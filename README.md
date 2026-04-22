# EchoBot - O Cronista das Sombras

**EchoBot** é um sistema avançado de crônica automática para RPG de mesa. Ele captura áudio diretamente das suas sessões no Discord, utiliza modelos de Inteligência Artificial de elite (**Gemini**, **GPT-4o**, **Claude 3.5**, ou **Whisper local**) para transcrever e processar a narrativa, gerando um diário técnico e um roteiro de revisão pronto para ser narrado ou arquivado.

---

## 🏛️ Arquitetura do Sistema

```
[Discord Voice] --> [Voice Bridge (Node.js)] --> [Backend API (FastAPI)] --> [MongoDB]
                                                              |
                                                              v
                                              [Frontend (React + Tailwind)]
```

### Componentes

1. **Voice Bridge** (`voice-bridge/`) - Bot Node.js para capturar áudio do Discord
2. **Backend API** (`backend/`) - API FastAPI com transcrição e processamento de IA
3. **Frontend** (`frontend/`) - Dashboard React com interface gótica

---

## 🚀 Guia de Início Rápido

### Pré-requisitos
- **Python 3.10+** (venv)
- **Node.js 18+**
- **MongoDB** (Local ou Atlas)
- **FFmpeg** instalado e no PATH

### 1. Instalação

**Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

**Voice Bridge:**
```bash
cd voice-bridge
npm install
```

### 2. Configuração

Crie o arquivo `.env` em `backend/.env`:
```env
MONGO_URL="sua_url_mongodb"
DB_NAME="rpbcronista"
OPENAI_API_KEY="sua_chave_openai"
GOOGLE_API_KEY="sua_chave_google"
DISCORD_BOT_TOKEN="seu_token_discord"
```

### 3. Executando

Abra 2 terminais:

**Terminal 1 - Backend:**
```bash
cd backend
.\venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000
```

**Terminal 2 - Voice Bridge:**
```bash
cd voice-bridge
node index.js
```

### 4. Comandos no Discord

- `!entrar <ID_SESSÃO>` - O bot entra no canal de voz e começa a gravar
- `!sair` - Para a gravação e envia o áudio para processamento

---

## ✨ Funcionalidades

- **Captura de Voz por Usuário** - Cada participante tem seu áudio separado
- **Timestamp Absoluto** - Hora real da fala registrada (ex: 14:32:15)
- **Transcrição Local (Faster Whisper)** - Sem custos de API
- **Transcrição Cloud (Gemini/OpenAI)** - Fallback quando local falha
- **Processamento Narrativo IC/OOC** - Separa falas de personagens de conversas paralelas
- **Diário Técnico** - Extração automática de NPCs, Itens, Locais e XP
- **Roteiro de Revisão** - Narrativa fluida com nomes de personagens
- **Áudio no MongoDB** - Arquivos compactados com gzip no GridFS
- **Edição de Sessão** - Alterar nome e sistema de jogo pelo frontend

---

## 📝 Notas

- O bot Discord original (`bot.py`) foi substituído pelo Voice Bridge (Node.js)
- Erro 4017 no Discord indica problema de UDP - tente usar VPN ou VPS
- O sistema tenta local primeiro, depois cloud (Gemini/OpenAI) como fallback

---

*“Que suas falas sejam épicas e suas crônicas, eternas.”*