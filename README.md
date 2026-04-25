# EchoBot - O Cronista das Sombras

[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=flat&logo=discord)](https://discord.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-F7B93E?style=flat&logo=lucide)](https://lucide.dev/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=flat&logo=ffmpeg)](https://ffmpeg.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai)](https://openai.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75E9?style=flat&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![Anthropic Claude](https://img.shields.io/badge/Claude-755139?style=flat&logo=anthropic)](https://www.anthropic.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=flat&logo=elevenlabs)](https://elevenlabs.io/)
[![Deepgram](https://img.shields.io/badge/Deepgram-FB542B?style=flat&logo=deepgram)](https://deepgram.com/)
[![Kokoro TTS](https://img.shields.io/badge/Kokoro_TTS-6B4E71?style=flat&logo=pyup&logoColor=white)](https://huggingface.co/hexgrad/Kokoro-82M)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-000000?style=flat&logo=openai&logoColor=white)](https://openrouter.ai/)
[![Groq](https://img.shields.io/badge/Groq-f55036?style=flat&logo=speedtest&logoColor=white)](https://groq.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![Attributions](https://img.shields.io/badge/Attributions-List-orange.svg)](ATTRIBUTIONS.md)

**EchoBot** é um sistema avançado de crônica automática para RPG de mesa. Ele captura áudio diretamente das suas sessões no Discord, utiliza modelos de Inteligência Artificial de elite (**Gemini**, **GPT-4o**, **Claude 3.5**, ou **Whisper local**) para transcrever e processar a narrativa, gerando um diário técnico e um roteiro de revisão pronto para ser narrado ou arquivado.

---

## 🏛️ Arquitetura do Sistema

O EchoBot é composto por três serviços principais que trabalham em harmonia:

```mermaid
graph TD
    subgraph "Captação de Áudio"
        A[Discord Voice] -->|Opus/Ogg Stream| B[Voice Bridge Node.js]
    end

    subgraph "Processamento & IA"
        C[Backend API FastAPI]
        D[(MongoDB)]
        E{Estratégias de IA}
        
        E1[STT: Faster Whisper / Gemini]
        E2[LLM: Gemini / GPT / Claude / OpenRouter / Groq]
        E3[TTS: ElevenLabs / Deepgram / Kokoro]
    end

    subgraph "Interface do Mestre"
        G[Frontend React]
    end

    B -->|POST /api/sessions/audio| C
    C <-->|Persistência| D
    
    C --- E
    E --- E1
    E --- E2
    E --- E3
    
    G <-->|Gestão & Revisão| C
    G -.->|Ouve Narração| E3
```

### Componentes

1.  **Voice Bridge** (`voice-bridge/`): Serviço Node.js responsável por se conectar aos canais de voz do Discord, capturar o áudio individual de cada usuário e enviá-lo para o backend.
2.  **Backend API** (`backend/`): Coração do sistema, desenvolvido em FastAPI. Gerencia a lógica de transcrição (local ou cloud), processamento narrativo via LLMs e persistência de dados.
3.  **Frontend** (`frontend/`): Dashboard administrativo em React com uma interface temática de *Dark Fantasy*, permitindo ao mestre gerenciar sessões, personagens e revisar as crônicas geradas.

---

## ✨ Funcionalidades

-   **Captura de Voz Multi-usuário**: Grava o áudio de cada participante separadamente para transcrições mais precisas.
-   **Timestamp Absoluto**: Registra o horário real de cada fala (ex: 14:32:15), facilitando a sincronização com a sessão.
-   **Transcrição Híbrida**: Prioriza o uso do **Faster Whisper (Local)** para economia, com fallback para APIs de cloud (OpenAI/Gemini).
-   **Processamento Narrativo Inteligente**: Separa automaticamente falas *In-Character* (IC) de conversas *Out-of-Character* (OOC).
-   **Diário Técnico Automático**: Extração de NPCs, Itens, Locais, Eventos e sugestão de XP.
-   **Roteiro de Revisão**: Gera uma narrativa fluida e épica da sessão.
-   **Narração Épica (TTS)**: Transforma o roteiro em áudio de alta qualidade via **ElevenLabs**, **Deepgram (Aura)** ou **Kokoro Local (Nativo Python)**.
-   **Multi-Provider LLM & Fallback**: Suporte integrado para **OpenRouter** e **Groq** com um sistema inteligente de contingência (fallbacks) que alterna automaticamente entre provedores em caso de falha.
-   **Simulação de Fallback Forçado**: Possibilidade de desativar o provedor principal para testar e validar planos de contingência diretamente na interface.
-   **Gestão de Chaves Centralizada**: As chaves de API e tokens do Discord são gerenciados diretamente na interface web e persistidos de forma criptografada no MongoDB.
-   **Interface Temática**: Design inspirado em arquétipos de luxo e fantasia sombria (*Dark Fantasy*).
-   **Otimização de Áudio**: Utiliza o formato **Ogg/Opus (64kbps, mono)** para garantir arquivos minúsculos com clareza ideal para transcrição por IA, economizando até 90% de espaço em relação ao WAV puro.
-   **TTS Local Integrado**: O sistema inclui o motor **Kokoro v1.0** rodando nativamente em Python (via ONNX), permitindo narrações de alta qualidade com **custo zero** e sem necessidade de GPU ou Docker.

---

## 🔊 Kokoro TTS (Nativo)

O EchoBot agora suporta o motor de voz **Kokoro** de forma totalmente nativa. 

- **Como funciona**: Na primeira vez que você solicitar uma narração via Kokoro, o sistema baixará automaticamente o modelo ONNX (~300MB) e os arquivos de voz (~30MB) para a pasta `backend/models/kokoro/`.
- **Vantagens**: 
  - 100% gratuito e privado.
  - Funciona offline após o download inicial.
  - Não requer ativação de virtualização (BIOS) ou Docker.
  - Velocidade de inferência otimizada para CPU.

---

## 🛠️ Detalhes Técnicos: Formato de Áudio

Para garantir a melhor eficiência do sistema, o EchoBot não utiliza `.wav` puro para armazenamento definitivo.

- **Formato**: `.ogg` (Opus). O Opus é o formato nativo do Discord, o que facilita a captura e oferece qualidade excelente com compressão superior.
- **Configuração**: 64kbps (mono). Para voz, esta taxa é mais que suficiente. A clareza para a IA transcrever depende da redução de ruídos de fundo e não de alta fidelidade musical.
- **Economia**: Um áudio de 1 hora em WAV (48kHz/16bit/Stereo) ocupa ~1GB. Em Opus 64k mono, ocupa apenas **~28MB**.

---

## 🚀 Guia de Início Rápido

### Pré-requisitos

-   **Python 3.10+** (recomendado usar `venv`)
-   **Node.js 18+** (npm ou yarn)
-   **MongoDB** (Local ou MongoDB Atlas)
-   **FFmpeg**: Essencial para o processamento de áudio. Certifique-se de que está no seu `PATH`.
-   **eSpeak-ng**: Necessário para o motor de voz **Kokoro**. 
    - No Windows: [Baixe o instalador .msi aqui](https://github.com/espeak-ng/espeak-ng/releases).
    - No Linux: `sudo apt-get install espeak-ng`

### 1. Instalação

#### Backend
```bash
cd backend
python -m venv venv
# No Windows:
.\venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
```

#### Frontend
```bash
cd frontend
npm install
```

#### Voice Bridge
```bash
cd voice-bridge
npm install
```

### 2. Configuração

Crie um arquivo `.env` na pasta `backend/` seguindo o modelo de `.env.example`. 

> [!IMPORTANT]
> A partir da versão atual, o `.env` deve conter apenas as chaves de infraestrutura. Todas as chaves de API de IA e o Token do Discord devem ser configurados diretamente na **Tela de Configurações** dentro do App.

```env
# Infraestrutura (Obrigatório no .env)
MONGO_URL="sua_url_mongodb"
DB_NAME="rpbcronista"
MASTER_KEY="sua_chave_mestra_para_criptografia"
```

As chaves abaixo **não são mais necessárias no .env** e devem ser inseridas via UI:
- `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`, `GROQ_API_KEY`
- `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, etc.

### 3. Executando

#### Modo Unificado (Recomendado)
Para iniciar todos os serviços simultaneamente em janelas separadas:
```powershell
.\run.ps1
```

#### Modo Manual
Caso prefira rodar cada serviço individualmente:

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Voice Bridge:**
```bash
cd voice-bridge
npm start
```

**Frontend:**
```bash
cd frontend
npm start
```

---

## 🧪 Testes

O EchoBot possui uma suíte de testes abrangente para garantir a estabilidade de todos os serviços.

### Execução Unificada (Recomendado)
Para rodar todos os testes de uma vez só:
```powershell
.\test_all.ps1
```

### Executando Testes Individuais
```bash
cd backend
# Ative o venv primeiro
pytest
```

### Executando Testes do Frontend (React)
```bash
cd frontend
npm test
```

### Executando Testes do Voice Bridge (Node.js)
```bash
cd voice-bridge
npm test
```

---

## 🎧 Comandos no Discord

Após o bot estar online e convidado para o seu servidor:

-   `!entrar <ID_SESSÃO>`: O bot entra no seu canal de voz atual e inicia a captura vinculada à sessão especificada.
-   `!sair`: O bot encerra a gravação, desconecta-se e envia os áudios finais para o backend iniciar o processamento.

---

## 🛠️ Tech Stack

### Backend
-   **Framework**: FastAPI
-   **Banco de Dados**: MongoDB (Motor driver)
-   **Processamento de Áudio**: Faster Whisper, PyTorch
-   **LLMs**: Google Gemini (padrão), OpenAI GPT-4, Anthropic Claude, OpenRouter, Groq
-   **TTS Providers**: ElevenLabs, Deepgram (Aura), Kokoro Local (Nativo Python)

### Frontend
-   **Library**: React 19
-   **Styling**: Tailwind CSS + Shadcn UI
-   **Icons**: Lucide React
-   **State/Routing**: React Router, Axios

### Voice Bridge
-   **Runtime**: Node.js
-   **Discord Library**: discord.js + @discordjs/voice
-   **Audio Processing**: prism-media

---

## 📂 Estrutura do Projeto

```
EchoBot/
├── backend/            # API FastAPI e Lógica de IA
│   ├── app/
│   │   ├── models/     # Modelos Pydantic/MongoDB
│   │   ├── routers/    # Endpoints da API
│   │   └── services/   # Serviços de Transcrição e IA
├── frontend/           # Interface Web React
│   ├── src/
│   │   ├── components/ # Componentes UI (Shadcn)
│   │   ├── pages/      # Dashboards e Views
│   │   └── hooks/      # Lógica de estado customizada
├── voice-bridge/       # Bot Discord para captura de áudio
│   ├── src/            # Lógica de áudio e conexão Discord
├── memory/             # Documentação de projeto (PRD, etc)
└── run.ps1             # Script de inicialização unificada
```

---

## 📝 Notas de Implementação

-   **Processamento Assíncrono**: O backend processa as transcrições em background para não travar a API.
-   **Estabilidade do Discord**: Se encontrar o erro 4017 (UDP), verifique sua conexão ou considere o uso de uma VPN/VPS.
-   **Fallback de IA**: O sistema tentará transcrever localmente primeiro; se falhar, utilizará as APIs configuradas (OpenAI/Gemini).

---

*“Que suas falas sejam épicas e suas crônicas, eternas.”* 🏛️📜