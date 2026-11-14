"""Coleta dados brutos da API Dados Abertos da Câmara dos Deputados.

Lê `dados/deputados.json` e `dados/projetos.json`, consulta os endpoints
oficiais da Câmara com pausa entre requisições (`time.sleep(0.2)`) e
grava o consolidado em `dados/cache_bruto.json`.
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"
REQUEST_DELAY_SECONDS = 0.2
REQUEST_TIMEOUT_SECONDS = 20
MAX_RETRIES = 3
ANO_REFERENCIA = 2026

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DADOS_DIR = PROJECT_ROOT / "dados"
DEPUTADOS_PATH = DADOS_DIR / "deputados.json"
PROJETOS_PATH = DADOS_DIR / "projetos.json"
CACHE_PATH = DADOS_DIR / "cache_bruto.json"

VOTOS_VALIDOS = {"Sim", "Não", "Abstenção", "Obstrução"}


def create_session() -> requests.Session:
    """Cria uma sessão HTTP configurada para a API da Câmara."""
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    return session


def get_json(session: requests.Session, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Executa GET com pausa obrigatória e retentativas para erros transitórios."""
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        time.sleep(REQUEST_DELAY_SECONDS)
        try:
            response = session.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
            if response.status_code in {429, 500, 502, 503, 504} and attempt < MAX_RETRIES:
                time.sleep(attempt * 1.0)
                continue
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(attempt * 1.0)
    raise RuntimeError(f"Falha ao consultar {url}: {last_error}") from last_error


def normalizar_voto(tipo_voto: str | None) -> str:
    """Padroniza o tipo de voto retornado pela API."""
    if not tipo_voto:
        return "Ausente"
    limpo = tipo_voto.strip()
    if limpo in VOTOS_VALIDOS:
        return limpo
    if limpo.lower() == "nao":
        return "Não"
    return "Ausente"


def coletar_perfil_deputado(session: requests.Session, id_camara: int) -> dict[str, Any]:
    """Coleta perfil, partido, UF e foto de um deputado."""
    payload = get_json(session, f"{BASE_URL}/deputados/{id_camara}")
    dados = payload.get("dados", {})
    status = dados.get("ultimoStatus", {}) or {}
    return {
        "id_camara": id_camara,
        "nome_civil": dados.get("nomeCivil") or "",
        "nome_eleitoral": status.get("nomeEleitoral") or status.get("nome") or "",
        "partido": status.get("siglaPartido") or "",
        "uf": status.get("siglaUf") or "",
        "foto_url": status.get("urlFoto") or "",
    }


def coletar_despesas_ceap(
    session: requests.Session,
    id_camara: int,
    ano: int,
    meses_avaliados: int,
) -> float:
    """Percorre a paginação da CEAP e soma `valorLiquido` no período avaliado."""
    total_liquido = 0.0
    next_url: str | None = f"{BASE_URL}/deputados/{id_camara}/despesas"
    params: dict[str, Any] | None = {"ano": ano, "itens": 100}

    while next_url:
        payload = get_json(session, next_url, params=params)
        params = None  # Links de paginação já trazem a query string completa.
        for item in payload.get("dados", []):
            mes = item.get("mes")
            if isinstance(mes, int) and not (1 <= mes <= meses_avaliados):
                continue
            valor = item.get("valorLiquido")
            if valor is not None:
                vl = float(valor)
                vd = float(item.get("valorDocumento") or 0.0)
                # A API da Câmara retorna alguns lançamentos de 2026 com valorDocumento > 0 e valorLiquido negativo;
                # estornos reais possuem valorDocumento < 0.
                if vd > 0 and vl < 0:
                    vl = abs(vl)
                total_liquido += vl

        next_url = next(
            (link.get("href") for link in payload.get("links", []) if link.get("rel") == "next"),
            None,
        )

    return round(total_liquido, 2)


def coletar_orgaos_deputado(session: requests.Session, id_camara: int) -> list[dict[str, Any]]:
    """Coleta órgãos e cargos ocupados pelo deputado para conferência."""
    payload = get_json(session, f"{BASE_URL}/deputados/{id_camara}/orgaos")
    orgaos: list[dict[str, Any]] = []
    for item in payload.get("dados", []):
        orgaos.append(
            {
                "sigla_orgao": item.get("siglaOrgao") or "",
                "nome_orgao": item.get("nomeOrgao") or "",
                "titulo": item.get("titulo") or "",
                "data_inicio": item.get("dataInicio"),
                "data_fim": item.get("dataFim"),
            }
        )
    return orgaos


def coletar_votos_projeto(
    session: requests.Session,
    id_votacao: str,
    ids_monitorados: set[int],
) -> dict[str, str]:
    """Coleta os votos nominais de uma votação filtrando pelos deputados do MVP."""
    payload = get_json(session, f"{BASE_URL}/votacoes/{id_votacao}/votos")
    votos_por_id: dict[int, str] = {}
    for item in payload.get("dados", []):
        deputado = item.get("deputado_") or {}
        dep_id = deputado.get("id")
        if dep_id in ids_monitorados:
            votos_por_id[int(dep_id)] = normalizar_voto(item.get("tipoVoto"))

    return {str(dep_id): votos_por_id.get(dep_id, "Ausente") for dep_id in sorted(ids_monitorados)}


def main() -> int:
    """Executa a coleta completa e salva `dados/cache_bruto.json`."""
    deputados_cfg = json.loads(DEPUTADOS_PATH.read_text(encoding="utf-8"))
    projetos_cfg = json.loads(PROJETOS_PATH.read_text(encoding="utf-8"))

    parametros_globais = deputados_cfg.get("parametros_globais", {})
    meses_avaliados = int(parametros_globais.get("meses_avaliados", 6))
    lista_deputados = deputados_cfg.get("deputados", [])
    ids_monitorados = {int(dep["id_camara"]) for dep in lista_deputados}

    session = create_session()
    deputados_coletados: dict[str, dict[str, Any]] = {}
    votacoes_coletadas: dict[str, dict[str, Any]] = {}

    total_deps = len(lista_deputados)
    for idx, dep in enumerate(lista_deputados, start=1):
        id_camara = int(dep["id_camara"])
        nome_ref = dep.get("nome_referencia", str(id_camara))
        print(f"[{idx}/{total_deps}] Coletando deputado {nome_ref} ({id_camara})...")
        perfil = coletar_perfil_deputado(session, id_camara)
        gasto_ceap = coletar_despesas_ceap(session, id_camara, ANO_REFERENCIA, meses_avaliados)
        orgaos = coletar_orgaos_deputado(session, id_camara)

        deputados_coletados[str(id_camara)] = {
            **perfil,
            "gasto_ceap_reais": gasto_ceap,
            "orgaos": orgaos,
        }

    total_projs = len(projetos_cfg)
    for idx, proj in enumerate(projetos_cfg, start=1):
        id_votacao = proj["id_votacao"]
        codigo = proj["codigo"]
        print(f"[{idx}/{total_projs}] Coletando votação {codigo} ({id_votacao})...")
        votos = coletar_votos_projeto(session, id_votacao, ids_monitorados)
        votacoes_coletadas[id_votacao] = {
            "codigo": codigo,
            "votos_por_deputado": votos,
        }

    cache_bruto = {
        "metadata": {
            "coletado_em": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
            "ano_referencia": ANO_REFERENCIA,
            "meses_avaliados": meses_avaliados,
            "total_deputados": len(deputados_coletados),
            "total_projetos": len(votacoes_coletadas),
        },
        "deputados": deputados_coletados,
        "votacoes": votacoes_coletadas,
    }

    CACHE_PATH.write_text(
        json.dumps(cache_bruto, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Coleta concluída com sucesso. Arquivo salvo em: {CACHE_PATH}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Erro na coleta: {exc}", file=sys.stderr)
        raise SystemExit(1)
