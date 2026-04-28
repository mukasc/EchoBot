"""
Campaigns router — CRUD operations and aggregated data for campaigns.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.exceptions import NotFoundException
from app.models.campaign import Campaign, CampaignCreate, CampaignUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

def _serialize_datetime(obj):
    """Recursively convert datetime objects to ISO strings for MongoDB."""
    if isinstance(obj, dict):
        return {k: _serialize_datetime(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_datetime(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def _deserialize_campaign(doc: dict) -> Campaign:
    for field in ("created_at", "updated_at"):
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except ValueError:
                pass
    return Campaign(**doc)

@router.get("/", response_model=List[Campaign])
async def list_campaigns(db: AsyncIOMotorDatabase = Depends(get_db)):
    docs = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_deserialize_campaign(d) for d in docs]

@router.post("/", response_model=Campaign, status_code=201)
async def create_campaign(payload: CampaignCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    campaign = Campaign(**payload.model_dump())
    await db.campaigns.insert_one(_serialize_datetime(campaign.model_dump()))
    return campaign

@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Campaign", campaign_id)
    return _deserialize_campaign(doc)

@router.put("/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not doc:
        raise NotFoundException("Campaign", campaign_id)

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return _deserialize_campaign(updated)

@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise NotFoundException("Campaign", campaign_id)

@router.get("/{campaign_id}/technical_diary")
async def get_campaign_technical_diary(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Aggregate all technical diary entries from all sessions in a campaign."""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise NotFoundException("Campaign", campaign_id)

    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {"$unwind": "$technical_diary"},
        {"$project": {
            "_id": 0,
            "session_id": "$id",
            "session_name": "$name",
            "entry": "$technical_diary"
        }},
        {"$group": {
            "_id": "$entry.category",
            "entries": {"$push": {
                "id": "$entry.id",
                "name": "$entry.name",
                "description": "$entry.description",
                "timestamp": "$entry.timestamp",
                "session_id": "$session_id",
                "session_name": "$session_name"
            }}
        }}
    ]

    results = await db.sessions.aggregate(pipeline).to_list(None)
    
    # Formata a resposta para ser mais amigável
    formatted_diary = {}
    for group in results:
        category = group["_id"]
        formatted_diary[category] = group["entries"]

    return {"campaign_id": campaign_id, "technical_diary": formatted_diary}

@router.get("/{campaign_id}/sessions")
async def list_campaign_sessions(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    from app.routers.sessions import _deserialize_session
    docs = await db.sessions.find({"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_deserialize_session(d) for d in docs]
