/* empresas.js
   - Llena la tabla desde Supabase
   - Búsqueda SOLO por nombre
   - Compatible con tu HTML (IDs: form-busqueda, busqueda, btnBuscar, estado-tabla, contenido-tabla)
   - Lee credenciales desde supabase-config.js:
       window.SUPABASE_URL
       window.SUPABASE_ANON_KEY
     (Opcional) window.SUPABASE_TABLE = "empresas"
*/

(() => {
  "use strict";

  // ====== Config por defecto (ajusta si tu tabla se llama distinto) ======
  const DEFAULT_TABLE = "empresas";
  const DEFAULT_LIMIT = 200;

  // Candidatos por si tus columnas están en minúsculas o MAYÚSCULAS (o con underscores)
  const FIELD_CANDIDATES = {
    nombre: ["nombre", "NOMBRE"],
    direccion: ["direccion", "DIRECCION"],
    telefono: ["telefono", "TELEFONO"],
    nombre_carta: ["nombre_carta", "NOMBRE_CARTA", "nombreCarta", "NOMBRECARTA"],
    puesto_carta: ["puesto_carta", "PUESTO_CARTA", "puestoCarta", "PUESTOCARTA"],
    correo_cont: ["correo_cont", "CORREO_CONT", "correo", "CORREO"],
    programa: [
      "programa_educativo_solicitado",
      "PROGRAMA_EDUCATIVO_SOLICITADO",
      "programa",
      "PROGRAMA",
      "programa_educativo",
      "PROGRAMA_EDUCATIVO"
    ],
    giro: [
      "giro_de_la_empresa",
      "GIRO_DE_LA_EMPRESA",
      "giro",
      "GIRO"
    ],
  };

  // ====== Helpers UI ======
  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setEstado(el, msg, kind = "info") {
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = msg;

    // Colores suaves (no afecta tu CSS global)
    if (kind === "error") el.style.color = "#b00020";
    else if (kind === "ok") el.style.color = "#1b5e20";
    else el.style.color = "#333";
  }

  function pick(row, candidates) {
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== undefined) {
        return row[key];
      }
    }
    // si existe pero está vacío, devolvemos vacío
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key] ?? "";
    }
    return "";
  }

  function renderRows(tbody, rows) {
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">No hay registros para mostrar.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((r) => {
        const nombre = pick(r, FIELD_CANDIDATES.nombre);
        const direccion = pick(r, FIELD_CANDIDATES.direccion);
        const telefono = pick(r, FIELD_CANDIDATES.telefono);
        const nombreCarta = pick(r, FIELD_CANDIDATES.nombre_carta);
        const puestoCarta = pick(r, FIELD_CANDIDATES.puesto_carta);
        const correo = pick(r, FIELD_CANDIDATES.correo_cont);
        const programa = pick(r, FIELD_CANDIDATES.programa);
        const giro = pick(r, FIELD_CANDIDATES.giro);

        return `
          <tr>
            <td>${escapeHtml(nombre)}</td>
            <td>${escapeHtml(direccion)}</td>
            <td>${escapeHtml(telefono)}</td>
            <td>${escapeHtml(nombreCarta)}</td>
            <td>${escapeHtml(puestoCarta)}</td>
            <td>${escapeHtml(correo)}</td>
            <td>${escapeHtml(programa)}</td>
            <td>${escapeHtml(giro)}</td>
          </tr>
        `;
      })
      .join("");
  }

  // ====== Supabase helpers ======
  function getSupabaseConfig() {
    const url =
      window.SUPABASE_URL ||
      window.supabaseUrl ||
      window.SUPABASE_PROJECT_URL ||
      "";

    const key =
      window.SUPABASE_ANON_KEY ||
      window.SUPABASE_KEY ||
      window.supabaseAnonKey ||
      "";

    const table = window.SUPABASE_TABLE || DEFAULT_TABLE;

    return { url, key, table };
  }

  function createSbClient(url, key) {
    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== "function") return null;
    return lib.createClient(url, key);
  }

  // Intenta ejecutar una consulta usando una lista de posibles columnas de nombre
  async function fetchWithNameColumnFallback(sb, table, nameCols, term, limit) {
    let lastError = null;

    for (const col of nameCols) {
      let q = sb.from(table).select("*").order(col, { ascending: true }).limit(limit);

      if (term) q = q.ilike(col, `%${term}%`);

      const { data, error } = await q;

      if (!error) {
        return { data: data || [], nameColUsed: col, error: null };
      }

      lastError = error;
      // si el error fue por columna inexistente, probamos la siguiente
      // si fue por RLS/permisos, igual lo devolvemos al final
    }

    return { data: [], nameColUsed: null, error: lastError };
  }

  // ====== Main ======
  document.addEventListener("DOMContentLoaded", async () => {
    const form = $("form-busqueda");
    const input = $("busqueda");
    const btn = $("btnBuscar");
    const estado = $("estado-tabla");
    const tbody = $("contenido-tabla");

    const { url, key, table } = getSupabaseConfig();

    if (!url || !key) {
      setEstado(
        estado,
        "Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en supabase-config.js",
        "error"
      );
      renderRows(tbody, []);
      return;
    }

    const sb = createSbClient(url, key);
    if (!sb) {
      setEstado(
        estado,
        "No se cargó la librería de Supabase. Revisa que exista: <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script>",
        "error"
      );
      renderRows(tbody, []);
      return;
    }

    // Columnas posibles para el nombre (para búsqueda)
    const possibleNameCols = FIELD_CANDIDATES.nombre;

    let detectedNameCol = null;

    async function cargar(term = "") {
      const clean = (term || "").trim();

      setEstado(estado, "Cargando...", "info");

      // Si ya detectamos la columna, usamos esa directo
      if (detectedNameCol) {
        let q = sb.from(table).select("*").order(detectedNameCol, { ascending: true }).limit(DEFAULT_LIMIT);
        if (clean) q = q.ilike(detectedNameCol, `%${clean}%`);

        const { data, error } = await q;
        if (error) {
          console.error(error);
          setEstado(estado, "Error al cargar datos: " + (error.message || "desconocido"), "error");
          renderRows(tbody, []);
          return;
        }

        setEstado(estado, data.length ? `Resultados: ${data.length}` : "Sin resultados.", data.length ? "ok" : "info");
        renderRows(tbody, data);
        return;
      }

      // Si NO está detectada, probamos varias columnas y nos quedamos con la que funcione
      const { data, nameColUsed, error } = await fetchWithNameColumnFallback(
        sb,
        table,
        possibleNameCols,
        clean,
        DEFAULT_LIMIT
      );

      if (error) {
        console.error(error);
        setEstado(
          estado,
          "Error al cargar datos. Si todo está bien, revisa RLS (policy SELECT) y el nombre de la tabla/columnas.",
          "error"
        );
        renderRows(tbody, []);
        return;
      }

      detectedNameCol = nameColUsed || detectedNameCol;

      setEstado(estado, data.length ? `Resultados: ${data.length}` : "Sin resultados.", data.length ? "ok" : "info");
      renderRows(tbody, data);
    }

    // Primera carga (sin filtro)
    await cargar("");

    // Botón buscar
    if (btn) btn.addEventListener("click", () => cargar(input ? input.value : ""));

    // Enter (submit del form)
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        cargar(input ? input.value : "");
      });
    }

    // (Opcional) búsqueda en vivo con debounce (suave)
    /*let t = null;
    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => cargar(input.value), 250);
      });
    }*/
  });
})();