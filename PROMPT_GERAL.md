# PROMPT_GERAL.md — Regras Permanentes do Agente

> ⚠️ **LEITURA OBRIGATÓRIA ANTES DE QUALQUER AÇÃO.** Leia este arquivo inteiro antes de propor, criar, editar, mover ou executar qualquer coisa neste repositório. Se não puder cumprir alguma regra, **pare e pergunte ao usuário**.

---

## 1. Ordem de leitura e precedência

1. **`PROMPT_GERAL.md`** (este arquivo): regras.
2. **`PLANO_EVOLUCAO.md`**: Consulte Antes da ação para ter certeza do que é necessário ser feito.
3. **`RELATORIO_AGENTE.md`**: Preencha como indicado após a ação.
4. **`ROADMAP.md`**: Sinalize a etapa ou passo como concluído.


**Em caso de conflito:** `PROMPT_GERAL.md` > `PLANO_EVOLUCAO.md` > `ROADMAP.md` > `RELATORIO_AGENTE.md` > documentos legados (`plano__ranking.md`, `Regras-agentes.md`, `Relatos.md`, `MAPA_PROJETO.md`, `lista_previa.md`). Os legados estão **substituídos** e não devem mais ser atualizados. A passagem de bastão agora é feita só em `RELATORIO_AGENTE.md`.

---

## 2. Protocolo de execução

1. **Uma etapa por vez.** Execute somente a próxima etapa pendente do `ROADMAP.md`. Não adiante etapas nem refatore o que não foi pedido.
2. **Confirme o escopo.** Se a etapa for ambígua, depender de decisão do usuário ou exigir mudança de fórmula ou contrato, pergunte antes de implementar.
3. **Implemente → teste → valide.** Nenhuma etapa é concluída sem os critérios de aceite da etapa atendidos e os testes passando.
4. **Atualize o estado:** marque `[x]` no `ROADMAP.md` e adicione uma entrada no topo do `RELATORIO_AGENTE.md`.
5. **Commits:** um commit por etapa, com mensagem `[F<fase>.<etapa>] descrição curta` (ex.: `[F1.3] migra projetos.json para o banco`). **Só faça `git push` quando o usuário pedir.**
6. **Etapa de Revisão:** é obrigatória no fim de cada fase. **Não avance para a fase seguinte sem aprovação explícita do usuário.**
7. **Pedido fora do roadmap:** atenda ao pedido do usuário, registre-o no relatório e, se ele alterar o plano, proponha o ajuste no `ROADMAP.md`.

---

## 3. Stack e regras arquiteturais invioláveis

| Camada | Permitido | Proibido |
| :--- | :--- | :--- |
| **Pipeline** (`pipeline/`, legado `scripts/`) | Python 3.11+, biblioteca padrão (incluindo `sqlite3`, `csv`, `json`, `unittest`), `requests` | Novas dependências sem ADR aprovado e registrado no `PLANO_EVOLUCAO.md` §2.1 |
| **Banco** | SQLite em `dados/db/ranking.sqlite`, schema SQL ANSI versionado em `pipeline/db/` | Banco dentro de `public/`, SQL exclusivo do SQLite sem necessidade, edição manual do `.sqlite` |
| **Front-end** (`public/`) | HTML5, CSS3, Vanilla JavaScript ES6+ (ES modules), SVG feito à mão para gráficos | Frameworks e bibliotecas (React, Vue, Svelte, Tailwind, Bootstrap, jQuery, Chart.js etc.), CDNs, scripts de terceiros, bancos de dados |
| **Deploy** | Vercel publicando **somente** `public/` (`vercel.json`) | Build steps que dependam de `node_modules` em `public/` |
| **Ferramentas de auditoria** | `.agents/skills/` (ex.: `web-design-guidelines`, `playwright-cli`), fora de `public/` | Qualquer dependência de runtime dessas ferramentas no site |

**Princípio da arquitetura:** *Static Data Pipeline*. As fontes vão para `dados/raw/`, a ingestão grava no SQLite, o cálculo produz snapshots, a validação confere tudo e a exportação gera `public/data/*.json`. O navegador **nunca** chama as APIs da Câmara ou do Senado e nunca faz cálculos de nota.

---

## 4. Invariantes de dados e histórico

1. **Fontes de verdade:** `dados/raw/` (imutável) + `dados/curadoria/*.csv` (versionado). O banco é **reconstruível**. Os JSONs de `public/data/` são **artefatos gerados** e nunca são editados à mão.
2. **Proibido criar um arquivo por projeto, votação ou parlamentar como fonte de dados.** A curadoria usa **uma tabela por entidade** (CSV). Os arquivos fatiados de `public/data/` são permitidos porque são artefatos de exportação.
3. **Temporalidade:** todo cálculo usa o **estado na data do evento** (partido via `filiacao`, mandato e exercício via `mandato`/`exercicio`). É proibido usar "partido atual" para votos ou despesas passadas.
4. **Nada fixo no código:** número de legislatura, ano, período, tamanho de bancada (não fixe 513), tetos de cota e pesos ficam em tabelas ou parâmetros de metodologia.
5. **Histórico imutável:** snapshots com `imutavel = 1` nunca são sobrescritos nem recalculados por cima. Nova regra aplicada ao passado gera **novo snapshot**.
6. **Rastreabilidade:** todo registro carregado tem `origem`. Dados manuais têm `verificado` (0/1) e `fonte_url`. Dados não verificados aparecem como "estimado" na UI.
7. **Idempotência:** rodar a mesma ingestão duas vezes não pode duplicar nem alterar dados já corretos.
8. **Contrato do front:** o formato de `public/data/` segue o `PLANO_EVOLUCAO.md` §2.7 com `schema_version`. Mudou o contrato, suba a versão e atualize o plano. `public/ranking_final.json` (contrato v1) não pode ser alterado até ir para a lixeira na Fase 8.

---

## 5. Fórmulas e metodologia

- As fórmulas oficiais estão **exclusivamente** no `PLANO_EVOLUCAO.md` §3. Implemente exatamente o que está lá.
- Qualquer mudança de fórmula, peso ou regra de normalização exige: (1) aprovação do usuário, (2) nova `metodologia_versao`, (3) atualização do §3 e da tabela §3.12, (4) testes com casos calculados à mão.
- Escalas: **Nota de Votos (NV) e Custo & Conduta (CC) entre 0 e 10**. A Nota Final é $(1-\lambda)NV + \lambda CC$, **sempre por perspectiva**. Não crie "ranking geral" sem perspectiva.
- Indicadores sensíveis (fidelidade, rebeldia, fisiologismo) usam redação neutra e mostram os componentes separadamente.

---

## 6. Organização de pastas e nomenclatura

| Item | Padrão | Exemplo |
| :--- | :--- | :--- |
| Pastas e arquivos Python, SQL e CSV | `snake_case`, sem acento | `pipeline/calc/partidos.py`, `avaliacoes.csv` |
| Tabelas SQL | singular, `snake_case`, pt-BR sem acento | `votacao`, `filiacao`, `resultado_parlamentar` |
| Chave primária / estrangeira | `id` / `<entidade>_id` | `parlamentar_id` |
| IDs externos | prefixo da fonte | `id_camara`, `codigo_senado`, `id_externo` |
| Chaves JSON exportadas | `snake_case` pt-BR sem acento | `nota_votos`, `custo_medio_mensal` |
| Funções e variáveis Python | `snake_case`; constantes em `MAIUSCULAS` | `calcular_nota_votos()` |
| JavaScript | `camelCase`; arquivos `kebab-case.js` em `public/js/` | `renderTabela()`, `filtro-uf.js` |
| CSS | classes `kebab-case`, tokens em variáveis `--nome` | `.card-value`, `--primary` |
| Migrações | `NNN_descricao.sql` sequencial | `003_cria_orientacao.sql` |
| Docs de governança | `MAIUSCULAS.md` na raiz | `ROADMAP.md` |

A estrutura alvo de pastas está no `PLANO_EVOLUCAO.md` §2.3. Não crie pastas de primeiro nível fora dela sem registrar no plano.

---

## 7. Padrões de UI/UX e layout

- **Idioma e formatação:** toda a interface em pt-BR. Números, moeda e datas via `Intl.NumberFormat` / `Intl.DateTimeFormat` (`pt-BR`, `BRL`).
- **Identidade visual:** reutilize os tokens de `public/style.css` (`--bg`, `--surface`, `--text`, `--text-muted`, `--primary`, `--green`/`--amber`/`--red` para faixas de nota, `--radius: 12px`), o cabeçalho escuro em gradiente, cards de resumo, tabelas com cabeçalho em caixa alta e modal/gaveta de detalhes.
- **Faixas de nota:** ≥ 7 alta (verde), ≥ 5 média (âmbar), < 5 baixa (vermelho). A perspectiva ativa sempre fica visível junto da nota.
- **Acessibilidade (obrigatória):** skip link; hierarquia de títulos; `label` em todo controle; `:focus-visible` em todo elemento interativo; `aria-live="polite"` em mensagens e contagens dinâmicas; modal com `inert` no fundo e foco restaurado ao fechar; `alt`, `width` e `height` em imagens; área de toque de no mínimo 44 px; `prefers-reduced-motion`; contraste AA.
- **Estado na URL:** filtros (casa, legislatura, UF, partido, perspectiva, tema, público, região, ordenação, página) refletidos em query string ou hash. Links compartilháveis.
- **Performance:** paginação ou carregamento sob demanda para listas grandes; detalhes carregados via `fetch` só quando abertos; orçamento do §2.7.
- **Transparência:** toda nota tem caminho visível até a decomposição (NV, CC, subindicadores, votos) e até a página de Metodologia.
- **Auditoria:** mudanças de UI passam por `web-design-guidelines` e `playwright-cli` (desktop e mobile 390×844, sem erros de console e sem overflow horizontal).

---

## 8. Higiene de arquivos e lixeira

1. **Nunca apague arquivos do projeto permanentemente** (nem com `rm`/`Remove-Item`, nem por sobrescrita total de arquivos que não sejam artefatos gerados).
2. Arquivos obsoletos, rascunhos e ideias descartadas são **movidos** para `lixeira/AAAA-MM-DD/<caminho-original>`. Ideias soltas vão para `lixeira/ideias/AAAA-MM-DD_<tema>.md`.
3. Registre todo movimento para a lixeira no `RELATORIO_AGENTE.md` e no commit (`[lixeira] motivo`).
4. Nenhum código pode ler ou importar de `lixeira/`. Só o usuário esvazia a lixeira.
5. **Exceções** (podem ser regenerados ou apagados): `dados/raw/`, `dados/db/*.sqlite`, `public/data/` (artefatos), caches de ferramentas (`.playwright-cli/`, `__pycache__/`).
6. Política completa: `PLANO_EVOLUCAO.md` §4.

---

## 9. Qualidade e segurança

- Testes com `unittest` em `tests/`, rodados com `python -m unittest discover -s tests`. Fórmula nova exige teste com caso calculado à mão.
- Validações (`python -m pipeline validate`) passam antes de qualquer exportação.
- Nunca commite segredos, tokens ou dados pessoais além dos públicos oficiais.
- Cite a fonte (URL/endpoint) de todo dado novo na coluna `origem`/`fonte_url`.
- Respeite as APIs públicas: pausa mínima de 0,2 s, retentativa com *backoff* e preferência por arquivos em lote.

---

## 10. Checklist padrão da Etapa de Revisão (fim de toda fase)

- [ ] **Código:** auditoria de legibilidade, código morto, duplicação e aderência à nomenclatura (§6).
- [ ] **Testes:** `python -m unittest discover -s tests` sem falhas; novos testes cobrindo o que a fase criou.
- [ ] **Dados:** `python -m pipeline validate` sem erros; contagens por UF/casa conferidas; amostra manual de pelo menos 5 registros comparados com o portal oficial.
- [ ] **Fórmulas:** pelo menos 2 parlamentares por casa calculados à mão e conferidos até a 2ª casa decimal (quando a fase envolver cálculo).
- [ ] **UI** (quando houver): `web-design-guidelines` + `playwright-cli` (desktop/mobile) sem erros.
- [ ] **Documentação:** `PLANO_EVOLUCAO.md` atualizado se a arquitetura, o contrato ou as fórmulas mudaram; `ROADMAP.md` com caixas marcadas.
- [ ] **Higiene:** obsoletos movidos para `lixeira/`; nada apagado.
- [ ] **Versão:** versão do projeto incrementada (tabela no `ROADMAP.md`) e registrada no `RELATORIO_AGENTE.md`.
- [ ] **Aprovação do usuário** para iniciar a fase seguinte.

---

## 11. Proibições resumidas

1. Pular a leitura deste arquivo, do relatório e do roadmap.
2. Introduzir frameworks, bibliotecas ou CDNs em `public/`.
3. Criar fonte de dados com um arquivo por projeto, votação ou parlamentar.
4. Usar o partido atual para eventos passados ou fixar no código legislatura, ano ou tamanho de bancada.
5. Sobrescrever snapshots imutáveis ou mudar fórmula sem nova versão de metodologia.
6. Apagar arquivos permanentemente ou esvaziar a `lixeira/`.
7. Avançar de fase sem a Etapa de Revisão concluída e aprovada.