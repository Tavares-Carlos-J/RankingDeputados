(() => {
  const DATA_URL = "ranking_final.json";

  const state = {
    metadata: null,
    ranking: [],
    byId: new Map(),
    lastFocusedEl: null,
  };

  const AVATAR_FALLBACK =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%2394a3b8'/%3E%3Cpath d='M8 35c0-6.6 5.4-11 12-11s12 4.4 12 11' fill='%2394a3b8'/%3E%3C/svg%3E";

  const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const numFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dtFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const els = {
    siteHeader: document.getElementById("site-header"),
    conteudoPrincipal: document.getElementById("conteudo-principal"),
    siteFooter: document.getElementById("site-footer"),
    periodoReferencia: document.getElementById("periodo-referencia"),
    atualizadoEm: document.getElementById("atualizado-em"),
    mediaNotas: document.getElementById("media-notas"),
    totalAvaliados: document.getElementById("total-avaliados"),
    totalFaltas: document.getElementById("total-faltas"),
    detalheFaltasGrupo: document.getElementById("detalhe-faltas-grupo"),
    somaGastos: document.getElementById("soma-gastos"),
    detalheGastosGrupo: document.getElementById("detalhe-gastos-grupo"),
    filtroBusca: document.getElementById("filtro-busca"),
    filtroPartido: document.getElementById("filtro-partido"),
    filtroUf: document.getElementById("filtro-uf"),
    ordenacao: document.getElementById("ordenacao"),
    contagemResultados: document.getElementById("contagem-resultados"),
    btnLimparFiltros: document.getElementById("btn-limpar-filtros"),
    estadoMensagem: document.getElementById("estado-mensagem"),
    tbody: document.getElementById("ranking-tbody"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalFechar: document.getElementById("modal-fechar"),
    modalFoto: document.getElementById("modal-foto"),
    modalPosicao: document.getElementById("modal-posicao"),
    modalNome: document.getElementById("modal-nome"),
    modalPartidoUf: document.getElementById("modal-partido-uf"),
    modalBlocoA: document.getElementById("modal-bloco-a"),
    modalBlocoASub: document.getElementById("modal-bloco-a-sub"),
    barBlocoA: document.getElementById("bar-bloco-a"),
    modalBlocoB: document.getElementById("modal-bloco-b"),
    modalBlocoBSub: document.getElementById("modal-bloco-b-sub"),
    barBlocoB: document.getElementById("bar-bloco-b"),
    modalBlocoC: document.getElementById("modal-bloco-c"),
    modalBlocoCSub: document.getElementById("modal-bloco-c-sub"),
    barBlocoC: document.getElementById("bar-bloco-c"),
    modalNotaFinal: document.getElementById("modal-nota-final"),
    modalNotaBruta: document.getElementById("modal-nota-bruta"),
    modalVotosTbody: document.getElementById("modal-votos-tbody"),
  };

  const formatBRL = (valor) => brlFormatter.format(valor || 0);
  const formatNum = (valor) => numFormatter.format(Number(valor || 0));

  const formatSigned = (valor) => {
    const n = Number(valor || 0);
    const sinal = n > 0 ? "+" : "";
    return `${sinal}${formatNum(n)}`;
  };

  const escapeHtml = (texto) =>
    String(texto ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? isoString : dtFormatter.format(dt);
  };

  const faixaNota = (nota) => {
    if (nota >= 7) return "faixa-alta";
    if (nota >= 5) return "faixa-media";
    return "faixa-baixa";
  };

  const votoClasse = (voto) => {
    if (voto === "Sim") return "voto-sim";
    if (voto === "Não") return "voto-nao";
    return "voto-neutro";
  };

  function mostrarMensagem(texto) {
    els.estadoMensagem.textContent = texto;
    els.estadoMensagem.hidden = false;
  }

  function limparMensagem() {
    els.estadoMensagem.hidden = true;
    els.estadoMensagem.textContent = "";
  }

  function preencherResumo() {
    const { metadata, ranking } = state;
    if (metadata) {
      els.atualizadoEm.textContent = formatDateTime(metadata.atualizado_em);
      const totalDeps = metadata.total_deputados ?? ranking.length;
      const totalProjs = metadata.total_projetos ?? 20;
      const periodo = metadata.periodo_referencia ? `${metadata.periodo_referencia} • ` : "";
      els.periodoReferencia.textContent = `${periodo}${totalDeps} deputados e ${totalProjs} votações nominais`;
    }

    if (ranking.length === 0) {
      els.mediaNotas.textContent = "—";
      els.totalFaltas.textContent = "—";
      els.somaGastos.textContent = "—";
      return;
    }

    const somaNotas = ranking.reduce((acc, d) => acc + Number(d.nota_final || 0), 0);
    const faltasNaoJust = ranking.reduce((acc, d) => acc + Number(d.resumo_visual?.faltas_nao_justificadas || 0), 0);
    const faltasJust = ranking.reduce((acc, d) => acc + Number(d.resumo_visual?.faltas_justificadas || 0), 0);
    const totalFaltas = faltasNaoJust + faltasJust;
    const somaCeap = ranking.reduce((acc, d) => acc + Number(d.resumo_visual?.gasto_ceap_reais || 0), 0);
    const somaGabinete = ranking.reduce((acc, d) => acc + Number(d.resumo_visual?.gasto_gabinete_reais || 0), 0);

    els.mediaNotas.textContent = formatNum(somaNotas / ranking.length);
    els.totalAvaliados.textContent = `${ranking.length} parlamentares avaliados`;
    els.totalFaltas.textContent = totalFaltas.toLocaleString("pt-BR");
    els.detalheFaltasGrupo.textContent = `${faltasNaoJust} não justificadas / ${faltasJust} justificadas`;
    els.somaGastos.textContent = formatBRL(somaCeap + somaGabinete);
    els.detalheGastosGrupo.textContent = `CEAP: ${formatBRL(somaCeap)} • Gabinete: ${formatBRL(somaGabinete)}`;
  }

  function popularFiltros() {
    const partidos = [...new Set(state.ranking.map((d) => d.partido).filter(Boolean))].sort();
    const ufs = [...new Set(state.ranking.map((d) => d.uf).filter(Boolean))].sort();

    partidos.forEach((partido) => {
      const opt = document.createElement("option");
      opt.value = partido;
      opt.textContent = partido;
      els.filtroPartido.appendChild(opt);
    });

    ufs.forEach((uf) => {
      const opt = document.createElement("option");
      opt.value = uf;
      opt.textContent = uf;
      els.filtroUf.appendChild(opt);
    });
  }

  function obterListaFiltradaEOrdenada() {
    const termo = els.filtroBusca.value.trim().toLowerCase();
    const partido = els.filtroPartido.value;
    const uf = els.filtroUf.value;
    const ordem = els.ordenacao.value;

    const filtrada = state.ranking.filter((dep) => {
      if (termo && !dep._nomeLower.includes(termo)) return false;
      if (partido && dep.partido !== partido) return false;
      if (uf && dep.uf !== uf) return false;
      return true;
    });

    filtrada.sort((a, b) => {
      switch (ordem) {
        case "nota_asc":
          return a.nota_final - b.nota_final || a.posicao - b.posicao;
        case "faltas_desc":
          return (b.resumo_visual?.faltas_totais || 0) - (a.resumo_visual?.faltas_totais || 0) || a.posicao - b.posicao;
        case "gasto_desc":
          return (b.resumo_visual?.gasto_total_reais || 0) - (a.resumo_visual?.gasto_total_reais || 0) || a.posicao - b.posicao;
        case "gasto_asc":
          return (a.resumo_visual?.gasto_total_reais || 0) - (b.resumo_visual?.gasto_total_reais || 0) || a.posicao - b.posicao;
        case "nota_desc":
        default:
          return a.posicao - b.posicao;
      }
    });

    return filtrada;
  }

  function sincronizarUrl() {
    const params = new URLSearchParams();
    const busca = els.filtroBusca.value.trim();
    const partido = els.filtroPartido.value;
    const uf = els.filtroUf.value;
    const ordem = els.ordenacao.value;

    if (busca) params.set("busca", busca);
    if (partido) params.set("partido", partido);
    if (uf) params.set("uf", uf);
    if (ordem && ordem !== "nota_desc") params.set("ordem", ordem);

    const query = params.toString();
    const novaUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", novaUrl);
  }

  function aplicarFiltrosDaUrl() {
    const params = new URLSearchParams(window.location.search);
    const busca = params.get("busca");
    const partido = params.get("partido");
    const uf = params.get("uf");
    const ordem = params.get("ordem");

    if (busca) els.filtroBusca.value = busca;
    if (partido && [...els.filtroPartido.options].some((o) => o.value === partido)) {
      els.filtroPartido.value = partido;
    }
    if (uf && [...els.filtroUf.options].some((o) => o.value === uf)) {
      els.filtroUf.value = uf;
    }
    if (ordem && [...els.ordenacao.options].some((o) => o.value === ordem)) {
      els.ordenacao.value = ordem;
    }
  }

  function limparFiltros() {
    els.filtroBusca.value = "";
    els.filtroPartido.value = "";
    els.filtroUf.value = "";
    els.ordenacao.value = "nota_desc";
    renderizarTabela();
    els.filtroBusca.focus();
  }

  function renderizarTabela() {
    const lista = obterListaFiltradaEOrdenada();
    els.tbody.innerHTML = "";
    sincronizarUrl();

    const temFiltroAtivo =
      Boolean(els.filtroBusca.value.trim()) ||
      Boolean(els.filtroPartido.value) ||
      Boolean(els.filtroUf.value) ||
      els.ordenacao.value !== "nota_desc";
    els.btnLimparFiltros.hidden = !temFiltroAtivo;

    if (state.ranking.length === 0) {
      els.contagemResultados.textContent = "";
      return;
    }

    els.contagemResultados.textContent =
      lista.length === state.ranking.length
        ? `Exibindo todos os ${state.ranking.length} parlamentares`
        : `Exibindo ${lista.length} de ${state.ranking.length} parlamentares`;

    if (lista.length === 0) {
      mostrarMensagem("Nenhum parlamentar encontrado para os filtros selecionados.");
      return;
    }

    limparMensagem();

    const rowsHtml = lista.map((dep) => {
      const topClass = dep.posicao <= 3 ? `top-${dep.posicao}` : "";
      const nota = Number(dep.nota_final || 0);
      const faixa = faixaNota(nota);
      const larguraBarra = Math.max(0, Math.min(100, (nota / 10) * 100));
      const resumo = dep.resumo_visual || {};
      const tooltipGastos = `CEAP: ${formatBRL(resumo.gasto_ceap_reais)} | Gabinete: ${formatBRL(resumo.gasto_gabinete_reais)}`;

      return `
        <tr data-id="${escapeHtml(dep.id_camara)}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(dep.nome)}">
          <td data-label="Posição"><span class="pos-badge ${topClass}">#${escapeHtml(dep.posicao)}</span></td>
          <td data-label="Parlamentar">
            <div class="parlamentar-cell">
              <img class="avatar" src="${escapeHtml(dep.foto_url || AVATAR_FALLBACK)}" alt="${escapeHtml(dep.nome)}" width="44" height="44" loading="lazy" decoding="async" />
              <div>
                <span class="parlamentar-nome">${escapeHtml(dep.nome)}</span>
                <span class="badge-party">${escapeHtml(dep.partido)} - ${escapeHtml(dep.uf)}</span>
              </div>
            </div>
          </td>
          <td data-label="Nota Final">
            <div class="nota-wrap">
              <span class="nota-valor ${faixa}">${formatNum(nota)}</span>
              <div class="progress-track">
                <div class="progress-fill ${faixa}" style="width: ${larguraBarra}%"></div>
              </div>
            </div>
          </td>
          <td data-label="Faltas">
            <span class="cell-main">${escapeHtml(resumo.faltas_totais ?? 0)} faltas</span>
            <span class="cell-sub">${escapeHtml(resumo.faltas_nao_justificadas ?? 0)} não just. / ${escapeHtml(resumo.faltas_justificadas ?? 0)} just.</span>
          </td>
          <td data-label="Gastos" title="${escapeHtml(tooltipGastos)}">
            <span class="cell-main">${formatBRL(resumo.gasto_total_reais)}</span>
            <span class="cell-sub">CEAP ${formatBRL(resumo.gasto_ceap_reais)} • Gab. ${formatBRL(resumo.gasto_gabinete_reais)}</span>
          </td>
        </tr>`;
    });

    els.tbody.innerHTML = rowsHtml.join("");
  }

  function definirInertFundo(ativo) {
    [els.siteHeader, els.conteudoPrincipal, els.siteFooter].forEach((el) => {
      if (el && "inert" in el) el.inert = ativo;
    });
  }

  function abrirModal(dep) {
    state.lastFocusedEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const blocos = dep.blocos || {};
    const ind = dep.indicadores || {};

    els.modalFoto.src = dep.foto_url || "";
    els.modalFoto.alt = dep.nome || "";
    els.modalPosicao.textContent = `#${dep.posicao}`;
    els.modalNome.textContent = dep.nome || "";
    els.modalPartidoUf.textContent = `${dep.partido} - ${dep.uf}`;

    const blocoA = Number(blocos.bloco_a || 0);
    const blocoB = Number(blocos.bloco_b || 0);
    const blocoC = Number(blocos.bloco_c || 0);

    els.modalBlocoA.textContent = formatSigned(blocoA);
    els.modalBlocoASub.textContent = `V: ${formatNum(ind.v_nota)} • PRE: ${formatNum(ind.pre_nota)}`;
    els.barBlocoA.style.width = `${Math.max(0, Math.min(100, (blocoA / 12) * 100))}%`;

    els.modalBlocoB.textContent = formatSigned(blocoB);
    els.modalBlocoBSub.textContent = `PL: ${formatNum(ind.pl_pontos)} • AL: ${formatNum(ind.al_pontos)} • PRO: -${formatNum(ind.pro_desconto)}`;
    els.barBlocoB.style.width = `${Math.max(0, Math.min(100, (Math.abs(blocoB) / 3) * 100))}%`;

    els.modalBlocoC.textContent = formatSigned(blocoC);
    els.modalBlocoCSub.textContent = `G: ${formatNum(ind.g_nota)} • D: ${formatNum(ind.d_nota)} • PRI: ${formatNum(ind.pri_nota)}`;
    els.barBlocoC.style.width = `${Math.max(0, Math.min(100, (Math.abs(blocoC) / 5) * 100))}%`;

    els.modalNotaFinal.textContent = formatNum(dep.nota_final);
    els.modalNotaBruta.textContent = `Nota bruta: ${formatNum(dep.nota_bruta)}`;

    els.modalVotosTbody.innerHTML = "";
    const votos = Array.isArray(dep.detalhe_votos) ? dep.detalhe_votos : [];
    const frag = document.createDocumentFragment();

    votos.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(item.codigo)}</strong><br />
          <span class="cell-sub">${escapeHtml(item.titulo)}</span>
        </td>
        <td class="num">${Number(item.rp || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td><span class="voto-pill ${votoClasse(item.voto)}">${escapeHtml(item.voto)}</span></td>
        <td class="num">${escapeHtml(item.np_obtido)}</td>
      `;
      frag.appendChild(tr);
    });

    els.modalVotosTbody.appendChild(frag);
    els.modalBackdrop.hidden = false;
    definirInertFundo(true);
    document.body.style.overflow = "hidden";
    els.modalFechar.focus();
  }

  function fecharModal() {
    els.modalBackdrop.hidden = true;
    definirInertFundo(false);
    document.body.style.overflow = "";
    if (state.lastFocusedEl && typeof state.lastFocusedEl.focus === "function") {
      state.lastFocusedEl.focus();
    }
    state.lastFocusedEl = null;
  }

  function abrirPorElemento(target) {
    const tr = target.closest("tr[data-id]");
    if (!tr) return;
    const dep = state.byId.get(Number(tr.dataset.id));
    if (dep) abrirModal(dep);
  }

  function registrarEventos() {
    els.filtroBusca.addEventListener("input", renderizarTabela);
    els.filtroPartido.addEventListener("change", renderizarTabela);
    els.filtroUf.addEventListener("change", renderizarTabela);
    els.ordenacao.addEventListener("change", renderizarTabela);
    els.btnLimparFiltros.addEventListener("click", limparFiltros);

    els.tbody.addEventListener("click", (event) => abrirPorElemento(event.target));
    els.tbody.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        abrirPorElemento(event.target);
      }
    });
    els.tbody.addEventListener(
      "error",
      (event) => {
        if (event.target.tagName === "IMG" && event.target.src !== AVATAR_FALLBACK) {
          event.target.src = AVATAR_FALLBACK;
        }
      },
      true
    );

    els.modalFoto.addEventListener("error", () => {
      if (els.modalFoto.src !== AVATAR_FALLBACK) els.modalFoto.src = AVATAR_FALLBACK;
    });

    els.modalFechar.addEventListener("click", fecharModal);
    els.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === els.modalBackdrop) fecharModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.modalBackdrop.hidden) fecharModal();
    });
  }

  async function inicializar() {
    registrarEventos();
    try {
      const resp = await fetch(DATA_URL, { cache: "no-store" });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      state.metadata = data.metadata || null;
      state.ranking = (Array.isArray(data.ranking) ? data.ranking : []).map((dep) => {
        const normalizado = { ...dep, _nomeLower: String(dep.nome || "").toLowerCase() };
        state.byId.set(Number(dep.id_camara), normalizado);
        return normalizado;
      });
      preencherResumo();
      popularFiltros();
      aplicarFiltrosDaUrl();
      renderizarTabela();
    } catch (erro) {
      preencherResumo();
      mostrarMensagem(
        "Não foi possível carregar public/ranking_final.json. Execute `python scripts/coletar.py` e `python scripts/calcular.py` e abra a pasta public/ via servidor HTTP local (ex.: Live Server)."
      );
    }
  }

  inicializar();
})();
