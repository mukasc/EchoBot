# Estratégia de Empacotamento e Instalação do EchoBot

**Data:** Maio de 2026
**Status:** Análise e Planejamento
**Objetivo:** Transformar o EchoBot em um aplicativo instalável para Windows, acessível para usuários não-técnicos (Mestres de RPG), resolvendo o problema de dependências pesadas de IA.

---

## 1. O Desafio Atual
O EchoBot é uma aplicação robusta composta por múltiplos serviços (FastAPI em Python, Node.js para o Discord Voice Bridge, e React para o Frontend). Além disso, possui dependências de sistema pesadas para rodar IA localmente:
- Bibliotecas Python imensas (PyTorch).
- Modelos de IA locais (Faster Whisper, Kokoro TTS).
- Binários do sistema (FFmpeg, eSpeak-ng).

Criar um único arquivo executável (`.exe`) empacotando tudo isso resultaria em um instalador massivo (1GB a 3GB), o que prejudica a distribuição e pune os usuários que desejam usar apenas APIs na nuvem (Gemini, OpenAI, ElevenLabs).

## 2. A Estratégia Escolhida: "Core Leve + Download Sob Demanda"

Para resolver isso, adotaremos o padrão-ouro de aplicações Desktop de IA (como LM Studio, GPT4All, etc). A arquitetura será dividida em duas partes:

### A. O Instalador Leve (Core)
Um instalador inicial pequeno (~100 a 200MB) contendo apenas:
1. **O Executável do Servidor (Python):** Compilado com `PyInstaller`, contendo apenas as bibliotecas essenciais para subir a API, gerenciar o banco de dados e conectar com APIs da nuvem.
2. **O Executável do Voice Bridge (Node.js):** Compilado com `pkg` ou similar.
3. **A Interface Web (React):** Servida estaticamente.

*Resultado:* O usuário baixa e instala o EchoBot em segundos. Se ele usar apenas provedores Cloud, o app já estará 100% funcional.

### B. O Gerenciador de Dependências Locais (On-Demand)
Para usuários que desejam utilizar STT (Whisper) ou TTS (Kokoro) processados localmente e de forma gratuita na própria máquina:
1. Haverá uma aba de **"Motor Local"** ou **"Dependências Nativas"** nas Configurações da UI.
2. Se o usuário tentar ativar o Whisper/Kokoro sem as dependências, a interface solicitará o download.
3. O usuário clica em **"Baixar e Instalar Módulos Locais"**.
4. O backend do EchoBot assumirá o download do PyTorch, modelos `.bin`/`.onnx`, FFmpeg e eSpeak-ng, salvando-os em uma pasta local do sistema (ex: `%APPDATA%\EchoBot\local_engine`).
5. A UI exibirá uma barra de progresso durante o processo.

## 3. Vantagens da Abordagem
- **Instalação Instantânea:** Reduz a barreira de entrada.
- **Eficiência de Armazenamento:** Usuários focados na nuvem não gastam gigabytes do HD com bibliotecas que não usarão.
- **Manutenibilidade e Updates:** Atualizações nos modelos de IA (ex: versão nova do Whisper) podem ser baixadas pela interface sem precisar reinstalar o EchoBot inteiro.

## 4. Plano de Ação (Fases de Implementação)

Para tirar essa arquitetura do papel, as seguintes etapas precisarão ser executadas:

- **Fase 1: Desacoplamento Seguro (Refatoração)**
  - Alterar o backend FastAPI para importar dependências pesadas (`torch`, `whisper`) de forma dinâmica (Lazy Loading).
  - Garantir que a API suba normalmente mesmo que essas bibliotecas não existam no ambiente.
  
- **Fase 2: Motor de Download no Backend**
  - Criar rotas na API para realizar o download e extração de binários e modelos grandes.
  - Implementar comunicação em tempo real (WebSocket ou Server-Sent Events - SSE) para relatar o progresso do download.

- **Fase 3: Interface do Gerenciador (React)**
  - Criar a tela de "Motor Local" nas Configurações.
  - Criar o painel visual de downloads com barras de progresso e botões de gerenciamento.

- **Fase 4: Empacotamento Final (Build System)**
  - Configurar os scripts de CI/CD para buildar o Python via `PyInstaller` e Node.js via `pkg`.
  - Juntar tudo num instalador Windows (ex: Inno Setup) garantindo que atalhos e processos ocultos funcionem perfeitamente.
