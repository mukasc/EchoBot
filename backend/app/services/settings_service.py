import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.settings import AppSettings, AppSettingsUpdate
from app.utils.security import encrypt, decrypt
from app.config import get_settings

logger = logging.getLogger(__name__)

async def get_app_settings(db: AsyncIOMotorDatabase) -> AppSettings:
    """Loads and decrypts application settings from MongoDB."""
    cfg = get_settings()
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    
    if doc:
        settings = AppSettings(**doc)
        # Decrypt sensitive fields
        settings.discord_bot_token = decrypt(settings.discord_bot_token)
        settings.elevenlabs_api_key = decrypt(settings.elevenlabs_api_key)
        settings.deepgram_api_key = decrypt(settings.deepgram_api_key)
        settings.custom_api_key = decrypt(settings.custom_api_key)
        settings.notion_api_key = decrypt(settings.notion_api_key)
        settings.kokoro_api_key = decrypt(settings.kokoro_api_key)
        
        # LLM specific keys
        settings.openai_api_key = decrypt(settings.openai_api_key)
        settings.google_api_key = decrypt(settings.google_api_key)
        settings.anthropic_api_key = decrypt(settings.anthropic_api_key)
        settings.openrouter_api_key = decrypt(settings.openrouter_api_key)
        settings.groq_api_key = decrypt(settings.groq_api_key)
        
        # Decrypt keys in fallbacks
        if settings.llm_fallbacks:
            for fb in settings.llm_fallbacks:
                if fb.api_key:
                    fb.api_key = decrypt(fb.api_key)
    else:
        settings = AppSettings()
        
    # Fallbacks to .env if empty
    if not settings.discord_bot_token:
        settings.discord_bot_token = cfg.discord_bot_token
    if not settings.elevenlabs_api_key:
        settings.elevenlabs_api_key = cfg.elevenlabs_api_key
    if not settings.deepgram_api_key:
        settings.deepgram_api_key = cfg.deepgram_api_key
        
    return settings

async def update_app_settings(db: AsyncIOMotorDatabase, payload: AppSettingsUpdate) -> AppSettings:
    """Encrypts and saves application settings to MongoDB."""
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    
    # Fields to encrypt
    sensitive_fields = [
        "discord_bot_token", "elevenlabs_api_key", "deepgram_api_key", 
        "custom_api_key", "notion_api_key", "kokoro_api_key", 
        "openai_api_key", "google_api_key", "anthropic_api_key", 
        "openrouter_api_key", "groq_api_key"
    ]
    
    for field in sensitive_fields:
        if field in update_data and update_data[field]:
            update_data[field] = encrypt(update_data[field])
            
    # Encrypt keys in fallbacks
    if "llm_fallbacks" in update_data and update_data["llm_fallbacks"]:
        for i, fb in enumerate(update_data["llm_fallbacks"]):
            if "api_key" in fb and fb["api_key"]:
                update_data["llm_fallbacks"][i]["api_key"] = encrypt(fb["api_key"])

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_data},
        upsert=True,
    )
    return await get_app_settings(db)
