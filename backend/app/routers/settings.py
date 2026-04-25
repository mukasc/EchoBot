"""App settings router — persists user-configurable settings in MongoDB."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models.settings import AppSettings, AppSettingsUpdate, TTSProvider
from app.utils.security import encrypt, decrypt
from app.services.elevenlabs import ElevenLabsService
from app.services.deepgram import DeepgramService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


async def _load_settings(db: AsyncIOMotorDatabase) -> AppSettings:
    from app.config import get_settings
    from app.models.common import LLMProvider
    
    cfg = get_settings()
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    
    if doc:
        settings = AppSettings(**doc)
        # Descriptografar campos sensíveis vindo do banco
        settings.discord_bot_token = decrypt(settings.discord_bot_token)
        settings.elevenlabs_api_key = decrypt(settings.elevenlabs_api_key)
        settings.deepgram_api_key = decrypt(settings.deepgram_api_key)
        settings.custom_api_key = decrypt(settings.custom_api_key)
        
        # Descriptografar chaves nos fallbacks
        if settings.llm_fallbacks:
            for fb in settings.llm_fallbacks:
                if fb.api_key:
                    fb.api_key = decrypt(fb.api_key)
    else:
        settings = AppSettings()
        
    # Fallback para .env se os campos estiverem vazios
    if not settings.discord_bot_token:
        settings.discord_bot_token = cfg.discord_bot_token or None
    if not settings.discord_app_id:
        settings.discord_app_id = cfg.discord_app_id or None
    if not settings.discord_guild_id:
        settings.discord_guild_id = cfg.discord_guild_id or None
    if not settings.elevenlabs_api_key:
        settings.elevenlabs_api_key = cfg.elevenlabs_api_key or None
    if not settings.deepgram_api_key:
        settings.deepgram_api_key = cfg.deepgram_api_key or None
        
    # Fallback para custom_api_key baseado no provedor selecionado
    if not settings.custom_api_key:
        if settings.llm_provider == LLMProvider.GEMINI:
            settings.custom_api_key = cfg.google_api_key or None
        elif settings.llm_provider == LLMProvider.OPENAI:
            settings.custom_api_key = cfg.openai_api_key or None
        elif settings.llm_provider == LLMProvider.ANTHROPIC:
            settings.custom_api_key = cfg.anthropic_api_key or None
            
    return settings


@router.get("/", response_model=AppSettings)
async def get_app_settings(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await _load_settings(db)


@router.put("/", response_model=AppSettings)
async def update_app_settings(
    payload: AppSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    logger.info(f"Saving updated application settings")
    
    # Criptografar campos sensíveis antes de salvar
    if "discord_bot_token" in update_data:
        update_data["discord_bot_token"] = encrypt(update_data["discord_bot_token"])
    if "elevenlabs_api_key" in update_data:
        update_data["elevenlabs_api_key"] = encrypt(update_data["elevenlabs_api_key"])
    if "deepgram_api_key" in update_data:
        update_data["deepgram_api_key"] = encrypt(update_data["deepgram_api_key"])
    if "custom_api_key" in update_data:
        update_data["custom_api_key"] = encrypt(update_data["custom_api_key"])
        
    # Criptografar chaves nos fallbacks se existirem
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


@router.get("/kokoro/voices")
async def get_kokoro_voices(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.kokoro import KokoroService
    from app.models.settings import TTSProvider
    settings = await _load_settings(db)
    
    # If the provider is already set to Kokoro, we can return the local voices directly
    # to avoid the service trying to call itself via HTTP (which might 404 depending on base_url)
    if settings.tts_provider == TTSProvider.KOKORO:
        from app.services.kokoro_local import kokoro_local_engine
        from fastapi.concurrency import run_in_threadpool
        return await run_in_threadpool(kokoro_local_engine.get_voices)

    try:
        svc = KokoroService(settings)
        voices = await svc.get_voices()
        return voices
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tts/providers")
async def list_tts_providers():
    return [p.value for p in TTSProvider]


@router.get("/tts/voices/{provider}")
async def list_tts_voices(
    provider: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retorna a lista de vozes disponíveis para um provedor específico."""
    app_settings = await _load_settings(db)
    
    if provider == TTSProvider.ELEVENLABS:
        from app.services.elevenlabs import ElevenLabsService
        api_key = app_settings.elevenlabs_api_key
        if not api_key:
            return []
        svc = ElevenLabsService(app_settings)
        return await svc.get_voices(api_key)
        
    elif provider == TTSProvider.DEEPGRAM:
        from app.services.deepgram import DeepgramService
        svc = DeepgramService(app_settings)
        return await svc.get_voices()
        
    elif provider == TTSProvider.KOKORO:
        from app.services.kokoro_local import kokoro_local_engine
        from fastapi.concurrency import run_in_threadpool
        voices = await run_in_threadpool(kokoro_local_engine.get_voices)
        
        lang_map = {
            "a": "🇺🇸 Inglês (EUA)",
            "b": "🇬🇧 Inglês (UK)",
            "e": "🇪🇸 Espanhol",
            "f": "🇫🇷 Francês",
            "h": "🇮🇳 Hindi",
            "i": "🇮🇹 Italiano",
            "j": "🇯🇵 Japonês",
            "p": "🇧🇷 Português",
            "z": "🇨🇳 Chinês",
        }
        
        results = []
        for v in voices:
            lang_code = v[0]
            gender_code = v[1]
            name = v[3:].capitalize()
            
            lang_name = lang_map.get(lang_code, "Outro")
            gender = "Fem" if gender_code == "f" else "Masc"
            
            friendly_name = f"{lang_name} - {name} ({gender})"
            results.append({"voice_id": v, "name": friendly_name, "category": "native"})
            
        return results
        
    return []
    
@router.get("/llm/openrouter/models")
async def list_openrouter_models(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Busca a lista de modelos disponíveis diretamente do OpenRouter."""
    import httpx
    try:
        # Tenta carregar a chave salva no banco
        settings = await _load_settings(db)
        api_key = settings.openrouter_api_key
        
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        async with httpx.AsyncClient() as client:
            response = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            # Retorna apenas o ID e o Nome para facilitar o Select no frontend
            return [
                {"value": m["id"], "label": m["name"]}
                for m in data.get("data", [])
            ]
    except Exception as e:
        # Fallback para modelos comuns caso a API falhe ou demore
        return [
            { "value": "google/gemini-2.0-flash-001", "label": "Gemini 2.0 Flash (OpenRouter)" },
            { "value": "openai/gpt-4o", "label": "GPT-4o (OpenRouter)" },
            { "value": "anthropic/claude-3.5-sonnet", "label": "Claude 3.5 Sonnet (OpenRouter)" },
        ]


@router.get("/llm/groq/models")
async def list_groq_models(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Busca a lista de modelos disponíveis diretamente do Groq."""
    import httpx
    try:
        # Tenta carregar a chave salva no banco
        settings = await _load_settings(db)
        api_key = settings.groq_api_key
        
        if not api_key:
            # Fallback para env se não houver no banco (para dev)
            from app.config import get_settings
            api_key = get_settings().groq_api_key
            
        if not api_key:
             return [
                {"value": "llama3-70b-8192", "label": "Llama 3 70B (Default)"},
                {"value": "mixtral-8x7b-32768", "label": "Mixtral 8x7B (Default)"},
            ]

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {api_key}"}
            response = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            return [
                {"value": m["id"], "label": m["id"]}
                for m in data.get("data", [])
            ]
    except Exception as e:
        # Se falhar a busca dinâmica (ex: chave inválida), retorna os modelos padrão
        return [
            {"value": "llama3-70b-8192", "label": "Llama 3 70B (Default)"},
            {"value": "mixtral-8x7b-32768", "label": "Mixtral 8x7B (Default)"},
        ]
