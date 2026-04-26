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


from app.services.settings_service import get_app_settings as load_settings, update_app_settings as save_settings


@router.get("/", response_model=AppSettings)
async def get_app_settings(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await load_settings(db)


@router.put("/", response_model=AppSettings)
async def update_app_settings(
    payload: AppSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await save_settings(db, payload)


@router.get("/elevenlabs/voices/")
async def get_elevenlabs_voices(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = await load_settings(db)
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


@router.get("/elevenlabs/usage/")
async def get_elevenlabs_usage(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = await load_settings(db)
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


@router.get("/deepgram/voices/")
async def get_deepgram_voices(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.deepgram import DeepgramService
    settings = await load_settings(db)
    target_key = api_key or settings.deepgram_api_key
    
    try:
        svc = DeepgramService(settings)
        voices = await svc.get_voices(target_key)
        return voices
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deepgram/usage/")
async def get_deepgram_usage(
    api_key: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.deepgram import DeepgramService
    settings = await load_settings(db)
    target_key = api_key or settings.deepgram_api_key
    
    try:
        svc = DeepgramService(settings)
        usage = await svc.get_subscription_info(target_key)
        return usage
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


def _format_kokoro_voices(voices: list[str]) -> list[dict]:
    """Converte lista de IDs do Kokoro em objetos com nomes amigáveis e bandeiras."""
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
        # Se já for um dicionário (ex: vindo da KokoroService externa), manter ou adaptar
        if isinstance(v, dict):
            results.append(v)
            continue
            
        if len(v) < 3:
            results.append({"voice_id": v, "name": v, "category": "native"})
            continue
            
        lang_code = v[0]
        gender_code = v[1]
        name = v[3:].capitalize()
        
        lang_name = lang_map.get(lang_code, "Outro")
        gender = "Fem" if gender_code == "f" else "Masc"
        
        friendly_name = f"{lang_name} - {name} ({gender})"
        results.append({"voice_id": v, "name": friendly_name, "category": "native"})
        
    return results


@router.get("/kokoro/voices/")
async def get_kokoro_voices(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.services.kokoro import KokoroService
    from app.models.settings import TTSProvider
    settings = await load_settings(db)
    
    # If the provider is already set to Kokoro, we can return the local voices directly
    if settings.tts_provider == TTSProvider.KOKORO:
        from app.services.kokoro_local import kokoro_local_engine
        from fastapi.concurrency import run_in_threadpool
        voices = await run_in_threadpool(kokoro_local_engine.get_voices)
        return _format_kokoro_voices(voices)

    try:
        svc = KokoroService(settings)
        voices = await svc.get_voices()
        # Se as vozes vierem como lista de strings da instância externa, formatar também
        if voices and isinstance(voices[0], str):
            return _format_kokoro_voices(voices)
        return voices
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tts/providers/")
async def list_tts_providers():
    return [p.value for p in TTSProvider]


@router.get("/tts/voices/{provider}/")
async def list_tts_voices(
    provider: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retorna a lista de vozes disponíveis para um provedor específico."""
    app_settings = await load_settings(db)
    
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
        return _format_kokoro_voices(voices)
        
    return []
    
@router.get("/llm/openrouter/models/")
async def list_openrouter_models(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Busca a lista de modelos disponíveis diretamente do OpenRouter."""
    import httpx
    try:
        # Tenta carregar a chave salva no banco
        settings = await load_settings(db)
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


@router.get("/llm/groq/models/")
async def list_groq_models(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Busca a lista de modelos disponíveis diretamente do Groq."""
    import httpx
    try:
        # Tenta carregar a chave salva no banco
        settings = await load_settings(db)
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
