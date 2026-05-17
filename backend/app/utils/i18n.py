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
        "ai.task_diary": "2. GERAR DIÁRIO TÉCNICO: NPCs, Locais, Itens, XP, Eventos, Missões/Quests (categoria 'quest') e Interações Notáveis de Jogadores (categoria 'interaction').\n- Para 'quest', identifique o nome da missão e seu status atual ('Ativa', 'Concluída', 'Falha', 'Abandonada'). Compare com o histórico de missões fornecido para atualizar seus estados.\n- Para 'interaction', capture momentos memoráveis, conquistas ou falhas críticas, associando-os diretamente ao personagem ou jogador no campo 'player_name'.",
        "ai.task_script": "3. GERAR ROTEIRO DE REVISÃO: Texto em prosa, manter narrativa coerente.",
        "ai.density.short": "Gere um roteiro conciso, focando apenas nos pontos cruciais.",
        "ai.density.standard": "Gere um roteiro equilibrado, mantendo o fluxo natural.",
        "ai.density.detailed": "Gere um roteiro detalhado e ricamente descritivo.",
        "ai.perspective.1p": "Escreva em 1ª pessoa.",
        "ai.perspective.3p_epic": "Escreva em 3ª pessoa com um tom épico.",
        "ai.perspective.tactical": "Escreva como um relatório tático focado em fatos.",
        "ai.prompt.header": "Analise esta transcrição de sessão de RPG ({game_system}):",
        "ai.prompt.mapping": "MAPEAMENTO DE JOGADORES:",
        "ai.prompt.glossary": "GLOSSÁRIO E CONTEXTO DA CAMPANHA (GRAFIA E DEFINIÇÕES):",
        "ai.prompt.quests_context": "HISTÓRICO DE MISSÕES (QUESTS) DE SESSÕES ANTERIORES:",
        "ai.prompt.quests_instruction": "INSTRUÇÕES DE MISSÕES (QUESTS):\n- Analise a transcrição atual e identifique se novas missões foram iniciadas ou se as missões do histórico acima mudaram de estado (Ativa, Concluída, Falha, Abandonada).\n- Para qualquer missão detectada ou atualizada, retorne o campo 'status' apropriado.\n- Se uma missão anterior não for mencionada nem houver indicação de mudança, você não precisa listá-la a menos que ela tenha sido alterada.",
        "ai.prompt.context_instructions": "INSTRUÇÕES DE CONTEXTO:\n- Use o glossário acima para garantir a grafia correta de nomes próprios.\n- Use as definições do glossário para categorizar corretamente NPCs, Locais e Itens.",
        "ai.prompt.style_instructions": "INSTRUÇÕES DE ESTILO:\n- DENSIDADE: {density}\n- PERSPECTIVA: {perspective}",
        "ai.prompt.scope_diary": "FOCO: Gere APENAS o diário técnico. O roteiro de revisão pode ser deixado vazio ou curto.",
        "ai.prompt.scope_script": "FOCO: Gere APENAS o roteiro de revisão. O diário técnico pode ser deixado vazio.",
        "ai.prompt.transcription": "TRANSCRIÇÃO:",
        "ai.prompt.footer": "Processe e retorne o JSON estruturado conforme o SYSTEM PROMPT.",
        "ai.prompt.json_instruction": "Responda SEMPRE em JSON com o formato:"
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
        "ai.task_diary": "2. GENERATE TECHNICAL DIARY: NPCs, Locations, Items, XP, Events, Quests (category 'quest'), and Notable Player Interactions (category 'interaction').\n- For 'quest', identify the quest name and its current status ('Active', 'Completed', 'Failed', 'Abandoned'). Reference the provided quest history to update their states.\n- For 'interaction', capture memorable moments, achievements, or critical failures, directly associating them with the character/player in the 'player_name' field.",
        "ai.task_script": "3. GENERATE REVIEW SCRIPT: Prose text, keep narrative coherent.",
        "ai.density.short": "Generate a concise script, focusing only on crucial points.",
        "ai.density.standard": "Generate a balanced script, maintaining natural flow.",
        "ai.density.detailed": "Generate a detailed and richly descriptive script.",
        "ai.perspective.1p": "Write in 1st person.",
        "ai.perspective.3p_epic": "Write in 3rd person with an epic tone.",
        "ai.perspective.tactical": "Write as a tactical report focused on facts.",
        "ai.prompt.header": "Analyze this RPG session transcription ({game_system}):",
        "ai.prompt.mapping": "PLAYER MAPPING:",
        "ai.prompt.glossary": "CAMPAIGN GLOSSARY AND CONTEXT (SPELLING AND DEFINITIONS):",
        "ai.prompt.quests_context": "QUEST HISTORY FROM PREVIOUS SESSIONS:",
        "ai.prompt.quests_instruction": "QUEST INSTRUCTIONS:\n- Analyze the current transcription and identify if new quests were started or if quests from the history above changed their status (Active, Completed, Failed, Abandoned).\n- For any detected or updated quest, return the appropriate 'status' field.\n- If a previous quest is not mentioned and has no status change, you do not need to output it unless its status was updated in this session.",
        "ai.prompt.context_instructions": "CONTEXT INSTRUCTIONS:\n- Use the glossary above to ensure correct spelling of proper names.\n- Use the glossary definitions to correctly categorize NPCs, Locations, and Items.",
        "ai.prompt.style_instructions": "STYLE INSTRUCTIONS:\n- DENSITY: {density}\n- PERSPECTIVE: {perspective}",
        "ai.prompt.scope_diary": "FOCUS: Generate ONLY the technical diary. The review script can be left empty or short.",
        "ai.prompt.scope_script": "FOCUS: Generate ONLY the review script. The technical diary can be left empty.",
        "ai.prompt.transcription": "TRANSCRIPTION:",
        "ai.prompt.footer": "Process and return the structured JSON as per the SYSTEM PROMPT.",
        "ai.prompt.json_instruction": "ALWAYS respond in JSON with the format:"
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
