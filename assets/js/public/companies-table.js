/**
 * companies-table.js — Tabla pública de empresas (Etapa 1)
 * Consulta registros_empresas y los muestra con:
 * - Búsqueda por nombre, programa educativo y giro
 * - Filtros por programa y giro
 * - Ordenamiento ascendente/descendente
 * - Paginación (10/25/50/100)
 * - Tabla en escritorio, tarjetas en móvil
 * - textContent (nunca innerHTML con datos de usuario)
 * - aria-live para actualizaciones
 *
 * NOTA ETAPA 2: Se añadirán selectores de año y periodo.
 */
(function () {
  "use strict";

  // ── Estado ────────────────────────────────────────────────────
  let state = {
    search:         "",
    filterPrograma: "",
    filterGiro:     "",
    sortBy:         "nombre",
    sortDir:        "asc",
    page:           0,
    pageSize:       25,
    total:          null,
  };

  // ── DOM refs ──────────────────────────────────────────────────
  const searchInput    = document.getElementById("search-input");
  const searchBtn      = document.getElementById("search-btn");
  const clearBtn       = document.getElementById("clear-btn");
  const filterPrograma = document.getElementById("filter-programa");
  const filterGiro     = document.getElementById("filter-giro");
  const sortSelect     = document.getElementById("sort-select");
  const sortDirBtn     = document.getElementById("sort-dir-btn");
  const pageSizeSelect = document.getElementById("page-size");
  const statusEl       = document.getElementById("table-status");
  const countEl        = document.getElementById("results-count");
  const tableBody      = document.getElementById("table-body");
  const tableWrap      = document.getElementById("table-wrapper");
  const cardsList      = document.getElementById("cards-list");
  const paginationEl   = document.getElementById("pagination");
  const retryBtn       = document.getElementById("retry-btn");
  const tableHeaders   = document.querySelectorAll(".companies-table th[data-col]");

  // ── Helpers ───────────────────────────────────────────────────
  function setStatus(text, type = "info", showSpinner = false) {
    if (!statusEl) return;
    if (!text) { statusEl.setAttribute("hidden", ""); statusEl.textContent = ""; return; }
    statusEl.removeAttribute("hidden");
    statusEl.className = `alert alert--${type}`;
    statusEl.textContent = showSpinner ? "" : text;
    if (showSpinner) {
      const s = document.createElement("span");
      s.className = "spinner";
      s.setAttribute("aria-hidden", "true");
      const t = document.createTextNode(" " + text);
      statusEl.appendChild(s);
      statusEl.appendChild(t);
    }
    statusEl.setAttribute("aria-live", "polite");
  }

  function setCount(showing, total) {
    if (!countEl) return;
    if (total === null) { countEl.textContent = ""; return; }
    const from = state.page * state.pageSize + 1;
    const to   = Math.min(from + showing - 1, total);
    countEl.textContent = total === 0
      ? "Sin resultados"
      : `Mostrando ${from}–${to} de ${total} empresa${total !== 1 ? "s" : ""}`;
  }

  // Crea un enlace o texto de forma segura
  function makeLink(value, prefix) {
    const str = String(value ?? "").trim();
    if (!str) return document.createTextNode("—");
    const a  = document.createElement("a");
    a.href   = `${prefix}${prefix === "tel:" ? str.replace(/\s/g, "") : str}`;
    a.textContent = str;
    return a;
  }

  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function isPhone(s) { return /^[\d\s()+\-]{7,}$/.test(s); }

  function safeVal(value) {
    const str = String(value ?? "").trim();
    if (isEmail(str)) return makeLink(str, "mailto:");
    if (isPhone(str)) return makeLink(str, "tel:");
    return document.createTextNode(str || "—");
  }

  function pick(row, candidates) {
    for (const k of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && row[k] !== "")
        return row[k];
    }
    for (const k of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, k)) return row[k] ?? "";
    }
    return "";
  }

  const C = window.CompaniesService?.COLS || {
    nombre:       ["nombre","NOMBRE"],
    direccion:    ["direccion","DIRECCION"],
    telefono:     ["telefono","TELEFONO"],
    nombre_carta: ["nombre_carta","NOMBRE_CARTA"],
    puesto_carta: ["puesto_carta","PUESTO_CARTA"],
    correo_cont:  ["correo_cont","CORREO_CONT","correo","CORREO"],
    programa:     ["programa_educativo_solicitado","PROGRAMA_EDUCATIVO_SOLICITADO","programa","PROGRAMA"],
    giro:         ["giro_de_la_empresa","GIRO_DE_LA_EMPRESA","giro","GIRO"],
  };

  // ── Render tabla (escritorio) ─────────────────────────────────
  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (!rows || rows.length === 0) {
      const tr = document.createElement("tr");
      tr.className = "table-empty-row";
      const td = document.createElement("td");
      td.colSpan = 8;
      td.textContent = "No hay registros para mostrar con los filtros actuales.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement("tr");
      const fields = [
        pick(row, C.nombre),
        pick(row, C.direccion),
        pick(row, C.telefono),
        pick(row, C.nombre_carta),
        pick(row, C.puesto_carta),
        pick(row, C.correo_cont),
        pick(row, C.programa),
        pick(row, C.giro),
      ];
      for (const val of fields) {
        const td = document.createElement("td");
        td.appendChild(safeVal(val));
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tableBody.appendChild(frag);
  }

  // ── Render tarjetas (móvil) ───────────────────────────────────
  function renderCards(rows) {
    if (!cardsList) return;
    cardsList.innerHTML = "";

    if (!rows || rows.length === 0) {
      const p = document.createElement("p");
      p.style.cssText = "text-align:center;color:var(--color-gray-400);padding:2rem";
      p.textContent = "No hay registros para mostrar.";
      cardsList.appendChild(p);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "company-card animate-in";
      card.dataset.expanded = "false";

      // Botón encabezado (accesible con teclado)
      const headerBtn = document.createElement("button");
      headerBtn.className = "company-card__header";
      headerBtn.type = "button";
      headerBtn.setAttribute("aria-expanded", "false");

      const nameEl = document.createElement("div");
      nameEl.className = "company-card__name";
      nameEl.textContent = String(pick(row, C.nombre) || "—");

      const metaEl  = document.createElement("div");
      metaEl.className = "company-card__meta";

      const progBadge = document.createElement("span");
      progBadge.className = "badge";
      progBadge.textContent = String(pick(row, C.programa) || "—");

      const giroBadge = document.createElement("span");
      giroBadge.className = "badge";
      giroBadge.textContent = String(pick(row, C.giro) || "—");

      metaEl.appendChild(progBadge);
      metaEl.appendChild(giroBadge);

      const leftDiv = document.createElement("div");
      leftDiv.appendChild(nameEl);
      leftDiv.appendChild(metaEl);

      const toggleIcon = document.createElement("span");
      toggleIcon.className = "company-card__toggle-icon";
      toggleIcon.setAttribute("aria-hidden", "true");
      toggleIcon.textContent = "▾";

      headerBtn.appendChild(leftDiv);
      headerBtn.appendChild(toggleIcon);

      // Detalles
      const details = document.createElement("div");
      details.className = "company-card__details";

      const detailFields = [
        ["Dirección",  pick(row, C.direccion), "text"],
        ["Teléfono",   pick(row, C.telefono),  "tel"],
        ["Contacto",   pick(row, C.nombre_carta), "text"],
        ["Puesto",     pick(row, C.puesto_carta),  "text"],
        ["Correo",     pick(row, C.correo_cont),   "email"],
      ];

      for (const [label, value, type] of detailFields) {
        const detRow = document.createElement("div");
        detRow.className = "detail-row";
        const lbl = document.createElement("span");
        lbl.className = "detail-label";
        lbl.textContent = label;
        const val = document.createElement("span");
        val.className = "detail-value";
        const str = String(value ?? "").trim();
        if (type === "email" && isEmail(str)) {
          val.appendChild(makeLink(str, "mailto:"));
        } else if (type === "tel" && isPhone(str)) {
          val.appendChild(makeLink(str, "tel:"));
        } else {
          val.textContent = str || "—";
        }
        detRow.appendChild(lbl);
        detRow.appendChild(val);
        details.appendChild(detRow);
      }

      // Toggle expand/collapse
      headerBtn.addEventListener("click", () => {
        const expanded = card.dataset.expanded === "true";
        card.dataset.expanded = String(!expanded);
        headerBtn.setAttribute("aria-expanded", String(!expanded));
        toggleIcon.textContent = !expanded ? "▴" : "▾";
      });
      headerBtn.addEventListener("keydown", e => {
        if (e.key === "Escape" && card.dataset.expanded === "true") {
          card.dataset.expanded = "false";
          headerBtn.setAttribute("aria-expanded", "false");
          toggleIcon.textContent = "▾";
        }
      });

      card.appendChild(headerBtn);
      card.appendChild(details);
      frag.appendChild(card);
    }
    cardsList.appendChild(frag);
  }

  // ── Paginación ────────────────────────────────────────────────
  function renderPagination(total, pageSize, currentPage) {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";
    if (total === null || total === 0) return;

    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return;

    const frag = document.createDocumentFragment();

    // Anterior
    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.textContent = "‹";
    prev.setAttribute("aria-label", "Página anterior");
    prev.disabled = currentPage === 0;
    prev.addEventListener("click", () => goToPage(currentPage - 1));
    frag.appendChild(prev);

    // Páginas visibles (máx 7)
    const maxVisible = 7;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage   = Math.min(totalPages - 1, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(0, endPage - maxVisible + 1);

    if (startPage > 0) {
      const b = makePageBtn(0, currentPage); frag.appendChild(b);
      if (startPage > 1) {
        const d = document.createElement("span");
        d.className = "page-btn"; d.textContent = "…"; d.style.cursor = "default";
        frag.appendChild(d);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      frag.appendChild(makePageBtn(i, currentPage));
    }

    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        const d = document.createElement("span");
        d.className = "page-btn"; d.textContent = "…"; d.style.cursor = "default";
        frag.appendChild(d);
      }
      frag.appendChild(makePageBtn(totalPages - 1, currentPage));
    }

    // Siguiente
    const next = document.createElement("button");
    next.className = "page-btn";
    next.textContent = "›";
    next.setAttribute("aria-label", "Página siguiente");
    next.disabled = currentPage >= totalPages - 1;
    next.addEventListener("click", () => goToPage(currentPage + 1));
    frag.appendChild(next);

    paginationEl.appendChild(frag);
  }

  function makePageBtn(page, currentPage) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (page === currentPage ? " page-btn--active" : "");
    btn.textContent = String(page + 1);
    btn.setAttribute("aria-label", `Página ${page + 1}`);
    if (page === currentPage) btn.setAttribute("aria-current", "page");
    btn.addEventListener("click", () => goToPage(page));
    return btn;
  }

  function goToPage(page) {
    state.page = page;
    loadData();
  }

  // ── Encabezados ordenables ────────────────────────────────────
  function updateSortHeaders() {
    tableHeaders.forEach(th => {
      const col = th.dataset.col;
      if (col === state.sortBy) {
        th.setAttribute("aria-sort", state.sortDir === "asc" ? "ascending" : "descending");
      } else {
        th.setAttribute("aria-sort", "none");
      }
    });
  }

  tableHeaders.forEach(th => {
    th.setAttribute("tabindex", "0");
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (state.sortBy === col) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortBy  = col;
        state.sortDir = "asc";
      }
      if (sortSelect) sortSelect.value = col;
      if (sortDirBtn) sortDirBtn.textContent = state.sortDir === "asc" ? "↑" : "↓";
      state.page = 0;
      loadData();
    });
    th.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); th.click(); }
    });
  });

  // ── Carga de datos ────────────────────────────────────────────
  async function loadData() {
    setStatus("Cargando…", "info", true);
    if (retryBtn) retryBtn.setAttribute("hidden", "");
    updateSortHeaders();

    try {
      const { data, count } = await window.CompaniesService.getCurrentCompanies({
        search:         state.search,
        filterPrograma: state.filterPrograma,
        filterGiro:     state.filterGiro,
        sortBy:         state.sortBy,
        sortDir:        state.sortDir,
        page:           state.page,
        pageSize:       state.pageSize,
      });

      state.total = count;

      setStatus("", "info");
      setCount(data.length, count);
      renderTable(data);
      renderCards(data);
      renderPagination(count, state.pageSize, state.page);

      if (count === 0) {
        setStatus("No hay registros disponibles con los criterios actuales.", "warning");
      }

    } catch (err) {
      console.error("[companies-table]", err);
      setStatus("Error al cargar los datos. " + (err.message || ""), "danger");
      if (retryBtn) retryBtn.removeAttribute("hidden");
      renderTable([]);
      renderCards([]);
    }
  }

  // ── Poblar filtros ────────────────────────────────────────────
  async function populateFilters() {
    try {
      const { programas, giros } = await window.CompaniesService.getFilterOptions();

      if (filterPrograma) {
        programas.forEach(p => {
          const o = document.createElement("option");
          o.value = p; o.textContent = p;
          filterPrograma.appendChild(o);
        });
      }
      if (filterGiro) {
        giros.forEach(g => {
          const o = document.createElement("option");
          o.value = g; o.textContent = g;
          filterGiro.appendChild(o);
        });
      }
    } catch (err) {
      console.warn("[companies-table] No se pudieron cargar los filtros:", err.message);
    }
  }

  // ── Eventos ───────────────────────────────────────────────────
  function applyFilters() {
    state.search         = searchInput?.value || "";
    state.filterPrograma = filterPrograma?.value || "";
    state.filterGiro     = filterGiro?.value || "";
    state.page           = 0;
    loadData();
  }

  function clearAll() {
    if (searchInput)    searchInput.value    = "";
    if (filterPrograma) filterPrograma.value = "";
    if (filterGiro)     filterGiro.value     = "";
    if (sortSelect)     sortSelect.value     = "nombre";
    if (sortDirBtn)     sortDirBtn.textContent = "↑";
    state = { ...state, search: "", filterPrograma: "", filterGiro: "",
              sortBy: "nombre", sortDir: "asc", page: 0 };
    loadData();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.CompaniesService) {
      setStatus("Error: el servicio de empresas no está disponible.", "danger");
      return;
    }

    await populateFilters();
    await loadData();

    if (searchBtn)  searchBtn.addEventListener("click",  applyFilters);
    if (clearBtn)   clearBtn.addEventListener("click",   clearAll);
    if (retryBtn)   retryBtn.addEventListener("click",   () => loadData());

    if (searchInput) {
      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); applyFilters(); }
      });
    }

    if (filterPrograma) filterPrograma.addEventListener("change", applyFilters);
    if (filterGiro)     filterGiro.addEventListener("change",     applyFilters);

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        state.sortBy = sortSelect.value;
        state.page   = 0;
        loadData();
      });
    }

    if (sortDirBtn) {
      sortDirBtn.addEventListener("click", () => {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        sortDirBtn.textContent  = state.sortDir === "asc" ? "↑" : "↓";
        sortDirBtn.setAttribute("aria-label",
          state.sortDir === "asc" ? "Orden ascendente" : "Orden descendente");
        state.page = 0;
        loadData();
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", () => {
        state.pageSize = parseInt(pageSizeSelect.value, 10) || 25;
        state.page     = 0;
        loadData();
      });
    }
  });
})();
