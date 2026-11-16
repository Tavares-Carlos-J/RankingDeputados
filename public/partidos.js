"use strict";

(() => {
  const DATA_URL = "ranking_final.json";

  const PERSPECTIVA_CC_ONLY = {
    id_perspectiva: "apenas_cc",
    titulo: "Apenas Custo & Conduta (Ncc)",
    resumo_criterio:
      "Avalia exclusivamente economia de recursos públicos (CEAP e Gabinete) e assiduidade/conduta, sem considerar alinhamento nos projetos.",
  };

  const fmtNumber = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fmtPercent = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const fmtCurrencyCompact = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  const state = {
    rawData: null,
    perspectivas: [],
    perspectiva: "visao_banca",
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
    btnCriteriosVisao: document.getElementById("btn-criterios-visao"),
    seletorPartidoDetalhe: document.getElementById("seletor-partido-detalhe"),
    estadoMensagem: document.getElementById("estado-mensagem"),

    partidosTbody: document.getElementById("partidos-tbody"),
    tituloPartidoDetalhe: document.getElementById("titulo-partido-detalhe"),
    metaPartidoDetalhe: document.getElementById("meta-partido-detalhe"),
    partidoProjetosTbody: document.getElementById("partido-projetos-tbody"),

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

  function getPerspectivaAtual() {
    return (
      state.perspectivas.find((p) => p.id_perspectiva === state.perspectiva) ||
      state.perspectivas[0] ||
      PERSPECTIVA_CC_ONLY
    );
  }

  function syncUrlFromState() {
    const params = new URLSearchParams();
    const defaultPersp =
      state.rawData?.metadata?.perspectiva_padrao || "visao_banca";

    if (state.perspectiva && state.perspectiva !== defaultPersp) {
      params.set("persp", state.perspectiva);
    }
    if (state.partidoDetalhe) {
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

    let perspParam = params.get("persp");
    if (perspParam === "visao_dono") perspParam = "visao_banca";

    const defaultPersp =
      state.rawData?.metadata?.perspectiva_padrao || "visao_banca";
    state.perspectiva = validPerspIds.has(perspParam)
      ? perspParam
      : validPerspIds.has(defaultPersp)
        ? defaultPersp
        : state.perspectivas[0]?.id_perspectiva || "visao_banca";

    const partidos = state.rawData?.visao_partidos || [];
    const partidoDetParam = params.get("partido_detalhe");
    const hasPartidoDet = partidos.some((p) => p.partido === partidoDetParam);
    state.partidoDetalhe = hasPartidoDet
      ? partidoDetParam
      : partidos[0]?.partido || "";
  }

  function populateSelectors() {
    dom.seletorPerspectiva.innerHTML = state.perspectivas
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id_perspectiva)}">${escapeHtml(p.titulo)}</option>`
      )
      .join("");
    dom.seletorPerspectiva.value = state.perspectiva;

    const visaoPartidos = state.rawData?.visao_partidos || [];
    dom.seletorPartidoDetalhe.innerHTML = visaoPartidos
      .map(
        (p) =>
          `<option value="${escapeHtml(p.partido)}">${escapeHtml(p.partido)} (${p.total_deputados} dep.)</option>`
      )
      .join("");
    dom.seletorPartidoDetalhe.value = state.partidoDetalhe;
  }

  function renderHeader() {
    const meta = state.rawData?.metadata || {};
    if (meta.aviso_legal) {
      dom.avisoLegalTexto.textContent = meta.aviso_legal;
    }
    if (meta.periodo_referencia) {
      dom.periodoReferencia.textContent = `${meta.periodo_referencia} • Coerência, divergência e custos em ${meta.total_projetos || 20} votações`;
    }
    dom.atualizadoEm.textContent = formatDateTime(meta.atualizado_em);
  }

  function renderPartyDetail(partidoNome) {
    const partidos = state.rawData?.visao_partidos || [];
    const party =
      partidos.find((p) => p.partido === partidoNome) || partidos[0];

    if (!party) {
      dom.tituloPartidoDetalhe.textContent =
        "Orientação × Voto Real por Projeto";
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
            <td data-label="Nota Média (Visão)">
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

  function setBackgroundInert(isInert) {
    [dom.testBanner, dom.siteHeader, dom.mainContent, dom.siteFooter].forEach(
      (el) => {
        if (el) el.inert = isInert;
      }
    );
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
      renderPartiesView();
    });

    dom.btnCriteriosVisao.addEventListener("click", openCriteriosModal);
    dom.modalCriteriosFechar.addEventListener("click", closeCriteriosModal);
    dom.modalCriteriosBackdrop.addEventListener("click", (e) => {
      if (e.target === dom.modalCriteriosBackdrop) closeCriteriosModal();
    });

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

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dom.modalCriteriosBackdrop.hidden) {
        closeCriteriosModal();
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
      renderHeader();
      bindEvents();
      renderPartiesView();
    } catch (err) {
      dom.estadoMensagem.hidden = false;
      dom.estadoMensagem.textContent = `Não foi possível carregar os dados partidários: ${err.message}`;
    }
  }

  init();
})();
