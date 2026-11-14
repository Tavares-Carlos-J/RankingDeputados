"""Motor de cálculo do Ranking Parlamentar (Nova Metodologia v2 — Teste).

Lê `dados/deputados.json`, `dados/projetos.json`, `dados/tetos_ceap_2026.json`,
`dados/cache_bruto.json`, `dados/configuracao_sistema.json` e (quando existir)
`dados/perspectivas/catalogo_perspectivas.json`.

Aplica a fórmula oficial do `PLANO_EVOLUCAO.md` §5:
- Nota da Perspectiva (`N_P`, peso 0.7): prova binária (1 = acertou gabarito, 0 = erro/ausente/abstenção)
- Nota Fixa de Custo e Conduta (`N_CC`, peso 0.3): unificada de 0 a 10
- Nota Final (`NF_P`): 0.7 * N_P + 0.3 * N_CC
- 5 critérios oficiais de desempate + análise de custos e visão de partido.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DADOS_DIR = PROJECT_ROOT / "dados"
PUBLIC_DIR = PROJECT_ROOT / "public"

DEPUTADOS_PATH = DADOS_DIR / "deputados.json"
PROJETOS_PATH = DADOS_DIR / "projetos.json"
TETOS_CEAP_PATH = DADOS_DIR / "tetos_ceap_2026.json"
CACHE_BRUTO_PATH = DADOS_DIR / "cache_bruto.json"
CONFIG_SISTEMA_PATH = DADOS_DIR / "configuracao_sistema.json"
CATALOGO_PERSPECTIVAS_PATH = DADOS_DIR / "perspectivas" / "catalogo_perspectivas.json"
RANKING_FINAL_PATH = PUBLIC_DIR / "ranking_final.json"

PERIODO_REFERENCIA = "1º Semestre 2026"
PESO_PERSPECTIVA = 0.7
PESO_CUSTO_CONDUTA = 0.3

CARGOS_ARTICULACAO_PONTOS: dict[str, float] = {
    "mesa_ou_comissao_permanente": 1.0,
    "titular_mesa": 1.0,
    "presidente_comissao_permanente": 1.0,
    "comissao_especial_ou_lider": 0.4,
    "lider_bancada": 0.4,
    "presidente_comissao_temporaria": 0.4,
    "presidente_comissao_especial": 0.4,
    "suplente_ou_frente": 0.1,
    "suplente": 0.1,
    "presidente_frente": 0.1,
    "nenhum": 0.0,
}


def load_json(path: Path) -> Any:
    """Lê e desserializa um arquivo JSON em UTF-8."""
    return json.loads(path.read_text(encoding="utf-8"))


def clamp(valor: float, minimo: float, maximo: float) -> float:
    """Limita `valor` ao intervalo fechado `[minimo, maximo]`."""
    return max(minimo, min(maximo, valor))


def normalizar_gabarito(voto: str | None) -> str:
    """Normaliza gabarito de perspectiva para 'Sim' ou 'Não'."""
    limpo = str(voto or "").strip().lower()
    if limpo in {"sim", "s", "yes"}:
        return "Sim"
    return "Não"


def carregar_perspectivas(projetos_cfg: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Carrega catálogo de perspectivas ou deriva `visao_dono` de `projetos.json`."""
    if CATALOGO_PERSPECTIVAS_PATH.exists():
        catalogo = load_json(CATALOGO_PERSPECTIVAS_PATH)
        perspectivas = catalogo.get("perspectivas", [])
        if perspectivas:
            return perspectivas

    gabarito_dono = {
        proj["codigo"]: {
            "gabarito": "Sim" if float(proj["np_sim"]) >= float(proj["np_nao"]) else "Não",
            "rp": float(proj["rp"]),
        }
        for proj in projetos_cfg
    }
    return [
        {
            "id_perspectiva": "visao_dono",
            "titulo": "Visão do Dono (Legado)",
            "resumo_criterio": "Gabarito inicial do projeto baseado nas notas originais de curadoria.",
            "gabarito": gabarito_dono,
        }
    ]


def calcular_nota_perspectiva(
    id_camara: int,
    projetos_cfg: list[dict[str, Any]],
    votacoes_cache: dict[str, Any],
    perspectiva: dict[str, Any],
) -> tuple[float, int, int, list[dict[str, Any]]]:
    """Calcula `N_P` (0 a 10) estilo prova binária (acerto=1, erro/ausente/abstenção=0)."""
    dep_key = str(id_camara)
    gabarito_map = perspectiva.get("gabarito", {})
    soma_acertos_rp = 0.0
    soma_rp = 0.0
    acertos_qtd = 0
    avaliados_qtd = 0
    detalhe_votos: list[dict[str, Any]] = []

    for proj in projetos_cfg:
        codigo = proj["codigo"]
        item_gab = gabarito_map.get(codigo)
        if not item_gab:
            continue

        esperado = normalizar_gabarito(item_gab.get("gabarito"))
        rp = float(item_gab.get("rp", proj.get("rp", 1.0)))
        votos_proj = (votacoes_cache.get(proj["id_votacao"]) or {}).get("votos_por_deputado", {})
        voto = votos_proj.get(dep_key, "Ausente")

        acertou = 1 if voto == esperado else 0
        soma_acertos_rp += acertou * rp
        soma_rp += rp
        acertos_qtd += acertou
        avaliados_qtd += 1

        detalhe_votos.append(
            {
                "codigo": codigo,
                "titulo": proj["titulo"],
                "voto": voto,
                "gabarito": esperado,
                "acertou": acertou,
                "np_obtido": 100 if acertou == 1 else 0,
                "rp": rp,
            }
        )

    n_p = 10.0 * (soma_acertos_rp / soma_rp) if soma_rp > 0 else 0.0
    return clamp(n_p, 0.0, 10.0), acertos_qtd, avaliados_qtd, detalhe_votos


def calcular_nota_custo_conduta(
    uf: str,
    gasto_ceap_reais: float,
    presenca: dict[str, Any],
    custos_manuais: dict[str, Any],
    bonus_penalidades: dict[str, Any],
    parametros_globais: dict[str, Any],
    tetos_ceap: dict[str, float],
) -> dict[str, Any]:
    """Calcula a Nota Fixa de Custo e Conduta (`N_CC`, 0 a 10) e métricas de custo."""
    meses = max(1.0, float(parametros_globais.get("meses_avaliados", 6)))
    piso_total = float(parametros_globais["piso_gabinete_mensal"]) * meses
    teto_gab_total = float(parametros_globais["teto_gabinete_mensal"]) * meses
    gasto_gabinete = float(custos_manuais["gasto_gabinete_acumulado"])
    gasto_total = gasto_ceap_reais + gasto_gabinete

    teto_ceap_mensal = float(tetos_ceap.get(uf, 0.0))
    teto_ceap_periodo = teto_ceap_mensal * meses

    uso_ceap = clamp(gasto_ceap_reais / teto_ceap_periodo, 0.0, 1.0) if teto_ceap_periodo > 0 else 0.0
    e_ceap = 10.0 * (1.0 - uso_ceap)

    if teto_gab_total > piso_total:
        uso_gab = clamp((gasto_gabinete - piso_total) / (teto_gab_total - piso_total), 0.0, 1.0)
    else:
        uso_gab = 0.0
    e_gabinete = 10.0 * (1.0 - uso_gab)

    priv_qtd = len(custos_manuais.get("privilegios_utilizados", []))
    total_priv = max(1.0, float(parametros_globais.get("total_privilegios_monitorados", 5)))
    e_privilegios = 10.0 * (1.0 - clamp(priv_qtd / total_priv, 0.0, 1.0))

    e_custo = clamp((0.40 * e_ceap) + (0.40 * e_gabinete) + (0.20 * e_privilegios), 0.0, 10.0)

    faltas_nao_just = float(presenca["ausencias_nao_justificadas"])
    faltas_just = float(presenca["ausencias_justificadas"])
    total_sessoes = max(1.0, float(presenca["total_sessoes_deliberativas"]))
    taxa_falta_ponderada = clamp((faltas_nao_just + (0.5 * faltas_just)) / total_sessoes, 0.0, 1.0)
    e_assiduidade = 10.0 * (1.0 - taxa_falta_ponderada)

    autoria = int(bonus_penalidades.get("autoria_aprovada_qtd", 0))
    relatoria = int(bonus_penalidades.get("relatoria_aprovada_qtd", 0))
    fiscalizacao = int(bonus_penalidades.get("fiscalizacao_concretizada_qtd", 0))
    projetos_aprovados = autoria + relatoria

    cargo = str(bonus_penalidades.get("cargo_articulacao", "nenhum")).strip().lower()
    al_pontos = min(1.0, CARGOS_ARTICULACAO_PONTOS.get(cargo, 0.0))
    pl_pontos = min(2.0, (autoria * 0.3) + (relatoria * 0.2) + (fiscalizacao * 0.1))
    e_produtividade = 10.0 * clamp((pl_pontos + al_pontos) / 3.0, 0.0, 1.0)

    condenacoes = int(bonus_penalidades.get("processos_transitados_julgado_qtd", 0))
    desconto_processos = condenacoes * 2.5

    e_conduta = clamp((0.70 * e_assiduidade) + (0.30 * e_produtividade) - desconto_processos, 0.0, 10.0)
    n_cc = clamp((0.50 * e_custo) + (0.50 * e_conduta), 0.0, 10.0)

    pct_teto_ceap = (gasto_ceap_reais / teto_ceap_periodo) * 100.0 if teto_ceap_periodo > 0 else 0.0
    pct_teto_gab = (gasto_gabinete / teto_gab_total) * 100.0 if teto_gab_total > 0 else 0.0

    return {
        "n_cc": n_cc,
        "e_custo": e_custo,
        "e_conduta": e_conduta,
        "e_ceap": e_ceap,
        "e_gabinete": e_gabinete,
        "e_privilegios": e_privilegios,
        "e_assiduidade": e_assiduidade,
        "e_produtividade": e_produtividade,
        "desconto_processos": desconto_processos,
        "projetos_aprovados": projetos_aprovados,
        "analise_custos": {
            "meses_avaliados": int(meses),
            "custo_mensal_medio_reais": round(gasto_total / meses, 2),
            "ceap_mensal_medio_reais": round(gasto_ceap_reais / meses, 2),
            "gabinete_mensal_medio_reais": round(gasto_gabinete / meses, 2),
            "teto_ceap_periodo_reais": round(teto_ceap_periodo, 2),
            "percentual_teto_ceap": round(pct_teto_ceap, 1),
            "teto_gabinete_periodo_reais": round(teto_gab_total, 2),
            "percentual_teto_gabinete": round(pct_teto_gab, 1),
        },
    }


def calcular_visao_partidos(
    registros: list[dict[str, Any]],
    projetos_cfg: list[dict[str, Any]],
    votacoes_cache: dict[str, Any],
    perspectivas: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Agrega custos médios, notas médias e coerência/divergência interna por partido."""
    por_partido: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for reg in registros:
        por_partido[reg["partido"] or "SEM PARTIDO"].append(reg)

    partidos_out: list[dict[str, Any]] = []
    for sigla, membros in sorted(por_partido.items()):
        n_membros = len(membros)
        custo_total = sum(m["resumo_visual"]["gasto_total_reais"] for m in membros)
        custo_ceap = sum(m["resumo_visual"]["gasto_ceap_reais"] for m in membros)
        custo_gab = sum(m["resumo_visual"]["gasto_gabinete_reais"] for m in membros)
        custo_mensal_soma = sum(m["analise_custos"]["custo_mensal_medio_reais"] for m in membros)
        media_pct_teto_ceap = sum(m["analise_custos"]["percentual_teto_ceap"] for m in membros) / n_membros
        media_n_cc = sum(m["nota_custo_conduta"] for m in membros) / n_membros

        notas_medias_persp = {
            p["id_perspectiva"]: round(
                sum(m["notas_por_perspectiva"][p["id_perspectiva"]]["nota_final"] for m in membros) / n_membros,
                2,
            )
            for p in perspectivas
        }

        votos_comparaveis = 0
        votos_alinhados = 0
        soma_rice = 0.0
        votacoes_rice = 0
        detalhe_projetos: list[dict[str, Any]] = []

        for proj in projetos_cfg:
            votos_proj = (votacoes_cache.get(proj["id_votacao"]) or {}).get("votos_por_deputado", {})
            contagem = Counter()
            for m in membros:
                voto = votos_proj.get(str(m["id_camara"]), "Ausente")
                contagem[voto] += 1

            sim_qtd = contagem.get("Sim", 0)
            nao_qtd = contagem.get("Não", 0) + contagem.get("Obstrução", 0)
            validos = sim_qtd + nao_qtd

            if validos > 0:
                orientacao_proxy = "Sim" if sim_qtd >= nao_qtd else "Não"
                alinhados = sim_qtd if orientacao_proxy == "Sim" else nao_qtd
                divergentes = validos - alinhados
                rice = abs(sim_qtd - nao_qtd) / validos
                votos_comparaveis += validos
                votos_alinhados += alinhados
                soma_rice += rice
                votacoes_rice += 1
            else:
                orientacao_proxy = "Sem quórum"
                alinhados = 0
                divergentes = 0
                rice = 0.0

            detalhe_projetos.append(
                {
                    "codigo": proj["codigo"],
                    "titulo": proj["titulo"],
                    "orientacao_proxy": orientacao_proxy,
                    "sim": sim_qtd,
                    "nao": contagem.get("Não", 0),
                    "obstrucao": contagem.get("Obstrução", 0),
                    "abstencao": contagem.get("Abstenção", 0),
                    "ausente": contagem.get("Ausente", 0),
                    "divergentes": divergentes,
                    "indice_coesao_rice": round(rice, 2),
                }
            )

        taxa_fidelidade = (votos_alinhados / votos_comparaveis) * 100.0 if votos_comparaveis > 0 else 0.0
        taxa_divergencia = 100.0 - taxa_fidelidade if votos_comparaveis > 0 else 0.0
        rice_medio = soma_rice / votacoes_rice if votacoes_rice > 0 else 0.0

        partidos_out.append(
            {
                "partido": sigla,
                "total_deputados": n_membros,
                "ufs": sorted({m["uf"] for m in membros if m["uf"]}),
                "custo_total_reais": round(custo_total, 2),
                "custo_ceap_reais": round(custo_ceap, 2),
                "custo_gabinete_reais": round(custo_gab, 2),
                "custo_medio_deputado_reais": round(custo_total / n_membros, 2),
                "custo_mensal_medio_deputado_reais": round(custo_mensal_soma / n_membros, 2),
                "media_percentual_teto_ceap": round(media_pct_teto_ceap, 1),
                "nota_media_custo_conduta": round(media_n_cc, 2),
                "notas_medias_perspectiva": notas_medias_persp,
                "coerencia": {
                    "fonte_orientacao": "proxy_maioria_bancada",
                    "votos_comparaveis": votos_comparaveis,
                    "votos_alinhados": votos_alinhados,
                    "taxa_alinhamento_pct": round(taxa_fidelidade, 1),
                    "taxa_divergencia_pct": round(taxa_divergencia, 1),
                    "indice_rice_medio": round(rice_medio, 2),
                },
                "detalhe_projetos": detalhe_projetos,
            }
        )

    partidos_out.sort(key=lambda p: (-p["total_deputados"], p["custo_medio_deputado_reais"], p["partido"]))
    return partidos_out


def processar_ranking(
    deputados_cfg: dict[str, Any],
    projetos_cfg: list[dict[str, Any]],
    tetos_ceap: dict[str, float],
    cache_bruto: dict[str, Any],
) -> dict[str, Any]:
    """Processa os deputados com a nova fórmula (0.7 Perspectiva + 0.3 Custo/Conduta)."""
    parametros_globais = deputados_cfg["parametros_globais"]
    deputados_cache = cache_bruto.get("deputados", {})
    votacoes_cache = cache_bruto.get("votacoes", {})
    perspectivas = carregar_perspectivas(projetos_cfg)
    persp_padrao = perspectivas[0]

    registros: list[dict[str, Any]] = []
    for dep in deputados_cfg["deputados"]:
        id_camara = int(dep["id_camara"])
        dep_cache = deputados_cache.get(str(id_camara), {})

        nome = dep_cache.get("nome_eleitoral") or dep.get("nome_referencia") or str(id_camara)
        partido = dep_cache.get("partido") or ""
        uf = dep_cache.get("uf") or ""
        foto_url = dep_cache.get("foto_url") or f"https://www.camara.leg.br/internet/deputado/bandep/{id_camara}.jpg"
        gasto_ceap_reais = float(dep_cache.get("gasto_ceap_reais", 0.0))
        gasto_gabinete_reais = float(dep["custos_manuais"]["gasto_gabinete_acumulado"])
        gasto_total_reais = gasto_ceap_reais + gasto_gabinete_reais

        presenca = dep["presenca"]
        faltas_just = int(presenca["ausencias_justificadas"])
        faltas_nao_just = int(presenca["ausencias_nao_justificadas"])
        faltas_totais = faltas_just + faltas_nao_just
        total_sessoes = int(presenca["total_sessoes_deliberativas"])
        presencas_reg = int(presenca["presencas_registradas"])
        percentual_presenca = round((presencas_reg / total_sessoes) * 100.0, 1) if total_sessoes > 0 else 0.0

        cc = calcular_nota_custo_conduta(
            uf=uf,
            gasto_ceap_reais=gasto_ceap_reais,
            presenca=presenca,
            custos_manuais=dep["custos_manuais"],
            bonus_penalidades=dep["bonus_penalidades_manuais"],
            parametros_globais=parametros_globais,
            tetos_ceap=tetos_ceap,
        )
        n_cc = cc["n_cc"]

        notas_por_perspectiva: dict[str, Any] = {}
        detalhe_votos_padrao: list[dict[str, Any]] = []
        for persp in perspectivas:
            p_id = persp["id_perspectiva"]
            n_p, acertos, avaliados, det_votos = calcular_nota_perspectiva(
                id_camara=id_camara,
                projetos_cfg=projetos_cfg,
                votacoes_cache=votacoes_cache,
                perspectiva=persp,
            )
            nf_p = (PESO_PERSPECTIVA * n_p) + (PESO_CUSTO_CONDUTA * n_cc)
            notas_por_perspectiva[p_id] = {
                "nota_perspectiva": round(n_p, 2),
                "nota_custo_conduta": round(n_cc, 2),
                "nota_final": round(nf_p, 2),
                "acertos": acertos,
                "total_avaliados": avaliados,
                "detalhe_votos": det_votos,
            }
            if p_id == persp_padrao["id_perspectiva"]:
                detalhe_votos_padrao = det_votos

        padrao_res = notas_por_perspectiva[persp_padrao["id_perspectiva"]]

        registros.append(
            {
                "_sort_key": (
                    -padrao_res["nota_final"],
                    faltas_nao_just,
                    faltas_totais,
                    -cc["projetos_aprovados"],
                    round(gasto_total_reais, 2),
                    nome.lower(),
                ),
                "posicao": 0,
                "id_camara": id_camara,
                "nome": nome,
                "partido": partido,
                "uf": uf,
                "foto_url": foto_url,
                "nota_final": padrao_res["nota_final"],
                "nota_perspectiva": padrao_res["nota_perspectiva"],
                "nota_custo_conduta": round(n_cc, 2),
                "projetos_aprovados": cc["projetos_aprovados"],
                "notas_por_perspectiva": notas_por_perspectiva,
                "componentes_cc": {
                    "e_custo": round(cc["e_custo"], 2),
                    "e_conduta": round(cc["e_conduta"], 2),
                    "e_ceap": round(cc["e_ceap"], 2),
                    "e_gabinete": round(cc["e_gabinete"], 2),
                    "e_privilegios": round(cc["e_privilegios"], 2),
                    "e_assiduidade": round(cc["e_assiduidade"], 2),
                    "e_produtividade": round(cc["e_produtividade"], 2),
                    "desconto_processos": round(cc["desconto_processos"], 2),
                },
                "analise_custos": cc["analise_custos"],
                "blocos": {
                    "bloco_a": round(PESO_PERSPECTIVA * padrao_res["nota_perspectiva"], 2),
                    "bloco_b": round(cc["e_conduta"], 2),
                    "bloco_c": round(cc["e_custo"], 2),
                },
                "indicadores": {
                    "v_nota": padrao_res["nota_perspectiva"],
                    "pre_nota": round(cc["e_assiduidade"], 2),
                    "pl_pontos": round(cc["e_produtividade"], 2),
                    "al_pontos": 0.0,
                    "pro_desconto": round(cc["desconto_processos"], 2),
                    "g_nota": round(cc["e_gabinete"], 2),
                    "d_nota": round(cc["e_ceap"], 2),
                    "pri_nota": round(cc["e_privilegios"], 2),
                },
                "resumo_visual": {
                    "faltas_justificadas": faltas_just,
                    "faltas_nao_justificadas": faltas_nao_just,
                    "faltas_totais": faltas_totais,
                    "total_sessoes": total_sessoes,
                    "percentual_presenca": percentual_presenca,
                    "gasto_ceap_reais": round(gasto_ceap_reais, 2),
                    "gasto_gabinete_reais": round(gasto_gabinete_reais, 2),
                    "gasto_total_reais": round(gasto_total_reais, 2),
                },
                "detalhe_votos": detalhe_votos_padrao,
            }
        )

    registros.sort(key=lambda item: item["_sort_key"])
    for idx, item in enumerate(registros, start=1):
        item["posicao"] = idx
        del item["_sort_key"]

    visao_partidos = calcular_visao_partidos(registros, projetos_cfg, votacoes_cache, perspectivas)
    total_ceap = sum(r["resumo_visual"]["gasto_ceap_reais"] for r in registros)
    total_gab = sum(r["resumo_visual"]["gasto_gabinete_reais"] for r in registros)
    total_geral = total_ceap + total_gab
    n_deps = len(registros) or 1

    config_sistema = load_json(CONFIG_SISTEMA_PATH) if CONFIG_SISTEMA_PATH.exists() else {}

    return {
        "metadata": {
            "atualizado_em": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
            "modo_operacao": config_sistema.get("modo_operacao", "DADOS_DE_TESTE"),
            "aviso_legal": config_sistema.get(
                "aviso_legal",
                "Ambiente de homologação e calibragem metodológica (57ª Legislatura). O ranking oficial terá início em 01/01/2027 com notas zeradas.",
            ),
            "formula": {
                "peso_perspectiva": PESO_PERSPECTIVA,
                "peso_custo_conduta": PESO_CUSTO_CONDUTA,
                "desempate": [
                    "faltas_nao_justificadas_asc",
                    "faltas_totais_asc",
                    "projetos_aprovados_desc",
                    "gasto_total_reais_asc",
                    "nome_asc",
                ],
            },
            "perspectiva_padrao": persp_padrao["id_perspectiva"],
            "perspectivas_disponiveis": [
                {
                    "id_perspectiva": p["id_perspectiva"],
                    "titulo": p["titulo"],
                    "resumo_criterio": p.get("resumo_criterio", ""),
                }
                for p in perspectivas
            ],
            "total_deputados": len(registros),
            "total_projetos": len(projetos_cfg),
            "periodo_referencia": PERIODO_REFERENCIA,
        },
        "resumo_custos": {
            "gasto_total_reais": round(total_geral, 2),
            "gasto_ceap_reais": round(total_ceap, 2),
            "gasto_gabinete_reais": round(total_gab, 2),
            "custo_medio_deputado_reais": round(total_geral / n_deps, 2),
            "custo_mensal_medio_deputado_reais": round(
                sum(r["analise_custos"]["custo_mensal_medio_reais"] for r in registros) / n_deps, 2
            ),
        },
        "visao_partidos": visao_partidos,
        "ranking": registros,
    }


def main() -> int:
    """Executa o cálculo do ranking e grava `public/ranking_final.json`."""
    if not CACHE_BRUTO_PATH.exists():
        raise FileNotFoundError(
            f"Arquivo {CACHE_BRUTO_PATH} não encontrado. Execute `python scripts/coletar.py` primeiro."
        )

    deputados_cfg = load_json(DEPUTADOS_PATH)
    projetos_cfg = load_json(PROJETOS_PATH)
    tetos_ceap = load_json(TETOS_CEAP_PATH)
    cache_bruto = load_json(CACHE_BRUTO_PATH)

    resultado = processar_ranking(deputados_cfg, projetos_cfg, tetos_ceap, cache_bruto)

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    RANKING_FINAL_PATH.write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Ranking calculado com sucesso. Arquivo salvo em: {RANKING_FINAL_PATH}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Erro no cálculo: {exc}", file=sys.stderr)
        raise SystemExit(1)
