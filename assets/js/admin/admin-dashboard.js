/**
 * admin-dashboard.js — Panel administrativo (Etapa 1)
 * Mantiene el flujo actual de carga de Excel y visualización de datos.
 *
 * CORRECCIONES respecto al original:
 * - Usa CompaniesService y AuthService (sin acceso directo a Supabase)
 * - Eliminado botón "Eliminar Todo" como acción instantánea; ahora requiere confirmación robusta
 * - textContent en lugar de innerHTML para datos de usuarios
 * - Manejo de errores mejorado
 * - Validaciones de Excel más descriptivas
 *
 * NOTA ETAPA 2: Esta lógica será reemplazada por el sistema de periodos y versiones.
 */
(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────
  const tbody         = document.getElementById("admin-table-body");
  const searchInput   = document.getElementById("admin-search");
  const excelInput    = document.getElementById("excel-upload");
  const btnSubir      = document.getElementById("btn-subir-excel");
  const btnEliminar   = document.getElementById("btn-eliminar");
  const btnSalir      = document.getElementById("btn-salir");
  const statusEl      = document.getElementById("admin-status");
  const countEl       = document.getElementById("admin-count");
  const progressBar   = document.getElementById("upload-progress");
  const progressWrap  = document.getElementById("progress-wrapper");
  const dropzone      = document.getElementById("excel-dropzone");
  const fileNameEl    = document.getElementById("file-name");

  const COLS = window.CompaniesService?.COLS;

  let allRows = [];
  let detectedCols = null; // mapa nombre_logico → nombre_real_en_bd

  // ── Helpers UI ────────────────────────────────────────────────
  function setStatus(text, type = "info") {
    if (!statusEl) return;
    if (!text) { statusEl.setAttribute("hidden", ""); statusEl.textContent = ""; return; }
    statusEl.removeAttribute("hidden");
    statusEl.className = `alert alert--${type}`;
    statusEl.textContent = text;
    statusEl.setAttribute("role", "status");
  }

  function setCount(n) {
    if (!countEl) return;
    countEl.textContent = n !== null ? `${n} registro${n !== 1 ? "s" : ""}` : "";
  }

  function setProgress(pct) {
    if (!progressBar || !progressWrap) return;
    if (pct === null) { progressWrap.style.display = "none"; return; }
    progressWrap.style.display = "block";
    progressBar.style.width = `${Math.min(100, pct)}%`;
  }

  // Crea una celda td de forma segura (sin innerHTML con datos de usuario)
  function safeTd(value) {
    const td  = document.createElement("td");
    const str = String(value ?? "").trim();
    // Convertir correo o teléfono en enlace
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      const a = document.createElement("a");
      a.href = `mailto:${str}`;
      a.textContent = str;
      td.appendChild(a);
    } else if (/^[\d\s()+\-]{7,}$/.test(str)) {
      const a = document.createElement("a");
      a.href = `tel:${str.replace(/\s/g, "")}`;
      a.textContent = str;
      td.appendChild(a);
    } else {
      td.textContent = str;
    }
    return td;
  }

  // ── Render de tabla ───────────────────────────────────────────
  function pick(row, candidates) {
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key) && row[key] != null) return row[key];
    }
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key] ?? "";
    }
    return "";
  }

  function renderRows(rows) {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows || rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 8;
      td.style.textAlign = "center";
      td.style.padding = "2rem";
      td.style.color = "var(--color-gray-400)";
      td.textContent = "No hay registros para mostrar.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    const FIELD_MAP = COLS || {
      nombre:       ["nombre","NOMBRE"],
      direccion:    ["direccion","DIRECCION"],
      telefono:     ["telefono","TELEFONO"],
      nombre_carta: ["nombre_carta","NOMBRE_CARTA"],
      puesto_carta: ["puesto_carta","PUESTO_CARTA"],
      correo_cont:  ["correo_cont","CORREO_CONT","correo","CORREO"],
      programa:     ["programa_educativo_solicitado","PROGRAMA_EDUCATIVO_SOLICITADO","programa","PROGRAMA"],
      giro:         ["giro_de_la_empresa","GIRO_DE_LA_EMPRESA","giro","GIRO"],
    };

    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.appendChild(safeTd(pick(row, FIELD_MAP.nombre)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.direccion)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.telefono)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.nombre_carta)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.puesto_carta)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.correo_cont)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.programa)));
      tr.appendChild(safeTd(pick(row, FIELD_MAP.giro)));
      fragment.appendChild(tr);
    }
    tbody.appendChild(fragment);
  }

  function filtrarLocal() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    if (!q) return renderRows(allRows);
    const filtered = allRows.filter(r => {
      const candidates = COLS
        ? [...COLS.nombre, ...COLS.programa, ...COLS.giro]
        : ["nombre","NOMBRE","programa_educativo_solicitado","giro_de_la_empresa"];
      return candidates.some(col =>
        String(r[col] ?? "").toLowerCase().includes(q)
      );
    });
    renderRows(filtered);
  }

  // ── Carga de datos desde Supabase ─────────────────────────────
  async function loadData() {
    setStatus("Cargando registros…", "info");
    try {
      const { data, count } = await window.CompaniesService.getCurrentCompanies({
        pageSize: 5000, page: 0,
      });
      allRows = data;
      setStatus(
        allRows.length
          ? `Listo. Mostrando ${allRows.length} registros.`
          : "La tabla no contiene registros.",
        allRows.length ? "success" : "warning"
      );
      setCount(allRows.length);
      filtrarLocal();
    } catch (err) {
      console.error("[admin-dashboard] loadData:", err);
      setStatus("Error al cargar datos: " + (err.message || "desconocido"), "danger");
      allRows = [];
      renderRows([]);
    }
  }

  // ── Excel → BD ────────────────────────────────────────────────
  function normalize(s) {
    return String(s || "").trim().toLowerCase()
      .replace(/_/g, " ").replace(/\s+/g, " ").replace(/\./g, "");
  }

  const HEADER_MAP = [
    { key: "nombre",                        aliases: ["nombre"] },
    { key: "direccion",                     aliases: ["direccion"] },
    { key: "telefono",                      aliases: ["telefono"] },
    { key: "nombre_carta",                  aliases: ["nombre_carta","nombre carta"] },
    { key: "puesto_carta",                  aliases: ["puesto_carta","puesto carta"] },
    { key: "correo_cont",                   aliases: ["correo_cont","correo contacto","correo"] },
    { key: "programa_educativo_solicitado", aliases: ["programa educativo solicitado","programa_educativo_solicitado","programa educativo","programa"] },
    { key: "giro_de_la_empresa",            aliases: ["giro de la empresa","giro_de_la_empresa","giro"] },
  ];

  function mapHeaders(rawHeaders) {
    const norm = rawHeaders.map(normalize);
    const map  = {};
    const missing = [];

    for (const { key, aliases } of HEADER_MAP) {
      const idx = aliases.map(a => norm.indexOf(normalize(a))).find(i => i !== -1) ?? -1;
      if (idx === -1) missing.push(key);
      map[key] = idx;
    }
    return { map, missing };
  }

  function parseExcelRows(aoa) {
    if (!aoa || aoa.length < 2) return { rows: [], missing: [], ignored: 0 };

    const rawHeaders = aoa[0];
    const { map, missing } = mapHeaders(rawHeaders);

    const rows    = [];
    let   ignored = 0;

    for (let i = 1; i < aoa.length; i++) {
      const raw  = aoa[i];
      const get  = k => map[k] >= 0 ? String(raw[map[k]] ?? "").trim() : "";
      const obj  = {};
      for (const { key } of HEADER_MAP) obj[key] = get(key);

      if (!obj.nombre) { ignored++; continue; }
      rows.push(obj);
    }

    return { rows, missing, ignored };
  }

  async function onFileSelected(file) {
    if (!file) return;

    // Validaciones de archivo
    const validExts = [".xlsx", ".xls"];
    const ext       = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setStatus(`Tipo de archivo no válido. Solo se aceptan: ${validExts.join(", ")}`, "danger");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus("El archivo excede el tamaño máximo de 20 MB.", "danger");
      return;
    }

    if (fileNameEl) {
      fileNameEl.textContent = file.name;
      fileNameEl.style.display = "block";
    }
    if (dropzone) dropzone.dataset.hasFile = "true";

    setStatus("Leyendo archivo Excel…", "info");
    setProgress(10);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        if (typeof XLSX === "undefined") {
          setStatus("La librería XLSX no está cargada.", "danger");
          setProgress(null);
          return;
        }
        const data     = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
          setStatus("No se encontró ninguna hoja en el archivo Excel.", "danger");
          setProgress(null);
          return;
        }

        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        setProgress(30);

        const { rows, missing, ignored } = parseExcelRows(aoa);

        if (rows.length === 0) {
          setStatus(
            "No se encontraron filas válidas. " +
            (missing.length ? `Columnas faltantes: ${missing.join(", ")}. ` : "") +
            "Verifica que la primera fila contenga los encabezados.",
            "danger"
          );
          setProgress(null);
          return;
        }

        // Resumen pre-carga
        const resumen = [
          `Archivo: ${file.name}`,
          `Filas en Excel: ${aoa.length - 1}`,
          `Registros válidos: ${rows.length}`,
          `Registros ignorados (sin nombre): ${ignored}`,
          missing.length ? `Columnas faltantes (se omitirán): ${missing.join(", ")}` : null,
        ].filter(Boolean).join("\n");

        const confirmMsg =
          "Se REEMPLAZARÁN todos los registros actuales:\n\n" +
          resumen +
          "\n\n⚠️ Esta operación eliminará los datos actuales antes de insertar los nuevos.\n" +
          "En la Etapa 2 esto será reemplazado por un sistema de versiones.\n\n" +
          "¿Continuar?";

        if (!confirm(confirmMsg)) {
          setStatus("Carga cancelada.", "info");
          setProgress(null);
          return;
        }

        setStatus("Eliminando registros anteriores…", "warning");
        setProgress(50);

        const { error: delErr } = await window.CompaniesService.deleteAllCompanies();
        if (delErr) {
          setStatus("Error al limpiar la base de datos: " + delErr.message, "danger");
          setProgress(null);
          return;
        }

        setStatus(`Insertando ${rows.length} registros…`, "info");
        setProgress(70);

        const { error: insErr } = await window.CompaniesService.uploadCurrentCompanies(rows);
        if (insErr) {
          setStatus("Error al insertar registros: " + insErr.message, "danger");
          setProgress(null);
          return;
        }

        setProgress(100);
        setStatus(`Listo. Se publicaron ${rows.length} registros.`, "success");
        setTimeout(() => setProgress(null), 1500);
        await loadData();

      } catch (err) {
        console.error("[admin-dashboard] Excel error:", err);
        setStatus("Error leyendo el Excel: " + (err.message || err), "danger");
        setProgress(null);
      } finally {
        if (excelInput) excelInput.value = "";
        if (dropzone) delete dropzone.dataset.hasFile;
        if (fileNameEl) { fileNameEl.textContent = ""; fileNameEl.style.display = "none"; }
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Cerrar sesión ─────────────────────────────────────────────
  async function onLogout() {
    if (!confirm("¿Deseas cerrar sesión?")) return;
    await window.AuthService.logout();
    window.location.replace("./admin-login.html");
  }

  // ── Init ──────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.CompaniesService || !window.AuthService) {
      setStatus("Error de configuración: servicios no cargados.", "danger");
      return;
    }

    await loadData();

    if (searchInput)  searchInput.addEventListener("input", filtrarLocal);
    if (btnSubir)     btnSubir.addEventListener("click", () => excelInput?.click());

    if (excelInput) {
      excelInput.addEventListener("change", e => {
        const f = e.target.files?.[0];
        if (f) onFileSelected(f);
      });
    }

    // Drag & drop en la dropzone
    if (dropzone) {
      dropzone.addEventListener("dragover", e => {
        e.preventDefault();
        dropzone.classList.add("upload-dropzone--active");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("upload-dropzone--active");
      });
      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("upload-dropzone--active");
        const f = e.dataTransfer?.files?.[0];
        if (f) onFileSelected(f);
      });
    }

    if (btnEliminar) {
      btnEliminar.addEventListener("click", async () => {
        const confirm1 = confirm(
          "⚠️ ADVERTENCIA: Esta acción eliminará TODOS los registros.\n\n" +
          "En la Etapa 2 esto será reemplazado por el sistema de versiones.\n\n" +
          "¿Estás seguro de que deseas continuar?"
        );
        if (!confirm1) return;
        const confirm2 = prompt('Escribe "ELIMINAR" (en mayúsculas) para confirmar:');
        if (confirm2 !== "ELIMINAR") {
          alert("Operación cancelada. No se eliminó ningún registro.");
          return;
        }
        setStatus("Eliminando todos los registros…", "warning");
        const { error } = await window.CompaniesService.deleteAllCompanies();
        if (error) {
          setStatus("Error al eliminar: " + error.message, "danger");
          return;
        }
        setStatus("Todos los registros han sido eliminados.", "success");
        allRows = [];
        setCount(0);
        renderRows([]);
      });
    }

    if (btnSalir) btnSalir.addEventListener("click", onLogout);
  });
})();
