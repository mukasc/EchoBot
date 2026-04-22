const { createWriteStream, existsSync, unlinkSync } = require('fs');
const { exec } = require('child_process');
const prism = require('prism-media');
const { EndBehaviorType } = require('@discordjs/voice');
const path = require('path');
const config = require('./config');

/**
 * Gerencia a gravação de áudio e conversão via FFmpeg.
 */
class AudioManager {
    constructor() {
        this.ffmpegPath = config.ffmpegPath;
    }

    /**
     * Inscreve um usuário para gravação individual.
     */
    subscribeUser(receiver, userId, sessionId, subscribedUsers) {
        if (subscribedUsers.has(userId)) return;

        const userPcmFile = path.join(config.tempDir, `temp_${sessionId}_user_${userId}.pcm`);
        const userOutStream = createWriteStream(userPcmFile);
        subscribedUsers.set(userId, { stream: userOutStream, file: userPcmFile });

        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 1500,
            },
        });

        const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
        
        decoder.on('error', (err) => {
            console.warn(`⚠️ [Audio] Pacote malformado de ${userId}: ${err.message}`);
        });

        opusStream.pipe(decoder).pipe(userOutStream, { end: false });
        console.log(`🎙️ [Audio] Inscrito: ${userId}`);
    }

    /**
     * Converte um arquivo PCM para WAV usando FFmpeg.
     */
    async convertToWav(pcmFile, wavFile) {
        const ffmpegCmd = `${this.ffmpegPath} -y -f s16le -ar 48000 -ac 2 -i "${pcmFile}" "${wavFile}"`;
        
        return new Promise((resolve, reject) => {
            console.log(`🎬 [Audio] Convertendo ${path.basename(pcmFile)} -> WAV...`);
            exec(ffmpegCmd, (error) => {
                if (error) {
                    console.error('❌ [Audio] Erro FFmpeg:', error);
                    return reject(error);
                }
                resolve(wavFile);
            });
        });
    }

    /**
     * Limpa arquivos temporários.
     */
    cleanup(files) {
        files.forEach(file => {
            try {
                if (file && existsSync(file)) {
                    unlinkSync(file);
                    // console.log(`🗑️ [Audio] Removido: ${path.basename(file)}`);
                }
            } catch (err) {
                console.error(`❌ [Audio] Erro ao deletar ${file}:`, err.message);
            }
        });
    }
}

module.exports = new AudioManager();
