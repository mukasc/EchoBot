
---

# Documento de Requisitos e Benchmark Técnico: ScrybeQuill

**Analista Responsável:** Senior Systems Analyst / Product Owner
**Projeto de Referência:** [ScrybeQuill](https://www.scrybequill.com/)
**Objetivo:** Mapear funcionalidades para definição de escopo de novo software de transcrição narrativa.

---

## 1. Lista de Requisitos (Backlog Técnico)

| ID | Nome da Funcionalidade | Descrição Detalhada | Critérios de Aceite | Prioridade | User Story |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF001** | **Upload e Ingestão de Áudio** | Suporte a arquivos de até 1.5GB/8h nos formatos MP3 e WAV. | O sistema deve validar o tamanho do arquivo e exibir progresso de upload em tempo real. | **Essencial** | Como usuário, quero subir o áudio da minha sessão para transformá-lo em crônica. |
| **RF002** | **Motor de Transcrição Inteligente** | Conversão de fala em texto ignorando ruídos externos e conversas paralelas (off-topic). | A transcrição deve filtrar ruídos e manter a fidelidade aos diálogos principais da trama. | **Essencial** | Como mestre, quero uma transcrição limpa que foque apenas na história narrada. |
| **RF003** | **Sumarização Narrativa (LLM)** | Geração de resumos em formato longo (crônica) e curto (bullet points). | O resumo deve ser coeso e permitir a escolha entre 1ª, 2ª ou 3ª pessoa. | **Essencial** | Como jogador, quero um resumo rápido para relembrar o que aconteceu na última sessão. |
| **RF004** | **Catálogo Automático de Entidades** | Extração automática de NPCs, locais e itens mencionados durante o áudio. | O sistema deve listar as entidades em uma seção separada para consulta rápida. | **Importante** | Como mestre, quero um índice de NPCs criados no improviso para não esquecer nomes. |
| **RF005** | **Editor de Texto com Glossário** | Interface para edição manual com suporte a "Localizar e Substituir". | Mudanças feitas no editor devem ser salvas e refletidas na futura narração de áudio. | **Essencial** | Como usuário, quero corrigir a escrita de nomes próprios antes de gerar o áudio final. |
| **RF006** | **Geração de Áudio Narrado (TTS)** | Síntese de voz com narradores pré-definidos e mixagem automática de trilha sonora. | O áudio final deve ser baixável com e sem música de fundo (narração isolada). | **Importante** | Como mestre, quero um áudio cinematográfico para dar o "recaps" no início da sessão. |
| **RF007** | **Renderização de Vídeo Otimizada** | Geração de vídeo MP4 contendo áudio e visual estático, limitado a 10MB. | O arquivo deve ser compatível com o limite de upload do Discord (10MB). | **Desejável** | Como usuário, quero compartilhar o vídeo da sessão diretamente no canal do Discord. |
| **RF008** | **Configuração de Spelling (Glossário)** | Lista de termos personalizados para orientar a IA na grafia correta. | A IA deve aplicar as correções de grafia automaticamente em futuras transcrições. | **Importante** | Como usuário, quero que a IA aprenda a escrever nomes de fantasia específicos do meu mundo. |

---

## 2. Fluxo de Usuário (User Journey)

1.  **Configuração:** O usuário nomeia a sessão e pré-seleciona Narrador/Trilha.
2.  **Upload:** O sistema recebe o áudio e enfileira para processamento.
3.  **Refinamento de Texto:** * IA gera a primeira versão do resumo.
    * Usuário utiliza o editor para correções e "Find & Replace".
4.  **Geração Multimídia:** O usuário clica em "Continue Generation" para renderizar áudio e vídeo.
5.  **Entrega:** O sistema disponibiliza os links de download (Texto, Áudio e Vídeo).

---

## 3. Inferências de Backend e Arquitetura

Para replicar esse benchmark, a arquitetura deve suportar:

* **Processamento Assíncrono:** Uso de filas (ex: **Redis + BullMQ**) para lidar com transcrições que podem levar minutos ou horas.
* **Orquestração de LLMs:**
    * *Transcrição:* Whisper (OpenAI) ou Deepgram.
    * *Processamento:* Gemini 1.5 Pro ou OpenAI o3 (conforme selecionado pelo usuário).
    * *Voz:* ElevenLabs ou Play.ht para narrações de alta fidelidade.
* **Infraestrutura de Arquivos:** Cloudflare R2 ou AWS S3 para armazenamento temporário dos áudios brutos (com deleção automática para privacidade).
* **Renderização de Vídeo:** Uso de FFmpeg no backend para converter o áudio e uma imagem estática em um vídeo MP4 otimizado.

---

## 4. Diferenciais de UX (Critical Success Factors)

* **Otimização para Discord:** A limitação técnica de 10MB no vídeo é um diferencial de produto focado na comunidade.
* **Privacidade:** Promessa de deleção permanente do áudio original após o processamento.
* **Modelo de Monetização:** Venda de "Narrator Credits" e pacotes de trilha sonora (Marketplace), incentivando a personalização.

---

> **Dica do PO:** Para o seu projeto, recomendo focar inicialmente na **RF008 (Glossário de Spelling)**. Em sistemas de RPG ou nichos específicos, a maior dor do usuário é a IA escrever nomes próprios de forma errada. Resolver isso no "core" do software gera um valor percebido imediato.