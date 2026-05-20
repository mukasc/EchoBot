import os
import shutil
import tempfile
import pytest
from datetime import datetime, timezone
from app.flatfile_provider import FlatFileDatabaseProvider, _resolve_path, _match_document, _project_document, _run_aggregation


@pytest.fixture
def temp_db_dir():
    """Create a temporary directory for flatfile DB test cases."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)


def test_resolve_path():
    """Test dot-separated path resolution helper."""
    doc = {
        "user": {
            "name": "Aragorn",
            "attributes": {
                "str": 18,
                "dex": 15
            }
        },
        "tags": ["hero", "king"],
        "items": [
            {"name": "Sword", "type": "weapon"},
            {"name": "Shield", "type": "armor"}
        ]
    }
    assert _resolve_path(doc, "user.name") == "Aragorn"
    assert _resolve_path(doc, "user.attributes.str") == 18
    assert _resolve_path(doc, "user.attributes.con") is None
    assert _resolve_path(doc, "tags") == ["hero", "king"]
    assert _resolve_path(doc, "items.name") == ["Sword", "Shield"]
    assert _resolve_path(doc, "nonexistent.field") is None


def test_match_document():
    """Test MongoDB-style matching interpreter."""
    doc = {
        "id": "s1",
        "campaign_id": "c1",
        "status": "completed",
        "tags": ["combat", "story"],
        "technical_diary": {
            "category": "npc",
            "name": "Strahd"
        }
    }

    # Match empty query
    assert _match_document(doc, {}) is True

    # Exact matches
    assert _match_document(doc, {"status": "completed"}) is True
    assert _match_document(doc, {"status": "active"}) is False

    # Path matches
    assert _match_document(doc, {"technical_diary.category": "npc"}) is True
    assert _match_document(doc, {"technical_diary.name": "Strahd"}) is True
    assert _match_document(doc, {"technical_diary.name": "Dracula"}) is False

    # $ne operator
    assert _match_document(doc, {"id": {"$ne": "s2"}}) is True
    assert _match_document(doc, {"id": {"$ne": "s1"}}) is False

    # $in operator (element in expected list)
    assert _match_document(doc, {"status": {"$in": ["active", "completed", "failed"]}}) is True
    assert _match_document(doc, {"status": {"$in": ["active", "failed"]}}) is False

    # $in operator matching against array fields (any overlap)
    assert _match_document(doc, {"tags": {"$in": ["combat", "rp"]}}) is True
    assert _match_document(doc, {"tags": {"$in": ["rp", "puzzle"]}}) is False


def test_project_document():
    """Test MongoDB-style projection helper."""
    doc = {
        "_id": "object_id_val",
        "id": "doc_id_val",
        "name": "Strahd von Zarovich",
        "spelling_glossary": "Castle Ravenloft, Barovia",
        "created_at": "2026-05-18T12:00:00Z"
    }

    # No projection (full copy)
    assert _project_document(doc, None) == doc

    # Exclusion projection
    proj_exclude = {"_id": 0, "created_at": 0}
    expected_exclude = {
        "id": "doc_id_val",
        "name": "Strahd von Zarovich",
        "spelling_glossary": "Castle Ravenloft, Barovia"
    }
    assert _project_document(doc, proj_exclude) == expected_exclude

    # Inclusion projection
    proj_include = {"spelling_glossary": 1}
    expected_include = {
        "_id": "object_id_val",
        "id": "doc_id_val",
        "spelling_glossary": "Castle Ravenloft, Barovia"
    }
    assert _project_document(doc, proj_include) == expected_include


def test_run_aggregation():
    """Test custom Python-native aggregation interpreter for match, sort, unwind, project, group."""
    docs = [
        {
            "id": "s1",
            "campaign_id": "c1",
            "created_at": "2026-05-18T10:00:00Z",
            "technical_diary": [
                {"name": "Castle Ravenloft", "category": "location"},
                {"name": "Strahd", "category": "npc"},
                {"name": "Save Ireena", "category": "quest"}
            ]
        },
        {
            "id": "s2",
            "campaign_id": "c1",
            "created_at": "2026-05-18T11:00:00Z",
            "technical_diary": [
                {"name": "Holy Symbol", "category": "item"},
                {"name": "Strahd", "category": "npc"}
            ]
        },
        {
            "id": "s3",
            "campaign_id": "c2",
            "created_at": "2026-05-18T12:00:00Z",
            "technical_diary": [
                {"name": "Dragon", "category": "npc"}
            ]
        }
    ]

    # Pipeline mimicking glossary generation:
    # 1. $match on campaign_id
    # 2. $unwind technical_diary
    # 3. $match on technical_diary.category in ["location", "npc", "item"]
    # 4. $group on name
    pipeline_glossary = [
        {"$match": {"campaign_id": "c1"}},
        {"$unwind": "$technical_diary"},
        {"$match": {"technical_diary.category": {"$in": ["npc", "location", "item"]}}},
        {"$group": {"_id": "$technical_diary.name"}}
    ]

    res = _run_aggregation(docs, pipeline_glossary)
    # Expected results grouped by name: Castle Ravenloft, Strahd, Holy Symbol
    names = {d["_id"] for d in res}
    assert names == {"Castle Ravenloft", "Strahd", "Holy Symbol"}

    # Pipeline mimicking quest gathering:
    # 1. $match on campaign_id and id != s2
    # 2. $sort on created_at
    # 3. $unwind technical_diary
    # 4. $match on quest category
    # 5. $project fields
    pipeline_quests = [
        {"$match": {"campaign_id": "c1", "id": {"$ne": "s2"}}},
        {"$sort": {"created_at": 1}},
        {"$unwind": "$technical_diary"},
        {"$match": {"technical_diary.category": "quest"}},
        {"$project": {
            "name": "$technical_diary.name",
            "description": "$technical_diary.description",
            "status": "$technical_diary.status"
        }}
    ]
    res_quests = _run_aggregation(docs, pipeline_quests)
    assert len(res_quests) == 1
    assert res_quests[0]["name"] == "Save Ireena"


@pytest.mark.asyncio
async def test_flatfile_crud_operations(temp_db_dir):
    """Test full CRUD operations on FlatFileDatabaseProvider and collections."""
    provider = FlatFileDatabaseProvider(temp_db_dir)

    # 1. Test insertion
    camp_doc = {
        "name": "Curse of Strahd",
        "system": "D&D 5e",
        "spelling_glossary": "Ravenloft"
    }
    insert_res = await provider.campaigns.insert_one(camp_doc)
    assert insert_res.inserted_id is not None
    generated_id = insert_res.inserted_id

    # Verify written file
    camp_file = os.path.join(temp_db_dir, "campaigns", f"{generated_id}.json")
    assert os.path.exists(camp_file)

    # 2. Test find_one
    found = await provider.campaigns.find_one({"id": generated_id})
    assert found is not None
    assert found["name"] == "Curse of Strahd"
    assert found["system"] == "D&D 5e"

    # Test find_one with projection
    found_projected = await provider.campaigns.find_one({"id": generated_id}, {"spelling_glossary": 1})
    assert found_projected is not None
    assert found_projected.get("name") is None
    assert found_projected["spelling_glossary"] == "Ravenloft"

    # 3. Test update_one
    update_res = await provider.campaigns.update_one(
        {"id": generated_id},
        {"$set": {"spelling_glossary": "Castle Ravenloft, Barovia", "dm": "Mukas"}}
    )
    assert update_res.matched_count == 1
    assert update_res.modified_count == 1

    updated = await provider.campaigns.find_one({"id": generated_id})
    assert updated["spelling_glossary"] == "Castle Ravenloft, Barovia"
    assert updated["dm"] == "Mukas"

    # 4. Test upsert
    upsert_res = await provider.campaigns.update_one(
        {"id": "new_campaign"},
        {"$set": {"name": "Labyrinth", "system": "Custom"}},
        upsert=True
    )
    assert upsert_res.matched_count == 0
    assert upsert_res.modified_count == 1

    upserted = await provider.campaigns.find_one({"id": "new_campaign"})
    assert upserted is not None
    assert upserted["name"] == "Labyrinth"

    # 5. Test find cursor and sorting
    # Insert multiple sessions
    now = datetime.now(timezone.utc)
    for i in range(5):
        await provider.sessions.insert_one({
            "id": f"sess_{i}",
            "name": f"Session {i}",
            "created_at": now.isoformat()
        })

    cursor = provider.sessions.find({})
    results = await cursor.to_list(10)
    assert len(results) == 5

    # Test sorting
    cursor_sorted = provider.sessions.find({}).sort("name", -1)
    results_sorted = await cursor_sorted.to_list(10)
    assert results_sorted[0]["name"] == "Session 4"
    assert results_sorted[-1]["name"] == "Session 0"

    # Test async iteration over cursor
    cursor_iter = provider.sessions.find({})
    collected = []
    async for doc in cursor_iter:
        collected.append(doc)
    assert len(collected) == 5

    # 6. Test delete_one
    delete_res = await provider.sessions.delete_one({"id": "sess_2"})
    assert delete_res.deleted_count == 1

    deleted_check = await provider.sessions.find_one({"id": "sess_2"})
    assert deleted_check is None


@pytest.mark.asyncio
async def test_flatfile_aggregation(temp_db_dir):
    """Test aggregation querying on FlatFileDatabaseProvider."""
    provider = FlatFileDatabaseProvider(temp_db_dir)

    # Insert mock sessions
    await provider.sessions.insert_one({
        "id": "s1",
        "campaign_id": "c1",
        "technical_diary": [
            {"name": "Strahd", "category": "npc"},
            {"name": "Sword of Light", "category": "item"}
        ]
    })
    await provider.sessions.insert_one({
        "id": "s2",
        "campaign_id": "c1",
        "technical_diary": [
            {"name": "Ravenloft", "category": "location"},
            {"name": "Strahd", "category": "npc"}
        ]
    })

    # Run aggregate pipeline through collection method
    pipeline = [
        {"$match": {"campaign_id": "c1"}},
        {"$unwind": "$technical_diary"},
        {"$group": {"_id": "$technical_diary.name"}}
    ]

    cursor = provider.sessions.aggregate(pipeline)
    res = await cursor.to_list(10)
    assert len(res) == 3
    names = {doc["_id"] for doc in res}
    assert names == {"Strahd", "Sword of Light", "Ravenloft"}


@pytest.mark.asyncio
async def test_flatfile_update_push(temp_db_dir):
    """Test $push operations with and without $each on FlatFileDatabaseProvider."""
    provider = FlatFileDatabaseProvider(temp_db_dir)
    
    # Insert initial document
    session_doc = {
        "id": "s1",
        "name": "Initial Session",
        "transcription_segments": [
            {"id": "seg1", "text": "Hello"}
        ]
    }
    await provider.sessions.insert_one(session_doc)
    
    # 1. Push single element
    await provider.sessions.update_one(
        {"id": "s1"},
        {"$push": {"transcription_segments": {"id": "seg2", "text": "World"}}}
    )
    
    updated = await provider.sessions.find_one({"id": "s1"})
    assert len(updated["transcription_segments"]) == 2
    assert updated["transcription_segments"][1]["id"] == "seg2"
    
    # 2. Push multiple elements with $each
    await provider.sessions.update_one(
        {"id": "s1"},
        {"$push": {"transcription_segments": {"$each": [{"id": "seg3", "text": "Foo"}, {"id": "seg4", "text": "Bar"}]}}}
    )
    
    updated2 = await provider.sessions.find_one({"id": "s1"})
    assert len(updated2["transcription_segments"]) == 4
    assert updated2["transcription_segments"][2]["id"] == "seg3"
    assert updated2["transcription_segments"][3]["id"] == "seg4"

