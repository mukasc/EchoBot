const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require('discord.js');
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

        this.client.on(Events.InteractionCreate, async (interaction) => {
            // Handle Slash Commands
            if (interaction.isChatInputCommand()) {
                const command = this.client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction, this);
                } catch (error) {
                    console.error(error);
                    const reply = { content: 'Ocorreu um erro ao executar este comando!', ephemeral: true };
                    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                    else await interaction.reply(reply);
                }
            }
            
            // Handle Buttons
            if (interaction.isButton()) {
                if (interaction.customId === 'stop_session') {
                    await this.handleLeave(interaction);
                }
            }
        });
    }

    async handleJoin(interaction) {
        const guildId = interaction.guildId;
        const sessionId = interaction.options.getString('sessao_id');

        if (this.activeSessions.has(guildId)) {
            return interaction.reply({ 
                content: '⚠️ Já estou gravando nesta sala! Finalize a sessão atual primeiro.', 
                ephemeral: true 
            });
        }

        const voiceChannel = interaction.member?.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ 
                content: '❌ Você precisa entrar num canal de voz primeiro!', 
                ephemeral: true 
            });
        }

        // Defer response as joining and fetching session might take time
        await interaction.deferReply();

        try {
            const sessionData = await apiClient.getSession(sessionId);
            const chunkDuration = sessionData?.chunk_duration_minutes || 20;

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });

            connection.on(VoiceConnectionStatus.Ready, async () => {
                console.log(`✅ Conexão estabelecida para Sessão: ${sessionId}`);

                const embed = new EmbedBuilder()
                    .setTitle('🎙️ Sessão de Gravação Iniciada')
                    .setDescription(`O bot está ouvindo e gravando o áudio deste canal para a sessão **${sessionId}**.`)
                    .setColor(Colors.Green)
                    .addFields(
                        { name: 'Sessão ID', value: sessionId, inline: true },
                        { name: 'Canal', value: voiceChannel.name, inline: true },
                        { name: 'Rotação', value: `${chunkDuration} minutos`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'EchoBot Voice Bridge', iconURL: this.client.user.displayAvatarURL() });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('stop_session')
                            .setLabel('Parar Gravação')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🛑')
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });

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
                    rotationTimer: null,
                    interactionChannelId: interaction.channelId
                };

                this.activeSessions.set(guildId, session);
                this.startRotationTimer(guildId);
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log('🔇 Bot desconectado do canal.');
                if (this.activeSessions.has(guildId)) {
                    this.handleLeave(null, guildId);
                }
            });

        } catch (err) {
            console.error('❌ Erro ao iniciar sessão:', err);
            await interaction.editReply({ content: `❌ Erro ao buscar sessão: ${err.message}` });
        }
    }

    startRotationTimer(guildId) {
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
            
            const chunkOffset = (currentSession.chunkIndex - 1) * currentSession.chunkDuration * 60;
            currentSession.chunkIndex++;
            
            filesToProcess.push({ file: oldPcmFile, stream: oldOutStream, userId: null });

            // Processa o bloco anterior em background (não espera)
            this.processChunk(currentSession.sessionId, filesToProcess, currentSession.sessionStartTime, chunkOffset);

        }, intervalMs);
    }

    async processChunk(sessionId, filesToProcess, sessionStartTime, chunkOffset = 0) {
        for (const item of filesToProcess) {
            // Aguarda o evento 'finish' para ter certeza que o arquivo está pronto
            item.stream.on('finish', async () => {
                const timestamp = new Date().getTime();
                const suffix = item.userId ? `user_${item.userId}` : 'central';
                const oggFile = path.join(config.tempDir, `chunk_${sessionId}_${suffix}_${timestamp}.ogg`);
                
                try {
                    // Pequena pausa para garantir que o SO liberou o arquivo
                    await new Promise(r => setTimeout(r, 500));

                    if (!fs.existsSync(item.file) || fs.statSync(item.file).size < 100) {
                        console.log(`⏩ [Rotation] Pulando arquivo vazio: ${item.file}`);
                        audioManager.cleanup([item.file]);
                        return;
                    }

                    await audioManager.convertToOpus(item.file, oggFile);
                    
                    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
                        await apiClient.uploadAudio(sessionId, oggFile, item.userId, sessionStartTime, chunkOffset);
                    }
                    
                    audioManager.cleanup([item.file, oggFile]);
                } catch (err) {
                    console.error(`❌ [Rotation] Erro ao processar bloco ${item.file}:`, err.message);
                    audioManager.cleanup([item.file]);
                }
            });

            // Garante que o stream seja fechado
            item.stream.end();
        }
    }

    async handleLeave(interaction, guildIdFromEvent = null) {
        const guildId = interaction ? interaction.guildId : guildIdFromEvent;
        const session = this.activeSessions.get(guildId);
        if (!session) {
            if (interaction) await interaction.reply({ content: 'Não há nenhuma sessão ativa.', ephemeral: true });
            return;
        }

        const { sessionId, sessionStartTime, pcmFile, outStream, centralStream, connection, subscribedUsers, rotationTimer, interactionChannelId } = session;
        console.log(`🛑 Finalizando sessão ${sessionId}...`);

        if (rotationTimer) clearInterval(rotationTimer);
        this.activeSessions.delete(guildId);
        
        // Finaliza streams
        centralStream.unpipe(outStream);
        centralStream.end();
        outStream.end();

        // Processa o último bloco
        const lastFiles = [];
        lastFiles.push({ file: pcmFile, stream: outStream, userId: null });
        
        if (subscribedUsers && subscribedUsers.size > 0) {
            for (const [userId, userData] of subscribedUsers) {
                lastFiles.push({ file: userData.file, stream: userData.stream, userId });
            }
        }

        // Se veio de um botão, atualizamos a mensagem original
        if (interaction && interaction.isButton()) {
            await interaction.update({ 
                content: `🛑 Gravação da sessão **${sessionId}** finalizada.`, 
                embeds: [], 
                components: [] 
            });
        } else if (interaction) {
            await interaction.reply(`🛑 Finalizando gravação da sessão **${sessionId}**...`);
        }

        // Processa os últimos arquivos
        const finalOffset = (session.chunkIndex - 1) * session.chunkDuration * 60;
        this.processChunk(sessionId, lastFiles, sessionStartTime, finalOffset);

        // Desconecta após um breve momento
        setTimeout(() => {
            if (connection) connection.destroy();
            
            // Se não foi uma interação, tenta avisar no canal
            if (!interaction && interactionChannelId) {
                const channel = this.client.channels.cache.get(interactionChannelId);
                if (channel) channel.send(`✅ Sessão **${sessionId}** finalizada com sucesso.`);
            }
        }, 1000);
    }
}

module.exports = DiscordBot;
