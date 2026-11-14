# Plano de Evolução e Arquitetura — Ranking Parlamentar (`PLANO_EVOLUCAO.md`)

Este documento é o **Pilar #2** da governança do projeto **Ranking Parlamentar**. Ele consolida o mapeamento atual do repositório, analisa e formaliza as decisões arquiteturais de evolução do MVP (57ª Legislatura — Dados de Teste) para a versão oficial de produção (58ª Legislatura — a partir de 01/01/2027).

---

## 0. Governança Documental do Projeto (Os 4 Arquivos Principais)

Para eliminar fragmentação de documentos antigos (`plano__ranking.md`, `Regras-agentes.md`, `Relatos.md`, `lista_previa.md`), o projeto passa a ser regido exclusivamente por **4 documentos mestres na raiz**:

| Ordem | Arquivo | Função Principal | Antigo Equivalente |
| :--- | :--- | :--- | :--- |
| **1º** | `PROMPT_GERAL.md` | **Leitura obrigatória inicial.** Contém as regras imutáveis de arquitetura, restrições de stack, padrões de código e conduta para desenvolvedores e agentes de IA. | `Regras-agentes.md` |
| **2º** | `PLANO_EVOLUCAO.md` | **(Este arquivo)** Define a visão estrutural, regras de negócio, fórmulas matemáticas, modelo de dados, escalabilidade e diretrizes de evolução do sistema. | `MAPA_PROJETO.md` + `plano__ranking.md` |
| **3º** | `RELATORIO_AGENTE.md` | Diário de bordo técnico ("passagem de bastão"). Registra o que foi feito em cada sessão, qual UF ou módulo foi atualizado e pendências imediatas. | `Relatos.md` |
| **4º** | `ROADMAP.md` | Cronograma executivo passo a passo indicando **o que** será feito, **como** será validado e **quando** cada etapa entra em vigor (incluindo a curadoria de perspectivas). | `lista_previa.md` + Fases do plano antigo |

---

## 1. Análise Crítica das Mudanças Sugeridas (Validação de Engenharia)

Antes de consolidar as novas regras, cada mudança proposta foi avaliada sob a ótica de **manutenibilidade, performance e justiça matemática**. Abaixo está o parecer técnico do que foi **integralmente adotado** e dos **ajustes de proteção** recomendados:

### 1.1. Fim dos Micro-Arquivos JSON (`prop_*.json` e `vot_*.json`)
* **Sua proposta:** Evitar arquivos individuais de poucas linhas para cada lei/votação (ex.: `prop_PEC_3_2021.json`), consolidando em documentos gerais.
* **Parecer Técnico (Aprovado com Regra de Limite):** Excelente decisão. Ter dezenas de micro-arquivos polui o diretório, dificulta auditoria humana e torna a leitura em disco mais lenta.
* **Como ficará:** Todas as proposições e gabaritos ficam unificados em `dados/projetos.json` e o cache das votações nominais fica unificado em `dados/cache_votacoes.json`.
* **Alerta Técnico (Proteção de Escalabilidade):** Para leis e votações, um arquivo único geral é perfeito (ocupa poucos megabytes). Porém, para as **notas fiscais da CEAP de 513 deputados ao longo de vários anos**, um único arquivo bruto passaria facilmente de $100\text{ MB}$ (limite de bloqueio do GitHub). Portanto, centralizaremos proposições e votações em arquivos gerais únicos, mas separaremos o cache pesado de despesas por **UF** (`dados/cache_ceap/UF.json`), o que casa perfeitamente com a sua ideia de atualização por Estado.

### 1.2. Dados de Teste Explícitos e Reset Oficial em 01/01/2027
* **Sua proposta:** Explicitar os dados atuais como Dados de Teste e zerar oficialmente o ranking em 1º de janeiro de 2027.
* **Parecer Técnico (Aprovado com Alerta de Calendário Legislativo):** Essencial para transparência jurídica e credibilidade pública. O site e os JSONs atuais terão a flag `"ambiente": "TESTE_MVP"` e um aviso visual claro no topo da interface.
* **Detalhe importante a considerar:** Embora o ranking zere oficialmente em **01/01/2027**, a posse constitucional dos deputados eleitos para a 58ª Legislatura ocorre em **01/02/2027** (e as votações nominais começam após a eleição da Mesa Diretora, em fevereiro). Portanto, entre 01/01/2027 e a primeira votação nominal de 2027, o sistema exibirá a base da nova legislatura com status `"Aguardando início das votações da 58ª Legislatura"`, evitando divisões por zero no código.

### 1.3. Histórico de Carreira e Gastos Totais (Exclusivo para Assumintes em 2027)
* **Sua proposta:** Para quem assumir em 2027, exibir dados históricos gerais com gastos de todos os anos anteriores em função e histórico de carreira do parlamentar.
* **Parecer Técnico (Aprovado com Isolamento de Escopo):** Funcionalidade de altíssimo valor agregado ("Ficha Limpa / Dossiê de Carreira").
* **Cuidado Arquitetural Crítico (O que não fazer):** O gasto histórico de mandatos anteriores (ex.: 2015–2026) **não pode contaminar a nota de Custo e Conduta ($0$ a $10$) do mandato de 2027**, senão um deputado reeleito já começaria 2027 com nota diferente de um deputado de 1º mandato antes mesmo de trabalhar um único dia.
* **Solução Adotada:** Os dados históricos (mandatos anteriores, soma histórica de CEAP/Gabinete por ano, histórico partidário e projetos aprovados na carreira) ficarão em um módulo estático separado (`dados/historico_carreira/`) e serão exibidos no **Modal de Perfil do Parlamentar** como **"Dossiê de Carreira (Mandatos Anteriores)"**, mantendo a nota ativa 100% justa e restrita ao mandato vigente.

### 1.4. Atualização de Parlamentares por UF em Ordem Alfabética (`AC` $\rightarrow$ `TO`)
* **Sua proposta:** Inserir e atualizar parlamentares estado por estado, em ordem alfabética, com análise e correção após cada UF.
* **Parecer Técnico (Aprovado — Melhor Prática de Qualidade de Dados):** Como a lista da 58ª Legislatura terá $513$ deputados, fazer tudo de uma vez geraria erros silenciosos (homônimos, IDs trocados, suplentes). Começar pelo Acre (`AC`, $8$ deputados), Alagoas (`AL`, $9$ deputados), Amazonas (`AM`, $8$ deputados) e Amapá (`AP`, $8$ deputados) permite validar o script em lotes pequenos antes de chegar a São Paulo (`SP`, $70$ deputados).
* **Refinamento Prático:** O script `scripts/coletar.py` e um novo `scripts/auditar_uf.py` aceitarão o parâmetro `--uf SIGLA` (ex.: `python scripts/coletar.py --uf AC`). Para a **inserção inicial e auditoria de cadastro/histórico**, o processo será estritamente UF por UF com trava de validação humana. Já para a atualização diária de uma votação nominal em plenário (quando todos os 513 já estiverem auditados), o sistema também permitirá rodar o lote completo caso você deseje economizar tempo, mantendo o modo por UF sempre disponível.

### 1.5. `README.md` Simplificado em Cada Pasta e Subpasta
* **Sua proposta:** Toda pasta ou subpasta deve conter um `README.md` explicando de forma simples o que é a pasta e sua função.
* **Parecer Técnico (Aprovado Integralmente):** Excelente para organização e para orientar agentes de IA a nunca salvarem arquivos no lugar errado.

### 1.6. Nova Regra de Cálculo: Perspectivas ($0{,}7$) + Custo e Conduta Fixa ($0{,}3$) e Voto estilo "Prova" ($0$ ou $1$)
* **Sua proposta:**
  1. Nota de **Custo e Conduta** é **fixa** (independe de perspectiva) e tem peso $0{,}3$ ($30\%$).
  2. Nota por **Perspectiva** (baseada nos votos) tem peso $0{,}7$ ($70\%$).
  3. O voto funciona como questão de prova: votar de acordo com a perspectiva ("acertar") vale $1$; votar contra ("errar"), faltar ("ausente") ou se abster ("abstenção") vale $0$. A nota de votos da perspectiva é convertida para a escala de $0$ a $10$.
* **Parecer Técnico (Aprovado — Muito Mais Limpo e Auditável):** No modelo antigo, notas negativas ou pesos intermediários em votos geravam distorções difíceis de explicar ao cidadão comum. O modelo binário de prova ($\text{Acerto} = 1$, $\text{Erro/Ausência/Abstenção} = 0$) multiplicado por $10$ é matematicamente transparente: se uma perspectiva avalia $20$ projetos de mesmo peso e o deputado acertou $15$, a nota de voto dele naquela perspectiva é exatamente $7{,}50$.
* **Refinamento na Presença:** Como a ausência em uma votação nominal já zera a questão daquela votação (penalizando os $70\%$ da Perspectiva), a presença geral em sessões deliberativas continua compondo parte da nota fixa de **Conduta** (nos $30\%$), garantindo que o deputado que comparece a sessões sem votações-chave também seja avaliado pela assiduidade.

### 1.7. Critérios de Desempate Definidos
* **Sua proposta:** Em caso de empate na Nota Final:
  1. Menor número de **faltas não justificadas**;
  2. Menor número de **faltas gerais** (justificadas + não justificadas);
  3. Maior número de **projetos aprovados**;
  4. Menor **custo total ao povo**.
* **Parecer Técnico (Aprovado + 5º Critério Técnico de Segurança):** A ordem reflete perfeitamente o mérito parlamentar (assiduidade estrita $\rightarrow$ presença efetiva $\rightarrow$ produtividade real $\rightarrow$ economia de recursos públicos). Adicionamos apenas um **5º critério puramente computacional** (ordem alfabética do nome parlamentar) para o dia 01/01/2027, quando todos os 513 deputados estarão empatados com tudo zerado.

### 1.8. Perspectivas: Definição Estrutural Agora e Curadoria no Roadmap
* **Sua proposta:** Definir neste documento apenas *como* as perspectivas funcionarão tecnicamente, sem cravar quais serão agora, deixando explícito que o `ROADMAP.md` terá uma etapa dedicada de **Curadoria e Análise de Perspectivas** apoiada por um **Arquivo de Instrução de Pensamento**.
* **Parecer Técnico (Aprovado):** Desacopla a engenharia de software da ciência política. O código fica pronto para receber $N$ perspectivas via JSON sem precisar alterar uma única linha de Python ou JavaScript quando as perspectivas forem escolhidas.

---

## 2. Arquitetura do Sistema e Mapa de Pastas

O projeto mantém a arquitetura **Static Data Pipeline** (Back-end local em Python para coleta, auditoria e cálculo $\rightarrow$ Front-end estático em HTML5/CSS3/Vanilla JS servido na Vercel), agora reestruturada para escalabilidade sem micro-arquivos.

### 2.1. Nova Estrutura de Diretórios (com Regra de `README.md`)

Cada diretório e subdiretório listado abaixo **deve conter obrigatoriamente um arquivo `README.md`** curto (máximo de 15 a 30 linhas) explicando sua finalidade, quais arquivos entram ali e qual script os consome ou gera.

```text
/ (Raiz do Projeto)
├── PROMPT_GERAL.md                # [Pilar 1] Regras imutáveis para Agentes e Devs
├── PLANO_EVOLUCAO.md              # [Pilar 2] Arquitetura, Fórmulas e Evolução (Este arquivo)
├── RELATORIO_AGENTE.md            # [Pilar 3] Log de atualizações e passagem de bastão
├── ROADMAP.md                     # [Pilar 4] Passo a passo cronológico e marcos do projeto
├── README.md                      # Apresentação pública do repositório
├── vercel.json                    # Configuração de deploy estático
├── .gitignore                     # Ignora .venv/, __pycache__/ e caches temporários
│
├── dados/                         # Base de dados estruturada
│   ├── README.md                  # Explica a organização geral da pasta dados/
│   ├── configuracao_sistema.json  # Flag de Modo (TESTE_MVP vs OFICIAL_2027), ano vigente e parâmetros
│   ├── tetos_ceap.json            # Tabela oficial de tetos mensais da CEAP para as 27 UFs
│   ├── projetos.json              # Catálogo ÚNICO de todas as proposições/votações avaliadas (sem prop_*.json soltos)
│   ├── cache_votacoes.json        # Cache ÚNICO consolidado com os votos nominais baixados da API
│   │
│   ├── perspectivas/              # Subpasta de governança e gabaritos das perspectivas
│   │   ├── README.md              # Explica o funcionamento dos gabaritos de perspectivas
│   │   ├── INSTRUCAO_PENSAMENTO.md# Diretrizes filosóficas/analíticas para curadoria de perspectivas
│   │   └── catalogo_perspectivas.json # Definição das perspectivas ativas e seus gabaritos por votação
│   │
│   ├── parlamentares_uf/          # Cadastro e cache de deputados divididos pelas 27 UFs (AC.json até TO.json)
│   │   ├── README.md              # Explica o fluxo de inserção e validação em ordem alfabética por UF
│   │   └── [UF].json              # Ex: AC.json, AL.json... (Dados cadastrais, presença, conduta e CEAP do ano)
│   │
│   └── historico_carreira/        # Dossiê histórico (exclusivo para deputados da 58ª Legislatura - 2027)
│       ├── README.md              # Explica a coleta única do histórico de mandatos e gastos passados
│       └── historico_geral.json   # Gastos anuais passados, mandatos anteriores e carreira de cada parlamentar
│
├── scripts/                       # Pipeline Python (Coleta, Auditoria por UF e Motor de Cálculo)
│   ├── README.md                  # Explica como executar cada script e seus argumentos CLI
│   ├── coletar.py                 # Coleta dados da API da Câmara (suporta --uf SIGLA e --historico)
│   ├── auditar_uf.py              # Valida integridade dos dados de uma UF específica antes de aprovar
│   └── calcular.py                # Aplica a nova fórmula (0.7 Perspectiva + 0.3 Custo/Conduta) e gera o JSON final
│
├── scripts/                      # Pasta onde ficará itens antigos, será limpa periódicamente
│
│
└── public/                        # Front-end Estático publicado na Vercel
    ├── README.md                  # Explica os arquivos da interface web e contrato do JSON consumido
    ├── index.html                 # Interface com banner de Modo Teste, seletor de Perspectivas e Ranking
    ├── style.css                  # Estilização responsiva
    ├── app.js                     # Lógica de filtros, troca dinâmica de Perspectivas, desempate e Modal de Histórico
    └── ranking_final.json         # Saída única consolidada pronta para consumo imediato no navegador

```

> **Nota sobre limpeza (`dados/_tmp/`):** Os 43 micro-arquivos antigos (`dados/_tmp/prop_*.json` e `dados/_tmp/vot_*.json`) serão eliminados assim que seus metadados úteis estiverem consolidados no arquivo geral `dados/projetos.json` e `dados/cache_votacoes.json`. É expressamente proibida a criação de arquivos JSON individuais por projeto de lei.

---

## 3. Regime de Dados: Modo Teste vs. Reset Oficial (01/01/2027) e Histórico

### 3.1. Explicitação de Dados de Teste (Fase Atual até 31/12/2026)
Enquanto o sistema opera com os dados da 57ª Legislatura (amostra de 40 deputados ou expansão gradual de testes), todo o ecossistema deve deixar explícito o caráter experimental:
1. **No JSON (`public/ranking_final.json`):** O bloco `metadata` conterá obrigatoriamente:
   * `"modo_operacao": "DADOS_DE_TESTE"`
   * `"aviso_legal": "Ambiente de homologação e calibragem metodológica (57ª Legislatura). O ranking oficial terá início em 01/01/2027 com notas zeradas."`
2. **Na Interface (`public/index.html`):** Um banner fixo de destaque informará ao usuário que os dados exibidos são de **Teste / Calibragem** e que a contagem oficial valerá a partir de **1º de janeiro de 2027**.

### 3.2. O Marco Zero (01/01/2027)
No dia **1º de janeiro de 2027**:
* O arquivo `configuracao_sistema.json` mudará para `"modo_operacao": "OFICIAL_58_LEGISLATURA"`.
* Todas as variáveis do mandato ativo (votos em projetos de 2027, faltas em 2027, gastos de CEAP e gabinete de 2027) iniciarão **oficialmente zeradas** ($0$).
* Nenhum ponto positivo ou negativo do período de testes será transferido para a nota de 2027.

### 3.3. Módulo de Histórico Parlamentar (Exclusivo para Assumintes em 2027)
Para todos os $513$ deputados que tomarem posse na 58ª Legislatura (2027–2030), o sistema manterá o registro de **Histórico de Carreira** (`dados/historico_carreira/historico_geral.json`), contendo:
* **Grau de Experiência:** Indicador se é parlamentar de 1º mandato ("Novato na Câmara") ou reeleito/veterano, listando quais legislaturas anteriores exerceu (ex.: 55ª, 56ª, 57ª).
* **Histórico Financeiro Acumulado:** Tabela com o gasto total anual do parlamentar em todos os anos anteriores em que esteve em exercício (CEAP + Verba de Gabinete discriminados ano a ano e somatório total da carreira).
* **Resumo de Carreira:** Histórico de partidos pelos quais passou, cargos relevantes ocupados em Mesas/Comissões e total de leis aprovadas em mandatos anteriores.
* **Isolamento:** Esses dados são **100% informativos e permanentes** (exibidos em uma aba própria dentro do Modal de Auditoria do Parlamentar), não alterando a matemática da nota de $0$ a $10$ do ano em curso.

---

## 4. Protocolo de Inserção e Atualização por UF (Ordem Alfabética)

Por se tratar da parte mais sensível do sistema (garantir que cada parlamentar tenha seu `id_camara` correto, foto válida, teto de CEAP correspondente ao seu Estado, histórico correto e dados de gabinete revisados), toda inserção ou atualização estrutural de parlamentares seguirá o **Fluxo Sequencial por UF**:

1. **Ordem Estrita de Execução (27 etapas):**
   `AC` $\rightarrow$ `AL` $\rightarrow$ `AM` $\rightarrow$ `AP` $\rightarrow$ `BA` $\rightarrow$ `CE` $\rightarrow$ `DF` $\rightarrow$ `ES` $\rightarrow$ `GO` $\rightarrow$ `MA` $\rightarrow$ `MG` $\rightarrow$ `MS` $\rightarrow$ `MT` $\rightarrow$ `PA` $\rightarrow$ `PB` $\rightarrow$ `PE` $\rightarrow$ `PI` $\rightarrow$ `PR` $\rightarrow$ `RJ` $\rightarrow$ `RN` $\rightarrow$ `RO` $\rightarrow$ `RR` $\rightarrow$ `RS` $\rightarrow$ `SC` $\rightarrow$ `SE` $\rightarrow$ `SP` $\rightarrow$ `TO`.
2. **Ciclo de Validação por Estado (Gate de Qualidade):**
   Para cada UF:
   * **Passo 1 (Coleta):** Executa-se a coleta exclusiva daquela UF (`python scripts/coletar.py --uf AC`).
   * **Passo 2 (Auditoria Automatizada):** Executa-se `python scripts/auditar_uf.py --uf AC`, que verifica:
     * Quantidade exata de cadeiras daquela UF na Câmara;
     * Ausência de campos nulos (`null`) em ID, nome, partido, foto ou despesas;
     * Consistência dos valores de CEAP com as notas fiscais da API e teto da UF.
   * **Passo 3 (Análise e Correção):** Caso haja divergência (ex.: suplente que assumiu, mudança de nome parlamentar, erro de paginação na API), corrige-se imediatamente o arquivo `dados/parlamentares_uf/[UF].json` e registra-se no `RELATORIO_AGENTE.md` antes de avançar para a próxima letra do alfabeto.

---

## 5. Motor Matemático Oficial (Fórmulas e Desempate)

A avaliação de cada parlamentar é dividida em duas dimensões claras: o **Alinhamento de Votos por Perspectiva** (peso $0{,}7$) e a **Nota Fixa de Custo e Conduta** (peso $0{,}3$). Todas as notas operam estritamente na escala de $0{,}00$ a $10{,}00$.

### 5.1. Nota da Perspectiva ($N_P$) — Escala de $0$ a $10$ (Peso $0{,}7$)

Cada votação nominal avaliada funciona exatamente como uma **questão de prova** sob a ótica da Perspectiva selecionada ($P$).

Para cada projeto/votação $i \in \{1, 2, \dots, n\}$ avaliado pela perspectiva $P$:
* Define-se o voto esperado pela perspectiva ($G_{P,i} \in \{\text{SIM}, \text{NÃO}\}$).
* Define-se o peso de relevância do projeto ($RP_i > 0$; caso todos tenham igual relevância, $RP_i = 1$).
* A pontuação unitária do voto do parlamentar ($v_{P,i}$) é **estritamente binária** ($0$ ou $1$):

$$v_{P,i} = \begin{cases} 1, & \text{se o voto do parlamentar for igual ao gabarito } G_{P,i} \text{ ("Acertou")} \\ 0, & \text{se o voto for contrário ("Errou"), Ausente, Abstenção ou Obstrução desalinhada} \end{cases}$$

A **Nota da Perspectiva ($N_P$)**, convertida para a escala de $0$ a $10$, é dada pela média ponderada de acertos multiplicada por $10$:

$$N_P = 10 \times \frac{\sum_{i=1}^{n} \left( v_{P,i} \times RP_i \right)}{\sum_{i=1}^{n} RP_i}$$

> **Trava de Segurança para Início de Mandato:** Se $\sum RP_i = 0$ (nenhuma votação ocorrida ainda no ano, como em 01/01/2027), define-se $N_P = 0{,}00$.

---

### 5.2. Nota Fixa de Custo e Conduta ($N_{CC}$) — Escala de $0$ a $10$ (Peso $0{,}3$)

A nota de **Custo e Conduta ($N_{CC}$)** é **única e fixa para cada deputado**, independentemente de qual perspectiva ideológica/temática o usuário escolha na tela. Ela mede a eficiência no uso do dinheiro público, a assiduidade física e a postura ética/produtiva no mandato vigente.

Ela é composta pela combinação padronizada (de $0$ a $10$) dos indicadores objetivos de gestão e comportamento parlamentar:
1. **Economia de Recursos Públicos ($E_{custo}$, de $0$ a $10$):** Avalia o quão econômico o deputado foi na soma de CEAP + Verba de Gabinete + uso de Privilégios/Auxílios em relação ao limite máximo permitido para a sua UF nos meses avaliados. Quanto menor o gasto e a renúncia a privilégios, mais próxima de $10$ é a nota.
2. **Assiduidade e Conduta Disciplinar ($E_{conduta}$, de $0$ a $10$):** Avalia a taxa de presença nas sessões deliberativas do período (penalizando severamente faltas não justificadas) combinada com a ficha de integridade (ausência de processos éticos/judiciais ou punições no Conselho de Ética) e efetividade legislativa.

A Nota Fixa de Custo e Conduta ($N_{CC}$) é travada no intervalo $[0, 10]$:

$$N_{CC} = \min\left(10{,}00, \; \max\left(0{,}00, \; \text{Média Ponderada}(E_{custo}, E_{conduta})\right)\right)$$

---

### 5.3. Nota Final por Perspectiva ($NF_P$)

Para qualquer perspectiva $P$ selecionada pelo usuário, a **Nota Final ($NF_P$)** do parlamentar é calculada aplicando peso de $70\%$ ($0{,}7$) para a Nota da Perspectiva e $30\%$ ($0{,}3$) para a Nota Fixa de Custo e Conduta:

$$NF_P = \left( 0{,}7 \times N_P \right) + \left( 0{,}3 \times N_{CC} \right)$$

* Exemplo prático: Se um deputado tirou $N_P = 8{,}00$ nos votos da Perspectiva $X$ e possui uma Nota Fixa de Custo e Conduta $N_{CC} = 9{,}00$:
  $$NF_X = (0{,}7 \times 8{,}00) + (0{,}3 \times 9{,}00) = 5{,}60 + 2{,}70 = 8{,}30$$

---

### 5.4. Critérios Oficiais de Desempate no Ranking

Sempre que dois ou mais parlamentares apresentarem exatamente a mesma **Nota Final ($NF_P$)** (considerando duas casas decimais), a posição no ranking será decidida rigorosamente na seguinte ordem sequencial de desempate:

1. **1º Critério — Faltas Não Justificadas (Menor vence):** Fica à frente o parlamentar que tiver o **menor número de faltas não justificadas** acumuladas no mandato vigente.
2. **2º Critério — Faltas Gerais / Totais (Menor vence):** Persistindo o empate, fica à frente o parlamentar que tiver o **menor número de faltas totais** (soma de faltas justificadas + não justificadas).
3. **3º Critério — Projetos Aprovados (Maior vence):** Persistindo o empate, fica à frente o parlamentar que tiver o **maior número de projetos aprovados** de sua autoria/relatoria no mandato vigente.
4. **4º Critério — Custo Total ao Povo (Menor vence):** Persistindo o empate, fica à frente o parlamentar que tiver gerado o **menor custo financeiro acumulado ao erário** (soma em $\text{R\$}$ de CEAP + Verba de Gabinete + Auxílios no mandato vigente).
5. **5º Critério Técnico (Apenas para Determinismo Computacional):** Ordem alfabética crescente do `nome_parlamentar` (utilizado exclusivamente quando os 4 critérios anteriores forem idênticos, como no dia 01/01/2027 com o ranking zerado).

---

## 6. Arquitetura de Perspectivas (Estrutura e Curadoria)

Conforme diretriz de evolução do projeto, **não definiremos neste momento quais serão os nomes ou linhas das perspectivas**. O sistema deve ser construído de forma agnóstica e plugável.

### 6.1. Como as Perspectivas Funcionam Tecnicamente
1. No arquivo `dados/perspectivas/catalogo_perspectivas.json`, cada perspectiva é um objeto independente no formato:
   * `id_perspectiva`: Identificador único (ex.: `"perspectiva_01"`).
   * `titulo`: Nome de exibição na interface.
   * `resumo_criterio`: Breve explicação do que aquela visão prioriza ao avaliar uma lei.
   * `gabarito`: Dicionário associando o código de cada projeto (`"PL_XXXX_202X"`) ao voto considerado correto (`"SIM"` ou `"NAO"`) e seu respectivo peso ($RP_i$).
2. O script `scripts/calcular.py` lê todas as perspectivas cadastradas nesse catálogo e pré-calcula o vetor de notas finais `notas_por_perspectiva` para cada deputado dentro do `public/ranking_final.json`.
3. No front-end (`public/app.js`), um seletor de perspectivas no topo da página permite ao cidadão alternar instantaneamente entre as perspectivas disponíveis (ou visualizar apenas a nota fixa de Custo e Conduta), reordenando a tabela em tempo real no navegador usando a nota da perspectiva ativa e os 4 critérios oficiais de desempate.

### 6.2. Etapa Obrigatória no Roadmap: Curadoria e Instrução de Pensamento
Fica formalmente estabelecido que o arquivo `ROADMAP.md` conterá uma **Etapa Exclusiva de Curadoria e Análise de Perspectivas** antes do lançamento oficial. Nessa etapa será criado e utilizado o arquivo **`dados/perspectivas/INSTRUCAO_PENSAMENTO.md`**, que servirá como um **Guia de Raciocínio e Análise Legislativa** (instrução de pensamento para humanos e agentes de IA) definindo:
* Quais premissas filosóficas, econômicas, sociais e jurídicas caracterizam cada perspectiva que vier a ser criada;
* Como analisar o texto real de uma PEC, PLP ou PL (evitando cair em títulos enganosos de projetos e focando no efeito prático da lei sobre o cidadão e o Estado);
* O protocolo passo a passo para atribuir `"SIM"` ou `"NAO"` no gabarito de cada perspectiva com justificativa pública auditável.

---

## 7. Mapeamento de Transição do Repositório (Estado Atual $\rightarrow$ Nova Estrutura)

Abaixo está o quadro de evolução do que já existe hoje no repositório para o padrão definitivo definido neste documento:

| Item / Funcionalidade | Como Está Hoje (MVP Atual) | Como Ficará na Evolução |
| :--- | :--- | :--- |
| **Arquivos de Governança** | Espalhados em `plano__ranking.md`, `MAPA_PROJETO.md`, `Regras-agentes.md`, `Relatos.md`, `lista_previa.md`. | Centralizados nos **4 Arquivos Principais**: `PROMPT_GERAL.md`, `PLANO_EVOLUCAO.md`, `RELATORIO_AGENTE.md` e `ROADMAP.md`. |
| **Documentação de Pastas** | Apenas um `README.md` de 1 linha na raiz. | Cada pasta e subpasta terá seu próprio `README.md` curto e didático explicando sua função. |
| **Arquivos de Leis/Votações** | $22$ arquivos `prop_*.json` e $21$ arquivos `vot_*.json` soltos em `dados/_tmp/`. | **Proibidos micro-arquivos.** Tudo unificado em `dados/projetos.json` e `dados/cache_votacoes.json`. |
| **Base de Parlamentares** | Arquivo único `dados/deputados.json` com $40$ deputados misturados. | Dividido e auditado em ordem alfabética por UF em `dados/parlamentares_uf/[UF].json` (`AC` até `TO`). |
| **Identificação de Testes** | Dados da 57ª Legislatura exibidos sem aviso explícito de ambiente de teste. | Flag `"DADOS_DE_TESTE"` no JSON + Banner visual na interface + Reset programado para **01/01/2027**. |
| **Histórico do Parlamentar** | Inexistente (mostra apenas gastos de 2026). | Módulo `dados/historico_carreira/historico_geral.json` para os assumintes de 2027 com gastos de todos os anos anteriores e trajetória política. |
| **Fórmula Matemática** | Blocos A, B e C com pesos mistos e notas variáveis em votos. | **Perspectiva ($0{,}7$)** com voto binário estilo prova ($\text{Acerto}=1$, $\text{Erro/Ausência/Abstenção}=0$) + **Custo e Conduta Fixa ($0{,}3$)**. |
| **Critérios de Desempate** | Desempate antigo por blocos. | **1º** Faltas não justificadas $\rightarrow$ **2º** Faltas gerais $\rightarrow$ **3º** Projetos aprovados $\rightarrow$ **4º** Custo ao povo. |
| **Sistema de Perspectivas** | Gabarito único fixo em `projetos.json` (`np_sim` / `np_nao`). | Múltiplas perspectivas plugáveis via `dados/perspectivas/catalogo_perspectivas.json` + etapa de curadoria com `INSTRUCAO_PENSAMENTO.md` no `ROADMAP.md`. |