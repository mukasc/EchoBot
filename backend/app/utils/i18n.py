# EchoBot - O Cronista das Sombras
# Copyright (C) 2026 mukas

from typing import Dict, Any

TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "pt-BR": {
        "error.session_not_found": "Sessão não encontrada.",
        "error.ai_providers_disabled": "Nenhum provedor de IA está ativo nas configurações.",
        "error.ai_failed": "Falha ao processar com IA após {attempts} tentativas. Erro: {error}",
        "error.api_key_missing": "Chave de API do {provider} não configurada.",
        "stt.initial_prompt": "Esta é uma sessão de RPG de mesa.",
        "ai.role": "Você é um cronista de RPG especializado. Sua tarefa é analisar transcrições de sessões de RPG.",
        "ai.idiom_instruction": "IDIOMA DE SAÍDA OBRIGATÓRIO: {language}",
        "ai.task_filter": "1. IDENTIFICAR e FILTRAR: IC (In-Character), OOC (Out-of-Character).",
        "ai.task_diary": "2. GERAR DIÁRIO TÉCNICO: NPCs, Locais, Itens, XP, Eventos.",
        "ai.task_script": "3. GERAR ROTEIRO DE REVISÃO: Texto em prosa, manter narrativa coerente.",
        "ai.density.short": "Gere um roteiro conciso, focando apenas nos pontos cruciais.",
        "ai.density.standard": "Gere um roteiro equilibrado, mantendo o fluxo natural.",
        "ai.density.detailed": "Gere um roteiro detalhado e ricamente descritivo.",
        "ai.perspective.1p": "Escreva em 1ª pessoa.",
        "ai.perspective.3p_epic": "Escreva em 3ª pessoa com um tom épico.",
        "ai.perspective.tactical": "Escreva como um relatório tático focado em fatos."
    },
    "en-US": {
        "error.session_not_found": "Session not found.",
        "error.ai_providers_disabled": "No AI providers are active in settings.",
        "error.ai_failed": "Failed to process with AI after {attempts} attempts. Error: {error}",
        "error.api_key_missing": "{provider} API Key not configured.",
        "stt.initial_prompt": "This is a tabletop RPG session.",
        "ai.role": "You are a specialized RPG chronicler. Your task is to analyze RPG session transcriptions.",
        "ai.idiom_instruction": "MANDATORY OUTPUT LANGUAGE: {language}",
        "ai.task_filter": "1. IDENTIFY and FILTER: IC (In-Character), OOC (Out-of-Character).",
        "ai.task_diary": "2. GENERATE TECHNICAL DIARY: NPCs, Locations, Items, XP, Events.",
        "ai.task_script": "3. GENERATE REVIEW SCRIPT: Prose text, keep narrative coherent.",
        "ai.density.short": "Generate a concise script, focusing only on crucial points.",
        "ai.density.standard": "Generate a balanced script, maintaining natural flow.",
        "ai.density.detailed": "Generate a detailed and richly descriptive script.",
        "ai.perspective.1p": "Write in 1st person.",
        "ai.perspective.3p_epic": "Write in 3rd person with an epic tone.",
        "ai.perspective.tactical": "Write as a tactical report focused on facts."
    }
}

def t(key: str, lang: str = "pt-BR", **kwargs) -> str:
    # Handle generic lang codes like 'en' or 'pt'
    if lang.startswith("pt"):
        actual_lang = "pt-BR"
    elif lang.startswith("en"):
        actual_lang = "en-US"
    else:
        actual_lang = "en-US"

    lang_dict = TRANSLATIONS.get(actual_lang, TRANSLATIONS["en-US"])
    text = lang_dict.get(key, key)
    
    if kwargs:
        try:
            return text.format(**kwargs)
        except KeyError:
            return text
    return text
