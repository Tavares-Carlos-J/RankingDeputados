"use strict";

(() => {
  const DATA_URL = "ranking_final.json";

  const PERSPECTIVA_CC_ONLY = {
    id_perspectiva: "apenas_cc",
    titulo: "Apenas Custo & Conduta (Ncc)",
    resumo_criterio:
      "Avalia exclusivamente economia de recursos públicos (CEAP e Gabinete) e assiduidade/conduta, sem considerar alinhamento nos projetos.",
  };

  const VALID_TABS = new Set(["ranking", "custos"]);
  const VALID_ORDERS = new Set([
    "nota_desc",
    "nota_asc",
    "cc_desc",
    "faltas_desc",
    "gasto_desc",
    "gasto_asc",
  ]);

  const fmtNumber = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fmtPercent = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const fmtCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fmtCurrencyCompact = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  const FALLBACK_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%23e2e8f0'/%3E%3Ccircle cx='32' cy='24' r='11' fill='%2394a3b8'/%3E%3Cpath d='M14 54c2-10 10-16 18-16s16 6 18 16' fill='%2394a3b8'/%3E%3C/svg%3E";

  const state = {
    rawData: null,
    perspectivas: [],
    perspectiva: "visao_banca",
    tab: "ranking",
    busca: "",
    partido: "",
    uf: "",
    ordem: "nota_desc",
  };

  let lastFocusedElement = null;

  const dom = {
    testBanner: document.getElementById("test-mode-banner"),
    avisoLegalTexto: document.getElementById("aviso-legal-texto"),
    siteHeader: document.getElementById("site-header"),
    mainContent: document.getElementById("conteudo-principal"),
    siteFooter: document.getElementById("site-footer"),
    periodoReferencia: document.getElementById("periodo-referencia"),
    atualizadoEm: document.getElementById("atualizado-em"),

    seletorPerspectiva: document.getElementById("seletor-perspectiva"),
    btnCriteriosVisao: document.getElementById("btn-criterios-visao"),

    labelMediaNotas: document.getElementById("label-media-notas"),
    mediaNotas: document.getElementById("media-notas"),
    totalAvaliados: document.getElementById("total-avaliados"),
    totalFaltas: document.getElementById("total-faltas"),
    detalheFaltasGrupo: document.getElementById("detalhe-faltas-grupo"),
    somaGastos: document.getElementById("soma-gastos"),
    detalheGastosGrupo: document.getElementById("detalhe-gastos-grupo"),

    tabButtons: Array.from(document.querySelectorAll('.tab-btn[role="tab"]')),
    tabPanels: {
      ranking: document.getElementById("painel-ranking"),
      custos: document.getElementById("painel-custos"),
    },

    filtroBusca: document.getElementById("filtro-busca"),
    filtroPartido: document.getElementById("filtro-partido"),
    filtroUf: document.getElementById("filtro-uf"),
    ordenacao: document.getElementById("ordenacao"),
    contagemResultados: document.getElementById("contagem-resultados"),
    btnLimparFiltros: document.getElementById("btn-limpar-filtros"),
    estadoMensagem: document.getElementById("estado-mensagem"),
    rankingTbody: document.getElementById("ranking-tbody"),

    custoMedioDeputado: document.getElementById("custo-medio-deputado"),
    custoMensalMedio: document.getElementById("custo-mensal-medio"),
    custoCeapTotal: document.getElementById("custo-ceap-total"),
    custoGabineteTotal: document.getElementById("custo-gabinete-total"),
    custosTbody: document.getElementById("custos-tbody"),

    modalBackdrop: document.getElementById("modal-backdrop"),
    modalFoto: document.getElementById("modal-foto"),
    modalPosicao: document.getElementById("modal-posicao"),
    modalNome: document.getElementById("modal-nome"),
    modalPartidoUf: document.getElementById("modal-partido-uf"),
    modalFechar: document.getElementById("modal-fechar"),
    modalPerspectivaNome: document.getElementById("modal-perspectiva-nome"),
    modalNp: document.getElementById("modal-np"),
    modalNpSub: document.getElementById("modal-np-sub"),
    barNp: document.getElementById("bar-np"),
    modalNcc: document.getElementById("modal-ncc"),
    modalNccSub: document.getElementById("modal-ncc-sub"),
    barNcc: document.getElementById("bar-ncc"),
    modalCustoMensal: document.getElementById("modal-custo-mensal"),
    modalCustoSub: document.getElementById("modal-custo-sub"),
    barCusto: document.getElementById("bar-custo"),
    modalNotaFinal: document.getElementById("modal-nota-final"),
    modalNotaFormula: document.getElementById("modal-nota-formula"),
    modalVotosTbody: document.getElementById("modal-votos-tbody"),

    modalCriteriosBackdrop: document.getElementById("modal-criterios-backdrop"),
    modalCriteriosTitulo: document.getElementById("modal-criterios-titulo"),
    modalCriteriosFechar: document.getElementById("modal-criterios-fechar"),
    modalCriteriosResumo: document.getElementById("modal-criterios-resumo"),
    modalCriteriosFormula: document.getElementById("modal-criterios-formula"),
    modalCriteriosTabelaWrap: document.getElementById("modal-criterios-tabela-wrap"),
    modalCriteriosTbody: document.getElementById("modal-criterios-tbody"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatDateTime(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function getFaixaClass(nota) {
    if (nota >= 7.0) return "faixa-alta";
    if (nota >= 4.5) return "faixa-media";
    return "faixa-baixa";
  }

  function getVotoClass(voto) {
    const v = normalizeText(voto);
    if (v === "sim") return "voto-sim";
    if (v === "nao" || v === "obstrucao") return "voto-nao";
    return "voto-neutro";
  }

  function clampPct(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function getPerspectivaAtual() {
    return (
      state.perspectivas.find((p) => p.id_perspectiva === state.perspectiva) ||
      state.perspectivas[0] ||
      PERSPECTIVA_CC_ONLY
    );
  }

  function getDeputyPerspectiveView(deputy) {
    const pId = state.perspectiva;
    if (pId === "apenas_cc") {
      const ncc = Number(deputy.nota_custo_conduta ?? 0);
      return {
        isCcOnly: true,
        notaPerspectiva: null,
        notaCustoConduta: ncc,
        notaFinal: ncc,
        detalheVotos: deputy.detalhe_votos || [],
      };
    }

    const pData = deputy.notas_por_perspectiva?.[pId];
    if (pData) {
      return {
        isCcOnly: false,
        notaPerspectiva: Number(pData.nota_perspectiva ?? 0),
        notaCustoConduta: Number(
          pData.nota_custo_conduta ?? deputy.nota_custo_conduta ?? 0
        ),
        notaFinal: Number(pData.nota_final ?? 0),
        detalheVotos: pData.detalhe_votos || deputy.detalhe_votos || [],
      };
    }

    return {
      isCcOnly: false,
      notaPerspectiva: Number(deputy.nota_perspectiva ?? 0),
      notaCustoConduta: Number(deputy.nota_custo_conduta ?? 0),
      notaFinal: Number(deputy.nota_final ?? 0),
      detalheVotos: deputy.detalhe_votos || [],
    };
  }

  // 5 critérios oficiais de desempate [PE §5.4]
  function compareOficial(a, b) {
    if (b._view.notaFinal !== a._view.notaFinal) {
      return b._view.notaFinal - a._view.notaFinal;
    }
    const aFaltasNJ = a.resumo_visual?.faltas_nao_justificadas ?? 0;
    const bFaltasNJ = b.resumo_visual?.faltas_nao_justificadas ?? 0;
    if (aFaltasNJ !== bFaltasNJ) {
      return aFaltasNJ - bFaltasNJ;
    }
    const aFaltasTot = a.resumo_visual?.faltas_totais ?? 0;
    const bFaltasTot = b.resumo_visual?.faltas_totais ?? 0;
    if (aFaltasTot !== bFaltasTot) {
      return aFaltasTot - bFaltasTot;
    }
    const aProj = a.projetos_aprovados ?? 0;
    const bProj = b.projetos_aprovados ?? 0;
    if (bProj !== aProj) {
      return bProj - aProj;
    }
    const aGasto = a.resumo_visual?.gasto_total_reais ?? 0;
    const bGasto = b.resumo_visual?.gasto_total_reais ?? 0;
    if (aGasto !== bGasto) {
      return aGasto - bGasto;
    }
    return String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR");
  }

  function getRankedDeputies() {
    const list = (state.rawData?.ranking || []).map((deputy) => ({
      ...deputy,
      _view: getDeputyPerspectiveView(deputy),
    }));

    list.sort(compareOficial);
    list.forEach((item, index) => {
      item._posicaoOficial = index + 1;
    });
    return list;
  }

  function syncUrlFromState() {
    const params = new URLSearchParams();
    const defaultPersp =
      state.rawData?.metadata?.perspectiva_padrao || "visao_banca";

    if (state.perspectiva && state.perspectiva !== defaultPersp) {
      params.set("persp", state.perspectiva);
    }
    if (state.tab && state.tab !== "ranking") {
      params.set("tab", state.tab);
    }
    if (state.busca) params.set("busca", state.busca);
    if (state.partido) params.set("partido", state.partido);
    if (state.uf) params.set("uf", state.uf);
    if (state.ordem && state.ordem !== "nota_desc") {
      params.set("ordem", state.ordem);
    }

    const qs = params.toString();
    const nextUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  function hydrateStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const validPerspIds = new Set(
      state.perspectivas.map((p) => p.id_perspectiva)
    );

    let perspParam = params.get("persp");
    if (perspParam === "visao_dono") perspParam = "visao_banca";

    const defaultPersp =
      state.rawData?.metadata?.perspectiva_padrao || "visao_banca";
    state.perspectiva = validPerspIds.has(perspParam)
      ? perspParam
      : validPerspIds.has(defaultPersp)
        ? defaultPersp
        : state.perspectivas[0]?.id_perspectiva || "visao_banca";

    const tabParam = params.get("tab");
    state.tab = VALID_TABS.has(tabParam) ? tabParam : "ranking";

    state.busca = params.get("busca") || "";
    state.partido = params.get("partido") || "";
    state.uf = params.get("uf") || "";

    const ordemParam = params.get("ordem");
    state.ordem = VALID_ORDERS.has(ordemParam) ? ordemParam : "nota_desc";
  }

  function populateSelectors() {
    dom.seletorPerspectiva.innerHTML = state.perspectivas
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id_perspectiva)}">${escapeHtml(p.titulo)}</option>`
      )
      .join("");
    dom.seletorPerspectiva.value = state.perspectiva;

    const ranking = state.rawData?.ranking || [];
    const partidos = Array.from(new Set(ranking.map((d) => d.partido)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const ufs = Array.from(new Set(ranking.map((d) => d.uf)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    dom.filtroPartido.innerHTML =
      '<option value="">Todos os partidos</option>' +
      partidos
        .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
        .join("");

    dom.filtroUf.innerHTML =
      '<option value="">Todas as UFs</option>' +
      ufs
        .map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`)
        .join("");

    dom.filtroBusca.value = state.busca;
    dom.filtroPartido.value = partidos.includes(state.partido)
      ? state.partido
      : "";
    if (dom.filtroPartido.value !== state.partido) state.partido = "";

    dom.filtroUf.value = ufs.includes(state.uf) ? state.uf : "";
    if (dom.filtroUf.value !== state.uf) state.uf = "";

    dom.ordenacao.value = state.ordem;
  }

  function renderHeaderAndPerspective() {
    const meta = state.rawData?.metadata || {};
    if (meta.aviso_legal) {
      dom.avisoLegalTexto.textContent = meta.aviso_legal;
    }
    if (meta.periodo_referencia) {
      dom.periodoReferencia.textContent = `${meta.periodo_referencia} • ${meta.total_deputados || 40} deputados em ${meta.total_projetos || 20} votações nominais`;
    }
    dom.atualizadoEm.textContent = formatDateTime(meta.atualizado_em);

    const pAtual = getPerspectivaAtual();
    dom.labelMediaNotas.textContent =
      state.perspectiva === "apenas_cc"
        ? "Média em Custo & Conduta"
        : `Média (${pAtual.titulo})`;
  }

  function filterAndSortRanking(rankedList) {
    const query = normalizeText(state.busca);

    const filtered = rankedList.filter((d) => {
      if (query) {
        const hay = normalizeText(`${d.nome} ${d.partido} ${d.uf}`);
        if (!hay.includes(query)) return false;
      }
      if (state.partido && d.partido !== state.partido) return false;
      if (state.uf && d.uf !== state.uf) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (state.ordem) {
      case "nota_asc":
        sorted.sort((a, b) => compareOficial(b, a));
        break;
      case "cc_desc":
        sorted.sort(
          (a, b) =>
            b._view.notaCustoConduta - a._view.notaCustoConduta ||
            compareOficial(a, b)
        );
        break;
      case "faltas_desc":
        sorted.sort(
          (a, b) =>
            (b.resumo_visual?.faltas_totais ?? 0) -
              (a.resumo_visual?.faltas_totais ?? 0) || compareOficial(a, b)
        );
        break;
      case "gasto_desc":
        sorted.sort(
          (a, b) =>
            (b.resumo_visual?.gasto_total_reais ?? 0) -
              (a.resumo_visual?.gasto_total_reais ?? 0) || compareOficial(a, b)
        );
        break;
      case "gasto_asc":
        sorted.sort(
          (a, b) =>
            (a.resumo_visual?.gasto_total_reais ?? 0) -
              (b.resumo_visual?.gasto_total_reais ?? 0) || compareOficial(a, b)
        );
        break;
      case "nota_desc":
      default:
        sorted.sort(compareOficial);
        break;
    }

    return sorted;
  }

  function renderSummary(filteredList) {
    const count = filteredList.length;
    if (count === 0) {
      dom.mediaNotas.textContent = "—";
      dom.totalAvaliados.textContent = "0 parlamentares no filtro";
      dom.totalFaltas.textContent = "0";
      dom.detalheFaltasGrupo.textContent = "Nenhum parlamentar selecionado";
      dom.somaGastos.textContent = fmtCurrencyCompact.format(0);
      dom.detalheGastosGrupo.textContent = "CEAP + Verba de Gabinete";
      return;
    }

    const somaNotas = filteredList.reduce(
      (acc, d) => acc + d._view.notaFinal,
      0
    );
    const faltasJust = filteredList.reduce(
      (acc, d) => acc + (d.resumo_visual?.faltas_justificadas ?? 0),
      0
    );
    const faltasNaoJust = filteredList.reduce(
      (acc, d) => acc + (d.resumo_visual?.faltas_nao_justificadas ?? 0),
      0
    );
    const somaCeap = filteredList.reduce(
      (acc, d) => acc + (d.resumo_visual?.gasto_ceap_reais ?? 0),
      0
    );
    const somaGab = filteredList.reduce(
      (acc, d) => acc + (d.resumo_visual?.gasto_gabinete_reais ?? 0),
      0
    );

    dom.mediaNotas.textContent = fmtNumber.format(somaNotas / count);
    dom.totalAvaliados.textContent = `${count} ${count === 1 ? "parlamentar avaliado" : "parlamentares avaliados"}`;
    dom.totalFaltas.textContent = String(faltasJust + faltasNaoJust);
    dom.detalheFaltasGrupo.textContent = `${faltasJust} justificadas • ${faltasNaoJust} não justificadas`;
    dom.somaGastos.textContent = fmtCurrencyCompact.format(somaCeap + somaGab);
    dom.detalheGastosGrupo.textContent = `CEAP: ${fmtCurrencyCompact.format(somaCeap)} • Gab.: ${fmtCurrencyCompact.format(somaGab)}`;
  }

  function renderRankingTable(rankedList) {
    const filtered = filterAndSortRanking(rankedList);
    renderSummary(filtered);

    const hasFilters = Boolean(state.busca || state.partido || state.uf);
    dom.btnLimparFiltros.hidden = !hasFilters;
    dom.contagemResultados.textContent = `Exibindo ${filtered.length} de ${rankedList.length} parlamentares`;

    if (filtered.length === 0) {
      dom.rankingTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            Nenhum parlamentar encontrado com os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered
      .map((d) => {
        const pos = d._posicaoOficial;
        const posClass = pos <= 3 ? ` top-${pos}` : "";
        const notaFinal = d._view.notaFinal;
        const faixaClass = getFaixaClass(notaFinal);
        const pctBar = clampPct(notaFinal * 10);
        const rv = d.resumo_visual || {};
        const ac = d.analise_custos || {};

        const decompHtml = d._view.isCcOnly
          ? `
            <span class="cell-main">Ncc: ${fmtNumber.format(d._view.notaCustoConduta)}</span>
            <span class="cell-sub">Modo 100% Custo &amp; Conduta</span>
          `
          : `
            <span class="cell-main">Np ${fmtNumber.format(d._view.notaPerspectiva)} • Ncc ${fmtNumber.format(d._view.notaCustoConduta)}</span>
            <span class="cell-sub">Peso: 70% Votos • 30% C&amp;C</span>
          `;

        return `
          <tr data-id="${escapeHtml(d.id_camara)}" tabindex="0" aria-label="Ver auditoria de ${escapeHtml(d.nome)}, ${pos}º lugar, nota ${fmtNumber.format(notaFinal)}">
            <td data-label="Posição">
              <span class="pos-badge${posClass}">#${pos}</span>
            </td>
            <td data-label="Parlamentar">
              <div class="parlamentar-cell">
                <img
                  src="${escapeHtml(d.foto_url || FALLBACK_AVATAR)}"
                  alt="Foto de ${escapeHtml(d.nome)}"
                  width="44"
                  height="44"
                  loading="lazy"
                  class="avatar"
                />
                <div>
                  <span class="parlamentar-nome">${escapeHtml(d.nome)}</span>
                  <span class="badge-party">${escapeHtml(d.partido)} - ${escapeHtml(d.uf)}</span>
                </div>
              </div>
            </td>
            <td data-label="Nota Final">
              <div class="nota-wrap">
                <span class="nota-valor ${faixaClass}">${fmtNumber.format(notaFinal)}</span>
                <div class="progress-track" aria-hidden="true">
                  <div class="progress-fill ${faixaClass}" style="width: ${pctBar}%;"></div>
                </div>
              </div>
            </td>
            <td data-label="Votos (70%) / C&amp;C (30%)">
              ${decompHtml}
            </td>
            <td data-label="Faltas">
              <span class="cell-main">${rv.faltas_totais ?? 0} (${fmtPercent.format(rv.percentual_presenca ?? 0)}% pres.)</span>
              <span class="cell-sub">${rv.faltas_justificadas ?? 0} just. • ${rv.faltas_nao_justificadas ?? 0} não just.</span>
            </td>
            <td data-label="Gastos">
              <span class="cell-main">${fmtCurrencyCompact.format(rv.gasto_total_reais ?? 0)}</span>
              <span class="cell-sub">${fmtCurrencyCompact.format(ac.custo_mensal_medio_reais ?? 0)}/mês • ${fmtPercent.format(ac.percentual_teto_ceap ?? 0)}% teto</span>
            </td>
          </tr>
        `;
      })
      .join("");

    dom.rankingTbody.innerHTML = rowsHtml;

    dom.rankingTbody.querySelectorAll("img.avatar").forEach((img) => {
      img.addEventListener("error", () => {
        if (img.src !== FALLBACK_AVATAR) img.src = FALLBACK_AVATAR;
      });
    });
  }

  function renderCostsView(rankedList) {
    const resumo = state.rawData?.resumo_custos || {};
    dom.custoMedioDeputado.textContent = fmtCurrencyCompact.format(
      resumo.custo_medio_deputado_reais ?? 0
    );
    dom.custoMensalMedio.textContent = fmtCurrencyCompact.format(
      resumo.custo_mensal_medio_deputado_reais ?? 0
    );
    dom.custoCeapTotal.textContent = fmtCurrencyCompact.format(
      resumo.gasto_ceap_reais ?? 0
    );
    dom.custoGabineteTotal.textContent = `Gabinete: ${fmtCurrencyCompact.format(resumo.gasto_gabinete_reais ?? 0)}`;

    const byCost = [...rankedList].sort(
      (a, b) =>
        (b.resumo_visual?.gasto_total_reais ?? 0) -
          (a.resumo_visual?.gasto_total_reais ?? 0) ||
        a.nome.localeCompare(b.nome, "pt-BR")
    );

    const rowsHtml = byCost
      .map((d) => {
        const rv = d.resumo_visual || {};
        const ac = d.analise_custos || {};
        const ncc = Number(d.nota_custo_conduta ?? 0);
        const faixaClass = getFaixaClass(ncc);
        return `
          <tr data-id="${escapeHtml(d.id_camara)}" tabindex="0" aria-label="Ver custos detalhados de ${escapeHtml(d.nome)}">
            <td data-label="Parlamentar">
              <div class="parlamentar-cell">
                <img
                  src="${escapeHtml(d.foto_url || FALLBACK_AVATAR)}"
                  alt="Foto de ${escapeHtml(d.nome)}"
                  width="44"
                  height="44"
                  loading="lazy"
                  class="avatar"
                />
                <div>
                  <span class="parlamentar-nome">${escapeHtml(d.nome)}</span>
                  <span class="badge-party">${escapeHtml(d.partido)} - ${escapeHtml(d.uf)}</span>
                </div>
              </div>
            </td>
            <td data-label="Custo Mensal Médio">
              <span class="cell-main">${fmtCurrency.format(ac.custo_mensal_medio_reais ?? 0)}</span>
              <span class="cell-sub">${ac.meses_avaliados ?? 6} meses avaliados</span>
            </td>
            <td data-label="CEAP (% do Teto UF)">
              <span class="cell-main">${fmtCurrencyCompact.format(rv.gasto_ceap_reais ?? 0)}</span>
              <span class="cell-sub">${fmtPercent.format(ac.percentual_teto_ceap ?? 0)}% de ${fmtCurrencyCompact.format(ac.teto_ceap_periodo_reais ?? 0)}</span>
            </td>
            <td data-label="Gabinete (% do Teto)">
              <span class="cell-main">${fmtCurrencyCompact.format(rv.gasto_gabinete_reais ?? 0)}</span>
              <span class="cell-sub">${fmtPercent.format(ac.percentual_teto_gabinete ?? 0)}% do teto</span>
            </td>
            <td data-label="Gasto Total">
              <span class="cell-main">${fmtCurrency.format(rv.gasto_total_reais ?? 0)}</span>
            </td>
            <td data-label="Nota C&amp;C (Ncc)">
              <span class="nota-valor ${faixaClass}">${fmtNumber.format(ncc)}</span>
            </td>
          </tr>
        `;
      })
      .join("");

    dom.custosTbody.innerHTML = rowsHtml;

    dom.custosTbody.querySelectorAll("img.avatar").forEach((img) => {
      img.addEventListener("error", () => {
        if (img.src !== FALLBACK_AVATAR) img.src = FALLBACK_AVATAR;
      });
    });
  }

  function switchTab(nextTab, focusTab = false) {
    state.tab = VALID_TABS.has(nextTab) ? nextTab : "ranking";

    dom.tabButtons.forEach((btn) => {
      const isSelected = btn.dataset.tab === state.tab;
      btn.setAttribute("aria-selected", String(isSelected));
      btn.tabIndex = isSelected ? 0 : -1;
      if (isSelected && focusTab) btn.focus();
    });

    Object.entries(dom.tabPanels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== state.tab;
    });

    syncUrlFromState();
  }

  function renderAll() {
    renderHeaderAndPerspective();
    const rankedList = getRankedDeputies();
    renderRankingTable(rankedList);
    renderCostsView(rankedList);
    switchTab(state.tab, false);
  }

  function setBackgroundInert(isInert) {
    [dom.testBanner, dom.siteHeader, dom.mainContent, dom.siteFooter].forEach(
      (el) => {
        if (el) el.inert = isInert;
      }
    );
  }

  function openDeputyModal(deputyId) {
    const rankedList = getRankedDeputies();
    const deputy = rankedList.find(
      (d) => String(d.id_camara) === String(deputyId)
    );
    if (!deputy) return;

    lastFocusedElement = document.activeElement;
    const view = deputy._view;
    const comp = deputy.componentes_cc || {};
    const ac = deputy.analise_custos || {};
    const pAtual = getPerspectivaAtual();

    dom.modalFoto.src = deputy.foto_url || FALLBACK_AVATAR;
    dom.modalFoto.alt = `Foto de ${deputy.nome}`;
    dom.modalFoto.onerror = () => {
      if (dom.modalFoto.src !== FALLBACK_AVATAR) {
        dom.modalFoto.src = FALLBACK_AVATAR;
      }
    };

    dom.modalPosicao.textContent = `#${deputy._posicaoOficial}`;
    dom.modalNome.textContent = deputy.nome;
    dom.modalPartidoUf.textContent = `${deputy.partido} - ${deputy.uf}`;
    dom.modalPerspectivaNome.textContent = pAtual.titulo;

    if (view.isCcOnly) {
      dom.modalNp.textContent = "—";
      dom.modalNpSub.textContent = "Desativada no modo Custo & Conduta";
      dom.barNp.style.width = "0%";
      dom.modalNotaFormula.textContent = "100% Ncc";
    } else {
      dom.modalNp.textContent = fmtNumber.format(view.notaPerspectiva);
      dom.modalNpSub.textContent = "Peso 70% na nota final";
      dom.barNp.style.width = `${clampPct(view.notaPerspectiva * 10)}%`;
      dom.modalNotaFormula.textContent = `0,7×${fmtNumber.format(view.notaPerspectiva)} + 0,3×${fmtNumber.format(view.notaCustoConduta)}`;
    }

    dom.modalNcc.textContent = fmtNumber.format(view.notaCustoConduta);
    dom.modalNccSub.textContent = `Custo: ${fmtNumber.format(comp.e_custo ?? 0)} • Conduta: ${fmtNumber.format(comp.e_conduta ?? 0)}`;
    dom.barNcc.style.width = `${clampPct(view.notaCustoConduta * 10)}%`;

    dom.modalCustoMensal.textContent = fmtCurrencyCompact.format(
      ac.custo_mensal_medio_reais ?? 0
    );
    dom.modalCustoSub.textContent = `${fmtPercent.format(ac.percentual_teto_ceap ?? 0)}% do teto CEAP`;
    dom.barCusto.style.width = `${clampPct(ac.percentual_teto_ceap ?? 0)}%`;

    dom.modalNotaFinal.textContent = fmtNumber.format(view.notaFinal);

    dom.modalVotosTbody.innerHTML = view.detalheVotos
      .map((v) => {
        const votoClass = getVotoClass(v.voto);
        const criterioClass = getVotoClass(v.gabarito);
        const alinhamentoTxt = view.isCcOnly
          ? "—"
          : v.acertou
            ? "Alinhado"
            : "Divergente";
        return `
          <tr>
            <td>
              <strong>${escapeHtml(v.codigo)}</strong>
              <span class="cell-sub" style="display:block;">${escapeHtml(v.titulo)}</span>
            </td>
            <td class="num">${escapeHtml(v.rp)}</td>
            <td>
              ${view.isCcOnly ? "—" : `<span class="voto-pill ${criterioClass}">${escapeHtml(v.gabarito)}</span>`}
            </td>
            <td><span class="voto-pill ${votoClass}">${escapeHtml(v.voto)}</span></td>
            <td class="num">${escapeHtml(alinhamentoTxt)}</td>
          </tr>
        `;
      })
      .join("");

    setBackgroundInert(true);
    dom.modalBackdrop.hidden = false;
    dom.modalFechar.focus();
  }

  function closeDeputyModal() {
    if (dom.modalBackdrop.hidden) return;
    dom.modalBackdrop.hidden = true;
    setBackgroundInert(false);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function openCriteriosModal() {
    lastFocusedElement = document.activeElement;
    const pAtual = getPerspectivaAtual();
    const isCcOnly = pAtual.id_perspectiva === "apenas_cc";

    dom.modalCriteriosTitulo.textContent = pAtual.titulo;
    dom.modalCriteriosResumo.textContent = pAtual.resumo_criterio || "";
    dom.modalCriteriosFormula.textContent = isCcOnly
      ? "Fórmula: 100% Custo & Conduta Fixa (Ncc = economia CEAP/Gabinete + assiduidade/conduta)."
      : "Fórmula: NF = (0,7 × Nota da Perspectiva) + (0,3 × Custo e Conduta Fixa).";

    if (isCcOnly) {
      dom.modalCriteriosTabelaWrap.hidden = true;
      dom.modalCriteriosTbody.innerHTML = "";
    } else {
      dom.modalCriteriosTabelaWrap.hidden = false;
      const criterios = pAtual.criterios_projetos || [];
      dom.modalCriteriosTbody.innerHTML = criterios
        .map((item) => {
          const votoClass = getVotoClass(item.voto_esperado);
          return `
            <tr>
              <td>
                <strong>${escapeHtml(item.codigo)}</strong>
                <span class="cell-sub" style="display:block;">${escapeHtml(item.titulo)}</span>
              </td>
              <td class="num">${escapeHtml(item.rp)}</td>
              <td><span class="voto-pill ${votoClass}">${escapeHtml(item.voto_esperado)}</span></td>
              <td>${escapeHtml(item.justificativa || "—")}</td>
            </tr>
          `;
        })
        .join("");
    }

    setBackgroundInert(true);
    dom.modalCriteriosBackdrop.hidden = false;
    dom.modalCriteriosFechar.focus();
  }

  function closeCriteriosModal() {
    if (dom.modalCriteriosBackdrop.hidden) return;
    dom.modalCriteriosBackdrop.hidden = true;
    setBackgroundInert(false);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function bindEvents() {
    dom.seletorPerspectiva.addEventListener("change", (e) => {
      state.perspectiva = e.target.value;
      syncUrlFromState();
      renderAll();
    });

    dom.btnCriteriosVisao.addEventListener("click", openCriteriosModal);
    dom.modalCriteriosFechar.addEventListener("click", closeCriteriosModal);
    dom.modalCriteriosBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.modalCriteriosBackdrop) closeCriteriosModal();
    });

    dom.tabButtons.forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab, false);
      });
      btn.addEventListener("keydown", (e) => {
        let targetIdx = null;
        if (e.key === "ArrowRight") {
          targetIdx = (idx + 1) % dom.tabButtons.length;
        } else if (e.key === "ArrowLeft") {
          targetIdx =
            (idx - 1 + dom.tabButtons.length) % dom.tabButtons.length;
        } else if (e.key === "Home") {
          targetIdx = 0;
        } else if (e.key === "End") {
          targetIdx = dom.tabButtons.length - 1;
        }
        if (targetIdx !== null) {
          e.preventDefault();
          switchTab(dom.tabButtons[targetIdx].dataset.tab, true);
        }
      });
    });

    dom.filtroBusca.addEventListener("input", (e) => {
      state.busca = e.target.value;
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    dom.filtroPartido.addEventListener("change", (e) => {
      state.partido = e.target.value;
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    dom.filtroUf.addEventListener("change", (e) => {
      state.uf = e.target.value;
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    dom.ordenacao.addEventListener("change", (e) => {
      state.ordem = e.target.value;
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    dom.btnLimparFiltros.addEventListener("click", () => {
      state.busca = "";
      state.partido = "";
      state.uf = "";
      dom.filtroBusca.value = "";
      dom.filtroPartido.value = "";
      dom.filtroUf.value = "";
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    [dom.rankingTbody, dom.custosTbody].forEach((tbody) => {
      tbody.addEventListener("click", (e) => {
        const row = e.target.closest("tr[data-id]");
        if (row) openDeputyModal(row.dataset.id);
      });
      tbody.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const row = e.target.closest("tr[data-id]");
          if (row) {
            e.preventDefault();
            openDeputyModal(row.dataset.id);
          }
        }
      });
    });

    dom.modalFechar.addEventListener("click", closeDeputyModal);
    dom.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.modalBackdrop) closeDeputyModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.modalBackdrop.hidden) closeDeputyModal();
        if (!dom.modalCriteriosBackdrop.hidden) closeCriteriosModal();
      }
    });
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao carregar dados.`);
      }
      const data = await response.json();
      state.rawData = data;

      const metaPersps = data.metadata?.perspectivas_disponiveis || [];
      state.perspectivas = [...metaPersps, PERSPECTIVA_CC_ONLY];

      hydrateStateFromUrl();
      populateSelectors();
      bindEvents();
      renderAll();
    } catch (err) {
      dom.estadoMensagem.hidden = false;
      dom.estadoMensagem.textContent = `Não foi possível carregar o ranking: ${err.message}`;
    }
  }

  init();
})();
