# Relato de Execução e Passagem de Bastão

## Estado Atual do Projeto
- **Fase atual:** Fase 4 — Publicação no GitHub e Vercel (validação visual, acessibilidade e pipeline CEAP concluídos)
- **Último agente ativo:** Antigravity (Gemini 4 Hydrogen)
- **Status do código:** `scripts/coletar.py` corrigido para lançamentos da API da Câmara com `valorDocumento > 0` e `valorLiquido < 0`; `dados/cache_bruto.json` e `public/ranking_final.json` regerados (`0` deputados com CEAP negativo); `public/` atualizado e reauditado via `playwright-cli` (`0` erros de console, `0` overflow em desktop/mobile `390×844`, foco/inert no modal e URL sync validados).

## Próxima Tarefa Imediata (Para o Próximo Agente)
- Realizar `git add .`, `git commit`, configurar o remoto no GitHub (`git push -u origin main`) e publicar o diretório `public` na Vercel (Fase 4).

---

## Histórico de Intervenções (Mais recente no topo)

### 2026-11-14 10:55 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Corrigido tratamento de `valorLiquido` negativo quando `valorDocumento > 0` em `scripts/coletar.py` e reexecutados `coletar.py` + `calcular.py` (`0` CEAP negativos; total CEAP `R$ 9.220.304,06`). Aplicadas todas as melhorias de `public/index.html`, `public/style.css` e `public/app.js` (favicon SVG inline, skip link, `aria-live="polite"`, contador de resultados, botão limpar filtros, sincronização com `URLSearchParams`, `:focus-visible`, `inert` no fundo e restauração de foco no modal, `overscroll-behavior: contain`, `touch-action: manipulation`, dimensões explícitas `width`/`height` nas imagens, rótulos mobile `data-label` e rodapé metodológico). Reauditado via `playwright-cli` sem erros de console e sem overflow.
- **Arquivos criados/alterados:** `scripts/coletar.py`, `dados/cache_bruto.json`, `public/ranking_final.json`, `public/index.html`, `public/style.css`, `public/app.js`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Nenhuma pendência técnica no front-end ou pipeline; falta apenas commit/push para o GitHub e deploy na Vercel.

### 2026-11-14 10:17 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Revisado e atualizado `Regras-agentes.md` (nomes reais `plano__ranking.md`, `MAPA_PROJETO.md` e `Relatos.md`; proibição mantida de frameworks/bibliotecas em `public/` e proteção do schema de `public/ranking_final.json`; permissão de `.agents/skills/` fora do build estático; protocolo curto de passagem de bastão em `Relatos.md`). Instalados Node.js LTS (`26.13.1`), `@playwright/cli` e as skills `web-design-guidelines` e `playwright-cli` em `.agents/skills/`. Auditado `public/` via `web-design-guidelines` e `playwright-cli` em servidor local (`http.server -d public 8000`): 40 deputados, 20 votos no modal, filtros/ordenação funcionais, zero overflow em desktop e mobile (`390×844`), 1 erro de console (`404 /favicon.ico`) e melhorias de acessibilidade/CSS listadas para correção pontual.
- **Arquivos criados/alterados:** `Regras-agentes.md`, `.agents/skills/web-design-guidelines/`, `.agents/skills/playwright-cli/`, `skills-lock.json`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Corrigir achados pontuais da auditoria em `public/` (`favicon.ico` 404, atributos de acessibilidade/dimensões de imagem, `:focus-visible` e `overscroll-behavior: contain` no modal) antes do push final para GitHub e deploy na Vercel.

### 2026-11-12 16:57 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Instalado Python 3.12.10 via `winget`, criado `.venv` com `requests`, executados `scripts/coletar.py` (gerando `dados/cache_bruto.json` com 40 deputados e 20 votações) e `scripts/calcular.py` (gerando `public/ranking_final.json`, Top 1 `Amom Mandel` 8.48, último `Marina Silva` 2.08). Auditadas manualmente as fórmulas dos deputados #1 (`Amom Mandel`) e #20 (`Dr. Zacharias Calil`) até a 2ª casa decimal e validado o servidor HTTP local em `public/` (HTTP 200 para `/`, `style.css`, `app.js` e `ranking_final.json`).
- **Arquivos criados/alterados:** `.venv/` (ignorado no Git), `dados/cache_bruto.json`, `public/ranking_final.json`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Falta apenas inspeção visual interativa no navegador e publicação no GitHub/Vercel (Fase 4). Dados manuais em `dados/deputados.json` seguem como baseline MVP.

### 2026-11-12 16:36 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Construído o front-end estático em HTML5, CSS3 e Vanilla JS (ES6+) em `public/`: cabeçalho com `metadata.atualizado_em`, cards de resumo (média das notas, total de faltas e soma de gastos), busca instantânea, filtros por Partido e UF, 5 modos de ordenação, tabela responsiva com destaque Top 3 e modal individual com decomposição dos Blocos A/B/C e auditoria dos 20 projetos.
- **Arquivos criados/alterados:** `public/index.html`, `public/style.css`, `public/app.js`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** `public/ranking_final.json` ainda não foi gerado porque Python 3.11+ não está instalado neste host Windows; teste visual com dados reais pendente dessa execução.

### 2026-11-12 16:34 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Implementado `scripts/calcular.py` em Python 3.11+ (biblioteca padrão) com as fórmulas dos Blocos A (`V`, `PRE`), B (`PL`, `AL`, `PRO`) e C (`G`, `D`, `PRI`), trava `[0, 10]`, critérios de desempate e schema completo de `public/ranking_final.json` (seção 6 do `plano__ranking.md`).
- **Arquivos criados/alterados:** `scripts/calcular.py`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Python 3.11+ segue ausente neste host Windows, impedindo a execução de `scripts/coletar.py` e `scripts/calcular.py` e a conferência manual de 2 deputados nesta sessão.

### 2026-11-12 16:31 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Implementado `scripts/coletar.py` em Python 3.11+ (`requests` + biblioteca padrão) com `time.sleep(0.2)`, retentativas para erros 429/5xx, coleta de perfil/foto/partido/UF (`/deputados/{id}`), paginação de despesas CEAP (`/deputados/{id}/despesas?ano=2026&itens=100` filtrando `1 <= mes <= meses_avaliados`), órgãos/cargos (`/deputados/{id}/orgaos`) e votos nominais nos 20 projetos (`/votacoes/{id_votacao}/votos`).
- **Arquivos criados/alterados:** `scripts/coletar.py`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** `python` / `py` não está instalado neste host Windows (apenas o alias da Microsoft Store em `WindowsApps\python.exe`), impedindo a execução direta de `scripts/coletar.py` e a geração de `dados/cache_bruto.json` nesta sessão.

### 2026-11-12 16:22 - Antigravity (Gemini 4 Hydrogen)
- **Feito:** Criados `dados/projetos.json` (20 projetos com `id_votacao` nominais verificados na API da Câmara; substituídos `PL 2253/2022` e `PL 2628/2022`, cujas votações em plenário na Câmara foram simbólicas/0 votos, por `PL 4614/2024` e `PLP 210/2024`) e `dados/deputados.json` (40 deputados de `lista_previa.md` com `id_camara` oficiais obtidos na API da 57ª Legislatura e parâmetros manuais baseline do MVP). Validados counts, unicidade de IDs e somas (`np_sim + np_nao = 100`, `P + AJ + A = TP`).
- **Arquivos criados/alterados:** `dados/projetos.json`, `dados/deputados.json`, `dados/_tmp/deputados_57.json`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Dados manuais em `dados/deputados.json` (presença, verba de gabinete, privilégios, produção e processos) estão preenchidos como baseline MVP e podem ser refinados por curadoria documental. Pastas `scripts/` e `public/` ainda vazias.

### 2026-11-12 15:35 - Cursor Grok 4.6
- **Feito:** Estrutura oficial (`dados/`, `scripts/`, `public/`), `.gitignore`, `vercel.json` e `dados/tetos_ceap_2026.json` (27 UFs, valores da seção 4.1). Git já existia; não foi reinicializado.
- **Arquivos criados/alterados:** `.gitignore`, `vercel.json`, `dados/tetos_ceap_2026.json`, pastas `scripts/` e `public/` (vazias), `Relatos.md`.
- **Pendências/Bugs conhecidos:** Pastas `scripts/` e `public/` ainda sem arquivos (não versionam no Git até o próximo conteúdo). Faltam `projetos.json` e `deputados.json`.

### [Data/Hora] - [Nome do Agente]
- **Feito:** Inicialização documental (repositório só com plano e regras).
- **Arquivos criados/alterados:** `plano__ranking.md`, `Regras-agentes.md`, `Relatos.md`.
- **Pendências/Bugs conhecidos:** Estrutura de diretórios e dados de entrada ainda inexistentes.
