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
from app.models.settings import AppSettings

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

        Returns the parsed JSON dict with keys:
            technical_diary, review_script, filtered_segments
        """
        api_key = self._resolve_api_key(app_settings)
        prompt = self._build_prompt(raw_transcription, game_system, mapping_context)
        response_text = await self._call_llm(app_settings, api_key, prompt)
        return self._parse_response(response_text, raw_transcription)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_api_key(self, app_settings: AppSettings) -> str:
        if not app_settings.use_emergent_key and app_settings.custom_api_key:
            return app_settings.custom_api_key

        provider = app_settings.llm_provider
        if provider == LLMProvider.OPENAI:
            return self._settings.openai_api_key
        if provider == LLMProvider.GEMINI:
            return self._settings.google_api_key
        if provider == LLMProvider.ANTHROPIC:
            return self._settings.anthropic_api_key
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

    async def _call_llm(
        self, app_settings: AppSettings, api_key: str, prompt: str
    ) -> str:
        provider = app_settings.llm_provider

        if provider == LLMProvider.OPENAI:
            return self._call_openai(api_key, prompt, app_settings.llm_model or "gpt-4o")

        if provider == LLMProvider.GEMINI:
            return self._call_gemini(api_key, prompt, app_settings.llm_model or "gemini-2.0-flash")

        if provider == LLMProvider.ANTHROPIC:
            return self._call_anthropic(
                api_key, prompt, app_settings.llm_model or "claude-3-5-sonnet-20240620"
            )

        raise ValueError(f"Unknown LLM provider: {provider}")

    @staticmethod
    def _call_openai(api_key: str, prompt: str, model: str) -> str:
        import openai

        client = openai.OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        return completion.choices[0].message.content or ""

    @staticmethod
    def _call_gemini(api_key: str, prompt: str, model_name: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=_SYSTEM_PROMPT,
        )
        response = model.generate_content(prompt)
        return response.text

    @staticmethod
    def _call_anthropic(api_key: str, prompt: str, model: str) -> str:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=model,
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    @staticmethod
    def _parse_response(response_text: str, fallback_transcription: str) -> Dict[str, Any]:
        """Strip markdown fences and parse JSON. Falls back gracefully."""
        text = response_text.strip()
        # Remove markdown code fences
        text = re.sub(r"^```(?:json)?", "", text, flags=re.MULTILINE).strip()
        text = re.sub(r"```$", "", text, flags=re.MULTILINE).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM JSON response. Using fallback structure.")
            return {
                "technical_diary": [],
                "review_script": fallback_transcription,
                "filtered_segments": [],
            }
