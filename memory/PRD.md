# EchoBot - O Cronista das Sombras (Product Requirements Document)

## Original Problem Statement
Bot de Discord para RPG de mesa que captura áudio de canais de voz, transcreve o conteúdo e oferece uma interface web para revisão e geração de narração épica.

## Architecture
- **Backend**: FastAPI (Python) com MongoDB
- **Voice Bridge**: Node.js (discord.js + @discordjs/voice) para captura de áudio individual
- **Frontend**: React 19 + TailwindCSS + Shadcn UI
- **AI Integration**: 
  - Faster Whisper (STT Local) + Cloud Fallback (OpenAI/Gemini)
  - Gemini 3 Flash (LLM padrão) - configurável para OpenAI/Claude/Anthropic
- **Design**: Dark Fantasy theme (Jewel & Luxury archetype)
- **License**: Proprietária (All Rights Reserved) - Proteção de IP para SaaS

## User Personas
1. **Game Master**: Revisa transcrições, edita roteiros, gera narração épica e gerencia a cronologia.
2. **Jogador**: Mapeia seu Discord ID ao personagem para identificação automática na transcrição.

## Core Requirements (Static)
1. Captura de áudio individual do Discord → transcrição híbrida.
2. Mapeamento Discord User ID → Personagem RPG.
3. Filtro inteligente IC (In-Character) vs OOC (Out-of-Character).
4. Diário Técnico: NPCs, Locais, Itens, XP, Eventos.
5. Roteiro de Revisão factual e limpo para narração futura.
6. Interface web administrativa e temática.

## What's Been Implemented (Snapshot: 25 Abr 2026)
- [x] **Voice Bridge (Node.js)**: Captura real de áudio do Discord com comandos `!entrar` e `!sair`.
- [x] **Otimização de Áudio**: Conversão para Ogg/Opus (64kbps, mono) economizando 90% de espaço.
- [x] **Timestamp Absoluto**: Sincronização de falas com o horário real da sessão.
- [x] **Dashboard de Sessões**: CRUD completo e visualização temática.
- [x] **Transcrição Híbrida**: Faster Whisper local com fallback automático para Cloud.
- [x] **Processamento Narrativo**: Separação IC/OOC e geração de Diário Técnico automática.
- [x] **Mapeamento de Personagens**: Gestão de Discord ID -> Nome do Personagem.
- [x] **Configurações Centralizadas**: Migração de chaves de API e tokens do `.env` para o MongoDB com gestão via UI.
- [x] **Fila de Processamento (Background Tasks)**: Execução assíncrona de transcrição e IA para evitar travamentos na interface.
- [x] **Ecossistema Multi-Provedor**: Suporte dinâmico para Groq (LLM), ElevenLabs, Deepgram e Kokoro (TTS).
- [x] **Motor TTS Local (Kokoro)**: Integração nativa Python (ONNX) para narração gratuita e de alta qualidade.
- [x] **Estabilidade de Áudio**: Decodificação mono e tratamento de buffers para evitar aceleração de áudio.
- [x] **Otimização de Espaço (Narração)**: Conversão automática de todas as narrações para formato .ogg (Opus), economizando até 80% de espaço em disco.
- [x] **Licenciamento Proprietário**: Proteção do código-fonte como ativo comercial para o futuro SaaS.
- [x] **Script de Inicialização Unificado**: `run.ps1` para orquestrar todos os serviços.

## Prioritized Backlog

### P1 (High Priority)
- [ ] **Exportação**: Formatos PDF e Markdown estilizados para o diário e roteiro.
- [ ] **Interface de Edição de Segmentos**: Melhorar a UX para ajuste fino de textos e falantes.

### P2 (Medium Priority)
- [ ] **Memória de Longo Prazo (RAG)**: Usar o Diário Técnico de sessões passadas como contexto para o LLM em novas sessões.
- [ ] **Busca Semântica**: Localizar eventos ou nomes específicos em todo o histórico de transcrições.
- [ ] **Pacote Executável**: Empacotamento do sistema em um instalador único (standalone) para facilitar distribuição.

### P3 (Low Priority)
- [ ] **Integração com Foundry VTT**: Foco inicial em World of Darkness (V20/v12) via MCP Ouroboros (Criar atores, rolar dados, atualizar stats).
- [ ] **Integração com Roll20**.
- [ ] **Temas visuais alternativos** (Ex: Cyberpunk, Sci-fi).
- [ ] **App Mobile Companion** para consulta rápida do Diário Técnico durante o jogo presencial.

## Next Action Items
1. Implementar serviço de exportação de Roteiros e Diários (Markdown/PDF).
2. Refinar a interface de edição de segmentos da transcrição.
3. Iniciar pesquisa para Busca Semântica no histórico de sessões.
