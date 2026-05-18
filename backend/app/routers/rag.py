"""
RAG Router — APIs for campaign lazy-loading, on-the-fly indexing, status reporting, and similarity searches.
"""
from __future__ import annotations

import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.interfaces import DatabaseProviderInterface
from app.database import get_db
from app.services.rag_service import RAGService, ActiveCampaignMemory, EmbeddingsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])


class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Query to search for in campaign memory")
    campaign_id: Optional[str] = Field(None, description="Optional campaign ID to dynamically load if none is active")
    top_k: int = Field(5, ge=1, le=50, description="Number of results to return")


@router.post("/select/{campaign_id}")
async def select_campaign(campaign_id: str, request: Request, db: DatabaseProviderInterface = Depends(get_db)):
    """
    Loads a campaign's vector index from disk into dynamic memory.
    If the index does not exist, builds it dynamically on-the-fly.
    """
    rag_service = RAGService()
    
    # Verify campaign exists in the database
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found.")

    # Load campaign memory from disk
    memory = await rag_service.load_campaign_memory(campaign_id)
    
    # If the index does not exist, let's build it dynamically on-the-fly to be extremely resilient!
    if not memory:
        logger.info(f"Vector index for campaign {campaign_id} not found. Re-indexing on-the-fly...")
        try:
            await rag_service.reindex_campaign(campaign_id, db)
            memory = await rag_service.load_campaign_memory(campaign_id)
        except Exception as e:
            logger.error(f"Failed to generate vector index for campaign {campaign_id} on-the-fly: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate and load vector index for campaign {campaign_id} on-the-fly: {str(e)}"
            )
            
    if not memory:
        raise HTTPException(
            status_code=400,
            detail=f"No vector index found for campaign {campaign_id}. Please trigger re-indexing first."
        )

    # Store in FastAPI application state
    request.app.state.active_campaign_memory = memory

    return {
        "status": "success",
        "message": f"Campaign memory for {campaign_id} successfully loaded.",
        "campaign_id": campaign_id,
        "chunk_count": len(memory.chunks),
        "embedding_model": memory.embedding_model,
        "updated_at": memory.updated_at
    }


@router.post("/query")
async def query_memory(payload: RAGQueryRequest, request: Request, db: DatabaseProviderInterface = Depends(get_db)):
    """
    Performs a cosine similarity search on the loaded dynamic memory.
    If no memory is loaded, but campaign_id is provided, it dynamically loads it.
    """
    memory: Optional[ActiveCampaignMemory] = getattr(request.app.state, "active_campaign_memory", None)
    
    # If campaign_id is provided and doesn't match current active campaign memory, dynamically load/switch it
    if payload.campaign_id and (not memory or memory.campaign_id != payload.campaign_id):
        # Verify campaign exists in the database
        campaign = await db.campaigns.find_one({"id": payload.campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign with ID {payload.campaign_id} not found.")

        rag_service = RAGService()
        memory = await rag_service.load_campaign_memory(payload.campaign_id)
        
        # If the index does not exist, build it dynamically on-the-fly
        if not memory:
            logger.info(f"Vector index for campaign {payload.campaign_id} not found. Re-indexing on-the-fly...")
            try:
                await rag_service.reindex_campaign(payload.campaign_id, db)
                memory = await rag_service.load_campaign_memory(payload.campaign_id)
            except Exception as e:
                logger.error(f"Failed to generate vector index for campaign {payload.campaign_id} on-the-fly: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate and load vector index for campaign {payload.campaign_id} on-the-fly: {str(e)}"
                )
        
        if not memory:
            raise HTTPException(
                status_code=400,
                detail=f"No vector index found for campaign {payload.campaign_id}. Please trigger re-indexing first."
            )
            
        request.app.state.active_campaign_memory = memory

    if not memory:
        raise HTTPException(
            status_code=400,
            detail="No campaign memory has been loaded. Please select a campaign or provide campaign_id in the body."
        )

    # Generate query vector
    embeddings_service = EmbeddingsService()
    try:
        embeddings, _ = await embeddings_service.get_embeddings([payload.query], db)
        if not embeddings:
            raise ValueError("No embeddings returned for query.")
        query_vector = embeddings[0]
    except Exception as e:
        logger.error(f"Failed to generate embeddings for query: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embedding for the search query: {str(e)}"
        )

    # Perform similarity search using NumPy
    matches = memory.search(query_vector, top_k=payload.top_k)

    # Format response
    formatted_results = []
    for chunk, score in matches:
        formatted_results.append({
            "chunk": chunk,
            "score": score
        })

    return {
        "campaign_id": memory.campaign_id,
        "query": payload.query,
        "embedding_model": memory.embedding_model,
        "results": formatted_results
    }


@router.post("/reindex/{campaign_id}")
async def reindex_campaign(campaign_id: str, request: Request, db: DatabaseProviderInterface = Depends(get_db)):
    """
    Extracts all lore/diary content for the campaign, generates embeddings,
    and saves the vector index to disk. If the campaign is currently loaded in memory,
    updates the loaded active memory.
    """
    rag_service = RAGService()
    
    # Verify campaign exists in the database
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found.")

    try:
        status = await rag_service.reindex_campaign(campaign_id, db)
    except Exception as e:
        logger.error(f"Error reindexing campaign {campaign_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reindex campaign {campaign_id}: {str(e)}"
        )

    # If this campaign was active, reload it automatically
    memory: Optional[ActiveCampaignMemory] = getattr(request.app.state, "active_campaign_memory", None)
    if memory and memory.campaign_id == campaign_id:
        logger.info(f"Active campaign {campaign_id} index re-generated. Auto-reloading memory...")
        new_memory = await rag_service.load_campaign_memory(campaign_id)
        if new_memory:
            request.app.state.active_campaign_memory = new_memory

    return status


@router.get("/status/{campaign_id}")
async def get_rag_status(campaign_id: str, db: DatabaseProviderInterface = Depends(get_db)):
    """Check if a campaign's vector index exists on disk and returns its metadata."""
    # Verify campaign exists in the database
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found.")

    rag_service = RAGService()
    status = await rag_service.get_index_status(campaign_id)
    return status


@router.post("/unload")
async def unload_campaign(request: Request):
    """Unloads any active campaign memory from RAM."""
    request.app.state.active_campaign_memory = None
    return {"status": "success", "message": "Campaign memory successfully unloaded."}
