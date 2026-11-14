# `scripts/` — Pipeline Python Local

Esta pasta contém os scripts de coleta, auditoria e cálculo executados localmente no ambiente `.venv` (Python 3.11+ com `requests`).

## Scripts Disponíveis
- `coletar.py`: consulta a API Dados Abertos da Câmara (`/deputados`, `/despesas`, `/orgaos`, `/votacoes/{id}/votos`) com pausa de `0.2s` entre requisições e grava `dados/cache_bruto.json`.
- `calcular.py`: aplica as fórmulas matemáticas do projeto sobre os dados coletados e gera `public/ranking_final.json`.
