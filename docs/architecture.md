# Arquitetura e Estratégia Técnica

## 1. Stack Tecnológico Principal

- **Backend:** FastAPI (Python) com foco em concorrência e alta performance.
- **Voice Bridge:** Node.js (`discord.js` + `@discordjs/voice`) atuando de forma autônoma na captura de áudio individual.
- **Frontend:** React 19 + TailwindCSS + Shadcn UI, para construir a imersão *Premium Dark Fantasy*.
- **Banco de Dados:** MongoDB, com planos de transição para arquiteturas *Zero-Config* (SQLite / Flat-file).

## 2. Ecossistema de IA e Integrações

- **STT (Speech-to-Text):** Abordagem híbrida. Motor principal local robusto com *Faster Whisper*, apoiado por um *Cloud Fallback* dinâmico (OpenAI / Deepgram).
- **LLM (Resumo e Roteiro):** Arquitetura multi-provedor selecionável via interface. Atualmente orquestrado com Gemini 3 Flash, com resiliência preparada para OpenAI (o3), Claude e Groq.
- **TTS (Text-to-Speech):** Motor nativo em Python via *Kokoro (ONNX)* assegurando locuções de alta qualidade, a custo zero. Integrações na nuvem via ElevenLabs e Deepgram disponíveis.

## 3. Alta Disponibilidade e Evolução da Infraestrutura

A blindagem e escalabilidade do cronista exigem implementações avançadas:
- **Estratégia de Failover LLM:** Se o provedor principal (ex. Gemini) apresentar timeouts, o backend redireciona a requisição da crônica para Groq ou OpenAI, blindando a experiência contra inatividades da nuvem.
- **Fila de Processamento (Task Queue):** Planeja-se migrar as filas temporárias em memória (`BackgroundTasks`) para um Message Broker leve e independente (ex. **Huey** ou **Celery** escorados no SQLite) — garantindo que a transcrição não se perca se o sistema reiniciar abruptamente.
- **State Management:** Emprego de um cache local baseado em disco (`DiskCache`), mitigando perdas financeiras e computacionais na regeração de conteúdo longo.

## 4. Fluxo de Processamento de Áudio (Micro-chunks / Streaming STT)

A inovação central será suplantar o gargalo do modelo em lotes (*Batch*). Usaremos Detecção de Atividade de Voz (VAD) para fatiar as narrativas em pequenos pedaços e realizar o bypass de armazenamento massivo, resolvendo a transcrição em "tempo real".

```mermaid
sequenceDiagram
    autonumber
    actor Jogador
    participant VoiceBridge as Voice Bridge (Node.js)
    participant FastAPI as Backend (FastAPI)
    participant STT as STT Engine (Whisper)
    participant LLM as Processamento LLM
    
    Jogador->>VoiceBridge: Fala no Discord (Roleplay)
    VoiceBridge->>VoiceBridge: VAD detecta pausa (Micro-chunk ~5s a 15s)
    VoiceBridge->>FastAPI: Envia pacote Ogg/Opus + Timestamp + User ID
    FastAPI->>STT: Transcreve o micro-chunk
    STT-->>FastAPI: Retorna a string textual (ex: "Sigo os rastros")
    FastAPI->>FastAPI: Persiste o texto no banco e deleta o áudio brutalmente
    note over FastAPI: O Mestre encerra a Sessão
    FastAPI->>LLM: Consolida a transcrição global e envia
    LLM-->>FastAPI: Retorna Resumo (separando IC/OOC), Roteiro e Diário Técnico

