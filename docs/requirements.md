***
### 3. `docs/requirements.md`
```markdown
# Requisitos do Produto (Especificação Viva)
A funcionalidade do EchoBot foi mapeada nos seguintes requisitos fundamentais (Estáticos e Dinâmicos), traduzidos na perspectiva de nossos usuários (*User Stories*).
## 1. Captura e Tratamento Sonoro
- **US001:** Como **Mestre**, quero que o bot grave os microfones dos participantes de modo isolado (multitrack), garantindo que o software identifique as vozes corretamente.
- **US002:** Como **Mestre**, quero que o áudio capturado seja instantaneamente convertido para o formato altamente comprimido Ogg/Opus (64kbps mono) para preservar 90% de armazenamento do meu servidor.
- **US003:** Como **Jogador**, quero vincular dinamicamente o meu `Discord User ID` ao nome do meu atual Personagem, automatizando o reconhecimento de entidade na transcrição.
- **US004:** Como **Usuário**, quero poder realizar o upload manual de áudios brutos gravados previamente, de forma múltipla e com conversão nativa do servidor, salvando aventuras passadas.
## 2. Orquestração Narrativa e Inteligência
- **US005:** Como **Mestre**, quero que a IA efetue a distinção automática de frases *In-Character* (IC) versus piadas/quebras de imersão *Out-of-Character* (OOC) no processo de redação do resumo.
- **US006:** Como **Mestre**, quero um robusto **Diário Técnico** entregue no fim da sessão. Ele deve catalogar: novos NPCs, Locais descobertos, Itens obtidos, as diversas Facções em jogo, status de *Quests* (Ativa/Falha/Completa) e ações notáveis dos heróis.
- **US007:** Como **Mestre**, quero um Roteiro limpo, factual e de forte viés criativo. Desejo ter a opção nativa de gerar a redação na 1ª, 2ª (você) ou 3ª pessoa antes de transformá-la em locuções épicas.
## 3. Revisão e Domínio Criativo
- **US008:** Como **Mestre**, quero usar um painel global de **Ajuste de Termos (*Find & Replace*)** para caçar e corrigir nomes próprios complexos na transcrição — com chaves de exatidão como *Match Case* e *Whole Word*.
- **US009:** Como **Mestre**, desejo alimentar um "Glossário de Spelling" persistente. Ele fará o modelo de STT e o LLM aprenderem definitivamente como se grafa o panteão divino do meu cenário.
- **US010:** Como **Mestre**, quero ter total visibilidade sobre os botões de "Regerar Resumo" e "Regerar Narração". Quero testar saídas ilimitadas usando processamento local sem o medo de gastar moedas e créditos.
## 4. O Ecossistema Compartilhado
- **US011:** Como **Usuário**, exijo a fluidez de poder exportar a minha crônica pronta diretamente para formatos em PDF, blocos Markdown brutos, e via API silenciosa, direto para a minha Wiki do Notion.
- **US012:** Como **Mestre**, exijo a organização limpa e hierárquica na interface, podendo agrupar dezenas de sessões aleatórias dentro de coleções canônicas de uma grande **Campanha (Crônica)**.
> Todas estas jornadas pautam o escopo do nosso [Roadmap](roadmap.md).