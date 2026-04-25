const { createWriteStream, existsSync, unlinkSync } = require('fs');
const child_process = require('child_process');
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
        
        // Forçamos 1 canal (Mono) para evitar que músicas Stereo fiquem aceleradas na conversão
        const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 });
        
        subscribedUsers.set(userId, { 
            stream: userOutStream, 
            file: userPcmFile,
            decoder: decoder
        });

        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.Manual,
            },
        });

        decoder.on('error', (err) => {
            console.warn(`⚠️ [Audio] Pacote malformado de ${userId}: ${err.message}`);
        });

        opusStream.pipe(decoder).pipe(userOutStream, { end: false });
        console.log(`🎙️ [Audio] Inscrito: ${userId}`);
    }

    /**
     * Rotaciona o stream de um usuário para um novo arquivo de chunk.
     */
    rotateUserStream(userId, sessionId, subscribedUsers, chunkIndex) {
        const userData = subscribedUsers.get(userId);
        if (!userData) return null;

        const oldFile = userData.file;
        const oldStream = userData.stream;

        const newPcmFile = path.join(config.tempDir, `temp_${sessionId}_user_${userId}_chunk_${chunkIndex}.pcm`);
        const newOutStream = createWriteStream(newPcmFile);

        userData.decoder.unpipe(oldStream);
        userData.decoder.pipe(newOutStream, { end: false });

        userData.file = newPcmFile;
        userData.stream = newOutStream;

        return { oldFile, oldStream };
    }

    /**
     * Converte um arquivo PCM para Ogg/Opus usando FFmpeg.
     */
    async convertToOpus(pcmFile, oggFile) {
        // Usamos -ac 1 para ler o PCM Mono que geramos e manter a velocidade correta
        const ffmpegCmd = `${this.ffmpegPath} -y -f s16le -ar 48000 -ac 1 -i "${pcmFile}" -c:a libopus -b:a 64k -ac 1 "${oggFile}"`;
        
        return new Promise((resolve, reject) => {
            console.log(`🎬 [Audio] Convertendo ${path.basename(pcmFile)} -> OGG/Opus (64k mono)...`);
            child_process.exec(ffmpegCmd, (error) => {
                if (error) {
                    console.error('❌ [Audio] Erro FFmpeg:', error);
                    return reject(error);
                }
                resolve(oggFile);
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
