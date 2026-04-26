# Modelo de Distribuição e Licenciamento (Estilo Foundry VTT)

Este documento descreve a estratégia de distribuição do EchoBot, baseada no modelo de licenciamento tradicional "On-Premises", focado em propriedade do usuário e flexibilidade de hospedagem.

## 1. Visão Geral do Modelo
Inspirado pelo sucesso do Foundry VTT, o EchoBot adotará um modelo onde o usuário adquire uma licença perpétua (ou de versão maior) que permite a execução de uma instância do software por vez.

### Pilares:
*   **Compra Única:** O usuário paga uma vez pela chave da licença.
*   **Auto-Hospedagem (On-Premises):** O usuário é responsável por onde o bot roda (seu PC, uma VPS, um Raspberry Pi, etc.).
*   **Privacidade Total:** Os dados permanecem sob o controle do usuário.
*   **Processamento Local Ilimitado:** O grande diferencial. Ao usar Whisper e Kokoro locais, o custo por sessão para o usuário é zero após a compra da licença.
*   **Modelo Híbrido (BYOK):** Liberdade para o usuário plugar suas próprias chaves (OpenAI, ElevenLabs) se desejar qualidade de nuvem, sem que o desenvolvedor precise gerenciar esses custos.

## 2. Análise Estratégica (Prós e Contras)

### Prós:
*   **Custo de Infra Zero:** O custo de processamento (GPU/CPU) é do usuário final.
*   **Vantagem Competitiva de "Uso Infinito":** Diferente de concorrentes (ScrybeQuill, Lorekeeper) que cobram por crédito/sessão, o EchoBot oferece processamento ilimitado via motores locais.
*   **Atratividade Comercial:** Pagamento único evita "fadiga de assinatura" do usuário.
*   **Margem de Lucro Elevada:** Sem custos variáveis, o valor da licença é lucro líquido (menos taxas).

### Contras:
*   **Receita Não Recorrente:** Dependência de novas vendas constantes para manter o fluxo de caixa.
*   **Vulnerabilidade a Pirataria:** Software local é mais suscetível a cracks e desvio de licença.
*   **Suporte Heterogêneo:** Variedade de hardware e SO dos usuários pode gerar tickets de suporte complexos.
*   **Dependência de Hardware Terceiro:** A performance do bot é limitada pelo PC do usuário.

## 3. Sistema de Licenciamento
O software será protegido por um sistema de validação de chaves.

### Regras de Uso:
*   **Uma Chave, Uma Instância:** Cada chave de licença permite que apenas uma instância do EchoBot esteja "Ativa" e respondendo a comandos/áudio por vez.
*   **Portabilidade:** O usuário pode mover sua instalação de um servidor para outro, desde que a instância anterior seja desativada.
*   **Validação Remota:** O backend realizará um check-in periódico (heartbeat) com um servidor de licenças minimalista para garantir que a chave não está sendo usada em duplicidade.

## 4. Mecanismos de Proteção e Antipirataria

Para garantir a viabilidade comercial do modelo On-Premises, serão implementadas as seguintes camadas de segurança:

### A. Hardware ID (Fingerprinting)
*   **Vínculo Máquina-Chave:** No ato da ativação, o software gera um hash único baseado no hardware do usuário (ID da CPU, Placa-mãe, etc.).
*   **Bloqueio de Compartilhamento:** A licença só funcionará na máquina registrada, exigindo um processo de "transferência" (via suporte ou painel) para ser movida para outro servidor.

### B. Heartbeat e Validação de Instância
*   **Check-in Periódico:** O bot realiza uma requisição HTTPS silenciosa para o servidor de licenças a cada X minutos.
*   **Detecção de Duplicidade:** Se a mesma chave for detectada em IPs diferentes simultaneamente, o acesso às funções de IA (mesmo locais) pode ser temporariamente suspenso.

### C. Ofuscação e Compilação
*   **PyArmor (Python):** Uso de criptografia de bytecode para proteger a lógica de validação de licença no Backend.
*   **Binários Standalone:** Distribuição via executáveis compilados que dificultam a engenharia reversa e a leitura do código-fonte original.

### D. Assinatura Digital de Binários
*   Garantia de que o software não foi alterado (tampered) por terceiros para remover as travas de segurança.

## 5. Estratégia de Configuração e Tutoriais
Reconhecemos que a auto-hospedagem pode ser complexa para usuários não-técnicos. Para mitigar isso e garantir uma experiência premium, focaremos em documentação exaustiva.

### Roteiro de Tutoriais Planejados:
1.  **Instalação Básica:** Docker vs Executável nativo.
2.  **Configuração de Rede:** Abertura de portas e encaminhamento (Port Forwarding).
3.  **Domínios e Segurança:** Configuração de Reverse Proxy (Nginx/Nginx Proxy Manager) e certificados SSL (Let's Encrypt).
4.  **Banco de Dados:** Configuração do MongoDB local ou em nuvem (Atlas).
5.  **Integração de Voz:** Configuração do Voice Bridge e drivers de áudio virtual.
6.  **Provedores de IA:** Como criar contas e obter chaves de API (Google Gemini, OpenAI, Groq, ElevenLabs, etc.).

### Pontos de Atenção na Configuração:
*   **Padronização via Docker:** Recomendar fortemente o uso de Docker para minimizar problemas de ambiente (Python/Node/Libs).
*   **Checklist de Requisitos Mínimos:** Definir claramente os requisitos de CPU/RAM para STT e TTS local para alinhar expectativas de performance.
*   **Facilitação de Rede:** Desenvolver scripts ou ferramentas de diagnóstico para validar se as portas necessárias estão abertas.

## 6. Experiência do Usuário Final
Embora a configuração inicial exija esforço, o resultado final é superior:
*   **Latência Zero:** Rodando localmente ou em VPS próxima, a resposta é imediata.
*   **Estabilidade:** O bot não depende de um servidor central de terceiros para funcionar (além da validação de licença).
*   **Customização:** Acesso total aos arquivos de configuração e logs.

## 7. Próximos Passos
*   Desenvolver o validador de chaves (Heartbeat API).
*   Estruturar o instalador standalone (Executável/Docker).
*   Iniciar a redação dos tutoriais de configuração de rede e SSL.
