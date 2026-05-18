import pytest
import os
import tempfile
from unittest.mock import MagicMock, AsyncMock, patch
import numpy as np

from app.services.rag_service import ActiveCampaignMemory, EmbeddingsService, RAGService
from app.routers.rag import RAGQueryRequest


def test_mock_embedding_determinism():
    """
    Test that EmbeddingsService.generate_mock_embedding is deterministic,
    returns a 1536-dimensional float vector, and is normalized (unit length).
    """
    text = "The shadow rises in the east."
    vec1 = EmbeddingsService.generate_mock_embedding(text)
    vec2 = EmbeddingsService.generate_mock_embedding(text)
    
    assert vec1 == vec2
    assert len(vec1) == 384
    
    # Check normalization
    norm = np.linalg.norm(np.array(vec1, dtype=np.float32))
    assert pytest.approx(norm, abs=1e-5) == 1.0

    # Different text should yield a different embedding
    vec3 = EmbeddingsService.generate_mock_embedding("A completely different phrase.")
    assert vec1 != vec3


def test_active_campaign_memory_search():
    """
    Test in-memory ActiveCampaignMemory search using cosine similarity.
    """
    # Create chunks
    chunks = [
        {"id": "chunk_1", "text": "Alucard is a powerful vampire lord."},
        {"id": "chunk_2", "text": "Eldrin lives in the Whispering Woods."},
        {"id": "chunk_3", "text": "The Sunstone of Ravenloft was lost."}
    ]
    
    # Generate mock embeddings
    embeddings = [
        EmbeddingsService.generate_mock_embedding(c["text"]) for c in chunks
    ]
    
    # Load into active campaign memory
    memory = ActiveCampaignMemory(
        campaign_id="test_camp",
        chunks=chunks,
        embeddings=embeddings,
        embedding_model="mock:test",
        updated_at="2026-05-18T00:00:00Z"
    )
    
    # Search for a query similar to chunk_1
    query_vec = EmbeddingsService.generate_mock_embedding("Alucard is a powerful vampire lord.")
    results = memory.search(query_vec, top_k=2)
    
    assert len(results) == 1
    # The first result should be chunk_1 with a similarity score of 1.0 (approx)
    assert results[0][0]["id"] == "chunk_1"
    assert pytest.approx(results[0][1], abs=1e-5) == 1.0


@pytest.mark.asyncio
async def test_rag_service_reindex_and_load(mock_db):
    """
    Test RAGService reindexing and loading lifecycles using mock database data.
    """
    campaign_id = "camp-vamp"
    session_id = "sess-1"
    
    # Mock campaign in DB
    mock_db.campaigns.find_one.return_value = {"id": campaign_id, "name": "Vampire Campaign"}
    
    # Mock session with diary and summary
    mock_session = {
        "id": session_id,
        "name": "Session 1: The Gathering",
        "campaign_id": campaign_id,
        "technical_diary": [
            {
                "id": "diary-1",
                "category": "NPC",
                "name": "Alucard",
                "description": "A high-born vampire lord.",
                "status": "Alive",
                "player_name": "Narrator"
            }
        ],
        "review_script": "The players entered the castle.\n\nThey met Alucard in the main hall."
    }
    
    # Mock sessions list
    mock_find_cursor = MagicMock()
    mock_find_cursor.to_list = AsyncMock(return_value=[mock_session])
    mock_db.sessions.find.return_value = mock_find_cursor

    # Use a temporary directory for flatfiles to isolate disk IO
    with tempfile.TemporaryDirectory() as tmpdir:
        # Patch config flatfile_dir and API keys to force local mock embeddings fallback
        with patch("app.services.rag_service.get_settings") as mock_get_settings_rag, \
             patch("app.services.settings_service.get_settings") as mock_get_settings_set:
            mock_cfg = MagicMock()
            mock_cfg.flatfile_dir = tmpdir
            mock_cfg.openai_api_key = None
            mock_cfg.google_api_key = None
            mock_cfg.master_key = "dGVzdC1rZXktMzItYnl0ZXMtc2VjdXJlIQ=="
            mock_get_settings_rag.return_value = mock_cfg
            mock_get_settings_set.return_value = mock_cfg
            
            mock_db.settings.find_one.return_value = None
            
            rag_service = RAGService()
            
            # 1. Test reindexing
            status = await rag_service.reindex_campaign(campaign_id, mock_db)
            assert status["campaign_id"] == campaign_id
            assert status["chunk_count"] == 3  # 1 diary entry + 2 paragraphs of review_script
            
            # 2. Test status retrieval
            status_meta = await rag_service.get_index_status(campaign_id)
            assert status_meta["exists"] is True
            assert status_meta["chunk_count"] == 3
            
            # 3. Test load active memory
            memory = await rag_service.load_campaign_memory(campaign_id)
            assert memory is not None
            assert memory.campaign_id == campaign_id
            assert len(memory.chunks) == 3
            assert memory.vectors.shape == (3, 384)


def test_rag_endpoints(client, mock_db):
    """
    Test the FastAPI endpoints for RAG operations.
    """
    campaign_id = "camp-endpoints"
    
    # Mock campaign and session queries
    mock_db.campaigns.find_one.return_value = {"id": campaign_id, "name": "Endpoints Campaign"}
    
    # Use a temporary directory for flatfiles to isolate disk IO
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.services.rag_service.get_settings") as mock_get_settings_rag, \
             patch("app.services.settings_service.get_settings") as mock_get_settings_set:
            mock_cfg = MagicMock()
            mock_cfg.flatfile_dir = tmpdir
            mock_cfg.openai_api_key = None
            mock_cfg.google_api_key = None
            mock_cfg.master_key = "dGVzdC1rZXktMzItYnl0ZXMtc2VjdXJlIQ=="
            mock_get_settings_rag.return_value = mock_cfg
            mock_get_settings_set.return_value = mock_cfg
            
            mock_db.settings.find_one.return_value = None
            
            # Setup endpoints mock for sessions to list empty (to test empty reindex)
            mock_find_cursor = MagicMock()
            mock_find_cursor.to_list = AsyncMock(return_value=[])
            mock_db.sessions.find.return_value = mock_find_cursor
            
            # Test status endpoint
            response = client.get(f"/api/rag/status/{campaign_id}")
            assert response.status_code == 200
            assert response.json()["exists"] is False
            
            # Test select on non-existing index (should trigger on-the-fly reindexing, which will yield empty)
            response = client.post(f"/api/rag/select/{campaign_id}")
            assert response.status_code == 200
            assert response.json()["status"] == "success"
            assert response.json()["chunk_count"] == 0
            
            # Test unload
            response = client.post("/api/rag/unload")
            assert response.status_code == 200
            assert response.json()["status"] == "success"
            
            # Try to query empty loaded memory (should return empty results)
            # Now let's load a non-empty index by mocking the sessions list and re-indexing
            mock_session = {
                "id": "s-1",
                "campaign_id": campaign_id,
                "technical_diary": [
                    {"id": "d-1", "name": "Sword of Power", "description": "Lethal blade."}
                ]
            }
            mock_find_cursor.to_list = AsyncMock(return_value=[mock_session])
            
            # Reindex
            response = client.post(f"/api/rag/reindex/{campaign_id}")
            assert response.status_code == 200
            assert response.json()["chunk_count"] == 1
            
            # Select
            response = client.post(f"/api/rag/select/{campaign_id}")
            assert response.status_code == 200
            assert response.json()["chunk_count"] == 1
            
            # Query
            response = client.post("/api/rag/query", json={"query": "[GERAL] Sword of Power: Lethal blade.", "top_k": 2})
            assert response.status_code == 200
            data = response.json()
            assert data["campaign_id"] == campaign_id
            assert len(data["results"]) == 1
            assert "diary" in data["results"][0]["chunk"]["source_type"]
            assert data["results"][0]["score"] > 0
            
            # Test query by passing campaign_id in query payload (without select first)
            # First unload it
            client.post("/api/rag/unload")
            
            response = client.post("/api/rag/query", json={"query": "[GERAL] Sword of Power: Lethal blade.", "campaign_id": campaign_id})
            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == 1


@pytest.mark.asyncio
async def test_sentence_transformers_embedding_generation(mock_db):
    """
    Test that EmbeddingsService can successfully generate real local embeddings using sentence-transformers.
    Bypasses is_testing by patching/setting FORCE_ST_IN_TESTS.
    """
    with patch.dict(os.environ, {"FORCE_ST_IN_TESTS": "1"}):
        embeddings_service = EmbeddingsService()
        texts = ["Olá mundo", "Testando o RAG local offline."]
        
        embeddings, model_name = await embeddings_service.get_embeddings(texts, mock_db)
        
        assert model_name == "local:paraphrase-multilingual-MiniLM-L12-v2"
        assert len(embeddings) == 2
        assert len(embeddings[0]) == 384
        assert len(embeddings[1]) == 384
        
        # Verify embeddings are list of floats of correct dimensions
        assert isinstance(embeddings, list)
        assert isinstance(embeddings[0], list)
        assert isinstance(embeddings[0][0], float)


