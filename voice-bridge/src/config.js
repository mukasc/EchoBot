require('dotenv').config({ path: '../backend/.env' });
const path = require('path');

module.exports = {
    discordToken: process.env.DISCORD_BOT_TOKEN,
    apiUrl: process.env.API_URL || 'http://localhost:8000/api',
    
    // Configurações de FFmpeg
    // Prioriza variável de ambiente, senão usa o path conhecido
    ffmpegPath: process.env.FFMPEG_PATH || `"C:\\Users\\mukas\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe"`,
    
    // Caminhos temporários
    tempDir: path.join(__dirname, '../temp'),
    recordingsDir: process.env.STANDALONE_RECORDINGS_DIR || path.join(__dirname, '../recordings'),
    standaloneChunkDuration: parseInt(process.env.STANDALONE_CHUNK_DURATION || '20', 10) * 60 * 1000,

    // Discord Intents
    intents: [
        'Guilds',
        'GuildVoiceStates',
    ]
};

// Garante que os diretórios existam
const fs = require('fs');
if (!fs.existsSync(module.exports.tempDir)) {
    fs.mkdirSync(module.exports.tempDir, { recursive: true });
}
if (!fs.existsSync(module.exports.recordingsDir)) {
    fs.mkdirSync(module.exports.recordingsDir, { recursive: true });
}
