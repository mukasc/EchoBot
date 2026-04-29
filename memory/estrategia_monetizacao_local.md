# Estratégia de Monetização e Licenciamento (On-Premises)

A dinâmica de valor no modelo *Self-Hosted* (On-Premises) muda fundamentalmente em relação ao SaaS tradicional. O usuário está "alugando" a inteligência do sistema, mas provendo seu próprio hardware. O trabalho da desenvolvedora deixa de ser "hospedar o bot" e passa a ser **"gerenciar a licença, fornecer atualizações de inteligência e garantir suporte"**.

Como o usuário arca com o peso do hardware, ele busca *propriedade* e repudia mensalidades atreladas apenas ao acesso do software. O modelo ideal é a **Licença Vitalícia** (com teto de escassez) atrelada a serviços adicionais.

---

## 1. Estrutura de Tiers (Níveis de Acesso)

### Tier 1: O Aventureiro (Suporte e Acesso Básico)
*Ideal para: Quem quer rodar o bot com segurança.*
- **Chave de Ativação (License Key):** Acesso vitalício às funções de transcrição e resumo local.
- **Canal Privado:** Acesso a suporte no Discord para dúvidas de instalação.
- **Updates:** Acesso às atualizações de software e melhorias dos modelos locais.

### Tier 2: O Mestre da Guilda (Personalização e Poder)
*Ideal para: Foco em performance e estilo próprio da mesa.*
- **Tudo do Tier 1.**
- **Biblioteca de Vozes Exclusiva:** Acesso a pacotes de vozes (`.bin` otimizados para o Kokoro), como vozes expressivas, narração de vilões ou monstros. (Ativo digital imaterial com custo zero de reprodução).
- **Marketplace de Prompts:** Arquivos de configuração tunados para estilos específicos (ex: "Resumo Épico", "Diário de Investigação", "Regras e Dano").
- **Prioridade de Feature:** Poder de voto para guiar quais modelos de LLM serão otimizados no futuro.

### Tier 3: O Guardião dos Pergaminhos (Enterprise/Full Control)
*Ideal para: Grupos grandes, podcasters e streamers.*
- **Tudo do Tier 2.**
- **Acesso VIP à API de Processamento (Cloud Fallback):** Uma "chave de segurança" para usar o servidor central do EchoBot caso o PC do usuário não aguente processar uma sessão muito longa. Garante que a sessão nunca fique sem resumo.
- **Consultoria de Instalação (Setup Premium):** Call de 30 minutos ou suporte via acesso remoto para otimizar a instalação (Docker, Nginx, etc.) garantindo que o bot rode perfeitamente.

---

## 2. A Estratégia da "Licença Vitalícia" (Lifetime)

### "Edição de Fundador" (Early Adopter)
Para gerar caixa imediato e senso de urgência, a licença vitalícia não será perpétua em sua oferta.
- **Escassez:** A licença *Lifetime* será restrita aos primeiros 50 a 100 usuários.
- **Transição:** Após o lote de fundadores, a licença passa a ser anual para novos usuários.
- **Cobertura:** A vitalícia garante o software base, correções de bugs e otimizações de performance para sempre.

### O "Passaporte de Manutenção" (Upsell)
Para não inviabilizar o projeto no longo prazo, atualizações *premium* (novos pacotes de voz gigantes, novos modelos de prompt complexos ou suporte personalizado avançado) farão parte de uma **anuidade opcional**. Se o usuário não pagar a anuidade, ele mantém a ferramenta e os pacotes que já possui funcionando perfeitamente (vitalício real).

---

## 3. Fluxos de Receita Adicionais (Monetização Além da Licença)

1. **Marketplace de Estilos:** Venda de pacotes de configuração avulsos (R$ 10 a R$ 30) em formatos `.json` ou `.yaml` com perfis de prompts hiper-otimizados e vozes selecionadas.
2. **Serviço de Sincronização na Nuvem (Backup):** Mensalidade irrisória (nível Google Drive) para sincronizar o banco de dados local (`SQLite`/`JSON`) do usuário para um servidor seguro da nuvem do EchoBot.
3. **Instalação Assistida:** Taxa única de serviço (*setup fee*) para usuários que desejam a ferramenta rodando mas recusam-se a aprender as complexidades técnicas da configuração local.

---

## 4. Proteção da Propriedade Intelectual

Para impedir a pirataria da licença vitalícia em distribuições On-Premises:
- **Hardware ID Binding:** Durante a instalação, o bot gera uma hash (Identificador Único) baseada na placa-mãe/processador da máquina do usuário. A licença vitalícia se "amarra" a esse hardware. O uso simultâneo em outra máquina com a mesma chave será bloqueado.
- **Ping de Validação Simples:** O software realiza uma verificação HTTP ultraleve (`GET api.echobot.com/v1/check-license?key=XXX&hwid=YYY`). 
  - Retorno `200`: Funcionalidades Pro ativadas.
  - Retorno `403`: Downgrade automático para gravação básica (ou bloqueio do motor avançado).
