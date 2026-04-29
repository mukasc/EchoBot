# Estratégia de Negócios, Distribuição e Expansão

A força legal do projeto é erguida sobre a espinha dorsal de uma licença Proprietária ("All Rights Reserved"), reservando todo o direito criativo sobre o código do Cronista. O produto deve prosperar entregando autonomia máxima no *On-Premises* enquanto amadurece o plano de domínio em nuvem (SaaS).

## 1. Distribuição On-Premises (Estilo VTT Tradicional)
O alvo primário é o Game Master exigente. Ele entrega o poder computacional e compra o direito vitalício da inteligência e automação.

### A. Estrutura de Assinatura Limitada (Tiers)
1. **Tier "O Aventureiro" (Essential):** Concessão de uso da licença vitalícia para transcrição da campanha local e atualizações de estrutura.
2. **Tier "Mestre da Guilda" (Pro):** Acesso premium à comunidade. Entrega de pacotes massivos de vozes (formatos `.bin` ajustados para vilões e heróis) de uso irrestrito com Kokoro TTS e Marketplace de sub-prompts.
3. **Tier "Guardião dos Pergaminhos" (Enterprise):** Licença de acesso especial e *Fallback* da nossa nuvem privada e atendimento corporativo (*Setup VIP* para servidores Nginx, Docker, SSL).

### B. Oferta de Fundação & Passaporte (Manutenção)
Para erguer caixa inicial e mitigar estagnação a longo prazo:
- Oferta com alta escassez (*Edição de Fundador*): As primeiras unidades garantem update vitalício ilimitado.
- Advento do "Passaporte de Manutenção": Após a adoção precoce, a licença garante funcionamento perene, contudo correções vitais/novos formatos demandam anuidade reduzida.

### C. Barreira contra Pirataria e Compartilhamento Ilícito
Uso da lógica **Single Instance Enforcement**. O binário da plataforma exigirá uma verificação leve (*ping validation* à nossa rede LicenseSpring/Autoral). Associada a um `Hardware ID Hash` gerado na ativação, bloqueará a operação comercial dividida; limitando execuções ilícitas para proteger a propriedade intelectual principal.

## 2. Abatimento Radical da Fricção de Setup
Comercializar para autohospedagem exige destruir a barreira da dificuldade. Para tanto, fornecemos um ecossistema com foco de documentação *Low Friction*:
- **Abolição da Necessidade de Sysadmin:** Migração do complexo banco MongoDB para modelos auto-sustentáveis (*Flat-File/SQLite*).
- **Pacote Tudo-em-Um:** Executáveis compactos ou roteiros Docker que sobem em dois cliques acompanhados de documentação extrema de portas, IPs e SSL.

## 3. Horizon 2: Arquitetura Multilocatário em Nuvem (SaaS)
Para captar o hobbyista eventual, que despreza configurações técnicas, a infraestrutura caminha para o provedor "Plug & Play". 

- **Tokenização Monetária ("Créditos"):** Comercialização de cotas operacionais baseadas por Sessão. Com um custo fixo de API computado, os créditos isentam a desenvolvedora do risco de uso abusivo dos LLMs.
- **Divisão Arquitetural:** Motor Whisper demandando GPUs transientes gerenciadas dinamicamente e os modelos locais (Kokoro TTS) executados perfeitamente em clusters massivos de CPU garantindo custo marginal nulo para entrega do resultado narrado.
- **O Isca Perfeita:** A oferta implacável de crédito de fundação e refino textual contínuo (*in-session*) blindando contra qualquer aversão do jogador comum.
