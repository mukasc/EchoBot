"""App settings router — persists user-configurable settings in MongoDB."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models.settings import AppSettings, AppSettingsUpdate
from app.services.elevenlabs import ElevenLabsService
from app.services.deepgram import DeepgramService

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


@router.get("/elevenlabs/voices")
async def get_elevenlabs_voices(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = await _load_settings(db)
    target_key = api_key or settings.elevenlabs_api_key
    
    if not target_key:
        return []
    
    try:
        svc = ElevenLabsService(settings)
        voices = await svc.get_voices(target_key)
        return voices
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/elevenlabs/usage")
async def get_elevenlabs_usage(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = await _load_settings(db)
    target_key = api_key or settings.elevenlabs_api_key
    
    if not target_key:
        return {}
    
    try:
        svc = ElevenLabsService(settings)
        usage = await svc.get_subscription_info(target_key)
        return usage
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deepgram/voices")
async def get_deepgram_voices(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.deepgram import DeepgramService
    settings = await _load_settings(db)
    target_key = api_key or settings.deepgram_api_key
    
    try:
        svc = DeepgramService(settings)
        voices = await svc.get_voices(target_key)
        return voices
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deepgram/usage")
async def get_deepgram_usage(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.deepgram import DeepgramService
    settings = await _load_settings(db)
    target_key = api_key or settings.deepgram_api_key
    
    try:
        svc = DeepgramService(settings)
        usage = await svc.get_subscription_info(target_key)
        return usage
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
