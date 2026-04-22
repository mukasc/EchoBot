const { Events, ChannelType } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { createWriteStream } = require('fs');
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

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`✅ Conexão estabelecida para Sessão: ${sessionId}`);
            message.reply(`🎙️ **[Sessão Iniciada] Gravando áudio...**`);

            const sessionStartTime = new Date().toISOString();
            const pcmFile = path.join(config.tempDir, `temp_${sessionId}.pcm`);
            const outStream = createWriteStream(pcmFile);
            const centralStream = new PassThrough();
            centralStream.pipe(outStream);

            const receiver = connection.receiver;
            const subscribedUsers = new Map();

            receiver.speaking.on('start', (userId) => {
                audioManager.subscribeUser(receiver, userId, sessionId, subscribedUsers);
            });

            this.activeSessions.set(message.guild.id, {
                sessionId,
                sessionStartTime,
                pcmFile,
                outStream,
                centralStream,
                connection,
                subscribedUsers
            });
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('🔇 Bot desconectado do canal.');
        });
    }

    async handleLeave(message) {
        const session = this.activeSessions.get(message.guild.id);
        if (!session) return message.reply('Não estou gravando no momento.');

        const { sessionId, sessionStartTime, pcmFile, outStream, centralStream, connection, subscribedUsers } = session;
        console.log(`🛑 Finalizando sessão ${sessionId}...`);

        this.activeSessions.delete(message.guild.id);
        
        // Finaliza streams
        centralStream.unpipe(outStream);
        centralStream.end();
        outStream.end();

        // Aguarda buffers serem gravados
        setTimeout(async () => {
            try {
                if (subscribedUsers && subscribedUsers.size > 0) {
                    console.log(`👥 Processando ${subscribedUsers.size} participantes...`);
                    
                    for (const [userId, userData] of subscribedUsers) {
                        userData.stream.end();
                        const oggFile = path.join(config.tempDir, `recording_${sessionId}_user_${userId}.ogg`);
                        
                        try {
                            await audioManager.convertToOpus(userData.file, oggFile);
                            await apiClient.uploadAudio(sessionId, oggFile, userId, sessionStartTime);
                            audioManager.cleanup([userData.file, oggFile]);
                        } catch (err) {
                            console.error(`❌ Erro no fluxo do usuário ${userId}:`, err.message);
                        }
                    }
                } else {
                    console.log('⚠️ Nenhum usuário individual, processando áudio combinado...');
                    const oggFile = path.join(config.tempDir, `recording_${sessionId}.ogg`);
                    
                    await audioManager.convertToOpus(pcmFile, oggFile);
                    await apiClient.uploadAudio(sessionId, oggFile, null, sessionStartTime);
                    audioManager.cleanup([pcmFile, oggFile]);
                }

                message.channel.send(`✅ Sessão **${sessionId}** enviada para processamento!`);
            } catch (err) {
                console.error('❌ Erro ao finalizar sessão:', err);
                message.channel.send(`❌ Ocorreu um erro ao processar o áudio.`);
            } finally {
                audioManager.cleanup([pcmFile]);
                connection.destroy();
            }
        }, 2000);
    }
}

module.exports = DiscordBot;
