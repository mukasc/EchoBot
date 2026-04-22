"""Character mappings router."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.exceptions import NotFoundException
from app.models.character import CharacterMapping, CharacterMappingCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/character-mappings", tags=["character-mappings"])


def _serialize(obj):
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


@router.get("/", response_model=List[CharacterMapping])
async def list_character_mappings(db: AsyncIOMotorDatabase = Depends(get_db)):
    docs = await db.character_mappings.find({}, {"_id": 0}).to_list(100)
    return [CharacterMapping(**d) for d in docs]


@router.post("/", response_model=CharacterMapping, status_code=201)
async def create_or_update_character_mapping(
    payload: CharacterMappingCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a character mapping, or update it if the Discord user already exists."""
    existing = await db.character_mappings.find_one(
        {"discord_user_id": payload.discord_user_id}, {"_id": 0}
    )

    if existing:
        update_data = payload.model_dump()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.character_mappings.update_one(
            {"discord_user_id": payload.discord_user_id},
            {"$set": update_data},
        )
        updated = await db.character_mappings.find_one(
            {"discord_user_id": payload.discord_user_id}, {"_id": 0}
        )
        return CharacterMapping(**updated)

    mapping = CharacterMapping(**payload.model_dump())
    await db.character_mappings.insert_one(_serialize(mapping.model_dump()))
    return mapping


@router.delete("/{mapping_id}", status_code=204)
async def delete_character_mapping(
    mapping_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    result = await db.character_mappings.delete_one({"id": mapping_id})
    if result.deleted_count == 0:
        raise NotFoundException("CharacterMapping", mapping_id)
