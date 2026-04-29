# Roadmap e Log de Progresso

Um monumento evolutivo às mecânicas de transcrição imersiva e entrega de produto.

## 1. Log de Progresso (Fundamentos e Artefatos Construídos)

**A. Core de Captura e Processamento**
- [x] Criação do Voice Bridge (Node.js) suportando captura real via `!entrar` e `!sair`.
- [x] Otimização profunda de áudio (conversão `Ogg/Opus` com 90% de ganho de eficiência).
- [x] Implementação de Timestamp absoluto sincronizado para alinhar os áudios e interações no STT.
- [x] Fila de processos (`BackgroundTasks`) bloqueando a falência de desempenho no FastAPI.
- [x] Implementação da integração TTS *offline* via biblioteca nativa Python ONNX do Kokoro.
- [x] Script unitário e orquestrado de arranque (`run.ps1`) para o ecossistema local.

**B. Interface, Experiência e Acessibilidade**
- [x] Reconstrução temática usando *Dark Fantasy, Glassmorphism* e uma semântica baseada em Radix UI.
- [x] Gestão em formato CRUD das Sessões e estruturação canônica de coleções em Campanhas.
- [x] Diálogos limpos (`AlertDialog`) de proteção e confirmação descartando alertas primitivos do navegador.
- [x] Otimização e validação intensiva de testes no Frontend (Vitest com Mocks e User Events) e unitários nas rotas Backend.

**C. Ferramentaria, IA e Legalidade**
- [x] Estruturação híbrida de Inteligência (STT Local com Fallback em Cloud) + Orquestrador Multi-provedor para o Roteiro (Gemini, Groq, Anthropic).
- [x] Criação autônoma do Diário Técnico baseado em identificação IC/OOC.
- [x] Ingestão via UI para upload manual de *assets* brutos e integração de exportação de dados com Notion.
- [x] Implantação da Licença Proprietária com documento rigoroso de atribuições de uso cruzado de libs (`NOTICE`).

---

## 2. Prioritized Backlog

### 🔴 P1 (Prioridade Crítica - O Refinamento)
- [ ] **Ajuste Global de Termos (Find & Replace Avançado):** Cirurgia de nomes próprios com funções nativas *Match Case* / *Whole Word* englobando Transcrição, Diário e Roteiro simultaneamente.
- [ ] **Glossário de Spelling Ativo:** Treino estático persistente (*Injeção de Prompt/Contexto*) instruindo o STT/LLM nas cartilhas de grafia únicas da campanha.
- [ ] **Expansão Profunda do Diário Técnico:** Detecção automatizada de *status* dinâmicos de Quests (Abandonada, Falha, Concluída) e enumeração de interações notáveis por jogador.
- [ ] **Acesso Intuitivo de Regeração:** Fortalecimento visual (UI) para instigar a regeração do Roteiro e da Narração usando provedores offline sem medos econômicos.
- [ ] **Refatoração no Upload:** Permissão para *bulk uploads* de arquivos, implementando uma sanitização severa no servidor convertendo tudo para Opus (Ogg) silenciosamente.

### 🟡 P2 (Prioridade Média - Estrutura Imbatível)
- [ ] **Integração de Memória Contínua (RAG):** Contextualização contínua para resumos injetando diários das semanas anteriores no prompt das sessões vigentes.
- [ ] **Busca Semântica Completa:** Motor interno de pesquisa global indexando eventos passados da campanha.
- [ ] **Trilha Sonora Autônoma:** Biblioteca embutida (*Royalty-Free / FMA*) misturada de modo harmônico à voz do TTS. Download opcional do áudio isolado (Stem).
- [ ] **Video Recap (Compatibilidade Discord):** Geração de mídia rápida, estática e comprimida sob a barra de 10MB limitante do Discord Free.
- [ ] **Portabilidade Absoluta da Base de Dados:** Adeus ao servidor obrigatório do MongoDB em implementações caseiras; transição para formato Flat-File/SQLite priorizando "Copiar & Colar" (*Zero-config* backup).
- [ ] **Voice Bridge Isolado e Gravação via WebRTC:** Habilitar modo gravador de podcast avulso do Discord; interface via Browser capturando e despachando pacotes direto do navegador para o servidor.

### 🟢 P3 (Baixa Prioridade - O Novo Horizonte)
- [ ] Sincronização direta de dados via MCP (Ouroboros) com Virtual TableTops (VTTs) como Foundry VTT e Roll20.
- [ ] Compartilhamento cooperativo e segurança com autenticação de múltiplos mestres, painel de administração de cotas e consumo da IA.
- [ ] Aplicação de Suporte (Companion App) nativo para celulares operando junto da mesa de RPG física.
- [ ] Multilíngue (i18n) enraizado e novos perfis de interface visual com estética Cyberpunk/Sci-Fi.

> Decisões que baseiam a viabilidade técnica constam nos relatórios de [Pesquisa e Mercado](research_benchmarking.md).
