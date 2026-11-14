# `dados/` — Base de Dados Estruturada

Esta pasta armazena os dados de entrada, parâmetros de configuração e caches coletados da API Dados Abertos da Câmara dos Deputados.

## Arquivos Principais
- `configuracao_sistema.json`: modo de operação (`DADOS_DE_TESTE` vs. `OFICIAL_58_LEGISLATURA`), ano vigente e parâmetros globais.
- `projetos.json`: catálogo único de proposições e votações nominais avaliadas.
- `deputados.json`: cadastro base atual dos 40 deputados de teste e indicadores manuais de baseline.
- `tetos_ceap_2026.json`: tabela oficial de tetos mensais da CEAP por UF.
- `cache_bruto.json`: snapshot bruto gerado por `scripts/coletar.py` e consumido por `scripts/calcular.py`.
- `_tmp/`: arquivos auxiliares da descoberta inicial de IDs (serão movidos para `lixeira/` na Fase 2).
