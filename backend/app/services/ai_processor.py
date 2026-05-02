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
from typing import Any, Dict, Optional

from app.config import Settings
from app.models.common import LLMProvider
from app.models.settings import AppSettings, LLMConfig
from app.exceptions import AppException

logger = logging.getLogger(__name__)

from app.utils.i18n import t

def get_system_prompt(target_language: str = "pt-BR") -> str:
    return f"""\
{t('ai.role', target_language)}
{t('ai.idiom_instruction', target_language, language=target_language)}

{t('ai.task_filter', target_language)}
{t('ai.task_diary', target_language)}
{t('ai.task_script', target_language)}

{t('ai.prompt.json_instruction', target_language)}
{{
  "technical_diary": [
    {{"category": "npc|location|item|xp|event", "name": "Nome", "description": "Descrição opcional"}}
  ],
  "review_script": "Texto do roteiro de revisão...",
  "filtered_segments": [
    {{"text": "texto", "type": "ic|ooc", "character": "Nome do Personagem ou null"}}
  ]
}}"""

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
        script_density: str = "standard",
        narrative_perspective: str = "3p_epic",
        target_language: str = "pt-BR",
        scope: str = "all",
        glossary: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send transcription to the configured LLM and parse the structured response.
        Implements fallback logic using app_settings.llm_fallbacks.

        Returns the parsed JSON dict with keys:
            technical_diary, review_script, filtered_segments
        """
        prompt = self._build_prompt(
            raw_transcription, 
            game_system, 
            mapping_context,
            script_density,
            narrative_perspective,
            target_language,
            scope,
            glossary
        )
        system_prompt = get_system_prompt(target_language)
        
        # Build the chain of attempts: (provider, model, specific_api_key)
        attempts = []
        
        if app_settings.llm_primary_enabled:
            attempts.append((app_settings.llm_provider, app_settings.llm_model, None))
            
        for fallback in app_settings.llm_fallbacks:
            if fallback.enabled:
                attempts.append((fallback.provider, fallback.model, fallback.api_key))

        if not attempts:
            raise AppException(t('error.ai_providers_disabled', target_language), status_code=400)

        last_error = None
        for attempt_index, (provider, model_name, specific_key) in enumerate(attempts):
            try:
                logger.info(f"AI Process attempt {attempt_index + 1}: Provider={provider.value}, Model={model_name}")
                api_key = self._resolve_api_key(provider, specific_key, app_settings)
                
                if not api_key:
                    logger.warning(f"Skipping {provider.value} because API key is missing.")
                    continue
                
                response_text = await self._call_llm_direct(provider, model_name or "default", api_key, prompt, system_prompt)
                
                # If we got here, it worked!
                parsed = self._parse_response(response_text, raw_transcription)
                parsed["metadata"] = {
                    "provider": provider.value if hasattr(provider, "value") else str(provider),
                    "model": model_name.value if hasattr(model_name, "value") else str(model_name if model_name != "default" else self._get_default_model(provider)),
                    "attempts": str(attempt_index + 1),
                    "primary_enabled": str(app_settings.llm_primary_enabled)
                }
                return parsed
                
            except Exception as e:
                last_error = e
                logger.warning(f"LLM Attempt {attempt_index + 1} failed ({provider}): {str(e)}")
                # Continue to next attempt
                continue

        # If we reach here, all attempts failed
        logger.error(f"All LLM attempts failed. Last error: {str(last_error)}")
        raise AppException(
            detail=t('error.ai_failed', target_language, attempts=len(attempts), error=str(last_error)),
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
        script_density: str = "standard",
        narrative_perspective: str = "3p_epic",
        target_language: str = "pt-BR",
        scope: str = "all",
        glossary: Optional[str] = None,
    ) -> str:
        # Instruction for density
        density_key = f"ai.density.{script_density}"
        density_text = t(density_key, target_language)
        
        # Instruction for perspective
        perspective_key = f"ai.perspective.{narrative_perspective}"
        perspective_text = t(perspective_key, target_language)
        
        scope_instruction = ""
        if scope == "diary":
            scope_instruction = t("ai.prompt.scope_diary", target_language)
        elif scope == "script":
            scope_instruction = t("ai.prompt.scope_script", target_language)
        
        glossary_header = t("ai.prompt.glossary", target_language)
        glossary_context = f"\n{glossary_header}\n{glossary}\n" if glossary else ""

        return (
            f"{t('ai.prompt.header', target_language, game_system=game_system)}\n\n"
            f"{t('ai.prompt.mapping', target_language)}\n{mapping_context}\n\n"
            f"{glossary_context}\n"
            f"{t('ai.prompt.context_instructions', target_language)}\n\n"
            f"{t('ai.prompt.style_instructions', target_language, density=density_text, perspective=perspective_text)}\n"
            f"{scope_instruction}\n\n"
            f"{t('ai.prompt.transcription', target_language)}\n{raw_transcription}\n\n"
            f"{t('ai.prompt.footer', target_language)}"
        )


    async def _call_llm_direct(
        self, provider: LLMProvider, model: str, api_key: str, prompt: str, system_prompt: str
    ) -> str:
        """Dispatches the call to the specific provider implementation."""
        if provider == LLMProvider.OPENAI:
            return await self._call_openai(api_key, prompt, model if model != "default" else "gpt-4o", system_prompt)

        if provider == LLMProvider.GEMINI:
            return await self._call_gemini(api_key, prompt, model if model != "default" else "gemini-2.0-flash", system_prompt)

        if provider == LLMProvider.ANTHROPIC:
            return await self._call_anthropic(
                api_key, prompt, model if model != "default" else "claude-3-5-sonnet-20240620", system_prompt
            )

        if provider == LLMProvider.OPENROUTER:
            return await self._call_openrouter(
                api_key, prompt, model if model != "default" else "google/gemini-2.0-flash-001", system_prompt
            )

        if provider == LLMProvider.GROQ:
            return await self._call_groq(
                api_key, prompt, model if model != "default" else "llama3-70b-8192", system_prompt
            )

        raise ValueError(f"Unknown LLM provider: {provider}")

    async def _call_openai(self, api_key: str, prompt: str, model: str, system_prompt: str) -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_openrouter(self, api_key: str, prompt: str, model: str, system_prompt: str) -> str:
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
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"} if any(m in model.lower() for m in ["gemini", "gpt", "llama-3"]) else None,
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_groq(self, api_key: str, prompt: str, model: str, system_prompt: str) -> str:
        from openai import AsyncOpenAI

        # Groq is OpenAI-compatible
        client = AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"} if any(m in model.lower() for m in ["llama-3", "llama3", "mixtral"]) else None,
            timeout=60.0,
        )
        return completion.choices[0].message.content or ""

    async def _call_gemini(self, api_key: str, prompt: str, model_name: str, system_prompt: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return response.text

    async def _call_anthropic(self, api_key: str, prompt: str, model: str, system_prompt: str) -> str:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            timeout=60.0,
        )
        return message.content[0].text

    @staticmethod
    def _parse_response(response_text: str, fallback_transcription: str) -> Dict[str, Any]:
        """Parse JSON from LLM response, handling trailing text and markdown fences."""
        if not response_text:
            return {
                "technical_diary": [],
                "review_script": fallback_transcription,
                "filtered_segments": [],
            }

        # Initial cleanup
        text = response_text.strip()
        
        # Remove markdown code fences if they wrap the entire response
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

        # Find the first occurrence of '{'
        start_idx = text.find('{')
        if start_idx == -1:
            logger.warning(f"No JSON object start found. Raw: {text[:200]}...")
            return {
                "technical_diary": [],
                "review_script": fallback_transcription,
                "filtered_segments": [],
            }

        text = text[start_idx:]

        try:
            # JSONDecoder().raw_decode is the key: it parses the first valid JSON object
            # and ignores anything after it (the "Extra data" that causes json.loads to fail)
            decoder = json.JSONDecoder()
            obj, _ = decoder.raw_decode(text)
            return obj
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"JSON parsing failed: {e}. Attempting greedy fallback...")
            
            # Greedy fallback: find the last '}'
            end_idx = text.rfind('}')
            if end_idx != -1:
                try:
                    greedy_text = text[:end_idx + 1]
                    return json.loads(greedy_text)
                except:
                    pass
            
            logger.error(f"All JSON parsing attempts failed. Raw snippet: {text[:200]}...")
            return {
                "technical_diary": [],
                "review_script": fallback_transcription,
                "filtered_segments": [],
            }
