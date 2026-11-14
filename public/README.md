# `public/` — Front-end Estático (Deploy Vercel)

Esta pasta é publicada diretamente na Vercel (`vercel.json`) e contém apenas ativos estáticos em **HTML5, CSS3 e Vanilla JavaScript (ES6+)**, sem frameworks ou bibliotecas externas.

## Arquivos
- `index.html`: estrutura da página, filtros, tabela do ranking e modal de auditoria individual.
- `style.css`: estilização responsiva, variáveis de tema, faixas de nota e foco acessível.
- `app.js`: leitura de `ranking_final.json`, filtros, ordenação, sincronização via URL e renderização do modal.
- `ranking_final.json`: saída consolidada gerada exclusivamente por `scripts/calcular.py` (nunca editar manualmente).
