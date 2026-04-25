"""
ExportService — handles exporting sessions to Markdown, PDF and Notion.
"""
from __future__ import annotations

import io
import logging
import markdown
from typing import List, Dict, Any
from xhtml2pdf import pisa
from notion_client import Client

from app.models.session import Session, TechnicalDiaryEntry

logger = logging.getLogger(__name__)

class ExportService:
    """Service to handle document exports."""

    def generate_markdown(self, session: Session) -> str:
        """Generates a stylized Markdown document for the session."""
        lines = []
        
        # Header
        lines.append(f"# {session.name}")
        lines.append(f"**Sistema:** {session.game_system}")
        lines.append(f"**Data:** {session.created_at.strftime('%d/%m/%Y %H:%M')}")
        if session.duration_minutes:
            lines.append(f"**Duração:** {session.duration_minutes} minutos")
        lines.append("\n---\n")

        # Technical Diary
        lines.append("## 📜 Diário Técnico")
        
        categories = {
            "npc": "👥 NPCs",
            "location": "📍 Locais",
            "item": "⚔️ Itens & Recompensas",
            "xp": "📈 Experiência (XP)",
            "event": "🎭 Eventos Importantes"
        }

        # Group by category
        grouped: Dict[str, List[TechnicalDiaryEntry]] = {}
        for entry in session.technical_diary:
            if entry.category not in grouped:
                grouped[entry.category] = []
            grouped[entry.category].append(entry)

        for cat_id, cat_name in categories.items():
            if cat_id in grouped:
                lines.append(f"### {cat_name}")
                for entry in grouped[cat_id]:
                    lines.append(f"- **{entry.name}**: {entry.description or 'Sem descrição'}")
                lines.append("")

        if not session.technical_diary:
            lines.append("*Nenhum registro no diário técnico.*")
        
        lines.append("\n---\n")

        # Review Script
        lines.append("## 📖 Roteiro de Revisão")
        if session.review_script:
            lines.append(session.review_script)
        else:
            lines.append("*Roteiro ainda não gerado.*")

        lines.append("\n---\n")
        lines.append("> Gerado automaticamente por EchoBot - O Cronista das Sombras")

        return "\n".join(lines)

    def generate_pdf(self, session: Session) -> bytes:
        """Generates a styled PDF document."""
        md_content = self.generate_markdown(session)
        html_content = markdown.markdown(md_content, extensions=['extra', 'smarty'])

        # Add some styling
        styled_html = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @page {{
                    size: A4;
                    margin: 1.5cm;
                }}
                body {{
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #2D2D2D;
                    background-color: #FCF9F2;
                }}
                h1 {{
                    color: #5C1D1D;
                    text-align: center;
                    font-size: 28pt;
                    margin-bottom: 5pt;
                    border-bottom: 2px solid #D4AF37;
                    padding-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }}
                .metadata {{
                    text-align: center;
                    font-size: 10pt;
                    color: #7A7A7A;
                    margin-bottom: 30pt;
                    font-style: italic;
                }}
                h2 {{
                    color: #5C1D1D;
                    font-size: 18pt;
                    border-bottom: 1px solid #D4AF37;
                    margin-top: 25pt;
                    margin-bottom: 10pt;
                    padding-bottom: 5pt;
                }}
                h3 {{
                    color: #7A5C1D;
                    font-size: 14pt;
                    margin-top: 15pt;
                    margin-bottom: 5pt;
                }}
                p {{
                    margin-bottom: 10pt;
                    text-align: justify;
                }}
                ul {{
                    margin-bottom: 15pt;
                }}
                li {{
                    margin-bottom: 5pt;
                }}
                hr {{
                    border: 0;
                    border-top: 1px solid #D4AF37;
                    margin: 20px 0;
                }}
                blockquote {{
                    background-color: #F3EFE0;
                    border-left: 5px solid #D4AF37;
                    padding: 10pt;
                    font-style: italic;
                    margin: 15pt 0;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        result = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(styled_html), dest=result)
        
        if pisa_status.err:
            logger.error(f"Error generating PDF: {pisa_status.err}")
            raise RuntimeError("Falha ao gerar PDF")
            
        return result.getvalue()

    async def export_to_notion(self, session: Session, api_key: str, parent_page_id: str) -> str:
        """Exports the session content to a new page in Notion."""
        notion = Client(auth=api_key)
        
        # 1. Create the page
        new_page = notion.pages.create(
            parent={"page_id": parent_page_id},
            properties={
                "title": [
                    {
                        "text": {
                            "content": f"Sessão: {session.name}"
                        }
                    }
                ]
            }
        )
        
        new_page_id = new_page["id"]
        
        # 2. Add content blocks
        blocks = []
        
        # Metadata
        blocks.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content": f"Sistema: {session.game_system}\nData: {session.created_at.strftime('%d/%m/%Y %H:%M')}"}}],
                "icon": {"emoji": "🎭"}
            }
        })
        
        blocks.append({"object": "block", "type": "divider", "divider": {}})
        
        # Technical Diary Header
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "📜 Diário Técnico"}}]
            }
        })
        
        # Diary Items
        categories = {
            "npc": "👥 NPCs",
            "location": "📍 Locais",
            "item": "⚔️ Itens & Recompensas",
            "xp": "📈 Experiência (XP)",
            "event": "🎭 Eventos Importantes"
        }
        
        grouped: Dict[str, List[TechnicalDiaryEntry]] = {}
        for entry in session.technical_diary:
            if entry.category not in grouped:
                grouped[entry.category] = []
            grouped[entry.category].append(entry)
            
        for cat_id, cat_name in categories.items():
            if cat_id in grouped:
                blocks.append({
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {
                        "rich_text": [{"type": "text", "text": {"content": cat_name}}]
                    }
                })
                for entry in grouped[cat_id]:
                    blocks.append({
                        "object": "block",
                        "type": "bulleted_list_item",
                        "bulleted_list_item": {
                            "rich_text": [
                                {"type": "text", "text": {"content": entry.name, "link": None}, "annotations": {"bold": True}},
                                {"type": "text", "text": {"content": f": {entry.description or ''}"}}
                            ]
                        }
                    })

        blocks.append({"object": "block", "type": "divider", "divider": {}})
        
        # Review Script Header
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "📖 Roteiro de Revisão"}}]
            }
        })
        
        # Review Script Content (Split by paragraphs)
        if session.review_script:
            paragraphs = session.review_script.split('\n\n')
            for p in paragraphs:
                if not p.strip(): continue
                
                # Check for headers in MD
                if p.startswith('### '):
                    blocks.append({
                        "object": "block",
                        "type": "heading_3",
                        "heading_3": {"rich_text": [{"type": "text", "text": {"content": p.replace('### ', '').strip()}}]}
                    })
                elif p.startswith('## '):
                    blocks.append({
                        "object": "block",
                        "type": "heading_2",
                        "heading_2": {"rich_text": [{"type": "text", "text": {"content": p.replace('## ', '').strip()}}]}
                    })
                else:
                    blocks.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": p.strip()}}]
                        }
                    })
        else:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": "Roteiro ainda não gerado.", "annotations": {"italic": True}}}]
                }
            })
            
        # Push blocks in chunks (Notion API limit is 100 blocks per request)
        for i in range(0, len(blocks), 100):
            notion.blocks.children.append(
                block_id=new_page_id,
                children=blocks[i:i+100]
            )
            
        return f"https://www.notion.so/{new_page_id.replace('-', '')}"
