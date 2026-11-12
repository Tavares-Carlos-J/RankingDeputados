"""Motor de cálculo do Ranking Parlamentar (Blocos A, B e C).

Lê `dados/deputados.json`, `dados/projetos.json`, `dados/tetos_ceap_2026.json`
e `dados/cache_bruto.json`, executa as fórmulas especificadas na seção 6 do
`plano__ranking.md` e exporta `public/ranking_final.json`.
"""

from __future__ import annotations

import json
import sys
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
RANKING_FINAL_PATH = PUBLIC_DIR / "ranking_final.json"

PERIODO_REFERENCIA = "1º Semestre 2026"

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


def calcular_bloco_a(
    id_camara: int,
    presenca: dict[str, Any],
    projetos: list[dict[str, Any]],
    soma_rp: float,
    votacoes_cache: dict[str, Any],
) -> tuple[float, float, float, list[dict[str, Any]]]:
    """Calcula Bloco A (Votações `V` e Presença `PRE`)."""
    dep_key = str(id_camara)
    soma_np_rp = 0.0
    detalhe_votos: list[dict[str, Any]] = []

    for proj in projetos:
        rp = float(proj["rp"])
        votos_proj = (votacoes_cache.get(proj["id_votacao"]) or {}).get("votos_por_deputado", {})
        voto = votos_proj.get(dep_key, "Ausente")

        if voto == "Sim":
            np_obtido = float(proj["np_sim"])
        elif voto == "Não":
            np_obtido = float(proj["np_nao"])
        else:
            np_obtido = 0.0

        soma_np_rp += np_obtido * rp
        detalhe_votos.append(
            {
                "codigo": proj["codigo"],
                "titulo": proj["titulo"],
                "voto": voto,
                "np_obtido": int(np_obtido) if np_obtido.is_integer() else round(np_obtido, 2),
                "rp": rp,
            }
        )

    v_nota = (soma_np_rp / soma_rp) / 10.0 if soma_rp > 0 else 0.0

    p = float(presenca["presencas_registradas"])
    aj = float(presenca["ausencias_justificadas"])
    tp = float(presenca["total_sessoes_deliberativas"])
    pre_nota = ((p + aj * 0.5) / tp) * 10.0 if tp > 0 else 0.0

    bloco_a = (v_nota * 0.9) + (pre_nota * 0.3)
    return bloco_a, v_nota, pre_nota, detalhe_votos


def calcular_bloco_b(bonus_penalidades: dict[str, Any]) -> tuple[float, float, float, float]:
    """Calcula Bloco B (Produção Legislativa `PL`, Articulação `AL` e Processos `PRO`)."""
    qtd_autoria = int(bonus_penalidades.get("autoria_aprovada_qtd", 0))
    qtd_relatoria = int(bonus_penalidades.get("relatoria_aprovada_qtd", 0))
    qtd_fiscalizacao = int(bonus_penalidades.get("fiscalizacao_concretizada_qtd", 0))

    pl_pontos = min(2.0, (qtd_autoria * 0.3) + (qtd_relatoria * 0.2) + (qtd_fiscalizacao * 0.1))

    cargo = str(bonus_penalidades.get("cargo_articulacao", "nenhum")).strip().lower()
    al_pontos = min(1.0, CARGOS_ARTICULACAO_PONTOS.get(cargo, 0.0))

    qtd_condenacoes = int(bonus_penalidades.get("processos_transitados_julgado_qtd", 0))
    pro_desconto = qtd_condenacoes * 1.0

    bloco_b = pl_pontos + al_pontos - pro_desconto
    return bloco_b, pl_pontos, al_pontos, pro_desconto


def calcular_bloco_c(
    uf: str,
    gasto_ceap_reais: float,
    custos_manuais: dict[str, Any],
    parametros_globais: dict[str, Any],
    tetos_ceap: dict[str, float],
) -> tuple[float, float, float, float]:
    """Calcula Bloco C (Gabinete `G`, CEAP `D` e Privilégios `PRI`)."""
    meses = float(parametros_globais["meses_avaliados"])
    piso_total = float(parametros_globais["piso_gabinete_mensal"]) * meses
    teto_total = float(parametros_globais["teto_gabinete_mensal"]) * meses
    gasto_gabinete = float(custos_manuais["gasto_gabinete_acumulado"])

    if teto_total > piso_total:
        g_bruto = ((gasto_gabinete - piso_total) / (teto_total - piso_total)) * 10.0
    else:
        g_bruto = 0.0
    g_nota = clamp(g_bruto, 0.0, 10.0)

    teto_ceap_mensal = float(tetos_ceap.get(uf, 0.0))
    teto_ceap_periodo = teto_ceap_mensal * meses
    d_bruto = (gasto_ceap_reais / teto_ceap_periodo) * 10.0 if teto_ceap_periodo > 0 else 0.0
    d_nota = clamp(d_bruto, 0.0, 10.0)

    privilegios_qtd = len(custos_manuais.get("privilegios_utilizados", []))
    total_privilegios = float(parametros_globais["total_privilegios_monitorados"])
    pri_nota = (privilegios_qtd / total_privilegios) * 10.0 if total_privilegios > 0 else 0.0

    bloco_c = -((g_nota * 0.15) + (d_nota * 0.15) + (pri_nota * 0.2))
    return bloco_c, g_nota, d_nota, pri_nota


def processar_ranking(
    deputados_cfg: dict[str, Any],
    projetos_cfg: list[dict[str, Any]],
    tetos_ceap: dict[str, float],
    cache_bruto: dict[str, Any],
) -> dict[str, Any]:
    """Processa os 40 deputados, ordena pelos critérios de desempate e monta o JSON final."""
    parametros_globais = deputados_cfg["parametros_globais"]
    deputados_cache = cache_bruto.get("deputados", {})
    votacoes_cache = cache_bruto.get("votacoes", {})
    soma_rp = sum(float(proj["rp"]) for proj in projetos_cfg)

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

        bloco_a, v_nota, pre_nota, detalhe_votos = calcular_bloco_a(
            id_camara=id_camara,
            presenca=presenca,
            projetos=projetos_cfg,
            soma_rp=soma_rp,
            votacoes_cache=votacoes_cache,
        )
        bloco_b, pl_pontos, al_pontos, pro_desconto = calcular_bloco_b(dep["bonus_penalidades_manuais"])
        bloco_c, g_nota, d_nota, pri_nota = calcular_bloco_c(
            uf=uf,
            gasto_ceap_reais=gasto_ceap_reais,
            custos_manuais=dep["custos_manuais"],
            parametros_globais=parametros_globais,
            tetos_ceap=tetos_ceap,
        )

        nota_bruta = bloco_a + bloco_b + bloco_c
        nota_final = clamp(nota_bruta, 0.0, 10.0)

        registros.append(
            {
                "_sort_key": (
                    -round(nota_final, 2),
                    -v_nota,
                    gasto_total_reais,
                ),
                "posicao": 0,
                "id_camara": id_camara,
                "nome": nome,
                "partido": partido,
                "uf": uf,
                "foto_url": foto_url,
                "nota_final": round(nota_final, 2),
                "nota_bruta": round(nota_bruta, 2),
                "blocos": {
                    "bloco_a": round(bloco_a, 2),
                    "bloco_b": round(bloco_b, 2),
                    "bloco_c": round(bloco_c, 2),
                },
                "indicadores": {
                    "v_nota": round(v_nota, 2),
                    "pre_nota": round(pre_nota, 2),
                    "pl_pontos": round(pl_pontos, 2),
                    "al_pontos": round(al_pontos, 2),
                    "pro_desconto": round(pro_desconto, 2),
                    "g_nota": round(g_nota, 2),
                    "d_nota": round(d_nota, 2),
                    "pri_nota": round(pri_nota, 2),
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
                "detalhe_votos": detalhe_votos,
            }
        )

    registros.sort(key=lambda item: item["_sort_key"])
    for idx, item in enumerate(registros, start=1):
        item["posicao"] = idx
        del item["_sort_key"]

    return {
        "metadata": {
            "atualizado_em": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
            "total_deputados": len(registros),
            "total_projetos": len(projetos_cfg),
            "periodo_referencia": PERIODO_REFERENCIA,
        },
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
