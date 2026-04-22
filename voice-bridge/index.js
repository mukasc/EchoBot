const { Client, GatewayIntentBits, Events } = require('discord.js');
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    EndBehaviorType
} = require('@discordjs/voice');
const { createWriteStream } = require('fs');
const prism = require('prism-media');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { exec } = require('child_process');
const { PassThrough } = require('stream');
require('dotenv').config({ path: '../backend/.env' });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Hardcoded FFmpeg path
const FFMPEG_EXE = `"C:\\Users\\mukas\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe"`;

const activeSessions = new Map();

client.on(Events.ClientReady, () => {
    console.log(`--- [NODE VOICE BRIDGE v3] Online: ${client.user.tag} ---`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!entrar')) {
        // Verifica se já está gravando
        if (activeSessions.has(message.guild.id)) {
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
            console.log(`✅ Conexão v3 ESTABILIZADA: ${sessionId}`);
            message.reply(`🎙️ **[Ponte v3] Gravando TUDO com proteção contra falhas.**`);
            
            // Registrar hora de início da sessão
            const sessionStartTime = new Date().toISOString();
            console.log(`🕐 Início da sessão: ${sessionStartTime}`);
            
            const pcmFile = `temp_${sessionId}.pcm`;
            const outStream = createWriteStream(pcmFile);
            const centralStream = new PassThrough();
            centralStream.pipe(outStream);

            const receiver = connection.receiver;
            const subscribedUsers = new Map();

            receiver.speaking.on('start', (userId) => {
                if (subscribedUsers.has(userId)) return;
                
                const userPcmFile = `temp_${sessionId}_user_${userId}.pcm`;
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
                    console.warn(`⚠️ [Aviso] Pacote malformado de ${userId}: ${err.message}`);
                });

                opusStream.pipe(decoder).pipe(userOutStream, { end: false });
            });

            activeSessions.set(message.guild.id, {
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
            console.log('🔇 Desconectado do canal de voz.');
        });

        connection.on('error', (err) => {
            console.error('❌ Erro na conexão de voz:', err);
        });
    }

    if (message.content.startsWith('!sair')) {
        const session = activeSessions.get(message.guild.id);
        if (!session) return message.reply('Não estou gravando.');

        const { sessionId, sessionStartTime, pcmFile, outStream, centralStream, connection, subscribedUsers } = session;
        console.log(`🛑 Finalizando sessão ${sessionId}...`);
        
        activeSessions.delete(message.guild.id);
        centralStream.unpipe(outStream);
        centralStream.end();
        outStream.end();

        setTimeout(async () => {
            const processUserAudio = async (userId, userData) => {
                const { file: userPcmFile, stream: userOutStream } = userData;
                userOutStream.end();
                
                const wavFile = `recording_${sessionId}_user_${userId}.wav`;
                const ffmpegCmd = `${FFMPEG_EXE} -y -f s16le -ar 48000 -ac 2 -i "${userPcmFile}" "${wavFile}"`;
                
                return new Promise((resolve, reject) => {
                    console.log(`🎬 Convertendo para WAV (usuário ${userId})...`);
                    exec(ffmpegCmd, async (error) => {
                        if (error) {
                            console.error('❌ Erro FFmpeg:', error);
                            resolve();
                            return;
                        }

                        try {
                            const form = new FormData();
                            form.append('file', fs.createReadStream(wavFile), {
                                filename: wavFile,
                                contentType: 'audio/wav',
                            });
                            form.append('speaker_id', userId.toString());
                            form.append('session_start_time', sessionStartTime);

                            console.log(`📤 Enviando áudio do usuário ${userId} para o Backend...`);
                            const response = await axios.post(`http://localhost:8000/api/sessions/${sessionId}/upload-audio`, form, {
                                headers: form.getHeaders(),
                            });

                            if (response.status === 200) {
                                console.log(`✅ Áudio do usuário ${userId} enviado com sucesso!`);
                            }
                            
                            if (fs.existsSync(userPcmFile)) fs.unlinkSync(userPcmFile);
                            if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile);
                            resolve();
                        } catch (err) {
                            console.error(`❌ Erro no Upload (${userId}):`, err.message);
                            resolve();
                        }
                    });
                });
            };

            // Processa cada usuário separadamente
            if (subscribedUsers && subscribedUsers.size > 0) {
                console.log(`👥 Processando áudio de ${subscribedUsers.size} usuário(s)...`);
                for (const [userId, userData] of subscribedUsers) {
                    await processUserAudio(userId, userData);
                }
            } else {
                // Fallback: processa áudio combinado
                console.log('⚠️ Nenhum usuário individual detectado, processando áudio combinado...');
                const wavFile = `recording_${sessionId}.wav`;
                const ffmpegCmd = `${FFMPEG_EXE} -y -f s16le -ar 48000 -ac 2 -i "${pcmFile}" "${wavFile}"`;
                
                exec(ffmpegCmd, async (error) => {
                    if (error) {
                        console.error('❌ Erro FFmpeg:', error);
                        return;
                    }

                    const form = new FormData();
                    form.append('file', fs.createReadStream(wavFile), {
                        filename: wavFile,
                        contentType: 'audio/wav',
                    });

                    console.log(`📤 Enviando áudio combinado para o Backend...`);
                    try {
                        const response = await axios.post(`http://localhost:8000/api/sessions/${sessionId}/upload-audio`, form, {
                            headers: form.getHeaders(),
                        });
                        if (response.status === 200) {
                            message.channel.send(`✅ Áudio da sessão ${sessionId} processado com sucesso!`);
                        }
                    } catch (err) {
                        console.error('❌ Erro no Upload:', err.message);
                    }
                    
                    if (fs.existsSync(pcmFile)) fs.unlinkSync(pcmFile);
                    if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile);
                });
                return;
            }

            // Limpa arquivos gerais
            if (fs.existsSync(pcmFile)) fs.unlinkSync(pcmFile);
            message.channel.send(`✅ Áudio de ${subscribedUsers?.size || 0} participante(s) enviado(s)!`);
            
            connection.destroy();
        }, 2000);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
