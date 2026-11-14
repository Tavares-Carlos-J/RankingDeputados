# Diretrizes Obrigatórias para Agentes de IA

Você está colaborando em sistema de rodízio com outros agentes neste repositório. Siga estas regras sem exceção:

1. **Leitura Obrigatória:** Antes de propor ou alterar qualquer código, leia `plano__ranking.md`, `MAPA_PROJETO.md` e `Relatos.md`.
2. **Fidelidade à Stack e Front-end Puro:**
   - **Back-end (`scripts/`):** Python 3.11+ (`.venv` com `requests`, `pandas`, `openpyxl` e biblioteca padrão).
   - **Front-end (`public/`):** Estritamente HTML5, CSS3 e Vanilla JavaScript (ES6+). É proibido introduzir frameworks ou bibliotecas externas (React, Vue, Tailwind, Bootstrap, jQuery, CDNs ou bancos de dados) em `public/`.
3. **Auditoria e Skills (`.agents/skills/`):** É permitido instalar e utilizar ferramentas e skills de auditoria (ex.: `web-design-guidelines`, `playwright-cli`) em `.agents/skills/` (ou fora de `public/`), desde que não alterem o build estático nem introduzam dependências de runtime em `public/` (o deploy na Vercel via `vercel.json` publica exclusivamente `public/`).
4. **Contrato de Dados:** Respeite rigorosamente os nomes de chaves, tipos e fórmulas matemáticas (Blocos A, B e C) definidos nas seções 4 e 6 de `plano__ranking.md`. Nunca altere o schema de `public/ranking_final.json` sem atualizar `plano__ranking.md` e `scripts/calcular.py`.
5. **Escopo Cirúrgico (Fase 4 — Validação Visual e Deploy):** Execute a próxima etapa pendente indicada em `Relatos.md`. Na Fase 4, são permitidos ajustes pontuais em `public/` para corrigir achados de auditoria visual, acessibilidade, responsividade ou UX, sem refatorar código funcional do back-end sem necessidade comprovada.
6. **Protocolo de Passagem de Bastão (`Relatos.md`):** Ao concluir sua tarefa, atualize `Relatos.md` de forma curta e objetiva:
   - Atualize **Estado Atual do Projeto** (fase, último agente ativo e status objetivo).
   - Atualize **Próxima Tarefa Imediata** com o próximo passo claro para o agente seguinte.
   - Adicione uma nova entrada no topo de **Histórico de Intervenções** no formato: `### YYYY-MM-DD HH:MM - Nome do Agente`, contendo apenas **Feito**, **Arquivos criados/alterados** e **Pendências/Bugs conhecidos**.