const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('./config');

/**
 * Faz upload de um arquivo de áudio para a sessão específica no backend.
 */
async function uploadAudio(sessionId, filePath, speakerId, sessionStartTime, chunkOffset = 0) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: filePath,
        contentType: 'audio/wav',
    });
    
    if (speakerId) {
        form.append('speaker_id', speakerId.toString());
    }
    
    if (sessionStartTime) {
        form.append('session_start_time', sessionStartTime);
    }

    form.append('chunk_offset', chunkOffset.toString());

    try {
        console.log(`📤 [API] Enviando ${filePath} (Usuário: ${speakerId || 'Geral'})...`);
        const response = await axios.post(`${config.apiUrl}/sessions/${sessionId}/upload-audio`, form, {
            headers: form.getHeaders(),
        });
        
        if (response.status === 200) {
            console.log(`✅ [API] Sucesso para ${speakerId || 'Geral'}`);
            return true;
        }
    } catch (err) {
        console.error(`❌ [API] Erro no upload (${speakerId || 'Geral'}):`, err.message);
        throw err;
    }
    return false;
}

async function getSession(sessionId) {
    try {
        const response = await axios.get(`${config.apiUrl}/sessions/${sessionId}`);
        if (response.status === 200) {
            return response.data;
        }
    } catch (err) {
        console.error(`❌ [API] Erro ao buscar sessão ${sessionId}:`, err.message);
        throw err;
    }
    return null;
}

module.exports = {
    uploadAudio,
    getSession
};
