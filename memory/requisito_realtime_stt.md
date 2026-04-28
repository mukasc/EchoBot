# Arquitetura de Transcrição em Tempo Real (Streaming STT / Micro-chunks)

## 1. Visão Geral (O Problema e a Solução)
Atualmente, a arquitetura do EchoBot opera no modelo de "Processamento em Lote" (*Batch Processing*): o Voice Bridge (bot do Discord) grava a sessão inteira durante horas, salva um arquivo colossal de áudio e, no final, envia tudo para o backend. Isso exige muito armazenamento em disco, trava processadores ou placas de vídeo na etapa do Whisper (STT) e faz com que o usuário espere muito tempo pelo resultado da sessão.

O insight para resolver isso é o **Bypass do Áudio**: abandonar a transcrição no final do jogo e realizar a transcrição **conforme as pessoas falam**, salvando apenas o texto e destruindo o áudio imediatamente.

## 2. Fluxo de Funcionamento (Micro-chunks via VAD)

O método mais seguro e adaptável para o FastAPI atual é o uso de *Micro-chunks* controlados por Detecção de Atividade de Voz (VAD).

### Passo 1: Captura Inteligente (Voice Bridge)
- **VAD (Voice Activity Detection):** O bot detecta quando um microfone começa a transmitir áudio e quando ele fica em silêncio.
- **Corte Dinâmico:** Em vez de manter um buffer eterno, quando o usuário para de falar (pausa de 1 a 2 segundos), o bot isola essa frase (o "micro-chunk"). Se o usuário falar sem parar, um limite rígido (ex: 15 ou 20 segundos) deve cortar o áudio automaticamente.
- **Transmissão Imediata:** O bot envia esse pequeno pacote (`.ogg`/Opus) para a API do backend, com os metadados: ID da Sessão, Nome do Jogador e Timestamp Exato do início da fala.

### Passo 2: Processamento Instantâneo (Backend FastAPI)
- **Ingestão Assíncrona:** O FastAPI recebe o pacote de áudio (geralmente poucos kilobytes) de forma paralela.
- **Motor STT (Whisper / Groq):** O micro-chunk é passado instantaneamente para a IA de transcrição. Transcrever 10 segundos de áudio com o *Faster-Whisper* demora uma fração de segundo.
- **Persistência e Descarte:** O backend pega o texto gerado (ex: `[20:15:33] Fernando: Onde fica a taverna?`), anexa na tabela de *Transcrições* do banco de dados atrelado à sessão, e **deleta fisicamente o arquivo de áudio recebido**.

## 3. Vantagens Estratégicas
* **Espera Zero (Zero-Latency End):** Assim que a sessão de RPG termina, a transcrição total já está 100% salva no banco. O processamento do LLM (Resumo/Roteiro) pode começar imediatamente.
* **Economia Extrema de Infraestrutura:** O custo de armazenar gigabytes de áudio no disco cai para zero.
* **Redução de Picos de Hardware:** Em vez de travar o servidor por 20 minutos com uso a 100% do processador para traduzir um áudio gigante, a máquina transcreve pequenos fôlegos de 1 segundo diluídos ao longo das 4 horas de jogo.
* **Tolerância a Quedas:** Se o servidor ou o bot cair no meio do jogo, apenas a frase exata daquele segundo é perdida. Todo o histórico das 3 horas anteriores já está transcrito e seguro no MongoDB.

## 4. Desafios de Implementação e Gargalos
* **Ordenação no Banco de Dados:** Como as chamadas HTTP do bot para o FastAPI serão assíncronas (um jogador pode enviar um chunk rápido de 2 segundos, e outro jogador enviar um de 15 segundos), os dados podem chegar fora de ordem na API. O bot deve assinar cada envio com um **Timestamp Unix Absoluto**, e a leitura dos textos deve ser ordenada por esse timestamp.
* **Saturação de Requisições:** Se 5 jogadores rirem ou falarem juntos, a API receberá 5 uploads quase simultâneos. É necessário garantir que o *pool de conexões* do STT aguente a concorrência (possivelmente usando uma fila *Redis* rápida ou processamento concorrente do Faster-Whisper).
* **Alucinações de STT:** Chunks extremamente pequenos ou vazios (ruído de fundo que enganou o VAD) costumam causar alucinações severas nos modelos Whisper. O backend precisará de um filtro simples para ignorar transcrições que sejam apenas pontuações ou palavras repetidas (ex: "Thank you.", "Ah.").

## 5. Próximos Passos (Roadmap de Pesquisa)
Para avançar, devemos pesquisar e definir:
1. Uma biblioteca de VAD eficiente para a linguagem na qual o Voice Bridge foi escrito (ex: WebRTC VAD, Silero VAD).
2. Como enviar requisições de forma limpa (HTTP Multi-part ou se vale a pena subir um WebSocket nativo do FastAPI para evitar *overhead* de cabeçalhos HTTP constantes).
