const { Events, ChannelType } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const { PassThrough } = require('stream');
const path = require('path');
const config = require('./config');
const audioManager = require('./audio-manager');
const apiClient = require('./api-client');

class DiscordBot {
    constructor(client) {
        this.client = client;
        this.activeSessions = new Map();
        this.setupEvents();
    }

    setupEvents() {
        this.client.on(Events.ClientReady, () => {
            console.log(`--- [BRIDGE] Online: ${this.client.user.tag} ---`);
        });

        this.client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return;

            if (message.content.startsWith('!entrar')) {
                await this.handleJoin(message);
            } else if (message.content.startsWith('!sair')) {
                await this.handleLeave(message);
            }
        });
    }

    async handleJoin(message) {
        if (this.activeSessions.has(message.guild.id)) {
            return message.reply('⚠️ Já estou gravando nesta sala! Use !sair para parar.');
        }

        const parts = message.content.split(' ');
        const sessionId = parts[1];
        if (!sessionId) return message.reply('Uso: !entrar <SESSAO_ID>');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('Entre num canal de voz primeiro!');

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        connection.on(VoiceConnectionStatus.Ready, async () => {
            console.log(`✅ Conexão estabelecida para Sessão: ${sessionId}`);
            message.reply(`🎙️ **[Sessão Iniciada] Gravando áudio em blocos...**`);

            let chunkDuration = 20;
            try {
                const sessionData = await apiClient.getSession(sessionId);
                chunkDuration = sessionData?.chunk_duration_minutes || 20;
                console.log(`⏲️ [Config] Duração do chunk: ${chunkDuration} minutos.`);
            } catch (err) {
                console.warn(`⚠️ [Config] Erro ao buscar config da sessão, usando padrão de 20min.`);
            }

            const sessionStartTime = new Date().toISOString();
            const pcmFile = path.join(config.tempDir, `temp_${sessionId}.pcm`);
            const outStream = fs.createWriteStream(pcmFile);
            const centralStream = new PassThrough();
            centralStream.pipe(outStream);

            const receiver = connection.receiver;
            const subscribedUsers = new Map();

            receiver.speaking.on('start', (userId) => {
                audioManager.subscribeUser(receiver, userId, sessionId, subscribedUsers);
            });

            const session = {
                sessionId,
                sessionStartTime,
                pcmFile,
                outStream,
                centralStream,
                connection,
                subscribedUsers,
                chunkIndex: 1,
                chunkDuration,
                rotationTimer: null
            };

            this.activeSessions.set(message.guild.id, session);
            this.startRotationTimer(message.guild.id, message.channel);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('🔇 Bot desconectado do canal.');
            this.handleLeave(message);
        });
    }

    startRotationTimer(guildId, channel) {
        const session = this.activeSessions.get(guildId);
        if (!session) return;

        const intervalMs = session.chunkDuration * 60 * 1000;
        
        session.rotationTimer = setInterval(async () => {
            const currentSession = this.activeSessions.get(guildId);
            if (!currentSession) return;

            console.log(`🔄 [Rotation] Rotacionando bloco ${currentSession.chunkIndex} para sessão ${currentSession.sessionId}...`);
            const filesToProcess = [];

            // Rotaciona usuários individuais
            for (const [userId, userData] of currentSession.subscribedUsers) {
                const rotated = audioManager.rotateUserStream(userId, currentSession.sessionId, currentSession.subscribedUsers, currentSession.chunkIndex + 1);
                if (rotated) {
                    filesToProcess.push({ file: rotated.oldFile, stream: rotated.oldStream, userId });
                }
            }

            // Rotaciona stream central
            const oldPcmFile = currentSession.pcmFile;
            const oldOutStream = currentSession.outStream;
            
            const newPcmFile = path.join(config.tempDir, `temp_${currentSession.sessionId}_chunk_${currentSession.chunkIndex + 1}.pcm`);
            const newOutStream = fs.createWriteStream(newPcmFile);
            
            currentSession.centralStream.unpipe(oldOutStream);
            currentSession.centralStream.pipe(newOutStream);
            
            currentSession.pcmFile = newPcmFile;
            currentSession.outStream = newOutStream;
            // Calcula o offset do chunk atual (em segundos)
            const chunkOffset = (currentSession.chunkIndex - 1) * currentSession.chunkDuration * 60;
            
            currentSession.chunkIndex++;
            
            filesToProcess.push({ file: oldPcmFile, stream: oldOutStream, userId: null });

            // Processa o bloco anterior em background
            this.processChunk(currentSession.sessionId, filesToProcess, currentSession.sessionStartTime, chunkOffset);
            // channel.send(`📦 Bloco finalizado e enviado para processamento.`);

        }, intervalMs);
    }

    async processChunk(sessionId, filesToProcess, sessionStartTime, chunkOffset = 0) {
        for (const item of filesToProcess) {
            item.stream.end();
            
            // Pequeno delay para garantir que o arquivo foi fechado
            setTimeout(async () => {
                const timestamp = new Date().getTime();
                const suffix = item.userId ? `user_${item.userId}` : 'central';
                const oggFile = path.join(config.tempDir, `chunk_${sessionId}_${suffix}_${timestamp}.ogg`);
                
                try {
                    // Verifica se o arquivo PCM tem conteúdo (pelo menos 1KB)
                    if (!fs.existsSync(item.file) || fs.statSync(item.file).size < 100) {
                        console.log(`⏩ [Rotation] Pulando arquivo vazio ou muito pequeno: ${item.file}`);
                        audioManager.cleanup([item.file]);
                        return;
                    }

                    await audioManager.convertToOpus(item.file, oggFile);
                    
                    // Verifica se a conversão gerou um arquivo válido
                    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
                        await apiClient.uploadAudio(sessionId, oggFile, item.userId, sessionStartTime, chunkOffset);
                    } else {
                        console.warn(`⚠️ [Rotation] Arquivo convertido inválido ou vazio: ${oggFile}`);
                    }
                    
                    audioManager.cleanup([item.file, oggFile]);
                } catch (err) {
                    console.error(`❌ [Rotation] Erro ao processar arquivo ${item.file}:`, err.message);
                }
            }, 2000);
        }
    }

    async handleLeave(message) {
        const session = this.activeSessions.get(message.guild.id);
        if (!session) return;

        const { sessionId, sessionStartTime, pcmFile, outStream, centralStream, connection, subscribedUsers, rotationTimer } = session;
        console.log(`🛑 Finalizando sessão ${sessionId}...`);

        if (rotationTimer) clearInterval(rotationTimer);
        this.activeSessions.delete(message.guild.id);
        
        // Finaliza streams
        centralStream.unpipe(outStream);
        centralStream.end();
        outStream.end();

        // Processa o último bloco de todos (Usuários + Central)
        const lastFiles = [];
        lastFiles.push({ file: pcmFile, stream: outStream, userId: null });
        
        if (subscribedUsers && subscribedUsers.size > 0) {
            for (const [userId, userData] of subscribedUsers) {
                lastFiles.push({ file: userData.file, stream: userData.stream, userId });
            }
        }

        setTimeout(async () => {
            try {
                const finalOffset = (session.chunkIndex - 1) * session.chunkDuration * 60;
                await this.processChunk(sessionId, lastFiles, sessionStartTime, finalOffset);
                message.channel.send(`✅ Sessão **${sessionId}** finalizada! Últimos blocos em processamento.`);
            } catch (err) {
                console.error('❌ Erro ao finalizar sessão:', err);
                message.channel.send(`❌ Ocorreu um erro ao finalizar o processamento.`);
            } finally {
                connection.destroy();
            }
        }, 2000);
    }
}

module.exports = DiscordBot;
