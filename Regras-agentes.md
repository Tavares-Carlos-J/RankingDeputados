# Diretrizes Obrigatórias para Agentes de IA

Você está colaborando em um sistema de rodízio com outros agentes neste repositório. Siga estas regras sem exceção:

1. **Leitura Obrigatória:** Antes de propor ou alterar qualquer código, leia integralmente `PLANO.md` e `RELATO.md`.
2. **Fidelidade à Stack:** Use estritamente Python 3.11+ (apenas `requests`, `pandas`, `openpyxl` e biblioteca padrão) no back-end e HTML5, CSS3 e Vanilla JavaScript (ES6+) em `public/`. É estritamente proibido introduzir frameworks (React, Vue, Tailwind, Bootstrap, jQuery) ou bancos de dados.
3. **Contrato de Dados:** Respeite rigorosamente os nomes de chaves, tipos e fórmulas matemáticas (Blocos A, B e C) definidos nas seções 4 e 6 do `PLANO.md`. Nunca altere o schema de `public/ranking_final.json` sem atualizar o `PLANO.md`.
4. **Escopo Cirúrgico:** Execute apenas a próxima etapa pendente indicada em `RELATO.md`. Não refatore código funcional de etapas anteriores sem necessidade comprovada.
5. **Atualização de Estado:** Ao concluir sua tarefa, atualize obrigatoriamente o arquivo `RELATO.md` seguindo o formato estabelecido, mantendo-o curto e objetivo.