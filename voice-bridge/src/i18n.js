const translations = {
    'pt-BR': {
        'error.generic': 'Ocorreu um erro ao executar este comando!',
        'join.already_recording': '⚠️ Já estou gravando nesta sala! Finalize a sessão atual primeiro.',
        'join.must_be_in_voice': '❌ Você precisa entrar num canal de voz primeiro!',
        'join.success_title': '🎙️ Sessão de Gravação Iniciada',
        'join.success_desc': 'O bot está ouvindo e gravando o áudio deste canal para a sessão **{{sessionId}}**.',
        'join.success_desc_standalone': 'O bot está ouvindo e gravando o áudio deste canal no modo Podcast Avulso.',
        'join.field_session_id': 'Sessão ID',
        'join.field_session_id_standalone': 'Podcast ID',
        'join.field_channel': 'Canal',
        'join.field_rotation': 'Rotação',
        'join.field_rotation_value': '{{minutes}} minutos',
        'join.btn_stop': 'Parar Gravação',
        'leave.no_active_session': 'Não há nenhuma sessão ativa.',
        'leave.finishing_msg': '🛑 Finalizando gravação da sessão **{{sessionId}}**...',
        'leave.finished_msg': '🛑 Gravação da sessão **{{sessionId}}** finalizada.',
        'leave.success_announcement': '✅ Sessão **{{sessionId}}** finalizada com sucesso.',
        'rotation.log': '🔄 [Rotation] Rotacionando bloco {{index}} para sessão {{sessionId}}...',
        'rotation.skip_empty': '⏩ [Rotation] Pulando arquivo vazio: {{file}}',
        'rotation.error': '❌ [Rotation] Erro ao processar bloco {{file}}: {{message}}',
        'api.error_session': '❌ Erro ao buscar sessão: {{message}}',
        'bot.online': '--- [BRIDGE] Online: {{tag}} ---',
        'bot.disconnected': '🔇 Bot desconectado do canal.'
    },
    'en-US': {
        'error.generic': 'An error occurred while executing this command!',
        'join.already_recording': '⚠️ I am already recording in this room! Finish the current session first.',
        'join.must_be_in_voice': '❌ You need to join a voice channel first!',
        'join.success_title': '🎙️ Recording Session Started',
        'join.success_desc': 'The bot is listening and recording the audio from this channel for session **{{sessionId}}**.',
        'join.success_desc_standalone': 'The bot is listening and recording the audio from this channel in Standalone Podcast Mode.',
        'join.field_session_id': 'Session ID',
        'join.field_session_id_standalone': 'Podcast ID',
        'join.field_channel': 'Channel',
        'join.field_rotation': 'Rotation',
        'join.field_rotation_value': '{{minutes}} minutes',
        'join.btn_stop': 'Stop Recording',
        'leave.no_active_session': 'There is no active session.',
        'leave.finishing_msg': '🛑 Finishing recording for session **{{sessionId}}**...',
        'leave.finished_msg': '🛑 Recording for session **{{sessionId}}** finished.',
        'leave.success_announcement': '✅ Session **{{sessionId}}** finished successfully.',
        'rotation.log': '🔄 [Rotation] Rotating block {{index}} for session {{sessionId}}...',
        'rotation.skip_empty': '⏩ [Rotation] Skipping empty file: {{file}}',
        'rotation.error': '❌ [Rotation] Error processing block {{file}}: {{message}}',
        'api.error_session': '❌ Error fetching session: {{message}}',
        'bot.online': '--- [BRIDGE] Online: {{tag}} ---',
        'bot.disconnected': '🔇 Bot disconnected from the channel.'
    }
};

const getLocale = (interaction) => {
    if (!interaction || !interaction.locale) return 'en-US';
    return interaction.locale === 'pt-BR' ? 'pt-BR' : 'en-US';
};

const t = (key, locale = 'en-US', params = {}) => {
    const lang = translations[locale] || translations['en-US'];
    let text = lang[key] || translations['en-US'][key] || key;

    Object.keys(params).forEach(param => {
        text = text.replace(`{{${param}}}`, params[param]);
    });

    return text;
};

module.exports = { t, getLocale };
