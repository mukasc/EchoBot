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
- **License**: Proprietária (All Rights Reserved) - Modelo de Licenciamento On-Premises (Estilo Foundry VTT). Veja [Licenciamento](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/memory/on_premises_licensing.md) para detalhes.

## User Personas
1. **Game Master**: Revisa transcrições, edita roteiros, gera narração épica e gerencia a cronologia.
2. **Jogador**: Mapeia seu Discord ID ao personagem para identificação automática na transcrição.

## Core Requirements (Static)
1. Captura de áudio individual do Discord → transcrição híbrida.
2. Mapeamento Discord User ID → Personagem RPG.
3. Filtro inteligente IC (In-Character) vs OOC (Out-of-Character).
4. Diário Técnico: NPCs, Locais, Itens, Facções, Quests, Ações de Jogadores, XP e Eventos.
5. Roteiro de Revisão factual e limpo para narração futura (com escolha de perspectiva: 1ª, 2ª ou 3ª pessoa).
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
- [x] **Estratégia de Failover de LLM**: Redundância automática entre provedores (Gemini, OpenAI, Groq) para máxima disponibilidade.
- [x] **Infraestrutura de Testes**: Implementação de suíte de testes unitários no Backend (FastAPI) para rotas críticas e serviços.
- [x] **Conformidade Legal**: Implementação de arquivo de Atribuições (`NOTICE`) e atualização para Licença Proprietária.
- [x] **Refatoração React 19**: Limpeza de warnings legados e otimização de hooks no Frontend.
- [x] **Ingestão Manual de Áudio**: Upload de arquivos via interface web (Botão "Upload Audio"). 
  *   *Nota: Atualmente aceita um arquivo por vez e mantém o formato original (sem conversão para .ogg no upload).*
- [x] **Exportação e Integração**: Exportação de Diário e Roteiro em formatos PDF e Markdown.
  *   *Bônus:* Implementada integração direta com **Notion.so** para envio automatizado de notas de sessão.
- [x] **Premium UI/UX overhaul**: Implementação de tema "Dark Fantasy" consistente com Glassmorphism, animações de entrada e transições suaves em todas as páginas (`Dashboard`, `BotSetup`, `Settings`).
- [x] **Navegação Fluida**: Implementação de Header flutuante e interativo.
- [x] **Feedback do Usuário Moderno**: Substituição de alertas nativos por diálogos de confirmação (`AlertDialog`) do Radix UI.
- [x] **Estabilização de Testes Frontend**: Suite de testes Vitest atualizada para cobrir interações complexas de UI (UserEvent) e mocks de APIs do navegador (`ResizeObserver`, etc.).
- [x] **Gestão de Campanhas (Crônicas)**: Implementada a hierarquia onde sessões são agrupadas dentro de Campanhas, com visualização de Diário Técnico Geral consolidado.
- [x] **Acessibilidade & Semântica**: Auditoria completa de labels, roles e hierarquia de cabeçalhos.

## Prioritized Backlog

### P1 (High Priority)
- [ ] **Ajuste Global de Termos (Legacy: Find & Replace)**: Ferramenta para correção em massa de nomes e termos em todos os textos gerados (Resumo, Diário e Roteiro) antes da narração. Deve incluir suporte a *Match Case* e *Whole Word* para precisão cirúrgica em nomes de fantasia.
- [ ] **Glossário de Spelling (Fantasy Names)**: Sistema para garantir que a IA aprenda a grafia correta de nomes próprios do mundo de RPG (Injeção de contexto no STT/LLM).
- [ ] **Expansão do Diário Técnico**: Incluir detecção automática de **Facções**, **Quests** (Objetivos) e **Ações Notáveis de Personagens**.
- [ ] **Visibilidade de Regeração (Diferencial Competitivo)**: Garantir que os botões de **"Regenerar Resumo"** e **"Regenerar Narração (Local)"** sejam proeminentes na UI de Detalhes da Sessão. O objetivo é permitir experimentação ilimitada (custo zero no motor local), ao contrário da concorrência que limita a uma única tentativa.
- [ ] **Melhorias no Upload Manual**: Suporte a múltiplos arquivos simultâneos e conversão automática para `.ogg` (Opus) no servidor para economia de espaço.

### P2 (Medium Priority)
- [ ] **Memória de Longo Prazo (RAG)**: Usar o Diário Técnico de sessões passadas como contexto para o LLM em novas sessões.
- [ ] **Busca Semântica**: Localizar eventos ou nomes específicos em todo o histórico de transcrições.
- [x] **Gestão de Crônicas/Aventuras**: Implementar hierarquia onde as sessões são agrupadas dentro de uma "Crônica" ou "Campanha".
- [ ] **Mixagem de Trilha Sonora**: Opção de adicionar trilha sonora de fundo (ambiente) automaticamente na geração do áudio narrado (TTS). Focar em curadoria de trilhas "human-made" para diferenciação ética.
  - *Avaliar*: Uso de bibliotecas de domínio público ou royalty-free como o [Free Music Archive (FMA)](https://freemusicarchive.org/) para compor o acervo padrão do sistema.
- [ ] **Video Recap (Discord-Ready)**: Geração de vídeo MP4 otimizado (limite 10MB) com áudio e imagem estática para compartilhamento rápido no Discord.
- [ ] **Política de Privacidade Ativa**: Implementar deleção automática de áudios brutos após transcrição bem-sucedida para garantir segurança de dados.
- [ ] **Pacote Executável**: Empacotamento do sistema em um instalador único (standalone) para facilitar a distribuição On-Premises.

### Arquitetura de Alta Disponibilidade (Escalabilidade)
- [ ] **Fila de Processamento Assíncrono (Task Queue)**: Migrar a fila em memória atual (`BackgroundTasks`) para um Message Broker robusto e leve (ex: **Redis** via Celery ou RQ).
  - *Objetivo*: Evitar perdas de processamento (transcrição, LLM, TTS) em caso de reinicialização do backend. Permite ao bot do Discord responder imediatamente (sem timeouts) e delegar a carga pesada para *workers* controlados, evitando gargalos de CPU/GPU.
- [ ] **Camada de Cache e Persistência de Estado (State Management)**: Utilizar o mesmo Redis para armazenar o status das sessões em tempo real, metadados de transcrições pendentes e fazer cache estruturado dos resultados dos LLMs.
  - *Objetivo*: Criar uma "memória de curto prazo" ultra-rápida. Torna a arquitetura tolerante a falhas (resiliente a restarts) e reduz drasticamente o consumo de tokens/tempo ao evitar requisições duplicadas de informações já processadas.

### P3 (Low Priority)
- [ ] **Integração com Foundry VTT**: Foco inicial em World of Darkness (V20/v12) via MCP Ouroboros (Criar atores, rolar dados, atualizar stats).
- [ ] **Integração com Roll20**.
- [ ] **Temas visuais alternativos** (Ex: Cyberpunk, Sci-fi).
- [ ] **Sistema de Login & Multi-Usuário**: Autenticação básica e isolamento de dados (o usuário só vê seus próprios registros).
- [ ] **Mensuração de Consumo**: Painel para rastrear uso de tokens (LLM) e tempo de áudio (TTS/STT) por usuário.
- [ ] **App Mobile Companion** para consulta rápida do Diário Técnico durante o jogo presencial.
- [ ] **Suporte Multi-Idioma (i18n)**: Implementar internacionalização na interface e nos prompts da IA, iniciando com Inglês (EUA) e Português (PT-BR).

## Next Action Items
1. Implementar serviço de exportação de Roteiros e Diários (Markdown/PDF).
2. Refinar a interface de edição de segmentos da transcrição (UX/UI).
3. Implementar sistema de Busca Semântica (RAG inicial) no histórico de sessões.

---

## Estratégia de Distribuição e Monetização (On-Premises)

### 1. Modelo de Venda Direta (Estilo Foundry VTT)
- **Licença Perpétua:** O usuário adquire uma chave única para uso vitalício da versão atual e atualizações menores.
- **Single Instance Enforcement:** Validação de licença para permitir apenas uma instância ativa por chave.
- **Foco em Privacidade:** Sem dependência de nuvem centralizada para o funcionamento core do bot.

### 2. Facilitação de Configuração (Low Friction)
- **Tutoriais Exaustivos:** Vídeos e guias passo-a-passo para Nginx, SSL, MongoDB e Voice Bridge.
- **Setup Scripts:** Automatização da instalação de dependências locais (Docker/NPM/Python).

### 3. Estabilidade e Autossuficiência
- **Foco na Robustez:** Prioridade em um software que "simplesmente funciona" após configurado, minimizando a necessidade de intervenções técnicas constantes.
- **Ecossistema de Auto-Suporte:** Incentivo à resolução de problemas via documentação e base de conhecimento da comunidade.

---

## Cloud Migration & Monetization Strategy (Insights - Opcional/Futuro)

Veja [Estratégia SaaS](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/memory/saas_licensing.md) para detalhes sobre este modelo.

### 1. Resource Management (Local vs. Cloud)
- **STT (Transcription):** In cloud environments, the local Faster Whisper engine requires high-cost GPU instances. 
  - *Strategy:* Prioritize API-based providers (Groq/Deepgram) for production to maintain low infrastructure costs and high speed.
- **TTS (Narration):** Kokoro ONNX is lightweight enough for CPU-based cloud workers, providing a "Zero-Marginal-Cost" narration tier for users.
- **Storage:** Mandatory conversion to `.ogg` (Opus) for all audio assets to minimize S3/R2 storage costs.
- **Auto-Cleanup:** Implementation of a strict privacy policy that deletes raw audio files immediately after processing is finalized.

### 2. Hybrid Architecture
- **Web/API Node:** Lightweight instance for FastAPI and user management.
- **Worker Nodes:** Scalable compute instances for heavy processing tasks (STT/TTS) using the existing background queue.
- **API First:** Design the system to gracefully fallback to Cloud APIs if local compute nodes are saturated.

### 3. Monetization Model (SaaS/Credits)
- **Session-Based Credits:** Instead of charging per action, charge per "Active Session" (Credit = 1 Upload).
- **Infinite Refinement:** Allow unlimited text re-generation (Summary/Script) within an active session (low LLM cost).
- **Tiered Narration:**
  - **Standard:** Unlimited use of local motors (Kokoro).
  - **Premium:** Usage-based charging for High-Fidelity providers (ElevenLabs).
- **Freemium Hook:** 1 Free Credit on signup to allow a full end-to-end trial (Recap + Narration).

---

## Pesquisa & Benchmarking

### Concorrentes Analisados
- [x] **ScrybeQuill**: Analisado em Abril/2026. Insights sobre créditos, regeneração e suporte a arquivos.
- [ ] **Lorekeeper.ai**: *Pendente de análise*. Premissa similar focada em gestão de conhecimento de campanha e automação para RPG.
- [ ] **StoryVault.gg**: *Pendente de análise*. Focado em transformar sessões em narrativas imersivas e organização de lore.
- [ ] **World Anvil**: *Referência de Mercado*. A maior plataforma de world-building e gestão de campanhas. Útil para entender organização de Wikis e timelines.
- [ ] **Notebook.ai**: *Pendente de análise*. Especializado em criação de personagens e world-building assistido por IA.
- [ ] **Kanka.io**: *Referência de UX*. Focado em gestão de campanhas com interface limpa e eficiente para organização de entidades.

### Ferramentas de Escrita Criativa (Foco em Narrativa)
*Úteis para insights sobre expansão de texto, descrições sensoriais e estilo de escrita.*
- [ ] **Sudowrite**: Referência em expansão de ideias e descrições sensoriais (olfato, tato, visão).
- [ ] **NovelAI**: Excelente para estilos de escrita customizáveis e narrativa de longa duração.
- [ ] **Squibler**: Foco em estruturação de capítulos e esboço de histórias.

### Ferramentas de Suporte Visual e Estruturação
*Foco em planejamento espacial e gestão de conhecimento.*
- [ ] **Inkarnate**: Referência em visualização de mundo (mapas) e estética de fantasia.
- [ ] **Obsidian (com plugins)**: Referência em "Cérebro Digital" (PKM). Estudar exportação compatível com plugins de RPG do Obsidian.

### Próximos Passos de Pesquisa
1. Testar o fluxo de ingestão do Lorekeeper e comparar com o nosso.
2. Verificar como o Sudowrite "expande" descrições para aplicar no nosso "Roteiro Detalhado".
3. Analisar modelos de RAG (Memória) do NovelAI para consistência de longa duração.
4. Estudar formatos de exportação para **Obsidian** (Markdown com wikilinks) para atrair usuários "power users".
