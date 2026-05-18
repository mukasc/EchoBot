# 💾 Banco de Dados Flat-File ("Zero-Config") — EchoBot

Este documento detalha o funcionamento técnico, decisões de arquitetura e implementação da engine de banco de dados **Flat-File (JSON local)**, criada para oferecer portabilidade absoluta, facilidade de uso offline ("Zero-Config") e conformidade direta com a API do MongoDB.

---

## 1. Motivação e Objetivos

Tradicionalmente, aplicações web que utilizam persistência rica exigem a instalação de servidores de banco de dados robustos (como MongoDB, PostgreSQL, etc.). Para o **EchoBot / Cronista das Sombras**, que é frequentemente executado localmente por mestres de RPG em suas próprias máquinas de jogo, a dependência obrigatória de um serviço externo como o MongoDB representava uma barreira de adoção significativa.

Os objetivos centrais no design da engine Flat-File foram:
* **Zero Overhead de Instalação**: Permitir rodar o sistema completo localmente sem instalar nada além das dependências Python/Node.
* **Portabilidade Total**: Toda a base de dados de uma campanha ou mesa de RPG pode ser transferida de máquina simplesmente copiando e colando uma pasta (backup por "Copiar e Colar").
* **Compatibilidade Completa de API**: Permitir alternar entre MongoDB e Flat-File modificando uma única linha no arquivo `.env`, sem alterar sequer uma linha de código da lógica de negócio ou dos serviços.
* **Resiliência a Falhas de I/O**: Garantir integridade física dos arquivos JSON mesmo sob concorrência intensa ou desligamento abrupto do servidor.

---

## 2. Padrão de Repositório Abstrato

Para permitir a coexistência transparente de múltiplos motores de banco de dados, o EchoBot adota uma arquitetura de injeção de dependências orientada a interfaces. Os contratos de interface estão definidos em [interfaces.py](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/interfaces.py).

### Interfaces Principais

* **`DatabaseProviderInterface`**: Define as propriedades obrigatórias expostas pelo banco de dados:
  * `sessions`: Coleção de sessões.
  * `campaigns`: Coleção de campanhas.
  * `character_mappings`: Mapeamentos de personagens/usuários.
  * `settings`: Configurações gerais da aplicação.
* **`DatabaseCollectionInterface`**: Define a assinatura assíncrona dos métodos CRUD tradicionais do MongoDB:
  * `find_one(filter, projection)`
  * `find(filter, projection)` (retorna um `AsyncCursorInterface`)
  * `insert_one(document)`
  * `update_one(filter, update, upsert)`
  * `delete_one(filter)`
  * `aggregate(pipeline)`
* **`AsyncCursorInterface`**: Replica de forma assíncrona os cursores do driver Motor do MongoDB:
  * `sort(key_or_list, direction)`
  * `to_list(length)`
  * Suporte nativo a loops iteradores assíncronos (`async for`).

---

## 3. Arquitetura Interna da Engine (`FlatFileDatabaseProvider`)

A classe [FlatFileDatabaseProvider](file:///c:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/app/flatfile_provider.py#L498-L523) orquestra a localização e gerência física das coleções sob uma pasta base (por padrão, `./data/`).

Cada coleção corresponde a um subdiretório físico no disco:
```
backend/data/
├── campaigns/
│   └── campaign-uuid-1.json
├── sessions/
│   ├── session-uuid-a.json
│   └── session-uuid-b.json
├── settings/
│   └── settings-uuid.json
└── character_mappings/
```

### A. Escritas Atômicas Seguras (`os.replace`)

Em sistemas operacionais modernos, a concorrência de processos ou threads escrevendo diretamente em arquivos compartilhados pode corromper dados caso o processo seja interrompido no meio da escrita (deixando o arquivo JSON incompleto). 

Para resolver este problema de concorrência, o Flat-File adota um mecanismo de **escrita atômica**:
1. O provedor cria um arquivo temporário com o sufixo `.tmp` no mesmo diretório de destino (ex: `12345.json.tmp`).
2. O conteúdo do documento serializado em JSON é gravado por completo neste arquivo temporário.
3. O sistema invoca a função nativa `os.replace(temp_path, final_path)`. Em nível de sistema operacional (POSIX e Windows NT), `os.replace` é uma operação **atômica de baixo nível**. Ela garante que a substituição ocorra instantaneamente. Se a escrita falhar, o arquivo original permanece intacto.

```python
def _write_json_file(file_path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    temp_path = f"{file_path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(temp_path, file_path)
```

### B. Controle de Concorrência (`asyncio.Lock`)

Cada coleção instanciada em `FlatFileDatabaseCollection` gerencia um lock assíncrono interno exclusivo (`asyncio.Lock`). Todas as operações de leitura concorrente profunda, alteração e escrita são enfileiradas sequencialmente por este Lock, protegendo o estado físico do disco contra colisões causadas por requisições HTTP paralelas no FastAPI.

### C. Normalização de Tipos de Dados BSON

O MongoDB utiliza BSON (Binary JSON), que suporta nativamente tipos como `bson.ObjectId` e objetos datetime avançados. Ao migrar dados de bancos MongoDB legados ou manipular chaves de API, o motor Flat-File normaliza esses tipos especiais em tempo de leitura/escrita, convertendo-os para strings legíveis (como datas no formato padrão **ISO-8601** UTC), garantindo 100% de compatibilidade na serialização JSON padrão.

---

## 4. O Intérprete Nativo de Consultas MongoDB

Um dos aspectos mais sofisticados da engine Flat-File é a inclusão de um **intérprete nativo** escrito puramente em Python que emula os operadores e mecanismos de busca do MongoDB na memória principal.

### A. Resolução Dinâmica de Caminhos (`Dot Notation`)
Permite ler campos profundos dentro de documentos aninhados utilizando caminhos separados por ponto (ex: `technical_diary.name` ou `character_mappings.player_name`), resolvendo dinamicamente listas internas de dicionários.

### B. Emulação de Operadores Críticos
O Flat-File interpreta localmente operadores essenciais para as rotas da aplicação, tais como:
* **Filtros padrão e de correspondência**: Igualdades diretas e emulação de arrays.
* **`$ne` (Not Equal)**: Verifica não-igualdades de forma robusta.
* **`$in`**: Verifica se uma propriedade pertence a uma lista de valores válidos.
* **`$set` com caminhos pontuados**: Atualiza campos internos altamente aninhados sem subscrever outras propriedades do objeto raiz.

### C. Engine de Agregação (`pipeline`)
A engine suporta pipelines de agregação do MongoDB em memória, traduzindo as chamadas para operações otimizadas sobre listas nativas do Python:
* **`$match`**: Filtra documentos de acordo com expressões lógicas complexas.
* **`$unwind`**: Desmembra arrays internos em múltiplos subdocumentos individuais (essencial para relatórios agregados).
* **`$project`**: Realiza inclusões ou exclusões de chaves e renomeações em tempo de execução.
* **`$group` com acumuladores (`$push`)**: Agrupa e aglutina registros complexos.
* **`$sort`**: Ordena coleções inteiras com base em propriedades dinâmicas ou datas do sistema.

---

## 5. Ferramenta de Migração (`migrate_db.py`)

Para viabilizar transições sem atrito entre ambientes de nuvem/produção e instâncias de execução local e portátil, o repositório traz o utilitário [migrate_db.py](file:///C:/Users/mukas/.gemini/antigravity/scratch/EchoBot/backend/migrate_db.py).

Este script realiza uma migração automatizada:
1. Conecta-se ao banco de dados de origem configurado via string de conexão do MongoDB.
2. Realiza a leitura e extração de todos os documentos de todas as coleções do app.
3. Higieniza e purga metadados indesejados específicos de BSON (ex: wraps extras de IDs).
4. Grava cada documento individualmente na pasta Flat-File de destino de forma organizada e estruturada, criando um banco portátil idêntico em apenas um clique.

---

> [!TIP]
> **Como ativar:** Para usar a engine Flat-File de forma padrão no EchoBot, simplesmente configure `DATABASE_TYPE="flatfile"` no seu arquivo `.env` (ou remova a variável `MONGO_URL` para que o sistema adote o Flat-File automaticamente de forma resiliente).
