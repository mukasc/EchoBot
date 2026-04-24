"""Demo and utility routers."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models.character import CharacterMapping, CharacterMappingCreate
from app.models.session import (
    Session,
    SessionStatus,
    TechnicalDiaryEntry,
    TranscriptionSegment,
    MessageType,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["utility"])


def _serialize(obj):
    from datetime import datetime
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


@router.get("/")
async def root():
    """Health check / root endpoint."""
    return {"message": "RPG Cronista API", "version": "1.0.0"}


@router.post("/demo/create-sample-session")
async def create_sample_session(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Create a sample session with demo data."""
    sample_segments = [
        TranscriptionSegment(
            speaker_discord_id="user_001",
            speaker_character_name="Valerius, o Paladino",
            text="Eu avanço em direção ao orc, erguendo meu escudo sagrado!",
            message_type=MessageType.IC,
            timestamp_start=0,
            timestamp_end=5,
        ),
        TranscriptionSegment(
            speaker_discord_id="dm_001",
            speaker_character_name="Mestre",
            text="O orc rosna e levanta sua machadinha enferrujada. O que você faz?",
            message_type=MessageType.NARRATION,
            timestamp_start=5,
            timestamp_end=10,
        ),
        TranscriptionSegment(
            speaker_discord_id="user_002",
            speaker_character_name="Lyra, a Arqueira",
            text="Espera, quantos orcs são mesmo? Deixa eu ver a ficha...",
            message_type=MessageType.OOC,
            timestamp_start=10,
            timestamp_end=15,
        ),
        TranscriptionSegment(
            speaker_discord_id="user_002",
            speaker_character_name="Lyra, a Arqueira",
            text="Preparo uma flecha envenenada e miro na articulação do ombro do orc!",
            message_type=MessageType.IC,
            timestamp_start=15,
            timestamp_end=20,
        ),
    ]

    sample_diary = [
        TechnicalDiaryEntry(category="npc", name="Orc Guerreiro", description="Hostil, portando machadinha"),
        TechnicalDiaryEntry(category="location", name="Floresta Sombria", description="Território orc"),
        TechnicalDiaryEntry(category="item", name="Machadinha Enferrujada", description="Arma do orc"),
        TechnicalDiaryEntry(category="xp", name="50 XP", description="Por derrotar o orc"),
    ]

    session = Session(
        name="Sessão 01 - A Emboscada na Floresta",
        game_system="D&D 5e",
        status=SessionStatus.AWAITING_REVIEW,
        duration_minutes=180,
        transcription_segments=[_serialize(s.model_dump()) for s in sample_segments],
        technical_diary=[_serialize(d.model_dump()) for d in sample_diary],
        review_script=(
            "Valerius avançou corajosamente em direção ao orc, erguendo seu escudo sagrado "
            "que brilhava com luz divina. O orc, uma criatura brutal de pele verde-musgo, "
            "rosnou ameaçadoramente e levantou sua machadinha enferrujada. Lyra, posicionada "
            "entre as árvores, preparou silenciosamente uma flecha envenenada, mirando "
            "precisamente na articulação do ombro do inimigo..."
        ),
        raw_transcription="Transcrição bruta da sessão de RPG...",
        cover_image_url=(
            "https://images.pexels.com/photos/3649095/pexels-photo-3649095.jpeg"
            "?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        ),
    )

    await db.sessions.insert_one(_serialize(session.model_dump()))

    # Create sample character mappings if they don't exist
    sample_mappings = [
        CharacterMappingCreate(
            discord_user_id="user_001",
            discord_username="Murillo#1234",
            character_name="Valerius, o Paladino",
            character_role="Tanque/Curador",
        ),
        CharacterMappingCreate(
            discord_user_id="user_002",
            discord_username="Julia#5678",
            character_name="Lyra, a Arqueira",
            character_role="DPS/Explorador",
        ),
        CharacterMappingCreate(
            discord_user_id="dm_001",
            discord_username="GameMaster#0001",
            character_name="Mestre",
            character_role="Dungeon Master",
        ),
    ]

    for m in sample_mappings:
        existing = await db.character_mappings.find_one(
            {"discord_user_id": m.discord_user_id}, {"_id": 0}
        )
        if not existing:
            mapping = CharacterMapping(**m.model_dump())
            await db.character_mappings.insert_one(_serialize(mapping.model_dump()))

    return {"message": "Sample session created", "session_id": session.id}


@router.get("/bot-setup-instructions")
async def get_bot_setup_instructions():
    """Return instructions for setting up the Discord bot."""
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
                    "Aceite os termos e crie",
                ],
            },
            {
                "step": 2,
                "title": "Configurar o Bot",
                "instructions": [
                    "No menu lateral, clique em 'Bot'",
                    "Clique em 'Add Bot'",
                    "Confirme a criação",
                    "Copie o TOKEN (guarde em segredo!)",
                    "Ative 'Message Content Intent' e 'Server Members Intent'",
                ],
            },
            {
                "step": 3,
                "title": "Permissões de Voz",
                "instructions": [
                    "O bot precisa das permissões:",
                    "- Connect (conectar em canais de voz)",
                    "- Speak (falar - mesmo que não use)",
                    "- Use Voice Activity (detectar atividade de voz)",
                ],
            },
            {
                "step": 4,
                "title": "Convidar para o Servidor",
                "instructions": [
                    "Vá em 'OAuth2' > 'URL Generator'",
                    "Selecione 'bot' em Scopes",
                    "Selecione as permissões necessárias",
                    "Copie a URL gerada e abra no navegador",
                    "Selecione seu servidor e autorize",
                ],
            },
            {
                "step": 5,
                "title": "Configurar Token no Sistema",
                "instructions": [
                    "Após obter o token, adicione-o nos campos de configuração acima",
                    "Clique em 'Salvar Configuração' para validar",
                    "O bot agora poderá ser usado para capturas futuras",
                ],
            },
        ],
        "note": (
            "A captura de áudio do Discord requer uma implementação separada com "
            "discord.py[voice]. Por enquanto, você pode fazer upload manual de "
            "arquivos de áudio gravados."
        ),
    }
