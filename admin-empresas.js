/* admin-empresas.js */

(() => {
  "use strict";

  const TABLE = window.SUPABASE_TABLE || "registros_empresas";
  const LOGIN_PAGE = "adm-loging.html";

  // ✅ Usar el cliente global (NO crear uno nuevo aquí)
  const supa = window.sb;

  // Columnas esperadas en BD (preferimos snake_case)
  const DB_LOWER = {
    nombre: "nombre",
    direccion: "direccion",
    telefono: "telefono",
    nombre_carta: "nombre_carta",
    puesto_carta: "puesto_carta",
    correo_cont: "correo_cont",
    programa: "programa_educativo_solicitado",
    giro: "giro_de_la_empresa",
  };

  // Fallback si en tu BD quedaron en MAYÚSCULAS
  const DB_UPPER = {
    nombre: "NOMBRE",
    direccion: "DIRECCION",
    telefono: "TELEFONO",
    nombre_carta: "NOMBRE_CARTA",
    puesto_carta: "PUESTO_CARTA",
    correo_cont: "CORREO_CONT",
    programa: "PROGRAMA_EDUCATIVO_SOLICITADO",
    giro: "GIRO_DE_LA_EMPRESA",
  };

  // ====== DOM ======
  const tbody = document.getElementById("tabla-alumnos");
  const search = document.getElementById("search");
  const excelInput = document.getElementById("excelUpload");
  const btnSubir = document.getElementById("btnSubirExcel");
  const btnEliminar = document.getElementById("btnEliminarTodo");
  const btnSalir = document.getElementById("btnSalir");
  const estado = document.getElementById("estado-admin");

  let allRows = [];
  let dbCols = DB_LOWER; // se ajusta automáticamente

  // ====== UI helpers ======
  function setEstado(text, type = "info") {
    if (!estado) return;
    if (!text) {
      estado.classList.add("d-none");
      estado.textContent = "";
      return;
    }
    estado.classList.remove("d-none", "alert-info", "alert-success", "alert-warning", "alert-danger");
    estado.classList.add(`alert-${type}`);
    estado.textContent = text;
  }

  function escapeHtml(v) {
    if (v === null || v === undefined) return "";
    return String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render(rows) {
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">No hay registros para mostrar.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r[dbCols.nombre] ?? r[DB_UPPER.nombre] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.direccion] ?? r[DB_UPPER.direccion] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.telefono] ?? r[DB_UPPER.telefono] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.nombre_carta] ?? r[DB_UPPER.nombre_carta] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.puesto_carta] ?? r[DB_UPPER.puesto_carta] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.correo_cont] ?? r[DB_UPPER.correo_cont] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.programa] ?? r[DB_UPPER.programa] ?? "")}</td>
        <td>${escapeHtml(r[dbCols.giro] ?? r[DB_UPPER.giro] ?? "")}</td>
      </tr>
    `).join("");
  }

  function filtrarTabla() {
    const q = (search?.value || "").toLowerCase().trim();
    if (!q) return render(allRows);

    const filtered = allRows.filter(r => {
      const nombre = String(r[dbCols.nombre] ?? r[DB_UPPER.nombre] ?? "").toLowerCase();
      return nombre.includes(q);
    });

    render(filtered);
  }

  // ====== Supabase ======
  async function loadData() {
    setEstado("Cargando empresas desde la base de datos...", "info");

    let { data, error } = await supa.from(TABLE).select("*").limit(5000);

    if (error) {
      console.error(error);
      setEstado("Error al cargar datos: " + (error.message || "desconocido"), "danger");
      allRows = [];
      render(allRows);
      return;
    }

    // Detecta si vienen llaves en upper
    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      const hasLower = keys.includes(DB_LOWER.nombre);
      const hasUpper = keys.includes(DB_UPPER.nombre);
      dbCols = hasLower ? DB_LOWER : (hasUpper ? DB_UPPER : DB_LOWER);
    }

    allRows = data || [];
    setEstado(allRows.length ? `Listo. Registros: ${allRows.length}` : "Sin registros en la base de datos.", allRows.length ? "success" : "warning");
    filtrarTabla();
  }

  async function signOutAndGoLogin() {
    try { await supa.auth.signOut(); } catch {}
    // limpia posible token
    try {
      const ref = new URL(window.SUPABASE_URL).hostname.split(".")[0];
      sessionStorage.removeItem(`sb-${ref}-auth-token`);
      localStorage.removeItem(`sb-${ref}-auth-token`);
    } catch {}
    window.location.replace(LOGIN_PAGE);
  }

  // ====== Eliminar TODO (BD) ======
  /*async function clearAllInDB() {
    const tryDelete = async (col, mode = "neq") => {
      if (mode === "neq") return await supa.from(TABLE).delete().neq(col, "__never__");
      if (mode === "notnull") return await supa.from(TABLE).delete().not(col, "is", null);
      return { error: { message: "Modo inválido" } };
    };

    let res = await tryDelete("id", "neq");
    if (!res.error) return res;

    res = await tryDelete(DB_LOWER.nombre, "notnull");
    if (!res.error) return res;

    res = await tryDelete(DB_UPPER.nombre, "notnull");
    if (!res.error) return res;

    return res;
  }*/

    // ====== Eliminar TODO (BD) ======
async function clearAllInDB() {
  const tryDelete = async (col) => {
    return await supa.from(TABLE).delete().not(col, "is", null);
  };

  // 1) Primero intenta por id (sirve para uuid y no da 400)
  let res = await tryDelete("id");
  if (!res.error) return res;

  // 2) Fallbacks por si "id" no existiera (raro) o tu tabla fuera otra
  res = await tryDelete(DB_LOWER.nombre);
  if (!res.error) return res;

  res = await tryDelete(DB_UPPER.nombre);
  return res;
}


  async function onEliminarTodo() {
    const ok = confirm("¿Seguro que deseas ELIMINAR TODOS los registros de la base de datos?\n\nEsta acción no se puede deshacer.");
    if (!ok) return;

    setEstado("Eliminando todos los registros...", "warning");

    const { error } = await clearAllInDB();
    if (error) {
      console.error(error);
      setEstado("No se pudo eliminar. Revisa permisos RLS/admin o crea función RPC de truncate. Error: " + error.message, "danger");
      return;
    }

    setEstado("Listo. Se eliminaron todos los registros.", "success");
    allRows = [];
    render(allRows);
  }

  // ====== Excel -> BD (REEMPLAZAR) ======
  function normalize(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\s+/g, " ")
      .replaceAll(".", "");
  }

  function mapExcelRowToObject(headers, row) {
    const idx = (names) => {
      for (const n of names) {
        const pos = headers.indexOf(normalize(n));
        if (pos !== -1) return pos;
      }
      return -1;
    };

    const iNombre = idx(["nombre", "NOMBRE"]);
    const iDireccion = idx(["direccion", "DIRECCION"]);
    const iTelefono = idx(["telefono", "TELEFONO"]);
    const iNombreCarta = idx(["nombre_carta", "NOMBRE_CARTA", "nombre carta"]);
    const iPuestoCarta = idx(["puesto_carta", "PUESTO_CARTA", "puesto carta"]);
    const iCorreo = idx(["correo_cont", "CORREO_CONT", "correo contacto", "correo"]);
    const iPrograma = idx([
      "programa educativo solicitado",
      "programa_educativo_solicitado",
      "PROGRAMA EDUCATIVO SOLICITADO"
    ]);
    const iGiro = idx([
      "giro de la empresa",
      "giro_de_la_empresa",
      "GIRO DE LA EMPRESA"
    ]);

    const get = (i) => (i >= 0 ? (row[i] ?? "") : "");

    return {
      nombre: String(get(iNombre)).trim(),
      direccion: String(get(iDireccion)).trim(),
      telefono: String(get(iTelefono)).trim(),
      nombre_carta: String(get(iNombreCarta)).trim(),
      puesto_carta: String(get(iPuestoCarta)).trim(),
      correo_cont: String(get(iCorreo)).trim(),
      programa_educativo_solicitado: String(get(iPrograma)).trim(),
      giro_de_la_empresa: String(get(iGiro)).trim(),
    };
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function insertRows(rows) {
    const payloadLower = rows.map(r => ({
      [DB_LOWER.nombre]: r.nombre,
      [DB_LOWER.direccion]: r.direccion,
      [DB_LOWER.telefono]: r.telefono,
      [DB_LOWER.nombre_carta]: r.nombre_carta,
      [DB_LOWER.puesto_carta]: r.puesto_carta,
      [DB_LOWER.correo_cont]: r.correo_cont,
      [DB_LOWER.programa]: r.programa_educativo_solicitado,
      [DB_LOWER.giro]: r.giro_de_la_empresa,
    }));

    const payloadUpper = rows.map(r => ({
      [DB_UPPER.nombre]: r.nombre,
      [DB_UPPER.direccion]: r.direccion,
      [DB_UPPER.telefono]: r.telefono,
      [DB_UPPER.nombre_carta]: r.nombre_carta,
      [DB_UPPER.puesto_carta]: r.puesto_carta,
      [DB_UPPER.correo_cont]: r.correo_cont,
      [DB_UPPER.programa]: r.programa_educativo_solicitado,
      [DB_UPPER.giro]: r.giro_de_la_empresa,
    }));

    const batches = chunk(payloadLower, 500);

    for (const b of batches) {
      const { error } = await supa.from(TABLE).insert(b);
      if (error) {
        console.warn("Insert lower falló, reintentando upper. Error:", error.message);

        const batchesUpper = chunk(payloadUpper, 500);
        for (const bu of batchesUpper) {
          const { error: e2 } = await supa.from(TABLE).insert(bu);
          if (e2) return { error: e2 };
        }
        dbCols = DB_UPPER;
        return { error: null };
      }
    }

    dbCols = DB_LOWER;
    return { error: null };
  }

  async function onExcelSelected(file) {
    const ok = confirm("Esto REEMPLAZARÁ los registros actuales:\n\n1) Borra todo en la base de datos\n2) Inserta lo del Excel\n\n¿Continuar?");
    if (!ok) return;

    setEstado("Leyendo Excel...", "info");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
          setEstado("No se encontró hoja en el Excel.", "danger");
          return;
        }

        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (!aoa || aoa.length < 2) {
          setEstado("El Excel no tiene datos (solo encabezados o está vacío).", "danger");
          return;
        }

        const headers = aoa[0].map(h => normalize(h));
        const rows = [];

        for (let i = 1; i < aoa.length; i++) {
          const obj = mapExcelRowToObject(headers, aoa[i]);
          if (obj.nombre) rows.push(obj);
        }

        if (rows.length === 0) {
          setEstado("No se encontraron filas válidas (faltó la columna NOMBRE o vienen vacías).", "danger");
          return;
        }

        setEstado("Borrando datos anteriores en la base de datos...", "warning");
        const del = await clearAllInDB();
        if (del.error) {
          console.error(del.error);
          setEstado("No se pudo limpiar la BD antes de insertar. Error: " + del.error.message, "danger");
          return;
        }

        setEstado(`Insertando ${rows.length} registros...`, "info");
        const ins = await insertRows(rows);
        if (ins.error) {
          console.error(ins.error);
          setEstado("Error insertando registros: " + ins.error.message, "danger");
          return;
        }

        setEstado("Listo. Base de datos actualizada con el Excel.", "success");
        await loadData();
      } catch (err) {
        console.error(err);
        setEstado("Error leyendo Excel: " + (err.message || err), "danger");
      } finally {
        excelInput.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // ====== Eventos ======
  document.addEventListener("DOMContentLoaded", async () => {
    // ✅ ya no creamos cliente aquí
    if (!supa) {
      setEstado("No existe window.sb. Revisa que supabase-config.js se cargue ANTES que admin-empresas.js", "danger");
      window.location.replace(LOGIN_PAGE);
      return;
    }

    await loadData();

    if (search) search.addEventListener("input", filtrarTabla);
    if (btnSubir) btnSubir.addEventListener("click", () => excelInput.click());

    if (excelInput) {
      excelInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) onExcelSelected(file);
      });
    }

    if (btnEliminar) btnEliminar.addEventListener("click", onEliminarTodo);

    if (btnSalir) btnSalir.addEventListener("click", async () => {
      const ok = confirm("¿Deseas cerrar sesión?");
      if (!ok) return;
      await signOutAndGoLogin();
    });
  });
})();
