# Plano Mestre de Organização e Execução — Ranking Parlamentar (MVP)

Este documento reúne toda a arquitetura técnica, modelagem de dados, regras de cálculo, organização de pastas, fontes de coleta e roteiro de implantação para construir o seu sistema de avaliação parlamentar com **40 deputados selecionados** e **20 projetos**, utilizando **VS Code**, **GitHub** e **Vercel**, já estruturado para escalar futuramente para toda a Câmara dos Deputados (513 parlamentares) e Senado Federal.

---

## 1. Arquitetura do Sistema

Para garantir carregamento instantâneo no navegador, custo zero de hospedagem e independência de instabilidades nas APIs governamentais durante o acesso do usuário, o projeto opera em **arquitetura desacoplada (Static Data Pipeline)**:

$$\text{Fontes Oficiais + Curadoria Manual} \xrightarrow{\text{Python (VS Code)}} \texttt{ranking\_final.json} \xrightarrow{\text{Git Push}} \text{GitHub} \xrightarrow{\text{Deploy Automático}} \text{Vercel (Front-end)}$$

1. **Camada de Dados e Cálculo (Local / Python):** Scripts em Python coletam os dados brutos da API da Câmara, cruzam com suas planilhas/JSONs de curadoria manual, executam todas as fórmulas dos Blocos $A$, $B$ e $C$ e exportam um arquivo estático consolidado (`ranking_final.json`).
2. **Camada de Versionamento (GitHub):** Armazena o código-fonte, os dados de entrada, os scripts de cálculo e o JSON final gerado.
3. **Camada de Visualização (Vercel):** Hospeda o site estático (`HTML`, `CSS` e `JavaScript puro`). O navegador do visitante apenas lê o `ranking_final.json` já calculado, sem fazer cálculos pesados nem requisições diretas à API da Câmara.

---

## 2. Configuração do Ambiente de Trabalho

Antes de escrever qualquer código, prepare o ambiente no seu computador:

### 2.1. Ferramentas Obrigatórias
- [ ] **Python 3.11+:** Instalado e adicionado ao `PATH` do sistema.
- [ ] **VS Code:** Instalado com as extensões:
  - *Python* (Microsoft)
  - *Pylance* (Microsoft)
  - *Live Server* (Ritwick Dey — para visualizar o site localmente antes de subir)
  - *Markdown All in One* (para visualizar e editar este plano)
- [ ] **Git:** Instalado e configurado com seu nome e e-mail (`git config --global user.name` e `user.email`).
- [ ] **Conta no GitHub:** Criada para hospedar o repositório.
- [ ] **Conta na Vercel:** Criada usando o login integrado com o GitHub.

### 2.2. Inicialização do Projeto no Terminal do VS Code
```bash
# 1. Criar pasta do projeto e entrar nela
mkdir ranking-parlamentar
cd ranking-parlamentar

# 2. Inicializar o repositório Git
git init

# 3. Criar ambiente virtual Python isolado
python -m venv .venv

# 4. Ativar o ambiente virtual
# No Windows (PowerShell):
.venv\Scripts\Activate.ps1
# No Linux/Mac:
source .venv/bin/activate

# 5. Instalar bibliotecas necessárias para coleta e manipulação de dados
pip install requests pandas openpyxl
```

---

## 3. Estrutura Oficial de Diretórios

Crie exatamente esta árvore de pastas e arquivos no VS Code:

```text
ranking-parlamentar/
├── .gitignore                 # Ignora .venv/, __pycache__/ e arquivos temporários
├── plano_execucao_ranking.md  # Este documento de planejamento
├── dados/
│   ├── tetos_ceap_2026.json   # Tabela fixa de tetos mensais da CEAP por UF
│   ├── projetos.json          # Os 20 projetos selecionados (IDs, NP e RP)
│   ├── deputados.json         # Os 40 deputados selecionados + variáveis manuais
│   └── cache_bruto.json       # Dados crus baixados da API (gerado automaticamente)
├── scripts/
│   ├── coletar.py             # Consulta a API da Câmara e salva em cache_bruto.json
│   └── calcular.py            # Processa os blocos A, B e C e gera o ranking_final.json
├── public/                    # Pasta publicada na Vercel
│   ├── index.html             # Estrutura da página (Ranking + Filtros + Modal)
│   ├── style.css              # Estilização responsiva e identidade visual
│   ├── app.js                 # Renderização da tabela, busca, ordenação e modal
│   └── ranking_final.json     # Base final consolidada (gerado automaticamente)
└── vercel.json                # Configuração de rota estática para a Vercel
```

### Arquivo `.gitignore`
```text
.venv/
__pycache__/
*.pyc
.DS_Store
```

### Arquivo `vercel.json`
```json
{
  "version": 2,
  "public": true,
  "cleanUrls": true
}
```

---

## 4. Modelagem dos Dados de Entrada (`dados/`)

### 4.1. `dados/tetos_ceap_2026.json`
Tabela de referência dos tetos mensais da Cota para o Exercício da Atividade Parlamentar (CEAP) para Deputados Federais por UF:

```json
{
  "AC": 57359.87,
  "AL": 53164.36,
  "AP": 55929.26,
  "AM": 56151.46,
  "BA": 50965.29,
  "CE": 54879.34,
  "DF": 41612.55,
  "ES": 49160.15,
  "GO": 46979.73,
  "MA": 54537.99,
  "MT": 51439.83,
  "MS": 52707.93,
  "MG": 47645.91,
  "PA": 54624.17,
  "PB": 54402.48,
  "PR": 50807.19,
  "PE": 53997.81,
  "PI": 53195.84,
  "RJ": 47267.41,
  "RN": 55198.09,
  "RS": 53086.78,
  "RO": 56267.90,
  "RR": 58474.70,
  "SC": 51951.42,
  "SP": 48727.46,
  "SE": 52248.86,
  "TO": 51525.80
}
```

### 4.2. `dados/projetos.json`
Cadastro dos **20 projetos** avaliados no experimento.
- **`id_votacao`**: ID exato da votação nominal principal no plenário (obtido na API da Câmara).
- **`np_sim` e `np_nao`**: Notas complementares ($NP_{\text{sim}} + NP_{\text{nao}} = 100$).
- **`rp`**: Relevância do projeto ($0,1 \le RP_i \le 1,0$).

```json
[
  {
    "codigo": "PL 0001/2026",
    "id_votacao": "2415689-42",
    "titulo": "Título resumido da proposição",
    "descricao_curta": "Explicação objetiva do que estava em jogo na votação.",
    "np_sim": 80,
    "np_nao": 20,
    "rp": 0.9
  }
]
```

### 4.3. `dados/deputados.json`
Cadastro dos **40 deputados selecionados** com o `id` oficial da Câmara e os parâmetros que exigem curadoria/consulta documental no MVP:

```json
{
  "parametros_globais": {
    "meses_avaliados": 6,
    "piso_gabinete_mensal": 35000.00,
    "teto_gabinete_mensal": 133170.54,
    "total_privilegios_monitorados": 5
  },
  "deputados": [
    {
      "id_camara": 204554,
      "nome_referencia": "Nome do Deputado",
      "presenca": {
        "presencas_registradas": 42,
        "ausencias_justificadas": 3,
        "ausencias_nao_justificadas": 1,
        "total_sessoes_deliberativas": 46
      },
      "custos_manuais": {
        "gasto_gabinete_acumulado": 310000.00,
        "privilegios_utilizados": [
          "auxilio_moradia_ou_imovel_funcional"
        ]
      },
      "bonus_penalidades_manuais": {
        "autoria_aprovada_qtd": 1,
        "relatoria_aprovada_qtd": 0,
        "fiscalizacao_concretizada_qtd": 2,
        "cargo_articulacao": "lider_bancada",
        "processos_transitados_julgado_qtd": 0
      }
    }
  ]
}
```
> **Nota sobre `privilegios_utilizados`:** A lista monitora os 5 itens definidos na metodologia:
> 1. `auxilio_moradia_ou_imovel_funcional`
> 2. `reembolso_medico_odontologico`
> 3. `auxilio_mudanca`
> 4. `aposentadoria_especial`
> 5. `passaporte_diplomatico_familiares`

---

## 5. Mapeamento das Fontes Oficiais e Coleta (`scripts/coletar.py`)

### 5.1. O que coletar automaticamente via API da Câmara
Base URL: `https://dadosabertos.camara.leg.br/api/v2` (Headers: `Accept: application/json`)

| Dado Necessário | Endpoint da API | Observação Técnica |
| :--- | :--- | :--- |
| Perfil, Partido, UF e Foto | `GET /deputados/{id}` | Extrair `nomeCivil`, `ultimoStatus.nomeEleitoral`, `ultimoStatus.siglaPartido`, `ultimoStatus.siglaUf` e `ultimoStatus.urlFoto`. |
| Voto nos 20 Projetos | `GET /votacoes/{id_votacao}/votos` | Retorna lista de votos da sessão. Filtrar pelo `id` dos 40 deputados. Mapear `Sim`, `Não`, `Abstenção`, `Obstrução` ou ausência na lista. |
| Gastos da Cota (CEAP) | `GET /deputados/{id}/despesas?ano=2026&itens=100` | Percorrer paginação (`links -> next`) e somar o campo `valorLiquido` de todas as notas fiscais do período avaliado. |
| Conferência de Órgãos/Cargos | `GET /deputados/{id}/orgaos` | Útil para validar presidências de comissões e composição da Mesa Diretora. |

### 5.2. Como encontrar o `id_votacao` exato de cada um dos 20 projetos
1. Busque o ID da proposição: `GET /proposicoes?siglaTipo=PL&numero=XXXX&ano=2026`.
2. Liste todas as votações daquela proposição: `GET /proposicoes/{idProposicao}/votacoes`.
3. Escolha o `id` da votação nominal de mérito (geralmente a votação principal do texto-base ou substitutivo no Plenário, ignorando requerimentos de retirada de pauta ou adiamento).

### 5.3. Onde coletar os dados manuais dos 40 deputados
- **Presença em Plenário ($P, AJ, A, TP$):** Portal da Câmara $\rightarrow$ *Deputados* $\rightarrow$ Perfil do Deputado $\rightarrow$ *Presença em plenário*.
- **Verba de Gabinete ($G$):** Portal da Transparência da Câmara $\rightarrow$ *Gastos Parlamentares* $\rightarrow$ *Cota para Exercício / Verba de Gabinete* (remuneração de secretários parlamentares).
- **Imóvel Funcional / Auxílio-Moradia ($PRI$):** Portal da Transparência da Câmara $\rightarrow$ *Imóveis Funcionais e Auxílio-Moradia*.
- **Passaporte Diplomático ($PRI$):** Consulta pública no portal do Ministério das Relações Exteriores (MRE) / transparência passiva.
- **Condenações Transitadas em Julgado ($PRO$):** Certidões/bases públicas do STF, STJ, TRFs e TJs ou bases consolidadas de processos públicos.

---

## 6. Especificação Matemática do Motor de Cálculo (`scripts/calcular.py`)

O script `calcular.py` deve implementar fielmente as fórmulas abaixo para cada um dos 40 deputados:

### 6.1. Bloco A — Atividade (Máximo: $+12,0$ pontos)
$$A = (V \times 0,9) + (PRE \times 0,3)$$

1. **Votações ($V$ — escala de $0$ a $10$):**
   Para cada projeto $i \in \{1, \dots, 20\}$:
   - Se voto = `Sim`: $NP_i = \text{np\_sim}$
   - Se voto = `Não`: $NP_i = \text{np\_nao}$
   - Se voto = `Abstenção`, `Obstrução` ou `Ausente`: $NP_i = 0$

   $$V = \left[ \frac{\sum_{i=1}^{20} (NP_i \times RP_i)}{\sum_{i=1}^{20} RP_i} \right] \div 10$$

2. **Presença ($PRE$ — escala de $0$ a $10$):**
   $$PRE = \left[ \frac{(P \times 1) + (AJ \times 0,5) + (A \times 0)}{TP} \right] \times 10$$

### 6.2. Bloco B — Bônus e Penalidades (Máximo: $+3,0$ / Mínimo: sem limite)
$$B = PL + AL - PRO$$

1. **Produção Legislativa ($PL$ — teto máximo de $2,0$ pontos):**
   Contabiliza apenas proposições aprovadas no filtro de mérito ($NP \ge 51/49$):
   $$PL = \min\Big(2,0;\; (\text{qtd\_autoria} \times 0,3) + (\text{qtd\_relatoria} \times 0,2) + (\text{qtd\_fiscalizacao} \times 0,1)\Big)$$

2. **Articulação Legislativa ($AL$ — teto máximo de $1,0$ ponto):**
   - Titular da Mesa Diretora ou Presidente de Comissão Permanente: $+1,0$
   - Presidente de Comissão Temporária/Especial ou Líder de Bancada: $+0,4$
   - Suplente dos cargos acima ou Presidente de Frente Parlamentar: $+0,1$
   *(Aplicar trava $\min(1,0;\; AL)$ caso acumule funções).*

3. **Penalidades e Processos ($PRO$ — sem limite de desconto):**
   $$PRO = \text{qtd\_condenacoes\_definitivas} \times 1,0$$

### 6.3. Bloco C — Custos (Bloco redutor: de $0,0$ até $-5,0$ pontos)
$$C = - \left[ (G \times 0,15) + (D \times 0,15) + (PRI \times 0,2) \right]$$

1. **Gastos de Gabinete ($G$ — escala travada em $[0, 10]$):**
   $$G_{\text{bruto}} = \left( \frac{\text{Gasto Gabinete} - \text{Piso Tolerado}}{\text{Teto Gabinete} - \text{Piso Tolerado}} \right) \times 10$$
   $$G = \max\Big(0,0;\; \min(10,0;\; G_{\text{bruto}})\Big)$$
   *(Nota: multiplicar piso e teto mensais pela quantidade de meses do período avaliado).*

2. **Despesas Operacionais / CEAP ($D$ — escala travada em $[0, 10]$):**
   $$D_{\text{bruto}} = \left( \frac{\text{Gasto Acumulado na Cota}}{\text{Teto da Cota do Estado} \times \text{Meses Avaliados}} \right) \times 10$$
   $$D = \max\Big(0,0;\; \min(10,0;\; D_{\text{bruto}})\Big)$$

3. **Privilégios ($PRI$ — escala de $0$ a $10$):**
   $$PRI = \left( \frac{\text{N. de Privilégios Utilizados}}{\text{Total de Privilégios Monitorados}} \right) \times 10$$

### 6.4. Nota Final e Ordenação
$$\text{Nota Bruta} = A + B + C$$
$$\text{Nota Final} = \max\Big(0,0;\; \min(10,0;\; \text{Nota Bruta})\Big)$$

- **Critérios de Desempate na Classificação:**
  1. Maior `nota_final` (arredondada em 2 casas decimais)
  2. Maior pontuação no indicador `V` (Votações)
  3. Menor gasto total somado (`gasto_gabinete + gasto_ceap`)

### 6.5. Estrutura do Arquivo de Saída (`public/ranking_final.json`)
O script `calcular.py` deve gerar um JSON completo para que o front-end apenas renderize:

```json
{
  "metadata": {
    "atualizado_em": "2026-11-12T15:00:00-03:00",
    "total_deputados": 40,
    "total_projetos": 20,
    "periodo_referencia": "1º Semestre 2026"
  },
  "ranking": [
    {
      "posicao": 1,
      "id_camara": 204554,
      "nome": "Nome Parlamentar",
      "partido": "SIGLA",
      "uf": "GO",
      "foto_url": "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
      "nota_final": 8.45,
      "nota_bruta": 8.45,
      "blocos": {
        "bloco_a": 9.82,
        "bloco_b": 0.40,
        "bloco_c": -1.77
      },
      "indicadores": {
        "v_nota": 7.90,
        "pre_nota": 9.02,
        "pl_pontos": 0.00,
        "al_pontos": 0.40,
        "pro_desconto": 0.00,
        "g_nota": 4.20,
        "d_nota": 3.60,
        "pri_nota": 2.00
      },
      "resumo_visual": {
        "faltas_justificadas": 3,
        "faltas_nao_justificadas": 1,
        "faltas_totais": 4,
        "total_sessoes": 46,
        "percentual_presenca": 91.3,
        "gasto_ceap_reais": 98450.20,
        "gasto_gabinete_reais": 310000.00,
        "gasto_total_reais": 408450.20
      },
      "detalhe_votos": [
        {
          "codigo": "PL 0001/2026",
          "titulo": "Título resumido",
          "voto": "Sim",
          "np_obtido": 80,
          "rp": 0.9
        }
      ]
    }
  ]
}
```

---

## 7. Planejamento da Interface Web (`public/`)

### 7.1. Tela Principal (`index.html`)
1. **Cabeçalho & Resumo do Experimento:**
   - Título do projeto, data da última atualização (`metadata.atualizado_em`) e cards com médias gerais dos 40 deputados (Média das Notas, Total de Faltas no grupo e Soma Total de Gastos).
2. **Barra de Controles e Filtros:**
   - Campo de busca instantânea por nome do parlamentar.
   - Filtro suspenso por **Partido** e por **UF**.
   - Seletor de **Ordenação**:
     - `Maior Nota (Ranking Oficial)` *(padrão)*
     - `Menor Nota`
     - `Mais Faltas`
     - `Maior Gasto Total`
     - `Menor Gasto Total`
3. **Tabela / Lista de Classificação:**
   - **Posição:** `#1` a `#40` (com destaque visual para o Top 3).
   - **Parlamentar:** Foto circular + Nome + Badge `PARTIDO - UF`.
   - **Nota Final:** Número em destaque (`0.00` a `10.00`) acompanhado de barra de progresso colorida conforme faixa de nota.
   - **Faltas:** Exibição clara de `Total de Faltas` com subdivisão discreta (`X não justificadas / Y justificadas`).
   - **Gastos:** Valor total formatado em Real (`R$ XXX.XXX,XX`) com tooltip ou subtítulo separando `CEAP` e `Gabinete`.

### 7.2. Modal / Gaveta de Detalhes Individual (Ao clicar em um deputado)
- **Decomposição da Nota:** Gráfico de barras simples ou cards mostrando:
  - Bloco A (Atividade): `+X,XX`
  - Bloco B (Bônus/Penalidades): `+X,XX` / `-X,XX`
  - Bloco C (Custos): `-X,XX`
  - Nota Bruta vs. Nota Final Travada (`0` a `10`).
- **Auditoria dos 20 Projetos:** Tabela listando cada proposição, o peso ($RP$), o voto registrado pelo deputado e a pontuação ($NP$) obtida naquela votação.

---

## 8. Cronograma de Execução Passo a Passo

### Fase 1: Preparação e Curadoria (Dias 1 a 2)
- [ ] Criar estrutura de pastas no VS Code e inicializar o Git.
- [ ] Selecionar os **40 deputados** e anotar seus respectivos `id_camara`.
- [ ] Selecionar os **20 projetos**, identificar o `id_votacao` exato de cada um na API da Câmara e preencher `dados/projetos.json` com `np_sim`, `np_nao` e `rp`.
- [ ] Preencher os dados complementares dos 40 deputados em `dados/deputados.json` (presenças/faltas, verba de gabinete, privilégios, processos e cargos).

### Fase 2: Coleta e Cálculo em Python (Dias 3 a 4)
- [ ] Desenvolver `scripts/coletar.py` com tratamento de erro e pausa leve (`time.sleep(0.2)`) entre requisições para não sobrecarregar a API da Câmara.
- [ ] Rodar `python scripts/coletar.py` e validar se `dados/cache_bruto.json` trouxe fotos, partidos, gastos CEAP e votos dos 40 parlamentares nos 20 projetos.
- [ ] Desenvolver `scripts/calcular.py` implementando os Blocos $A$, $B$ e $C$.
- [ ] Escolher **2 deputados manualmente** na amostra, fazer a conta na calculadora e conferir se o resultado gerado em `public/ranking_final.json` bate até a segunda casa decimal.

### Fase 3: Front-end e Usabilidade (Dias 5 a 6)
- [ ] Construir `public/index.html`, `public/style.css` e `public/app.js`.
- [ ] Testar localmente com o *Live Server* do VS Code:
  - Testar filtros por partido e estado.
  - Testar troca de ordenação (Nota, Faltas, Gastos).
  - Testar abertura do modal individual e visualização dos 20 votos.
  - Testar responsividade no modo celular (`F12` no navegador).

### Fase 4: Publicação no GitHub e Vercel (Dia 7)
- [ ] Criar repositório no GitHub (ex.: `ranking-parlamentar-mvp`).
- [ ] Subir o projeto pelo terminal do VS Code:
  ```bash
  git add .
  git commit -m "Versao inicial MVP: 40 deputados e 20 projetos"
  git branch -M main
  git remote add origin https://github.com/SEU_USUARIO/ranking-parlamentar-mvp.git
  git push -u origin main
  ```
- [ ] Acessar o painel da **Vercel** $\rightarrow$ *Add New Project* $\rightarrow$ Importar `ranking-parlamentar-mvp`.
- [ ] Configurar **Output Directory** como `public` e clicar em **Deploy**.
- [ ] Validar o link público gerado pela Vercel.

---

## 9. Roteiro de Escala Futura (Pós-MVP)

Quando a avaliação experimental com os 40 deputados estiver validada e você decidir expandir o sistema:

1. **Expansão para toda a Câmara (513 Deputados) e Senado (81 Senadores):**
   - No `coletar.py`, substituir a lista fixa de 40 IDs pela chamada `GET /deputados?idLegislatura=57` (retorna todos os 513 em exercício automaticamente).
   - Para o Senado, adicionar módulo equivalente consumindo a API de Dados Abertos do Senado (`legis.senado.leg.br/dadosabertos`).
2. **Automação Total de Presença e Folha de Gabinete:**
   - Criar raspadores (*scrapers*) em Python usando `BeautifulSoup` ou `Playwright` para extrair automaticamente os relatórios de presença em plenário e folha de pagamento de secretários parlamentares sem digitação manual.
3. **Atualização Periódica na Nuvem (GitHub Actions):**
   - Criar o arquivo `.github/workflows/atualizar.yml` para que o próprio GitHub execute `coletar.py` e `calcular.py` automaticamente toda semana (ex.: segundas-feiras às 06h00), faça o `git commit` do novo `ranking_final.json` e dispare o redeploy automático na Vercel.
4. **Performance no Front-end para +500 Linhas:**
   - Adicionar paginação simples no `app.js` (exibir 50 parlamentares por página) para manter a rolagem fluida em dispositivos móveis.