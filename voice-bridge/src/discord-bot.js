const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const { PassThrough } = require('stream');
const path = require('path');
const config = require('./config');
const audioManager = require('./audio-manager');
const apiClient = require('./api-client');
const { t, getLocale } = require('./i18n');

class DiscordBot {
    constructor(client) {
        this.client = client;
        this.activeSessions = new Map();
        this.setupEvents();
    }

    setupEvents() {
        this.client.on(Events.ClientReady, () => {
            console.log(t('bot.online', 'en-US', { tag: this.client.user.tag }));
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            const locale = getLocale(interaction);

            // Handle Slash Commands
            if (interaction.isChatInputCommand()) {
                const command = this.client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction, this);
                } catch (error) {
                    console.error(error);
                    const reply = { content: t('error.generic', locale), ephemeral: true };
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
        const locale = getLocale(interaction);

        if (this.activeSessions.has(guildId)) {
            return interaction.reply({ 
                content: t('join.already_recording', locale), 
                ephemeral: true 
            });
        }

        const voiceChannel = interaction.member?.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ 
                content: t('join.must_be_in_voice', locale), 
                ephemeral: true 
            });
        }

        // Defer response as joining and fetching session might take time
        await interaction.deferReply();

        try {
            const isStandalone = !sessionId;
            let resolvedSessionId = sessionId;
            let chunkDuration = 20;

            if (isStandalone) {
                const now = new Date();
                const pad = (num) => String(num).padStart(2, '0');
                const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
                resolvedSessionId = `podcast_${dateStr}_${timeStr}`;
                chunkDuration = interaction.options.getInteger('duracao_chunk') || 20;
                
                const podcastDir = path.join(config.recordingsDir, resolvedSessionId);
                if (!fs.existsSync(podcastDir)) {
                    fs.mkdirSync(podcastDir, { recursive: true });
                }
            } else {
                const sessionData = await apiClient.getSession(sessionId);
                chunkDuration = sessionData?.chunk_duration_minutes || 20;
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });

            connection.on(VoiceConnectionStatus.Ready, async () => {
                console.log(`✅ Connection established. Session: ${resolvedSessionId} (Standalone: ${isStandalone})`);

                const successDesc = isStandalone 
                    ? t('join.success_desc_standalone', locale)
                    : t('join.success_desc', locale, { sessionId: resolvedSessionId });
                
                const sessionIdFieldLabel = isStandalone 
                    ? t('join.field_session_id_standalone', locale)
                    : t('join.field_session_id', locale);

                const embed = new EmbedBuilder()
                    .setTitle(t('join.success_title', locale))
                    .setDescription(successDesc)
                    .setColor(Colors.Green)
                    .addFields(
                        { name: sessionIdFieldLabel, value: resolvedSessionId, inline: true },
                        { name: t('join.field_channel', locale), value: voiceChannel.name, inline: true },
                        { name: t('join.field_rotation', locale), value: t('join.field_rotation_value', locale, { minutes: chunkDuration }), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'EchoBot Voice Bridge', iconURL: this.client.user.displayAvatarURL() });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('stop_session')
                            .setLabel(t('join.btn_stop', locale))
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🛑')
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });

                const sessionStartTime = new Date().toISOString();
                const pcmFile = path.join(config.tempDir, `temp_${resolvedSessionId}.pcm`);
                const outStream = fs.createWriteStream(pcmFile);
                const centralStream = new PassThrough();
                centralStream.pipe(outStream);

                const receiver = connection.receiver;
                const subscribedUsers = new Map();

                receiver.speaking.on('start', (userId) => {
                    audioManager.subscribeUser(receiver, userId, resolvedSessionId, subscribedUsers);
                });

                const session = {
                    sessionId: resolvedSessionId,
                    isStandalone,
                    sessionStartTime,
                    pcmFile,
                    outStream,
                    centralStream,
                    connection,
                    subscribedUsers,
                    chunkIndex: 1,
                    chunkDuration,
                    rotationTimer: null,
                    interactionChannelId: interaction.channelId,
                    locale // Store locale for non-interaction events
                };

                this.activeSessions.set(guildId, session);
                this.startRotationTimer(guildId);
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log(t('bot.disconnected', locale));
                if (this.activeSessions.has(guildId)) {
                    this.handleLeave(null, guildId);
                }
            });

        } catch (err) {
            console.error('❌ Error starting session:', err);
            await interaction.editReply({ content: t('api.error_session', locale, { message: err.message }) });
        }
    }

    startRotationTimer(guildId) {
        const session = this.activeSessions.get(guildId);
        if (!session) return;

        const intervalMs = session.chunkDuration * 60 * 1000;
        
        session.rotationTimer = setInterval(async () => {
            const currentSession = this.activeSessions.get(guildId);
            if (!currentSession) return;

            console.log(t('rotation.log', 'en-US', { index: currentSession.chunkIndex, sessionId: currentSession.sessionId }));
            const filesToProcess = [];

            // Rotates individual users
            for (const [userId, userData] of currentSession.subscribedUsers) {
                const rotated = audioManager.rotateUserStream(userId, currentSession.sessionId, currentSession.subscribedUsers, currentSession.chunkIndex + 1);
                if (rotated) {
                    filesToProcess.push({ file: rotated.oldFile, stream: rotated.oldStream, userId });
                }
            }

            // Rotates central stream
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

            // Processes previous chunk in background
            this.processChunk(
                currentSession.sessionId, 
                filesToProcess, 
                currentSession.sessionStartTime, 
                chunkOffset, 
                currentSession.isStandalone,
                guildId
            );

        }, intervalMs);
    }

    async processChunk(sessionId, filesToProcess, sessionStartTime, chunkOffset = 0, isStandalone = false, guildId = null) {
        for (const item of filesToProcess) {
            item.stream.on('finish', async () => {
                const timestamp = new Date().getTime();
                const suffix = item.userId ? `user_${item.userId}` : 'central';
                const oggFile = path.join(config.tempDir, `chunk_${sessionId}_${suffix}_${timestamp}.ogg`);
                
                try {
                    await new Promise(r => setTimeout(r, 500));

                    if (!fs.existsSync(item.file) || fs.statSync(item.file).size < 100) {
                        console.log(t('rotation.skip_empty', 'en-US', { file: item.file }));
                        audioManager.cleanup([item.file]);
                        return;
                    }

                    let speakerName = 'central';
                    if (item.userId && guildId) {
                        try {
                            const guild = this.client.guilds.cache.get(guildId);
                            const member = await guild?.members.fetch(item.userId);
                            speakerName = member ? member.displayName : item.userId;
                        } catch (e) {
                            speakerName = item.userId;
                        }
                    } else if (item.userId) {
                        speakerName = item.userId;
                    }

                    const metadata = {
                        speaker_id: item.userId || 'central',
                        speaker_name: speakerName,
                        real_start_time: new Date(new Date(sessionStartTime).getTime() + chunkOffset * 1000).toISOString(),
                        chunk_offset: chunkOffset,
                        session_id: sessionId,
                        mode: isStandalone ? 'standalone' : 'normal'
                    };

                    await audioManager.convertToOpus(item.file, oggFile, metadata);
                    
                    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
                        if (isStandalone) {
                            const safeSpeaker = speakerName.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const oggFileName = `chunk_${chunkOffset}_${safeSpeaker}.ogg`;
                            const finalOggPath = path.join(config.recordingsDir, sessionId, oggFileName);
                            
                            fs.renameSync(oggFile, finalOggPath);
                            console.log(`💾 [Standalone] Saved chunk to ${finalOggPath}`);

                            const metadataPath = path.join(config.recordingsDir, sessionId, 'metadata.json');
                            let catalog = { podcastId: sessionId, startTime: sessionStartTime, chunks: [] };
                            if (fs.existsSync(metadataPath)) {
                                try {
                                    catalog = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                                } catch (e) {}
                            }
                            catalog.chunks.push({
                                fileName: oggFileName,
                                speakerId: item.userId || 'central',
                                speakerName: speakerName,
                                chunkOffset: chunkOffset,
                                realStartTime: metadata.real_start_time
                            });
                            fs.writeFileSync(metadataPath, JSON.stringify(catalog, null, 2), 'utf8');
                        } else {
                            await apiClient.uploadAudio(sessionId, oggFile, item.userId, sessionStartTime, chunkOffset);
                        }
                    }
                    
                    audioManager.cleanup([item.file, oggFile]);
                } catch (err) {
                    console.error(t('rotation.error', 'en-US', { file: item.file, message: err.message }));
                    audioManager.cleanup([item.file]);
                }
            });

            item.stream.end();
        }
    }

    async handleLeave(interaction, guildIdFromEvent = null) {
        const guildId = interaction ? interaction.guildId : guildIdFromEvent;
        const session = this.activeSessions.get(guildId);
        const interactionLocale = interaction ? getLocale(interaction) : null;
        
        if (!session) {
            if (interaction) await interaction.reply({ content: t('leave.no_active_session', interactionLocale || 'en-US'), ephemeral: true });
            return;
        }

        const { sessionId, sessionStartTime, pcmFile, outStream, centralStream, connection, subscribedUsers, rotationTimer, interactionChannelId, locale } = session;
        const finalLocale = interactionLocale || locale || 'en-US';
        
        console.log(`🛑 Finishing session ${sessionId}...`);

        if (rotationTimer) clearInterval(rotationTimer);
        this.activeSessions.delete(guildId);
        
        centralStream.unpipe(outStream);
        centralStream.end();
        outStream.end();

        const lastFiles = [];
        lastFiles.push({ file: pcmFile, stream: outStream, userId: null });
        
        if (subscribedUsers && subscribedUsers.size > 0) {
            for (const [userId, userData] of subscribedUsers) {
                lastFiles.push({ file: userData.file, stream: userData.stream, userId });
            }
        }

        if (interaction && interaction.isButton()) {
            await interaction.update({ 
                content: t('leave.finished_msg', finalLocale, { sessionId }), 
                embeds: [], 
                components: [] 
            });
        } else if (interaction) {
            await interaction.reply(t('leave.finishing_msg', finalLocale, { sessionId }));
        }

        const finalOffset = (session.chunkIndex - 1) * session.chunkDuration * 60;
        this.processChunk(sessionId, lastFiles, sessionStartTime, finalOffset, session.isStandalone, guildId);

        setTimeout(() => {
            if (connection) connection.destroy();
            
            if (!interaction && interactionChannelId) {
                const channel = this.client.channels.cache.get(interactionChannelId);
                if (channel) channel.send(t('leave.success_announcement', finalLocale, { sessionId }));
            }
        }, 1000);
    }
}

module.exports = DiscordBot;
