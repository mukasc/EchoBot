import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import aiohttp
import time
import logging

# SOLUÇÃO PARA WINDOWS 10/11: Usa SelectorEventLoop para estabilizar o UDP
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Logging Config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('EchoBot')

load_dotenv()

# Caminhos do Ambiente (Winget FFmpeg e venv libopus)
FFMPEG_BIN_PATH = r"C:\Users\mukas\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
FFMPEG_EXE = os.path.join(FFMPEG_BIN_PATH, "ffmpeg.exe")
OPUS_DLL_PATH = r"c:\Users\mukas\.gemini\antigravity\scratch\EchoBot\backend\venv\Lib\site-packages\discord\bin\libopus-0.x64.dll"

if FFMPEG_BIN_PATH not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + FFMPEG_BIN_PATH

async def get_bot_token(db):
    """Busca o Token no Banco ou no .env"""
    settings = await db.settings.find_one({"id": "app_settings"})
    if settings and settings.get('discord_bot_token'):
        return settings.get('discord_bot_token')
    return os.environ.get('DISCORD_BOT_TOKEN')

async def finished_callback(sink, session_id, channel):
    """Callback chamado quando a gravação é encerrada"""
    logger.info(f"💾 Processando áudio da sessão: {session_id}")
    try:
        recorded_users = [(user_id, audio) for user_id, audio in sink.audio_data.items()]
        logger.info(f"👥 Usuários com áudio: {len(recorded_users)}")
        
        if not recorded_users:
            if channel: await channel.send(f"⚠️ Gravação encerrada. Nenhum áudio capturado (possível bloqueio UDP).")
            return

        # Pega o áudio do primeiro usuário que falou
        user_id, audio = recorded_users[0]
        file_path = f"temp_session_{session_id}.wav"
        
        audio.file.seek(0)
        with open(file_path, "wb") as f:
            f.write(audio.file.read())
        
        logger.info(f"📤 Subindo para o backend: {file_path}")
        async with aiohttp.ClientSession() as session:
            url = f"http://localhost:8000/api/sessions/{session_id}/upload-audio"
            with open(file_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=f"recorded_{session_id}.wav", content_type='audio/wav')
                async with session.post(url, data=data) as resp:
                    if resp.status == 200:
                        logger.info("🚀 Sucesso no upload!")
                        if channel: await channel.send(f"✅ Áudio da sessão {session_id} enviado com sucesso!")
                    else:
                        logger.error(f"❌ Erro no Backend: {await resp.text()}")
    except Exception as e:
        logger.error(f"💥 Erro no Callback: {e}")
    finally:
        if 'file_path' in locals() and os.path.exists(file_path): 
            try: os.remove(file_path)
            except: pass

async def main():
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'rpbcronista')]
    
    token = await get_bot_token(db)
    if not token:
        logger.error("ERRO: Configure o DISCORD_BOT_TOKEN!")
        return

    intents = discord.Intents.all()
    bot = commands.Bot(command_prefix="!", intents=intents)
    recordings = {}

    @bot.event
    async def on_ready():
        logger.info(f'--- EchoBot Online: {bot.user} ---')
        # Garante que o Opus (Codecs de Áudio) esteja carregado
        try:
            if not discord.opus.is_loaded():
                discord.opus.load_opus(OPUS_DLL_PATH)
        except Exception as e:
            logger.warning(f"Aviso no Opus: {e}")
        logger.info(f'📦 Status Ouvido (Opus): {"ATIVO" if discord.opus.is_loaded() else "NÃO CARREGADO"}')

    @bot.command(aliases=['entrar', 'gravar'])
    async def join(ctx, session_id: str = None):
        """Comando para o bot entrar e começar a gravar"""
        if not session_id:
            await ctx.send("Uso: `!entrar <ID_DA_SESSÃO>`")
            return
        
        if not ctx.author.voice:
            await ctx.send("Você precisa estar num canal de voz!")
            return

        channel = ctx.author.voice.channel
        try:
            vc = ctx.voice_client
            if not vc:
                logger.info(f"🔌 Conectando ao canal: {channel.name}")
                vc = await channel.connect(timeout=60.0, reconnect=True)
                
                # Aguarda o handshake UDP do Discord (20s de paciência)
                logger.info("⏳ Aguardando estabilização da rede...")
                for i in range(40):
                    if vc.is_connected():
                        logger.info(f"✅ Conexão estável em {i*0.5}s!")
                        break
                    await asyncio.sleep(0.5)
            
            if not vc.is_connected():
                await ctx.send("❌ O bot entrou no canal mas a conexão de áudio (UDP) foi bloqueada pelo seu Roteador ou Provedor de Internet. Tente uma VPS ou outra rede (ex: 4G).")
                return

            if ctx.guild.id in recordings:
                await ctx.send("Já estou gravando nesta sala!")
                return
            
            await asyncio.sleep(1) # Delay técnico
            recordings[ctx.guild.id] = session_id
            
            # Inicia o Sink de Áudio (Wave format)
            vc.start_recording(discord.sinks.WaveSink(), finished_callback, session_id, ctx.channel)
            await ctx.send(f"🎙️ **Ouvindo a sessão `{session_id}`...** Quando terminar, digite `!sair`.")
            
        except Exception as e:
            logger.error(f"❌ Erro fatal: {e}")
            await ctx.send(f"❌ Falha ao iniciar: {e}")

    @bot.command(aliases=['sair', 'parar'])
    async def leave(ctx):
        """Comando para o bot finalizar a gravação e sair"""
        vc = ctx.voice_client
        if not vc:
            await ctx.send("Não estou em nenhum canal.")
            return

        if vc.recording:
            vc.stop_recording()
            await asyncio.sleep(2) # Tempo para fechar os buffers
        
        await vc.disconnect()
        if ctx.guild.id in recordings: del recordings[ctx.guild.id]
        await ctx.send("Sessão finalizada. Áudio enviado para processamento.")

    try:
        await bot.start(token)
    except Exception as e:
        logger.error(f"Erro ao iniciar bot: {e}")
    finally:
        await bot.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
