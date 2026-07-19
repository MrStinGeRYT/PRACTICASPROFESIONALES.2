/* empresas.js
   - Llena la tabla desde Supabase
   - Búsqueda SOLO por nombre
   - Paginación (200 por página) + botón "Cargar más"
   - Compatible con tu HTML (IDs: form-busqueda, busqueda, btnBuscar, estado-tabla, contenido-tabla)
   - Lee credenciales desde supabase-config.js:
       window.SUPABASE_URL
       window.SUPABASE_ANON_KEY
     (Opcional) window.SUPABASE_TABLE = "empresas"
*/

(() => {
  "use strict";

  // ====== Config por defecto ======
  const DEFAULT_TABLE = "empresas";

  // ✅ Paginación
  const PAGE_SIZE = 200;
  let page = 0;
  let lastTerm = "";
  let totalCount = null;
  let detectedNameCol = null;

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
      "PROGRAMA_EDUCATIVO",
    ],
    giro: ["giro_de_la_empresa", "GIRO_DE_LA_EMPRESA", "giro", "GIRO"],
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

    if (kind === "error") el.style.color = "#b00020";
    else if (kind === "ok") el.style.color = "#1b5e20";
    else el.style.color = "#333";
  }

  function pick(row, candidates) {
    for (const key of candidates) {
      if (
        Object.prototype.hasOwnProperty.call(row, key) &&
        row[key] !== null &&
        row[key] !== undefined
      ) {
        return row[key];
      }
    }
    for (const key of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key] ?? "";
    }
    return "";
  }

  // ✅ Ahora soporta append
  function renderRows(tbody, rows, opts = {}) {
    const { append = false } = opts;
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      if (!append) {
        tbody.innerHTML = `<tr><td colspan="8">No hay registros para mostrar.</td></tr>`;
      }
      return;
    }

    // si estaba el mensaje "No hay registros..." y vamos a append, limpiamos
    if (append && tbody.querySelector("td[colspan]")) {
      tbody.innerHTML = "";
    }

    const html = rows
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

    if (append) tbody.insertAdjacentHTML("beforeend", html);
    else tbody.innerHTML = html;
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

  // ✅ Trae una página usando una columna de nombre candidata (con range)
  async function fetchPageWithNameColumnFallback(sb, table, nameCols, term, from, to) {
    let lastError = null;

    for (const col of nameCols) {
      let q = sb
        .from(table)
        .select("*", { count: "exact" })
        .order(col, { ascending: true })
        .range(from, to);

      if (term) q = q.ilike(col, `%${term}%`);

      const { data, error, count } = await q;

      if (!error) {
        return { data: data || [], count: count ?? null, nameColUsed: col, error: null };
      }

      lastError = error;
    }

    return { data: [], count: null, nameColUsed: null, error: lastError };
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

    // ✅ Botón "Cargar más" (se crea solo, sin tocar tu HTML)
    let btnCargarMas = document.getElementById("btnCargarMas");
    if (!btnCargarMas && estado && estado.parentElement) {
      btnCargarMas = document.createElement("button");
      btnCargarMas.id = "btnCargarMas";
      btnCargarMas.type = "button";
      btnCargarMas.textContent = "Cargar más";
      btnCargarMas.style.marginTop = "10px";
      btnCargarMas.style.display = "none";
      // puedes cambiar clase si usas Bootstrap:
      btnCargarMas.className = "btn btn-secondary";
      estado.parentElement.appendChild(btnCargarMas);
    }

    const possibleNameCols = FIELD_CANDIDATES.nombre;

    function actualizarEstadoYBoton(loadedSoFar) {
      const total = totalCount;

      if (total !== null) {
        setEstado(estado, `Mostrando ${loadedSoFar} de ${total}`, loadedSoFar ? "ok" : "info");
        if (btnCargarMas) {
          btnCargarMas.style.display = loadedSoFar < total ? "inline-block" : "none";
        }
      } else {
        setEstado(estado, loadedSoFar ? `Mostrando: ${loadedSoFar}` : "Sin resultados.", loadedSoFar ? "ok" : "info");
        if (btnCargarMas) btnCargarMas.style.display = "none";
      }
    }

    async function cargarPagina(term, append = false) {
      const clean = (term || "").trim();

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Si ya detectamos columna, usamos directo
      if (detectedNameCol) {
        let q = sb
          .from(table)
          .select("*", { count: "exact" })
          .order(detectedNameCol, { ascending: true })
          .range(from, to);

        if (clean) q = q.ilike(detectedNameCol, `%${clean}%`);

        const { data, error, count } = await q;
        if (error) {
          console.error(error);
          setEstado(estado, "Error al cargar datos: " + (error.message || "desconocido"), "error");
          return;
        }

        if (totalCount === null) totalCount = count ?? null;

        renderRows(tbody, data || [], { append });

        page++;

        const loaded = (page - 1) * PAGE_SIZE + (data ? data.length : 0);
        // pero si ya había datos anteriores y estamos appending:
        const loadedSoFar = append ? tbody.querySelectorAll("tr").length : (data ? data.length : 0);

        actualizarEstadoYBoton(loadedSoFar);
        return;
      }

      // Si NO está detectada, probamos candidatos y guardamos la que funcione
      const { data, count, nameColUsed, error } = await fetchPageWithNameColumnFallback(
        sb,
        table,
        possibleNameCols,
        clean,
        from,
        to
      );

      if (error) {
        console.error(error);
        setEstado(
          estado,
          "Error al cargar datos. Revisa RLS (policy SELECT) y el nombre de la tabla/columnas.",
          "error"
        );
        return;
      }

      detectedNameCol = nameColUsed || detectedNameCol;
      if (totalCount === null) totalCount = count ?? null;

      renderRows(tbody, data || [], { append });

      page++;

      const loadedSoFar = tbody.querySelectorAll("tr").length;
      actualizarEstadoYBoton(loadedSoFar);
    }

    async function nuevaBusqueda(term = "") {
      lastTerm = (term || "").trim();
      page = 0;
      totalCount = null;

      setEstado(estado, "Cargando...", "info");
      renderRows(tbody, [], { append: false });
      if (btnCargarMas) btnCargarMas.style.display = "none";

      await cargarPagina(lastTerm, false);
    }

    // ✅ Primera carga
    await nuevaBusqueda("");

    // Buscar
    if (btn) btn.addEventListener("click", () => nuevaBusqueda(input ? input.value : ""));

    // Enter (submit)
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        nuevaBusqueda(input ? input.value : "");
      });
    }

    // ✅ Cargar más
    if (btnCargarMas) {
      btnCargarMas.addEventListener("click", () => {
        // si ya no hay más, no hace nada
        if (totalCount !== null && tbody.querySelectorAll("tr").length >= totalCount) return;

        setEstado(estado, "Cargando más...", "info");
        cargarPagina(lastTerm, true);
      });
    }
  });
})();
