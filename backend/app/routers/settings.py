"""App settings router — persists user-configurable settings in MongoDB."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models.settings import AppSettings, AppSettingsUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


async def _load_settings(db: AsyncIOMotorDatabase) -> AppSettings:
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if doc:
        return AppSettings(**doc)
    return AppSettings()


@router.get("/", response_model=AppSettings)
async def get_app_settings(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await _load_settings(db)


@router.put("/", response_model=AppSettings)
async def update_app_settings(
    payload: AppSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_data},
        upsert=True,
    )
    return await _load_settings(db)
