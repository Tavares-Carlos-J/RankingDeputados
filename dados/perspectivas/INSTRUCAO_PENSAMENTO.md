# INSTRUCAO_PENSAMENTO.md — Guia de Curadoria e Análise Legislativa

Este documento define o protocolo obrigatório de raciocínio para humanos e agentes de IA ao preencher ou revisar `catalogo_perspectivas.json` (`PLANO_EVOLUCAO.md` §6.2).

---

## 1. Regras de Ouro da Análise de Votações

1. **Nunca julgar pelo apelido ou título do projeto:** leia a ementa e o objeto exato da votação nominal (`texto-base`, `substitutivo`, `emenda` ou `destaque`).
2. **Atenção máxima a destaques de supressão e inversão de voto:**
   - Em votação de **texto-base**, `"Sim"` aprova a matéria e `"Não"` rejeita.
   - Em **Destaque para Supressão (DVS)**, `"Sim"` **mantém** ou **suprime** conforme o enunciado da mesa (ex.: *"Destaque para suprimir o art. X"* → votar `"Sim"` **retira** o artigo; votar `"Não"` **mantém** o artigo). Sempre verificar o sentido exato antes de definir o gabarito.
3. **Efeito prático > discurso:** avalie quem paga a conta, quem ganha ou perde renda/direitos, e qual o impacto fiscal ou institucional concreto.
4. **Justificativa pública curta:** todo gabarito deve registrar o motivo objetivo da escolha (`"Sim"` ou `"Não"`).

---

## 2. Premissas das Perspectivas Iniciais (Fase de Teste)

| ID | Título | Premissa Central | O que tende a receber `Sim` | O que tende a receber `Não` |
| :--- | :--- | :--- | :--- | :--- |
| `visao_dono` | **Visão do Dono (Legado)** | Gabarito original de referência do MVP (`dados/projetos.json`). | Conforme `np_sim >= np_nao` no legado. | Conforme `np_nao > np_sim` no legado. |
| `povo` | **Povo** | Poder de compra do cidadão, justiça tributária, proteção social, serviços públicos, direitos difusos e combate à impunidade. | Isenção na base, cesta básica, progressividade, serviços públicos, combate ao crime e integridade institucional. | Aumento de imposto sobre consumo popular, corte de benefícios sociais, flexibilização ambiental sem salvaguarda e autoproteção parlamentar. |
| `mercado` | **Mercado** | Previsibilidade fiscal, segurança jurídica, menor carga sobre produção e capital, destravamento de investimentos e controle de despesas obrigatórias. | Simplificação tributária, âncora fiscal, contenção de gastos obrigatórios, segurança fundiária/ambiental para investimentos e pró-contribuinte em contencioso. | Aumento de tributação sobre capital/setor produtivo/JCP/fintechs e instabilidade institucional/jurídica. |

---

## 3. Protocolo Passo a Passo de Curadoria

1. **Identificar a proposição e o `id_votacao`:** confirmar data, fase (1º/2º turno, substitutivo, destaque) e objeto real da votação.
2. **Avaliar sob cada perspectiva isoladamente:** aplicar as premissas da Seção 2 sem tentar "equilibrar" artificialmente as visões — divergências entre **Povo** e **Mercado** são esperadas e informativas.
3. **Definir o peso `rp` (`0.1` a `1.0`):** impacto estrutural/nacional (`0.8`–`1.0`), impacto setorial relevante (`0.5`–`0.75`), impacto específico (`0.1`–`0.45`).
4. **Registrar e revisar:** preencher `catalogo_perspectivas.json` com `justificativa` curta e validar o impacto no ranking via `scripts/calcular.py`.
