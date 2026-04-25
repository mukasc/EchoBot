"""
AIProcessorService — calls LLM providers to process RPG session transcriptions.

Produces:
- technical_diary: list of categorised entries (NPC, location, item, XP, event)
- review_script: narrative prose for review
- filtered_segments: IC/OOC classification per segment
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

from app.config import Settings
from app.models.common import LLMProvider
from app.models.settings import AppSettings, LLMConfig
from app.exceptions import AppException

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
Você é um cronista de RPG especializado. Sua tarefa é analisar transcrições de sessões de RPG e:

1. IDENTIFICAR e FILTRAR:
   - IC (In-Character): Falas de personagens, narração do mestre, descrições de ações
   - OOC (Out-of-Character): Discussões sobre regras, piadas fora do jogo, conversas pessoais

2. GERAR DIÁRIO TÉCNICO:
   - NPCs encontrados
   - Locais visitados
   - Itens obtidos/perdidos
   - XP ou recompensas
   - Eventos importantes

3. GERAR ROTEIRO DE REVISÃO:
   - Texto em prosa clara e factual
   - Substituir nomes de jogadores por nomes de personagens
   - Manter a narrativa coerente
   - Marcar termos incertos como [Termo Incerto: fonética]
   - Evitar caracteres especiais para TTS

Responda SEMPRE em JSON com o formato:
{
  "technical_diary": [
    {"category": "npc|location|item|xp|event", "name": "Nome", "description": "Descrição opcional"}
  ],
  "review_script": "Texto do roteiro de revisão...",
  "filtered_segments": [
    {"text": "texto", "type": "ic|ooc", "character": "Nome do Personagem ou null"}
  ]
}"""


class AIProcessorService:
    """Processes RPG transcriptions using configured LLM provider."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def process(
        self,
        raw_transcription: str,
        game_system: str,
        mapping_context: str,
        app_settings: AppSettings,
    ) -> Dict[str, Any]:
        """
        Send transcription to the configured LLM and parse the structured response.
        Implements fallback logic using app_settings.llm_fallbacks.

        Returns the parsed JSON dict with keys:
            technical_diary, review_script, filtered_segments
        """
        prompt = self._build_prompt(raw_transcription, game_system, mapping_context)
        
        # Build the chain of attempts: (provider, model, specific_api_key)
        attempts = []
        
        logger.info(f"Building LLM chain. Primary enabled: {app_settings.llm_primary_enabled}, Primary: {app_settings.llm_provider}")
        
        if app_settings.llm_primary_enabled:
            attempts.append((app_settings.llm_provider, app_settings.llm_model or "default", None))
        
        for fb in app_settings.llm_fallbacks:
            logger.info(f"Checking fallback: {fb.provider} ({fb.model}), enabled: {fb.enabled}")
            if fb.enabled:
                attempts.append((fb.provider, fb.model, fb.api_key))

        logger.info(f"Total attempts in chain: {len(attempts)}")
        
        if not attempts:
            raise AppException(
                detail="Nenhum provedor de IA está ativo. Ative o Provedor Principal ou pelo menos um Fallback nas Configurações.",
                status_code=400
            )

        last_error = None
        for i, (provider, model, specific_key) in enumerate(attempts):
            try:
                logger.info(f"LLM Attempt {i+1}: {provider} ({model})")
                
                # Resolve API Key for this specific attempt
                api_key = self._resolve_api_key(provider, specific_key, app_settings)
                
                # Call the specific provider
                response_text = await self._call_llm_direct(provider, model, api_key, prompt)
                
                # If we got here, it worked!
                parsed = self._parse_response(response_text, raw_transcription)
                parsed["metadata"] = {
                    "provider": provider.value if hasattr(provider, "value") else str(provider),
                    "model": model.value if hasattr(model, "value") else str(model if model != "default" else self._get_default_model(provider)),
                    "attempts": str(i + 1),
                    "primary_enabled": str(app_settings.llm_primary_enabled)
                }
                return parsed
                
            except Exception as e:
                last_error = e
                logger.warning(f"LLM Attempt {i+1} failed ({provider}): {str(e)}")
                # Continue to next attempt
                continue

        # If we reach here, all attempts failed
        logger.error(f"All LLM attempts failed. Last error: {str(last_error)}")
        raise AppException(
            detail=f"Falha ao processar com IA após {len(attempts)} tentativas. Erro: {str(last_error)}",
            status_code=503
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_default_model(self, provider: LLMProvider) -> str:
        """Returns the hardcoded default model name for each provider."""
        if provider == LLMProvider.OPENAI:
            return "gpt-4o"
        if provider == LLMProvider.GEMINI:
            return "gemini-2.0-flash"
        if provider == LLMProvider.ANTHROPIC:
            return "claude-3-5-sonnet-20240620"
        if provider == LLMProvider.OPENROUTER:
            return "google/gemini-2.0-flash-001"
        if provider == LLMProvider.GROQ:
            return "llama3-70b-8192"
        return "default"

    def _resolve_api_key(
        self, 
        provider: LLMProvider, 
        specific_key: Optional[str], 
        app_settings: AppSettings
    ) -> str:
        """Resolves the API key for a specific provider, considering fallbacks and environment variables."""
        
        # Priority 1: Specific key provided in the fallback config
        if specific_key:
            return specific_key

        # Priority 2: Global Key from AppSettings (DB)
        db_key = None
        if provider == LLMProvider.OPENAI:
            db_key = app_settings.openai_api_key
        elif provider == LLMProvider.GEMINI:
            db_key = app_settings.google_api_key
        elif provider == LLMProvider.ANTHROPIC:
            db_key = app_settings.anthropic_api_key
        elif provider == LLMProvider.OPENROUTER:
            db_key = app_settings.openrouter_api_key
        elif provider == LLMProvider.GROQ:
            db_key = app_settings.groq_api_key
        
        if db_key:
            return db_key
            
        # Priority 3: custom_api_key (legacy)
        if app_settings.custom_api_key:
            return app_settings.custom_api_key

        # Priority 4: Fallback to environment variables
        if provider == LLMProvider.OPENAI:
            return self._settings.openai_api_key
        if provider == LLMProvider.GEMINI:
            return self._settings.google_api_key
        if provider == LLMProvider.ANTHROPIC:
            return self._settings.anthropic_api_key
        if provider == LLMProvider.OPENROUTER:
            return self._settings.openrouter_api_key
        if provider == LLMProvider.GROQ:
            return self._settings.groq_api_key
        return self._settings.openai_api_key

    @staticmethod
    def _build_prompt(
        raw_transcription: str,
        game_system: str,
        mapping_context: str,
    ) -> str:
        return (
            f"Analise esta transcrição de sessão de RPG ({game_system}):\n\n"
            f"MAPEAMENTO DE JOGADORES:\n{mapping_context}\n\n"
            f"TRANSCRIÇÃO:\n{raw_transcription}\n\n"
            "Processe e retorne o JSON estruturado."
        )

    async def _call_llm_direct(
        self, provider: LLMProvider, model: str, api_key: str, prompt: str
    ) -> str:
        """Dispatches the call to the specific provider implementation."""
        if provider == LLMProvider.OPENAI:
            return await self._call_openai(api_key, prompt, model if model != "default" else "gpt-4o")

        if provider == LLMProvider.GEMINI:
            return await self._call_gemini(api_key, prompt, model if model != "default" else "gemini-2.0-flash")

        if provider == LLMProvider.ANTHROPIC:
            return await self._call_anthropic(
                api_key, prompt, model if model != "default" else "claude-3-5-sonnet-20240620"
            )

        if provider == LLMProvider.OPENROUTER:
            return await self._call_openrouter(
                api_key, prompt, model if model != "default" else "google/gemini-2.0-flash-001"
            )

        if provider == LLMProvider.GROQ:
            return await self._call_groq(
                api_key, prompt, model if model != "default" else "llama3-70b-8192"
            )

        raise ValueError(f"Unknown LLM provider: {provider}")

    async def _call_openai(self, api_key: str, prompt: str, model: str) -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_openrouter(self, api_key: str, prompt: str, model: str) -> str:
        from openai import AsyncOpenAI

        # OpenRouter is OpenAI-compatible
        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "https://github.com/mukas/EchoBot",
                "X-Title": "EchoBot",
            }
        )
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"} if any(m in model.lower() for m in ["gemini", "gpt", "llama-3"]) else None,
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_groq(self, api_key: str, prompt: str, model: str) -> str:
        from openai import AsyncOpenAI

        # Groq is OpenAI-compatible
        client = AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"} if any(m in model.lower() for m in ["llama-3", "llama3", "mixtral"]) else None,
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_gemini(self, api_key: str, prompt: str, model_name: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=_SYSTEM_PROMPT,
        )
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return response.text

    async def _call_anthropic(self, api_key: str, prompt: str, model: str) -> str:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            timeout=60.0,
        )
        return message.content[0].text

    @staticmethod
    def _parse_response(response_text: str, fallback_transcription: str) -> Dict[str, Any]:
        """Strip markdown fences and parse JSON. Falls back gracefully."""
        text = response_text.strip()
        # Remove markdown code fences
        text = re.sub(r"^```(?:json)?", "", text, flags=re.MULTILINE).strip()
        text = re.sub(r"```$", "", text, flags=re.MULTILINE).strip()

        # Try to find JSON block if there's extra text
        if not text.startswith("{"):
            match = re.search(r"({.*})", text, re.DOTALL)
            if match:
                text = match.group(1)

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}. Raw: {text[:200]}...")
            return {
                "technical_diary": [],
                "review_script": fallback_transcription,
                "filtered_segments": [],
            }
