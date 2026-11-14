"use strict";

(() => {
  const DATA_URL = "ranking_final.json";

  const PESOS_NOTA = {
    perspectiva: 0.7,
    custoConduta: 0.3,
  };

  const PERSPECTIVA_CC_ONLY = {
    id_perspectiva: "apenas_cc",
    titulo: "Apenas Custo & Conduta (Ncc)",
    resumo_criterio:
      "Avalia exclusivamente economia de recursos públicos (CEAP e Gabinete) e assiduidade/conduta, sem considerar alinhamento ideológico nos projetos.",
  };

  const VALID_TABS = new Set(["ranking", "partidos", "custos"]);
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
    projetosCatalogo: [],
    perspectiva: "visao_dono",
    tab: "ranking",
    busca: "",
    partido: "",
    uf: "",
    projeto: "",
    ordem: "nota_desc",
    partidoDetalhe: "",
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
    perspectivaDescricao: document.getElementById("perspectiva-descricao"),

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
      partidos: document.getElementById("painel-partidos"),
      custos: document.getElementById("painel-custos"),
    },

    filtroBusca: document.getElementById("filtro-busca"),
    filtroPartido: document.getElementById("filtro-partido"),
    filtroUf: document.getElementById("filtro-uf"),
    filtroProjeto: document.getElementById("filtro-projeto"),
    ordenacao: document.getElementById("ordenacao"),
    contagemResultados: document.getElementById("contagem-resultados"),
    btnLimparFiltros: document.getElementById("btn-limpar-filtros"),
    estadoMensagem: document.getElementById("estado-mensagem"),
    rankingTbody: document.getElementById("ranking-tbody"),

    seletorPartidoDetalhe: document.getElementById("seletor-partido-detalhe"),
    partidosTbody: document.getElementById("partidos-tbody"),
    tituloPartidoDetalhe: document.getElementById("titulo-partido-detalhe"),
    metaPartidoDetalhe: document.getElementById("meta-partido-detalhe"),
    partidoProjetosTbody: document.getElementById("partido-projetos-tbody"),

    custoMedioDeputado: document.getElementById("custo-medio-deputado"),
    custoMensalMedio: document.getElementById("custo-mensal-medio"),
    custoCeapTotal: document.getElementById("custo-ceap-total"),
    custoGabineteTotal: document.getElementById("custo-gabinete-total"),
    custosTbody: document.getElementById("custos-tbody"),

    modalBackdrop: document.getElementById("modal-backdrop"),
    modalDetalhes: document.getElementById("modal-detalhes"),
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
        acertos: null,
        totalAvaliados: deputy.detalhe_votos?.length ?? 20,
        detalheVotos: deputy.detalhe_votos || [],
      };
    }

    const pData = deputy.notas_por_perspectiva?.[pId];
    if (pData) {
      return {
        isCcOnly: false,
        notaPerspectiva: Number(pData.nota_perspectiva ?? 0),
        notaCustoConduta: Number(pData.nota_custo_conduta ?? deputy.nota_custo_conduta ?? 0),
        notaFinal: Number(pData.nota_final ?? 0),
        acertos: Number(pData.acertos ?? 0),
        totalAvaliados: Number(pData.total_avaliados ?? pData.detalhe_votos?.length ?? 20),
        detalheVotos: pData.detalhe_votos || deputy.detalhe_votos || [],
      };
    }

    return {
      isCcOnly: false,
      notaPerspectiva: Number(deputy.nota_perspectiva ?? 0),
      notaCustoConduta: Number(deputy.nota_custo_conduta ?? 0),
      notaFinal: Number(deputy.nota_final ?? 0),
      acertos: null,
      totalAvaliados: deputy.detalhe_votos?.length ?? 20,
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
      state.rawData?.metadata?.perspectiva_padrao || "visao_dono";

    if (state.perspectiva && state.perspectiva !== defaultPersp) {
      params.set("persp", state.perspectiva);
    }
    if (state.tab && state.tab !== "ranking") {
      params.set("tab", state.tab);
    }
    if (state.busca) params.set("busca", state.busca);
    if (state.partido) params.set("partido", state.partido);
    if (state.uf) params.set("uf", state.uf);
    if (state.projeto) params.set("projeto", state.projeto);
    if (state.ordem && state.ordem !== "nota_desc") {
      params.set("ordem", state.ordem);
    }
    if (state.partidoDetalhe && state.tab === "partidos") {
      params.set("partido_detalhe", state.partidoDetalhe);
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

    const perspParam = params.get("persp");
    const defaultPersp =
      state.rawData?.metadata?.perspectiva_padrao || "visao_dono";
    state.perspectiva = validPerspIds.has(perspParam)
      ? perspParam
      : validPerspIds.has(defaultPersp)
        ? defaultPersp
        : state.perspectivas[0]?.id_perspectiva || "visao_dono";

    const tabParam = params.get("tab");
    state.tab = VALID_TABS.has(tabParam) ? tabParam : "ranking";

    state.busca = params.get("busca") || "";
    state.partido = params.get("partido") || "";
    state.uf = params.get("uf") || "";
    state.projeto = params.get("projeto") || "";

    const ordemParam = params.get("ordem");
    state.ordem = VALID_ORDERS.has(ordemParam) ? ordemParam : "nota_desc";

    const partidos = state.rawData?.visao_partidos || [];
    const partidoDetParam = params.get("partido_detalhe");
    const hasPartidoDet = partidos.some((p) => p.partido === partidoDetParam);
    state.partidoDetalhe = hasPartidoDet
      ? partidoDetParam
      : partidos[0]?.partido || "";
  }

  function populateSelectors() {
    // Perspectivas
    dom.seletorPerspectiva.innerHTML = state.perspectivas
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id_perspectiva)}">${escapeHtml(p.titulo)}</option>`
      )
      .join("");
    dom.seletorPerspectiva.value = state.perspectiva;

    // Partidos e UFs no filtro de Ranking
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

    // Projetos (20 leis)
    const sampleVotes = ranking[0]?.detalhe_votos || [];
    state.projetosCatalogo = sampleVotes.map((v) => ({
      codigo: v.codigo,
      titulo: v.titulo,
      rp: v.rp,
    }));

    dom.filtroProjeto.innerHTML =
      '<option value="">Todos os projetos</option>' +
      state.projetosCatalogo
        .map(
          (proj) =>
            `<option value="${escapeHtml(proj.codigo)}">${escapeHtml(proj.codigo)} — ${escapeHtml(proj.titulo)}</option>`
        )
        .join("");

    // Seletor de partido na aba Visão do Partido
    const visaoPartidos = state.rawData?.visao_partidos || [];
    dom.seletorPartidoDetalhe.innerHTML = visaoPartidos
      .map(
        (p) =>
          `<option value="${escapeHtml(p.partido)}">${escapeHtml(p.partido)} (${p.total_deputados} dep.)</option>`
      )
      .join("");

    // Aplicar valores iniciais hidratados da URL
    dom.filtroBusca.value = state.busca;
    dom.filtroPartido.value = partidos.includes(state.partido)
      ? state.partido
      : "";
    if (dom.filtroPartido.value !== state.partido) state.partido = "";

    dom.filtroUf.value = ufs.includes(state.uf) ? state.uf : "";
    if (dom.filtroUf.value !== state.uf) state.uf = "";

    const validProjeto = state.projetosCatalogo.some(
      (p) => p.codigo === state.projeto
    );
    dom.filtroProjeto.value = validProjeto ? state.projeto : "";
    if (!validProjeto) state.projeto = "";

    dom.ordenacao.value = state.ordem;
    dom.seletorPartidoDetalhe.value = state.partidoDetalhe;
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
    dom.perspectivaDescricao.textContent = pAtual.resumo_criterio || "";
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

  function renderStatusBanner(rankedList) {
    if (!state.projeto) {
      dom.estadoMensagem.hidden = true;
      dom.estadoMensagem.textContent = "";
      return;
    }

    const sampleDeputy = rankedList[0];
    const projVote = sampleDeputy?._view.detalheVotos.find(
      (v) => v.codigo === state.projeto
    );
    if (!projVote) {
      dom.estadoMensagem.hidden = true;
      return;
    }

    const gabaritoTxt =
      state.perspectiva === "apenas_cc"
        ? "Modo apenas Custo & Conduta (sem gabarito)"
        : `Gabarito na perspectiva: ${projVote.gabarito || "—"}`;

    dom.estadoMensagem.hidden = false;
    dom.estadoMensagem.innerHTML = `<strong>Filtro por Projeto:</strong> ${escapeHtml(projVote.codigo)} — ${escapeHtml(projVote.titulo)} (Peso RP: ${escapeHtml(projVote.rp)}) • <strong>${escapeHtml(gabaritoTxt)}</strong>`;
  }

  function renderRankingTable(rankedList) {
    const filtered = filterAndSortRanking(rankedList);
    renderSummary(filtered);
    renderStatusBanner(rankedList);

    const hasFilters = Boolean(
      state.busca || state.partido || state.uf || state.projeto
    );
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

        let decompHtml = "";
        if (state.projeto) {
          const projVote = d._view.detalheVotos.find(
            (v) => v.codigo === state.projeto
          );
          if (projVote) {
            const votoCss = getVotoClass(projVote.voto);
            const provaTxt =
              state.perspectiva === "apenas_cc"
                ? "Sem gabarito (Ncc)"
                : projVote.acertou
                  ? "Acertou (1)"
                  : "Errou (0)";
            decompHtml = `
              <span class="voto-pill ${votoCss}">${escapeHtml(projVote.voto)}</span>
              <span class="cell-sub" style="display:block; margin-top:0.2rem;">${escapeHtml(provaTxt)} • Ncc ${fmtNumber.format(d._view.notaCustoConduta)}</span>
            `;
          }
        } else if (d._view.isCcOnly) {
          decompHtml = `
            <span class="cell-main">Ncc: ${fmtNumber.format(d._view.notaCustoConduta)}</span>
            <span class="cell-sub">Modo 100% Custo &amp; Conduta</span>
          `;
        } else {
          decompHtml = `
            <span class="cell-main">Np ${fmtNumber.format(d._view.notaPerspectiva)} • Ncc ${fmtNumber.format(d._view.notaCustoConduta)}</span>
            <span class="cell-sub">${d._view.acertos ?? 0}/${d._view.totalAvaliados} acertos na prova</span>
          `;
        }

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

  function renderPartyDetail(partidoNome) {
    const partidos = state.rawData?.visao_partidos || [];
    const party =
      partidos.find((p) => p.partido === partidoNome) || partidos[0];

    if (!party) {
      dom.tituloPartidoDetalhe.textContent = "Orientação × Voto Real por Projeto";
      dom.metaPartidoDetalhe.textContent = "Sem dados partidários";
      dom.partidoProjetosTbody.innerHTML = "";
      return;
    }

    state.partidoDetalhe = party.partido;
    dom.seletorPartidoDetalhe.value = party.partido;
    dom.tituloPartidoDetalhe.textContent = `Orientação × Voto Real — ${party.partido}`;
    dom.metaPartidoDetalhe.textContent = `${party.total_deputados} dep. • Alinhamento ${fmtPercent.format(party.coerencia?.taxa_alinhamento_pct ?? 0)}% • Coesão Rice ${fmtNumber.format(party.coerencia?.indice_rice_medio ?? 0)}`;

    const rowsHtml = (party.detalhe_projetos || [])
      .map((proj) => {
        const naoObst = (proj.nao ?? 0) + (proj.obstrucao ?? 0);
        const ausAbst = (proj.ausente ?? 0) + (proj.abstencao ?? 0);
        const orientacaoClass = getVotoClass(proj.orientacao_proxy);
        return `
          <tr>
            <td>
              <strong>${escapeHtml(proj.codigo)}</strong>
              <span class="cell-sub" style="display:block;">${escapeHtml(proj.titulo)}</span>
            </td>
            <td><span class="voto-pill ${orientacaoClass}">${escapeHtml(proj.orientacao_proxy)}</span></td>
            <td class="num">${proj.sim ?? 0}</td>
            <td class="num">${naoObst}</td>
            <td class="num">${ausAbst}</td>
            <td class="num">${proj.divergentes ?? 0}</td>
            <td class="num">${fmtNumber.format(proj.indice_coesao_rice ?? 0)}</td>
          </tr>
        `;
      })
      .join("");

    dom.partidoProjetosTbody.innerHTML = rowsHtml;
  }

  function renderPartiesView() {
    const partidos = [...(state.rawData?.visao_partidos || [])];
    const pId = state.perspectiva;

    partidos.sort((a, b) => {
      const notaA =
        pId === "apenas_cc"
          ? a.nota_media_custo_conduta
          : a.notas_medias_perspectiva?.[pId] ?? a.nota_media_custo_conduta;
      const notaB =
        pId === "apenas_cc"
          ? b.nota_media_custo_conduta
          : b.notas_medias_perspectiva?.[pId] ?? b.nota_media_custo_conduta;
      return (
        notaB - notaA ||
        (b.coerencia?.taxa_alinhamento_pct ?? 0) -
          (a.coerencia?.taxa_alinhamento_pct ?? 0) ||
        a.partido.localeCompare(b.partido, "pt-BR")
      );
    });

    const rowsHtml = partidos
      .map((p) => {
        const notaPersp =
          pId === "apenas_cc"
            ? p.nota_media_custo_conduta
            : p.notas_medias_perspectiva?.[pId] ?? 0;
        const faixaClass = getFaixaClass(notaPersp);
        const coer = p.coerencia || {};
        return `
          <tr>
            <td data-label="Partido">
              <button type="button" class="btn-party-row" data-party="${escapeHtml(p.partido)}">
                ${escapeHtml(p.partido)}
              </button>
            </td>
            <td data-label="Bancada (Amostra)">
              <span class="cell-main">${p.total_deputados} ${p.total_deputados === 1 ? "deputado" : "deputados"}</span>
              <span class="cell-sub">UFs: ${escapeHtml((p.ufs || []).join(", "))}</span>
            </td>
            <td data-label="Alinhamento Interno">
              <span class="cell-main">${fmtPercent.format(coer.taxa_alinhamento_pct ?? 0)}%</span>
              <span class="cell-sub">${coer.votos_alinhados ?? 0}/${coer.votos_comparaveis ?? 0} votos alinhados</span>
            </td>
            <td data-label="Divergência">
              <span class="cell-main">${fmtPercent.format(coer.taxa_divergencia_pct ?? 0)}%</span>
            </td>
            <td data-label="Coesão (Rice)">
              <span class="cell-main">${fmtNumber.format(coer.indice_rice_medio ?? 0)}</span>
            </td>
            <td data-label="Nota Média (Persp.)">
              <span class="nota-valor ${faixaClass}">${fmtNumber.format(notaPersp)}</span>
            </td>
            <td data-label="Custo Médio / Dep.">
              <span class="cell-main">${fmtCurrencyCompact.format(p.custo_medio_deputado_reais ?? 0)}</span>
              <span class="cell-sub">${fmtCurrencyCompact.format(p.custo_mensal_medio_deputado_reais ?? 0)}/mês • ${fmtPercent.format(p.media_percentual_teto_ceap ?? 0)}% teto</span>
            </td>
          </tr>
        `;
      })
      .join("");

    dom.partidosTbody.innerHTML = rowsHtml;
    renderPartyDetail(state.partidoDetalhe);
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
    renderPartiesView();
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
      dom.modalNotaFormula.textContent = "100% Ncc (sem peso ideológico)";
    } else {
      dom.modalNp.textContent = fmtNumber.format(view.notaPerspectiva);
      dom.modalNpSub.textContent = `${view.acertos ?? 0}/${view.totalAvaliados} acertos na prova`;
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
        const gabClass = getVotoClass(v.gabarito);
        const provaText = view.isCcOnly
          ? "—"
          : v.acertou
            ? "1 (Acertou)"
            : "0 (Errou)";
        return `
          <tr>
            <td>
              <strong>${escapeHtml(v.codigo)}</strong>
              <span class="cell-sub" style="display:block;">${escapeHtml(v.titulo)}</span>
            </td>
            <td class="num">${escapeHtml(v.rp)}</td>
            <td>
              ${view.isCcOnly ? "—" : `<span class="voto-pill ${gabClass}">${escapeHtml(v.gabarito)}</span>`}
            </td>
            <td><span class="voto-pill ${votoClass}">${escapeHtml(v.voto)}</span></td>
            <td class="num">${escapeHtml(provaText)}</td>
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

  function bindEvents() {
    dom.seletorPerspectiva.addEventListener("change", (e) => {
      state.perspectiva = e.target.value;
      syncUrlFromState();
      renderAll();
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

    dom.filtroProjeto.addEventListener("change", (e) => {
      state.projeto = e.target.value;
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
      state.projeto = "";
      dom.filtroBusca.value = "";
      dom.filtroPartido.value = "";
      dom.filtroUf.value = "";
      dom.filtroProjeto.value = "";
      syncUrlFromState();
      renderRankingTable(getRankedDeputies());
    });

    // Delegação para abrir modal nas tabelas de Ranking e Custos
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

    // Visão do Partido: seletor e clique na linha
    dom.seletorPartidoDetalhe.addEventListener("change", (e) => {
      state.partidoDetalhe = e.target.value;
      syncUrlFromState();
      renderPartyDetail(state.partidoDetalhe);
    });

    dom.partidosTbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-party]");
      if (!btn) return;
      state.partidoDetalhe = btn.dataset.party;
      syncUrlFromState();
      renderPartyDetail(state.partidoDetalhe);
      dom.tituloPartidoDetalhe.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });

    // Modal fechar
    dom.modalFechar.addEventListener("click", closeDeputyModal);
    dom.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.modalBackdrop) closeDeputyModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dom.modalBackdrop.hidden) {
        closeDeputyModal();
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
