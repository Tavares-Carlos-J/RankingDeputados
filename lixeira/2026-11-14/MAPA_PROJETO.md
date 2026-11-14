# Mapeamento Geral do Projeto — Ranking Parlamentar

Este documento mapeia tudo o que já foi construído no projeto **Ranking Parlamentar (MVP)**, descrevendo o fluxo geral implementado, todas as pastas e todos os arquivos presentes no repositório e suas respectivas utilidades.

---

## 1. Visão Geral do Que Foi Feito

O projeto implementa um sistema de avaliação parlamentar em arquitetura desacoplada (**Static Data Pipeline**) para **40 deputados federais** da 57ª Legislatura e **20 projetos votados nominalmente**:

1. **Planejamento e Governança (Fase 1):** Definição da arquitetura, fórmulas matemáticas (Blocos A, B e C), schema do JSON final, regras para agentes em rodízio e lista inicial de parlamentares e projetos.
2. **Estrutura e Dados de Entrada:** Criação dos diretórios oficiais (`dados/`, `scripts/`, `public/`), configuração de deploy (`vercel.json`) e `.gitignore`, tabela fixa de tetos da CEAP por UF (`dados/tetos_ceap_2026.json`), catálogo oficial das 20 votações nominais (`dados/projetos.json`) e base dos 40 deputados com parâmetros manuais (`dados/deputados.json`).
3. **Pipeline Python de Coleta e Cálculo (Fase 2):**
   - Configuração do ambiente virtual `.venv` (Python 3.12.10 + `requests`).
   - Implementação e execução de `scripts/coletar.py`, gerando `dados/cache_bruto.json` a partir da API Dados Abertos da Câmara dos Deputados.
   - Implementação e execução de `scripts/calcular.py`, aplicando as fórmulas dos Blocos A, B e C e exportando `public/ranking_final.json`.
4. **Front-end Estático (Fase 3):** Construção da interface web em `public/` (HTML5, CSS3 e Vanilla JS ES6+) com cards de resumo, busca por nome, filtros por partido e UF, 5 modos de ordenação, tabela responsiva e modal de auditoria individual (decomposição dos blocos e votos nos 20 projetos).
5. **Estado Atual (Fase 4 pendente):** O pipeline e os arquivos estáticos estão prontos e servidos localmente em `public/`. Resta a inspeção visual final no navegador e a publicação no GitHub e na Vercel.

---

## 2. Mapa de Pastas

| Pasta | Utilidade | Versionada no Git? |
| :--- | :--- | :--- |
| `.git/` | Metadados e histórico do repositório Git local. | — (Controle Git) |
| `.venv/` | Ambiente virtual Python 3.12.10 isolado com a biblioteca `requests` instalada para rodar os scripts de coleta e cálculo. | Não (`.gitignore`) |
| `dados/` | Armazena as tabelas fixas, os arquivos de entrada curados manualmente, o cache bruto coletado da API da Câmara e arquivos temporários de apoio. | Parcial (arquivos principais sim; `_tmp/` e `_*` ignorados) |
| `dados/_tmp/` | Subpasta temporária criada durante o levantamento e validação dos IDs de deputados, proposições e votações na API da Câmara. | Não (`.gitignore`) |
| `scripts/` | Contém os scripts Python do back-end local (coleta na API e motor de cálculo do ranking). | Sim |
| `public/` | Pasta estática publicada na Vercel; contém o front-end (`index.html`, `style.css`, `app.js`) e o JSON consolidado (`ranking_final.json`). | Sim |

---

## 3. Mapa Completo de Arquivos

### 3.1. Raiz do Projeto

| Arquivo | Utilidade |
| :--- | :--- |
| `.gitignore` | Define os padrões ignorados pelo Git: `.venv/`, `__pycache__/`, `*.pyc`, `.DS_Store`, `dados/_tmp/` e `dados/_*`. |
| `README.md` | Arquivo inicial de apresentação do repositório (atualmente contém apenas o título `# RankingDeputados`). |
| `plano__ranking.md` | Plano mestre técnico do projeto: descreve a arquitetura *Static Data Pipeline*, estrutura de diretórios, modelagem dos JSONs, fórmulas matemáticas dos Blocos A, B e C, critérios de desempate e roteiro de implantação em 4 fases. |
| `lista_previa.md` | Documento de referência inicial listando os 20 projetos selecionados (2023–2026) e os 40 deputados federais (nome, partido e UF) escolhidos para o MVP. |
| `Regras-agentes.md` | Diretrizes obrigatórias para agentes de IA em rodízio no repositório (leitura prévia, stack permitida sem frameworks/bancos externos, respeito ao contrato de dados e escopo cirúrgico). |
| `Relatos.md` | Registro de estado atual e histórico cronológico de intervenções ("passagem de bastão") entre agentes. |
| `vercel.json` | Configuração de hospedagem estática na Vercel (`"cleanUrls": true`, `"outputDirectory": "public"`). |
| `MAPA_PROJETO.md` | Este arquivo de mapeamento geral da estrutura, pastas e arquivos do projeto. |

---

### 3.2. Pasta `scripts/`

| Arquivo | Utilidade |
| :--- | :--- |
| `scripts/coletar.py` | Consulta a API Dados Abertos da Câmara (`https://dadosabertos.camara.leg.br/api/v2`) a partir de `dados/deputados.json` e `dados/projetos.json`. Coleta perfil, foto, partido, UF, despesas CEAP paginadas (ano de referência 2026), órgãos/cargos e votos nominais nas 20 votações, usando pausa de `0.2s` entre requisições e retentativas para erros `429`/`5xx`. Grava o resultado em `dados/cache_bruto.json`. |
| `scripts/calcular.py` | Motor de cálculo do ranking. Lê `dados/deputados.json`, `dados/projetos.json`, `dados/tetos_ceap_2026.json` e `dados/cache_bruto.json`; calcula o **Bloco A** (Votações `V` e Presença `PRE`), **Bloco B** (Produção Legislativa `PL`, Articulação `AL` e Processos `PRO`) e **Bloco C** (Custo CEAP+Gabinete `G`, Desperdício `D` e Privilégios `PRI`); aplica a trava `[0, 10]`, ordena com critérios de desempate e gera `public/ranking_final.json`. |

---

### 3.3. Pasta `public/` (Front-end Estático e Saída)

| Arquivo | Utilidade |
| :--- | :--- |
| `public/index.html` | Estrutura HTML5 da aplicação web: cabeçalho com período e data da última atualização, 3 cards de resumo (média das notas, total de faltas e soma de gastos), barra de filtros (busca por nome, partido, UF e ordenação), tabela principal do ranking e estrutura do modal de detalhes do parlamentar. |
| `public/style.css` | Estilização CSS3 pura e responsiva: define paleta de cores via variáveis CSS, layout em grid/flex, destaque visual para Top 3 e faixas de nota (alta/média/baixa), estilização da tabela e do modal de detalhamento. |
| `public/app.js` | Lógica em Vanilla JavaScript (ES6+) que faz `fetch` de `ranking_final.json`, formata moedas/datas em `pt-BR`, atualiza os cards de resumo, popula dinamicamente os filtros de Partido e UF, aplica busca/filtros/5 modos de ordenação, renderiza a tabela e gerencia a abertura do modal com a decomposição dos Blocos A/B/C e a tabela de votos nos 20 projetos. |
| `public/ranking_final.json` | Base de dados final consolidada gerada por `scripts/calcular.py`, contendo `metadata` (data de atualização, totais, período) e a lista ordenada `ranking` com notas, blocos, indicadores, presença, gastos e votos por projeto dos 40 deputados. |

---

### 3.4. Pasta `dados/`

#### Arquivos principais
| Arquivo | Utilidade |
| :--- | :--- |
| `dados/tetos_ceap_2026.json` | Tabela fixa com os valores do teto mensal da CEAP (em reais) para todas as 27 Unidades Federativas. |
| `dados/projetos.json` | Catálogo dos 20 projetos avaliados no MVP, contendo `codigo`, `id_votacao` nominal na API da Câmara, `titulo`, `descricao_curta`, pontuação `np_sim` / `np_nao` e peso de relevância `rp`. |
| `dados/deputados.json` | Configuração de `parametros_globais` (`meses_avaliados`, piso/teto mensal de gabinete, total de privilégios monitorados) e lista dos 40 deputados (`id_camara`, `nome_referencia`, dados manuais de presença, custos de gabinete/privilégios e bônus/penalidades). |
| `dados/cache_bruto.json` | Snapshot bruto gerado por `scripts/coletar.py` com os dados baixados da API da Câmara para os 40 deputados (perfis, gastos CEAP, órgãos) e as 20 votações nominais. |

#### Arquivos temporários / auxiliares de depuração (ignorados pelo Git)
| Arquivo / Subpasta | Utilidade |
| :--- | :--- |
| `dados/_dep_toni.json` | Resposta bruta auxiliar de consulta na API referente à deputada Carol de Toni. |
| `dados/_lookup_votacoes.txt` | Anotação/saída auxiliar gerada durante a busca de IDs de votações na API. |
| `dados/_p1.json` | Resposta JSON auxiliar de consulta de proposição/votação usada em testes. |
| `dados/_p2903.json` | Resposta JSON auxiliar referente ao PL 2903/2023. |
| `dados/_tmp/deputados_57.json` | Listagem bruta completa dos deputados da 57ª Legislatura obtida na API da Câmara para mapear os `id_camara` dos 40 deputados. |
| `dados/_tmp/ids.txt` | Lista auxiliar de IDs de proposições/votações extraída durante o levantamento inicial. |
| `dados/_tmp/prop_*.json` (22 arquivos) | Respostas individuais da API para proposições consultadas durante a verificação das votações (`PEC 3/2021`, `PEC 9/2023`, `PEC 18/2025`, `PEC 45/2019`, `PLP 68/2024`, `PLP 93/2023`, `PLP 128/2025`, `PLP 136/2023`, `PL 490/2007`, `PL 583/2011`, `PL 914/2024`, `PL 1087/2025`, `PL 2159/2021`, `PL 2162/2023`, `PL 2253/2022`, `PL 2384/2023`, `PL 2628/2022`, `PL 2903/2023`, `PL 3626/2023`, `PL 4173/2023`, `PL 5230/2023`, `PL 5582/2025`). |
| `dados/_tmp/votacoes_resumo.txt` | Resumo textual das votações retornadas pela API durante a seleção dos `id_votacao` nominais. |
| `dados/_tmp/votos_sample.json` | Amostra de retorno de votos da API usada para validar o formato do endpoint `/votacoes/{id}/votos`. |
| `dados/_tmp/vot_*.json` (21 arquivos) | Respostas individuais da API para votações específicas consultadas por ID (`vot_257161.json`, `vot_345311.json`, `vot_493361.json`, `vot_2196833.json`, `vot_2270800.json`, `vot_2352476.json`, `vot_2357053.json`, `vot_2358548.json`, `vot_2360503.json`, `vot_2372071.json`, `vot_2374400.json`, `vot_2383287.json`, `vot_2399598.json`, `vot_2403910.json`, `vot_2422697.json`, `vot_2430143.json`, `vot_2477340.json`, `vot_2487436.json`, `vot_2500080.json`, `vot_2520670.json`, `vot_2579832.json`). |
