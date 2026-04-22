# RPG Cronista - Product Requirements Document

## Original Problem Statement
Bot de Discord para RPG de mesa que captura áudio de canais de voz, transcreve o conteúdo e oferece uma interface web para revisão e geração de narração épica.

## Architecture
- **Backend**: FastAPI (Python) com MongoDB
- **Frontend**: React + TailwindCSS + Shadcn UI
- **AI Integration**: 
  - OpenAI Whisper (STT) via Custom API Key
  - Gemini 3 Flash (LLM) para processamento - configurável para OpenAI/Claude
- **Design**: Dark Fantasy theme (Jewel & Luxury archetype)

## User Personas
1. **Game Master**: Revisa transcrições, edita roteiros, gera narração épica
2. **Jogador**: Mapeia seu Discord ID ao personagem

## Core Requirements (Static)
1. Captura de áudio do Discord → transcrição com Whisper
2. Mapeamento Discord User ID → Personagem RPG
3. Filtro IC (In-Character) vs OOC (Out-of-Character)
4. Diário Técnico: NPCs, Locais, Itens, XP, Eventos
5. Roteiro de Revisão editável para TTS futuro
6. Interface web para revisão e edição

## What's Been Implemented (25 Mar 2026)
- [x] Dashboard de Sessões de RPG
- [x] CRUD completo de sessões
- [x] Página de detalhes com tabs (Transcrição, Diário Técnico, Roteiro)
- [x] Upload de áudio e transcrição com Whisper
- [x] Processamento com IA (Gemini 3 Flash padrão)
- [x] Mapeamento Discord User → Personagem
- [x] Configurações de LLM (provider switcher)
- [x] Instruções de setup do Bot Discord
- [x] Sistema de badges IC/OOC/Narração
- [x] Edição de segmentos de transcrição
- [x] Sessão de exemplo com dados demo

## Prioritized Backlog

### P0 (Critical)
- [x] MVP completo com todas funcionalidades core ✓

### P1 (High Priority)
- [ ] Integração real com Discord Bot (captura de áudio automática)
- [ ] TTS com ElevenLabs para narração épica
- [ ] Exportação de roteiro em PDF/Markdown

### P2 (Medium Priority)
- [ ] Histórico de versões do roteiro
- [ ] Busca e filtros nas sessões
- [ ] Tags customizáveis para diário técnico
- [ ] Compartilhamento de sessões entre mestres

### P3 (Low Priority)
- [ ] Temas visuais alternativos
- [ ] Integração com Roll20/Foundry VTT
- [ ] App mobile

## Next Action Items
1. Configurar Discord Bot com discord.py[voice] para captura automática
2. Adicionar integração ElevenLabs para narração
3. Implementar exportação de roteiros
