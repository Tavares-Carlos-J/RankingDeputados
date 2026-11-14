# Ranking Parlamentar

Sistema de avaliação e transparência parlamentar em arquitetura **Static Data Pipeline** (coleta e cálculo local em Python → saída estática em JSON → interface web em HTML5, CSS3 e Vanilla JS publicada na Vercel).

> **Ambiente atual:** `DADOS_DE_TESTE` (57ª Legislatura — amostra de 40 deputados e 20 votações nominais para homologação). O marco zero oficial da 58ª Legislatura entra em vigor em **01/01/2027**.

---

## Governança do Projeto (Leitura Obrigatória)

1. **[PROMPT_GERAL.md](PROMPT_GERAL.md)** — Regras imutáveis de arquitetura, stack, nomenclatura, UI/UX e higiene de arquivos.
2. **[PLANO_EVOLUCAO.md](PLANO_EVOLUCAO.md)** — Arquitetura, fórmulas matemáticas, modelo de pastas e plano de evolução até 2027.
3. **[RELATORIO_AGENTE.md](RELATORIO_AGENTE.md)** — Diário técnico curto de execução e passagem de bastão entre sessões.
4. **[ROADMAP.md](ROADMAP.md)** — Cronograma executivo por fases e etapas com critérios de aceite e revisões.

---

## Como Executar Localmente

```powershell
# Ativar ambiente virtual Python
.venv\Scripts\Activate.ps1

# Coletar dados da API da Câmara e calcular o ranking
python scripts/coletar.py
python scripts/calcular.py

# Servir a interface estática localmente
python -m http.server -d public 8000
```

Acesse `http://localhost:8000` no navegador.
