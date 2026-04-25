import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone
from app.services.export import ExportService
from app.models.session import Session, TechnicalDiaryEntry

class TestExportService:
    @pytest.fixture
    def service(self):
        return ExportService()

    @pytest.fixture
    def sample_session(self):
        return Session(
            id="test-session-id",
            name="A Vingança do Beholder",
            game_system="D&D 5e",
            created_at=datetime(2026, 4, 25, 15, 0, 0, tzinfo=timezone.utc),
            duration_minutes=120,
            technical_diary=[
                TechnicalDiaryEntry(category="npc", name="Grog", description="Um bárbaro amigável"),
                TechnicalDiaryEntry(category="location", name="Taberna do Dragão", description="Local de descanso"),
                TechnicalDiaryEntry(category="item", name="Espada Longa +1", description="Encontrada no baú"),
                TechnicalDiaryEntry(category="event", name="Ataque dos Goblins", description="Ocorreu no meio da estrada")
            ],
            review_script="O grupo chegou na taberna e foi atacado por goblins."
        )

    def test_generate_markdown_structure(self, service, sample_session):
        """Test that Markdown generation includes all required sections and groupings."""
        md = service.generate_markdown(sample_session)
        
        assert "# A Vingança do Beholder" in md
        assert "**Sistema:** D&D 5e" in md
        assert "## 📜 Diário Técnico" in md
        assert "### 👥 NPCs" in md
        assert "### 📍 Locais" in md
        assert "### ⚔️ Itens & Recompensas" in md
        assert "### 🎭 Eventos Importantes" in md
        assert "- **Grog**: Um bárbaro amigável" in md
        assert "## 📖 Roteiro de Revisão" in md
        assert "O grupo chegou na taberna" in md
        assert "Gerado automaticamente por EchoBot" in md

    def test_generate_markdown_empty_diary(self, service):
        """Test Markdown generation with an empty diary."""
        session = Session(name="Empty Session", technical_diary=[], review_script="")
        md = service.generate_markdown(session)
        
        assert "*Nenhum registro no diário técnico.*" in md
        assert "*Roteiro ainda não gerado.*" in md

    @patch("app.services.export.pisa")
    def test_generate_pdf_success(self, mock_pisa, service, sample_session):
        """Test PDF generation success."""
        mock_status = MagicMock()
        mock_status.err = False
        mock_pisa.CreatePDF.return_value = mock_status
        
        pdf_bytes = service.generate_pdf(sample_session)
        
        assert isinstance(pdf_bytes, bytes)
        mock_pisa.CreatePDF.assert_called_once()

    @patch("app.services.export.pisa")
    def test_generate_pdf_failure(self, mock_pisa, service, sample_session):
        """Test PDF generation failure raises RuntimeError."""
        mock_status = MagicMock()
        mock_status.err = "Some error"
        mock_pisa.CreatePDF.return_value = mock_status
        
        with pytest.raises(RuntimeError, match="Falha ao gerar PDF"):
            service.generate_pdf(sample_session)

    @pytest.mark.asyncio
    @patch("app.services.export.Client")
    async def test_export_to_notion_success(self, mock_notion_client, service, sample_session):
        """Test Notion export including page creation and block chunking."""
        mock_client_instance = mock_notion_client.return_value
        mock_client_instance.pages.create.return_value = {"id": "new-page-id"}
        mock_client_instance.blocks.children.append.return_value = {}

        # Mocking many blocks to test chunking
        # Adding more diary entries to trigger multiple chunks if needed
        # (Though our sample has only a few, let's test the logic)
        
        url = await service.export_to_notion(
            session=sample_session,
            api_key="fake-key",
            parent_page_id="parent-id"
        )
        
        assert "notion.so/newpageid" in url
        mock_client_instance.pages.create.assert_called_once()
        mock_client_instance.blocks.children.append.assert_called()

    @pytest.mark.asyncio
    @patch("app.services.export.Client")
    async def test_export_to_notion_chunking(self, mock_notion_client, service):
        """Test that Notion blocks are pushed in chunks of 100."""
        mock_client_instance = mock_notion_client.return_value
        mock_client_instance.pages.create.return_value = {"id": "new-page-id"}
        
        # Create a session with a very long review script to generate > 100 blocks
        long_script = "\n\n".join([f"Paragraph {i}" for i in range(150)])
        session = Session(name="Long Session", review_script=long_script)
        
        await service.export_to_notion(
            session=session,
            api_key="fake-key",
            parent_page_id="parent-id"
        )
        
        # Should call append at least twice (100 + 50ish blocks)
        assert mock_client_instance.blocks.children.append.call_count >= 2
