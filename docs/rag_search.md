# 🔍 Sistema RAG e Busca Semântica Local — EchoBot

Este documento apresenta a especificação técnica, decisões de engenharia e fluxos de dados do **Mecanismo RAG Local (Retrieval-Augmented Generation)** do EchoBot, projetado para contextualizar de forma contínua as campanhas e permitir buscas semânticas ultra-rápidas baseadas em embeddings vetoriais.

---

## 1. Motivação e Abordagem RAG em RPG

Durante campanhas de RPG de longa duração, o acúmulo de sessões passadas gera um enorme volume de texto na forma de diários técnicos e roteiros de revisão. Tentar injetar toda essa história no prompt de contexto de uma LLM apresenta dois grandes obstáculos:
1. **Limitações de Contexto**: O limite físico de tokens da LLM pode ser ultrapassado.
2. **Custo e Desempenho**: Injetar centenas de milhares de palavras a cada nova interação torna a latência inaceitável e o custo financeiro proibitivo.

A arquitetura do EchoBot contorna esses problemas utilizando um sistema RAG de **Busca Semântica Local**:
* Em vez de ler todo o histórico, o sistema divide o texto de sessões passadas em pequenos fragmentos (chunks).
* Gera vetores numéricos de alta dimensão (embeddings) representando o significado semântico usando uma **IA 100% Local e Offline** (`sentence-transformers` com o modelo `paraphrase-multilingual-MiniLM`).
* Quando o narrador faz uma pergunta ou a LLM precisa de contexto sobre o passado (ex: *"Quem era Eldrin?"*), o motor local busca apenas os fragmentos mais semanticamente relevantes utilizando cálculos lineares no NumPy e injeta apenas esse subconjunto no prompt.

---

## 2. Visão Geral da Arquitetura do Sistema RAG

A orquestração do RAG baseia-se em três serviços fundamentais:

```
[FastAPI Request] ---> [RAGService: Chunking & Index I/O]
                             |
                             +---> [EmbeddingsService: API Keys & Vector Generation]
                             |
                             +---> [ActiveCampaignMemory: RAM NumPy Search Engine]
```

### A. Extração e Chunking Dinâmico (`RAGService`)

O [RAGService](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/services/rag_service.py#L167-L342) é encarregado de ler o banco de dados e construir o índice vetorial da campanha. Ele divide a lore em dois tipos fundamentais de chunks estruturados:

1. **Entradas do Diário Técnico (`diary` Chunks)**:
   * Extrai registros estruturados de NPCs, Locais, Facções e Itens contidos nos históricos das sessões.
   * Constrói strings textuais ricas injetando tags de categorização e status atuais (ex: `[NPC] Eldrin: Um mago elfo renegado que vive nos pântanos. (Status: Ativo) (Personagem: Alucard)`).
2. **Parágrafos de Resumos Narrativos (`session_summary` Chunks)**:
   * Lê o campo `review_script` (roteiro gerado) e divide o texto em parágrafos usando quebras de linha (`\n\n`).
   * Purga parágrafos muito curtos (inferiores a 15 caracteres) e formata o chunk com o nome da sessão correspondente para manter a contextualização histórica.

### B. Persistência Física (`vector_indices/<campaign_id>.json`)

Para evitar a dependência de um banco de dados vetorial complexo externo (como Pinecone ou ChromaDB), o EchoBot armazena o índice vetorial de cada campanha diretamente no diretório do banco de dados em formato JSON portátil:
* **Caminho**: `{DATABASE_DIR}/vector_indices/{campaign_id}.json`
* **Integridade**: Escrito de forma **atômica** utilizando arquivos `.tmp` e substituições de baixo nível (`os.replace`).
* **Estrutura**: Separa os metadados do texto bruto das listas de floats que representam os embeddings.

---

## 3. Mecanismo de Busca Vetorial com NumPy (`ActiveCampaignMemory`)

Para obter velocidade de processamento na casa dos milissegundos dentro do ciclo assíncrono do FastAPI, a representação em RAM de um índice carregado é gerenciada pela classe [ActiveCampaignMemory](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/services/rag_service.py#L23-L76).

### A. Otimização por Normalização Antecipada
Calcular a similaridade por cosseno clássica entre dois vetores $A$ e $B$ envolve a fórmula:

$$\text{Cosine Similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$

Calcular a norma euclidiana ($\|A\|$) para milhares de vetores em tempo de execução seria custoso. Para otimizar isso, o `ActiveCampaignMemory` **normaliza antecipadamente** a matriz de vetores no momento da inicialização:
1. Converte a lista de embeddings em uma matriz NumPy bidimensional `float32` de dimensões $(\text{chunks}, 1536)$.
2. Calcula a norma de cada linha da matriz via `np.linalg.norm(self.vectors, axis=1, keepdims=True)`.
3. Divide a matriz por essas normas. Qualquer norma nula é coagida para `1.0` para evitar divisões por zero.

```python
self.vectors = np.array(embeddings, dtype=np.float32)
norms = np.linalg.norm(self.vectors, axis=1, keepdims=True)
norms[norms == 0] = 1.0
self.vectors = self.vectors / norms
```

### B. O Cálculo de Similaridade por Produto Escalar
Como os vetores do banco e o vetor da consulta estão garantidamente normalizados (com comprimento unitário igual a $1.0$), a similaridade por cosseno simplifica-se em um **produto escalar direto** (dot product). 
Utilizando o NumPy, o cálculo de similaridade contra toda a base é executado instantaneamente via produto de matriz por vetor:

```python
similarities = np.dot(self.vectors, query_vector)
```

Isso nos dá uma lista de pontuações de similaridade. O NumPy ordena e recupera as $k$ posições mais relevantes utilizando `np.argsort(similarities)[::-1][:top_k]` na velocidade do C nativo compilado.

---

## 4. Roteamento de Embeddings de Alta Resiliência (`EmbeddingsService`)

O [EmbeddingsService](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/services/rag_service.py#L78-L165) gera vetores de forma dinâmica e hierárquica baseado nas chaves disponíveis:

```
[get_embeddings]
      |
      +---> OpenAI text-embedding-3-small (Se chave ativa)
      |
      +---> Gemini models/text-embedding-004 (Se chave ativa & OpenAI ausente)
      |
      +---> IA Local Offline: sentence-transformers (Se não houver chaves de API Cloud)
      |
      +---> Local Deterministic Mock Fallback (Se IA Local falhar ou em testes Unitários)
```

### O Motor Local (`sentence-transformers`)
Para operar sem consumir créditos de APIs pagas e manter a privacidade, o sistema implementa um fallback para o modelo `intfloat/paraphrase-multilingual-MiniLM-L12-v2`.
1. **Lazy Loading**: O modelo (que tem cerca de 220MB) só é carregado para a memória RAM na primeira vez que um embedding precisa ser gerado, evitando lentidão na inicialização da API FastAPI. Padrão Singleton.
2. **Non-blocking Threads**: A geração dos vetores (codificação) requer processamento pesado de CPU. Para evitar que a FastAPI congele e derrube o sistema enquanto gera os embeddings, o processamento ocorre via `asyncio.to_thread()`, repassando o trabalho para o *threadpool* do Python, mantendo o *Event Loop* principal sempre livre para receber novas requisições.

### O Fallback Local Determinístico (SHA-256)
Para garantir que testes automatizados rodem de forma instantânea offline e que novos desenvolvedores iniciem sem custos de API, projetamos um gerador de embeddings determinístico local:
1. Gera um hash **SHA-256** do texto do segmento.
2. Extrai os primeiros 8 caracteres hexadecimais do hash e os converte em um inteiro de 32 bits.
3. Utiliza este inteiro como semente (*seed*) matemática para um gerador pseudo-aleatório do NumPy (`np.random.default_rng(seed)`).
4. Amostra 1536 dimensões seguindo uma distribuição normal padrão, e normaliza o vetor resultante para comprimento unitário.

Isso garante que:
* **Determinismo**: O mesmo texto gerará exatamente o mesmo vetor em qualquer máquina.
* **Segurança e Privacidade**: Nenhum dado é enviado para a nuvem.
* **Coerência de Busca**: O cálculo de similaridade por cosseno funciona perfeitamente, permitindo testar toda a lógica do RAG de forma offline com latência zero.

---

## 5. Referência dos Endpoints REST da API RAG

As rotas REST estão definidas em [routers/rag.py](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/routers/rag.py).

### 1. Carregar Campanha em RAM
* **Endpoint**: `POST /api/rag/select/{campaign_id}`
* **Comportamento**: Lazy-loads o índice físico em memória para buscas. Se o arquivo JSON do índice não existir no disco, aciona automaticamente a reindexação em lote na hora (on-the-fly) de forma transparente.

### 2. Consulta Semântica
* **Endpoint**: `POST /api/rag/query`
* **JSON Payload**:
  ```json
  {
    "query": "Quem é Eldrin?",
    "campaign_id": "uuid-da-campanha",
    "top_k": 5
  }
  ```
* **Comportamento**: Retorna os $k$ chunks mais relevantes ordenados por similaridade com seus respectivos scores (cosseno).

### 3. Reindexar Campanha
* **Endpoint**: `POST /api/rag/reindex/{campaign_id}`
* **Comportamento**: Apaga o índice anterior, reconstrói os chunks a partir de todas as sessões cadastradas no banco de dados, gera novos embeddings e atualiza a instância em RAM caso ela esteja carregada.

### 4. Consultar Status do Índice
* **Endpoint**: `GET /api/rag/status/{campaign_id}`
* **Comportamento**: Informa se o arquivo do índice físico existe no disco e retorna metadados (atualização, modelo de embedding utilizado e contagem total de chunks).

### 5. Descarregar RAM
* **Endpoint**: `POST /api/rag/unload`
* **Comportamento**: Limpa a variável global de RAM no estado do FastAPI, liberando a memória do servidor.

---

## 6. FAQ e Resolução de Dúvidas Comuns

**1. Em qual momento é criado a memória RAG quando eu inicio o sistema?**
O índice não é gerado ao ligar o servidor, mas sim **sob demanda** (Lazy Loading). Quando a campanha é selecionada (via `/api/rag/select/{campaign_id}`), o sistema procura o arquivo de índice. Se não existir, ele dispara o processo de criação automaticamente na primeira leitura.

**2. Quando eu gravo uma sessão ou insiro um áudio manual, o RAG é usado? Se sim, de que maneira?**
Ao gravar uma sessão nova, o texto entra no banco de dados, mas **o índice RAG não é atualizado sozinho imediatamente**. Para que a nova sessão entre na "memória de longo prazo" do RAG, é preciso reindexar a campanha. No entanto, ao interagir com o chat ou ao pedir que a IA escreva um resumo, o sistema *consulta* o RAG atual para trazer o contexto do passado e usar na resposta.

**3. Em qual pasta esses índices são gravados?**
Os índices vetoriais ficam armazenados fisicamente de forma portátil no diretório de banco de dados, na subpasta de índices.
**Caminho Padrão:** `backend/data/vector_indices/<campaign_id>.json`

**4. Eu abri uma campanha e uma sessão, mas não gerou nada. Tenho que regerar ou criar um botão manual?**
Exatamente. Como a reindexação é um processo que lê todas as sessões e gera vetores (podendo levar alguns segundos), ela requer um gatilho. **O próximo passo do desenvolvimento** no frontend deve ser adicionar um botão de **"Atualizar Memória RAG"** (ou "Sincronizar Lore") na interface da campanha, que dispare uma chamada `POST /api/rag/reindex/{campaign_id}` para incluir as novas sessões gravadas.

**5. No RAG, estamos utilizando o que para fazer os embeddings? Posso usar bibliotecas Python ao invés da OpenAI/Gemini?**
Sim! Implementamos a biblioteca Python gratuita e offline chamada **`sentence-transformers`**. O sistema está configurado com o modelo `intfloat/paraphrase-multilingual-MiniLM-L12-v2`, que tem excelente compreensão de Português.
Sempre que o sistema não encontrar chaves de API da OpenAI ou Gemini no seu `.env` (ou se o Gemini falhar com erro 404, como ocorreu), ele cairá **automaticamente** para esse motor local, garantindo que você não gaste nenhum crédito ou dependa de internet para a busca semântica!
