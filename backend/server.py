from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="RPG Cronista API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ ENUMS ============
class SessionStatus(str, Enum):
    RECORDING = "recording"
    TRANSCRIBING = "transcribing"
    PROCESSING = "processing"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"

class MessageType(str, Enum):
    IC = "ic"  # In-Character
    OOC = "ooc"  # Out-of-Character
    NARRATION = "narration"

class LLMProvider(str, Enum):
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

# ============ MODELS ============
class CharacterMapping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_user_id: str
    discord_username: str
    character_name: str
    character_role: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CharacterMappingCreate(BaseModel):
    discord_user_id: str
    discord_username: str
    character_name: str
    character_role: Optional[str] = None
    avatar_url: Optional[str] = None

class TranscriptionSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    speaker_discord_id: str
    speaker_character_name: Optional[str] = None
    text: str
    message_type: MessageType = MessageType.IC
    timestamp_start: float
    timestamp_end: float
    confidence: float = 1.0
    uncertain_terms: List[str] = []

class TechnicalDiaryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # npc, location, item, xp, event
    name: str
    description: Optional[str] = None
    timestamp: Optional[str] = None

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    game_system: str = "D&D 5e"
    status: SessionStatus = SessionStatus.AWAITING_REVIEW
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_minutes: Optional[int] = None
    transcription_segments: List[TranscriptionSegment] = []
    technical_diary: List[TechnicalDiaryEntry] = []
    review_script: str = ""
    raw_transcription: str = ""
    cover_image_url: Optional[str] = None

class SessionCreate(BaseModel):
    name: str
    game_system: str = "D&D 5e"
    cover_image_url: Optional[str] = None

class SessionUpdate(BaseModel):
    name: Optional[str] = None
    game_system: Optional[str] = None
    status: Optional[SessionStatus] = None
    review_script: Optional[str] = None
    technical_diary: Optional[List[TechnicalDiaryEntry]] = None
    cover_image_url: Optional[str] = None

class TranscriptionSegmentUpdate(BaseModel):
    text: Optional[str] = None
    message_type: Optional[MessageType] = None
    speaker_character_name: Optional[str] = None

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    llm_provider: LLMProvider = LLMProvider.GEMINI
    llm_model: str = "gemini-3-flash-preview"
    custom_api_key: Optional[str] = None
    use_emergent_key: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppSettingsUpdate(BaseModel):
    llm_provider: Optional[LLMProvider] = None
    llm_model: Optional[str] = None
    custom_api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None

# ============ HELPER FUNCTIONS ============
def serialize_datetime(obj):
    """Convert datetime objects to ISO strings for MongoDB"""
    if isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(obj, fields=['created_at', 'updated_at']):
    """Convert ISO strings back to datetime objects"""
    if isinstance(obj, dict):
        for field in fields:
            if field in obj and isinstance(obj[field], str):
                try:
                    obj[field] = datetime.fromisoformat(obj[field])
                except ValueError:
                    pass
        return obj
    return obj

async def get_settings() -> AppSettings:
    """Get app settings from database or return defaults"""
    settings_doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if settings_doc:
        return AppSettings(**deserialize_datetime(settings_doc))
    return AppSettings()

async def get_llm_api_key() -> str:
    """Get the appropriate LLM API key based on settings"""
    settings = await get_settings()
    if settings.use_emergent_key:
        return os.environ.get('EMERGENT_LLM_KEY', '')
    return settings.custom_api_key or ''

async def apply_character_mapping(discord_user_id: str) -> Optional[str]:
    """Get character name for a Discord user ID"""
    mapping = await db.character_mappings.find_one(
        {"discord_user_id": discord_user_id}, 
        {"_id": 0}
    )
    if mapping:
        return mapping.get("character_name")
    return None

# ============ API ROUTES ============

# Root
@api_router.get("/")
async def root():
    return {"message": "RPG Cronista API", "version": "1.0.0"}

# ============ SESSIONS ============
@api_router.get("/sessions", response_model=List[Session])
async def get_sessions():
    sessions = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Session(**deserialize_datetime(s)) for s in sessions]

@api_router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return Session(**deserialize_datetime(session))

@api_router.post("/sessions", response_model=Session)
async def create_session(input: SessionCreate):
    session = Session(**input.model_dump())
    doc = serialize_datetime(session.model_dump())
    await db.sessions.insert_one(doc)
    return session

@api_router.put("/sessions/{session_id}", response_model=Session)
async def update_session(session_id: str, input: SessionUpdate):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "technical_diary" in update_data:
        update_data["technical_diary"] = [
            serialize_datetime(entry.model_dump() if hasattr(entry, 'model_dump') else entry) 
            for entry in update_data["technical_diary"]
        ]
    
    await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    
    updated = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    return Session(**deserialize_datetime(updated))

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

# ============ TRANSCRIPTION SEGMENTS ============
@api_router.put("/sessions/{session_id}/segments/{segment_id}")
async def update_segment(session_id: str, segment_id: str, input: TranscriptionSegmentUpdate):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    segments = session.get("transcription_segments", [])
    updated = False
    for i, seg in enumerate(segments):
        if seg.get("id") == segment_id:
            if input.text is not None:
                segments[i]["text"] = input.text
            if input.message_type is not None:
                segments[i]["message_type"] = input.message_type
            if input.speaker_character_name is not None:
                segments[i]["speaker_character_name"] = input.speaker_character_name
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    await db.sessions.update_one(
        {"id": session_id}, 
        {"$set": {"transcription_segments": segments, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Segment updated"}

# ============ CHARACTER MAPPINGS ============
@api_router.get("/character-mappings", response_model=List[CharacterMapping])
async def get_character_mappings():
    mappings = await db.character_mappings.find({}, {"_id": 0}).to_list(100)
    return [CharacterMapping(**deserialize_datetime(m)) for m in mappings]

@api_router.post("/character-mappings", response_model=CharacterMapping)
async def create_character_mapping(input: CharacterMappingCreate):
    # Check if mapping already exists for this Discord user
    existing = await db.character_mappings.find_one(
        {"discord_user_id": input.discord_user_id}, {"_id": 0}
    )
    if existing:
        # Update existing mapping
        update_data = input.model_dump()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.character_mappings.update_one(
            {"discord_user_id": input.discord_user_id},
            {"$set": update_data}
        )
        updated = await db.character_mappings.find_one(
            {"discord_user_id": input.discord_user_id}, {"_id": 0}
        )
        return CharacterMapping(**deserialize_datetime(updated))
    
    mapping = CharacterMapping(**input.model_dump())
    doc = serialize_datetime(mapping.model_dump())
    await db.character_mappings.insert_one(doc)
    return mapping

@api_router.delete("/character-mappings/{mapping_id}")
async def delete_character_mapping(mapping_id: str):
    result = await db.character_mappings.delete_one({"id": mapping_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"message": "Mapping deleted"}

# ============ SETTINGS ============
@api_router.get("/settings", response_model=AppSettings)
async def get_app_settings():
    return await get_settings()

@api_router.put("/settings", response_model=AppSettings)
async def update_app_settings(input: AppSettingsUpdate):
    settings = await get_settings()
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_settings()

# ============ AUDIO PROCESSING ============
@api_router.post("/sessions/{session_id}/upload-audio")
async def upload_audio(session_id: str, file: UploadFile = File(...)):
    """Upload audio file for transcription"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate file type
    allowed_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a']
    if file.content_type not in allowed_types and not file.filename.endswith(('.mp3', '.wav', '.webm', '.mp4', '.m4a')):
        raise HTTPException(status_code=400, detail="Invalid audio file type")
    
    # Update session status
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": SessionStatus.TRANSCRIBING.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    try:
        # Read audio file
        audio_content = await file.read()
        
        # Get API key
        api_key = await get_llm_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="No API key configured")
        
        # Transcribe using Whisper
        from emergentintegrations.llm.openai import OpenAISpeechToText
        import io
        
        stt = OpenAISpeechToText(api_key=api_key)
        
        audio_file = io.BytesIO(audio_content)
        audio_file.name = file.filename
        
        response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            language="pt",
            timestamp_granularities=["segment"]
        )
        
        # Process transcription
        raw_text = response.text
        segments = []
        
        if hasattr(response, 'segments'):
            for seg in response.segments:
                segment = TranscriptionSegment(
                    speaker_discord_id="unknown",
                    text=seg.text.strip(),
                    timestamp_start=seg.start,
                    timestamp_end=seg.end,
                    message_type=MessageType.IC
                )
                segments.append(serialize_datetime(segment.model_dump()))
        else:
            # Single segment for entire transcription
            segment = TranscriptionSegment(
                speaker_discord_id="unknown",
                text=raw_text,
                timestamp_start=0,
                timestamp_end=0,
                message_type=MessageType.IC
            )
            segments.append(serialize_datetime(segment.model_dump()))
        
        # Update session with transcription
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {
                "raw_transcription": raw_text,
                "transcription_segments": segments,
                "status": SessionStatus.PROCESSING.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Audio transcribed successfully", "segments_count": len(segments)}
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"status": SessionStatus.AWAITING_REVIEW.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# ============ AI PROCESSING ============
@api_router.post("/sessions/{session_id}/process")
async def process_session(session_id: str):
    """Process transcription with AI to generate technical diary and review script"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    raw_transcription = session.get("raw_transcription", "")
    if not raw_transcription:
        raise HTTPException(status_code=400, detail="No transcription available")
    
    # Get character mappings
    mappings = await db.character_mappings.find({}, {"_id": 0}).to_list(100)
    mapping_context = "\n".join([
        f"- {m['discord_username']} -> {m['character_name']}" 
        for m in mappings
    ]) if mappings else "Nenhum mapeamento definido"
    
    try:
        api_key = await get_llm_api_key()
        current_settings = await get_settings()
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"process-{session_id}",
            system_message="""Você é um cronista de RPG especializado. Sua tarefa é analisar transcrições de sessões de RPG e:

1. IDENTIFICAR e FILTRAR:
   - IC (In-Character): Falas de personagens, narração do mestre, descrições de ações
   - OOC (Out-of-Character): Discussões sobre regras, piadas fora do jogo, conversas pessoais

2. GERAR DIÁRIO TÉCNICO:
   - NPCs encontrados
   - Locais visitados
   - Itens obtidos/perdidos
   - XP ou recompensas
   - Eventos importantes

3. GERAR ROTEIRO DE REVISÃO:
   - Texto em prosa clara e factual
   - Substituir nomes de jogadores por nomes de personagens
   - Manter a narrativa coerente
   - Marcar termos incertos como [Termo Incerto: fonética]
   - Evitar caracteres especiais para TTS

Responda SEMPRE em JSON com o formato:
{
  "technical_diary": [
    {"category": "npc|location|item|xp|event", "name": "Nome", "description": "Descrição opcional"}
  ],
  "review_script": "Texto do roteiro de revisão...",
  "filtered_segments": [
    {"text": "texto", "type": "ic|ooc", "character": "Nome do Personagem ou null"}
  ]
}"""
        )
        
        # Configure model based on settings
        if current_settings.llm_provider == LLMProvider.GEMINI:
            chat.with_model("gemini", current_settings.llm_model)
        elif current_settings.llm_provider == LLMProvider.OPENAI:
            chat.with_model("openai", current_settings.llm_model)
        elif current_settings.llm_provider == LLMProvider.ANTHROPIC:
            chat.with_model("anthropic", current_settings.llm_model)
        
        prompt = f"""Analise esta transcrição de sessão de RPG ({session.get('game_system', 'D&D 5e')}):

MAPEAMENTO DE JOGADORES:
{mapping_context}

TRANSCRIÇÃO:
{raw_transcription}

Processe e retorne o JSON estruturado."""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse AI response
        import json
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            ai_result = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # If parsing fails, create basic structure
            ai_result = {
                "technical_diary": [],
                "review_script": raw_transcription,
                "filtered_segments": []
            }
        
        # Build technical diary entries
        diary_entries = []
        for entry in ai_result.get("technical_diary", []):
            diary_entry = TechnicalDiaryEntry(
                category=entry.get("category", "event"),
                name=entry.get("name", ""),
                description=entry.get("description")
            )
            diary_entries.append(serialize_datetime(diary_entry.model_dump()))
        
        # Update segments with IC/OOC classification
        segments = session.get("transcription_segments", [])
        filtered = ai_result.get("filtered_segments", [])
        
        for i, seg in enumerate(segments):
            if i < len(filtered):
                seg["message_type"] = filtered[i].get("type", "ic")
                if filtered[i].get("character"):
                    seg["speaker_character_name"] = filtered[i]["character"]
        
        # Update session
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {
                "technical_diary": diary_entries,
                "review_script": ai_result.get("review_script", raw_transcription),
                "transcription_segments": segments,
                "status": SessionStatus.AWAITING_REVIEW.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Session processed successfully", "diary_entries": len(diary_entries)}
        
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# ============ DEMO DATA ============
@api_router.post("/demo/create-sample-session")
async def create_sample_session():
    """Create a sample session for demonstration"""
    sample_segments = [
        TranscriptionSegment(
            speaker_discord_id="user_001",
            speaker_character_name="Valerius, o Paladino",
            text="Eu avanço em direção ao orc, erguendo meu escudo sagrado!",
            message_type=MessageType.IC,
            timestamp_start=0,
            timestamp_end=5
        ),
        TranscriptionSegment(
            speaker_discord_id="dm_001",
            speaker_character_name="Mestre",
            text="O orc rosna e levanta sua machadinha enferrujada. O que você faz?",
            message_type=MessageType.NARRATION,
            timestamp_start=5,
            timestamp_end=10
        ),
        TranscriptionSegment(
            speaker_discord_id="user_002",
            speaker_character_name="Lyra, a Arqueira",
            text="Espera, quantos orcs são mesmo? Deixa eu ver a ficha...",
            message_type=MessageType.OOC,
            timestamp_start=10,
            timestamp_end=15
        ),
        TranscriptionSegment(
            speaker_discord_id="user_002",
            speaker_character_name="Lyra, a Arqueira",
            text="Preparo uma flecha envenenada e miro na articulação do ombro do orc!",
            message_type=MessageType.IC,
            timestamp_start=15,
            timestamp_end=20
        )
    ]
    
    sample_diary = [
        TechnicalDiaryEntry(category="npc", name="Orc Guerreiro", description="Hostil, portando machadinha"),
        TechnicalDiaryEntry(category="location", name="Floresta Sombria", description="Território orc"),
        TechnicalDiaryEntry(category="item", name="Machadinha Enferrujada", description="Arma do orc"),
        TechnicalDiaryEntry(category="xp", name="50 XP", description="Por derrotar o orc")
    ]
    
    session = Session(
        name="Sessão 01 - A Emboscada na Floresta",
        game_system="D&D 5e",
        status=SessionStatus.AWAITING_REVIEW,
        duration_minutes=180,
        transcription_segments=[serialize_datetime(s.model_dump()) for s in sample_segments],
        technical_diary=[serialize_datetime(d.model_dump()) for d in sample_diary],
        review_script="Valerius avançou corajosamente em direção ao orc, erguendo seu escudo sagrado que brilhava com luz divina. O orc, uma criatura brutal de pele verde-musgo, rosnou ameaçadoramente e levantou sua machadinha enferrujada. Lyra, posicionada entre as árvores, preparou silenciosamente uma flecha envenenada, mirando precisamente na articulação do ombro do inimigo...",
        raw_transcription="Transcrição bruta da sessão de RPG...",
        cover_image_url="https://images.pexels.com/photos/3649095/pexels-photo-3649095.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
    )
    
    doc = serialize_datetime(session.model_dump())
    await db.sessions.insert_one(doc)
    
    # Create sample character mappings
    mappings = [
        CharacterMappingCreate(
            discord_user_id="user_001",
            discord_username="Murillo#1234",
            character_name="Valerius, o Paladino",
            character_role="Tanque/Curador"
        ),
        CharacterMappingCreate(
            discord_user_id="user_002",
            discord_username="Julia#5678",
            character_name="Lyra, a Arqueira",
            character_role="DPS/Explorador"
        ),
        CharacterMappingCreate(
            discord_user_id="dm_001",
            discord_username="GameMaster#0001",
            character_name="Mestre",
            character_role="Dungeon Master"
        )
    ]
    
    for m in mappings:
        existing = await db.character_mappings.find_one(
            {"discord_user_id": m.discord_user_id}, {"_id": 0}
        )
        if not existing:
            mapping = CharacterMapping(**m.model_dump())
            await db.character_mappings.insert_one(serialize_datetime(mapping.model_dump()))
    
    return {"message": "Sample session created", "session_id": session.id}

# ============ BOT SETUP INSTRUCTIONS ============
@api_router.get("/bot-setup-instructions")
async def get_bot_setup_instructions():
    """Return instructions for setting up the Discord bot"""
    return {
        "title": "Como configurar o Bot de Discord",
        "steps": [
            {
                "step": 1,
                "title": "Criar Aplicação no Discord Developer Portal",
                "instructions": [
                    "Acesse https://discord.com/developers/applications",
                    "Clique em 'New Application'",
                    "Dê um nome (ex: RPG Cronista)",
                    "Aceite os termos e crie"
                ]
            },
            {
                "step": 2,
                "title": "Configurar o Bot",
                "instructions": [
                    "No menu lateral, clique em 'Bot'",
                    "Clique em 'Add Bot'",
                    "Confirme a criação",
                    "Copie o TOKEN (guarde em segredo!)",
                    "Ative 'Message Content Intent' e 'Server Members Intent'"
                ]
            },
            {
                "step": 3,
                "title": "Permissões de Voz",
                "instructions": [
                    "O bot precisa das permissões:",
                    "- Connect (conectar em canais de voz)",
                    "- Speak (falar - mesmo que não use)",
                    "- Use Voice Activity (detectar atividade de voz)"
                ]
            },
            {
                "step": 4,
                "title": "Convidar para o Servidor",
                "instructions": [
                    "Vá em 'OAuth2' > 'URL Generator'",
                    "Selecione 'bot' em Scopes",
                    "Selecione as permissões necessárias",
                    "Copie a URL gerada e abra no navegador",
                    "Selecione seu servidor e autorize"
                ]
            },
            {
                "step": 5,
                "title": "Configurar Token no Sistema",
                "instructions": [
                    "Após obter o token, adicione-o nas configurações",
                    "O token será usado para conectar o bot"
                ]
            }
        ],
        "note": "A captura de áudio do Discord requer uma implementação separada com discord.py[voice]. Por enquanto, você pode fazer upload manual de arquivos de áudio gravados."
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
