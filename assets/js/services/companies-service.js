/**
 * companies-service.js — Etapa 1
 * Capa de servicio para consulta y carga de registros de empresas.
 * Opera sobre la tabla actual `registros_empresas` sin modificar su esquema.
 *
 * NOTA ETAPA 2: Se añadirán funciones para periodos y versiones.
 */

const CompaniesService = (() => {
  "use strict";

  const TABLE = () => window.SUPABASE_TABLE || "registros_empresas";
  const BATCH_SIZE = 500;

  function getClient() {
    const client = window.sb;
    if (!client) throw new Error("Cliente Supabase no inicializado.");
    return client;
  }

  /**
   * Columnas conocidas en la tabla actual (snake_case + MAYÚSCULAS como fallback).
   * No se modifican los nombres reales — se detectan automáticamente.
   */
  const COLS = {
    nombre:    ["nombre",   "NOMBRE"],
    direccion: ["direccion","DIRECCION"],
    telefono:  ["telefono", "TELEFONO"],
    nombre_carta: ["nombre_carta","NOMBRE_CARTA"],
    puesto_carta: ["puesto_carta","PUESTO_CARTA"],
    correo_cont:  ["correo_cont","CORREO_CONT","correo","CORREO"],
    programa: [
      "programa_educativo_solicitado","PROGRAMA_EDUCATIVO_SOLICITADO",
      "programa","PROGRAMA","programa_educativo","PROGRAMA_EDUCATIVO",
    ],
    giro: ["giro_de_la_empresa","GIRO_DE_LA_EMPRESA","giro","GIRO"],
  };

  /**
   * Obtiene todos los registros actuales con paginación y filtros.
   * @param {object} options
   * @param {string}  options.search       - Búsqueda en nombre, programa, giro
   * @param {string}  options.filterPrograma - Filtro exacto de programa educativo
   * @param {string}  options.filterGiro   - Filtro exacto de giro
   * @param {string}  options.sortBy       - Campo de ordenamiento ('nombre'|'programa'|'giro')
   * @param {'asc'|'desc'} options.sortDir
   * @param {number}  options.page         - 0-indexed
   * @param {number}  options.pageSize     - 10|25|50|100
   * @returns {{ data: object[], count: number | null, nameCol: string }}
   */
  async function getCurrentCompanies(options = {}) {
    const sb = getClient();
    const {
      search        = "",
      filterPrograma = "",
      filterGiro     = "",
      sortBy         = "nombre",
      sortDir        = "asc",
      page           = 0,
      pageSize       = 25,
    } = options;

    const table    = TABLE();
    const nameCol  = await _detectNameCol(sb, table);
    const sortCol  = _resolveSortCol(sortBy, nameCol);

    const from = page * pageSize;
    const to   = from + pageSize - 1;

    let q = sb
      .from(table)
      .select("*", { count: "exact" })
      .order(sortCol, { ascending: sortDir === "asc" })
      .range(from, to);

    // Búsqueda multi-campo (OR sobre nombre, programa y giro)
    if (search.trim()) {
      const term = search.trim();
      const pc   = _resolveCol(COLS.programa) || "programa_educativo_solicitado";
      const gc   = _resolveCol(COLS.giro)     || "giro_de_la_empresa";
      q = q.or(`${nameCol}.ilike.%${term}%,${pc}.ilike.%${term}%,${gc}.ilike.%${term}%`);
    }

    // Filtros exactos
    if (filterPrograma.trim()) {
      const pc = _resolveCol(COLS.programa) || "programa_educativo_solicitado";
      q = q.eq(pc, filterPrograma.trim());
    }
    if (filterGiro.trim()) {
      const gc = _resolveCol(COLS.giro) || "giro_de_la_empresa";
      q = q.eq(gc, filterGiro.trim());
    }

    const { data, error, count } = await q;
    if (error) throw error;

    return { data: data || [], count: count ?? null, nameCol };
  }

  /**
   * Obtiene listas únicas de programas y giros para poblar los filtros.
   * @returns {{ programas: string[], giros: string[] }}
   */
  async function getFilterOptions() {
    const sb    = getClient();
    const table = TABLE();
    const pc    = _resolveCol(COLS.programa) || "programa_educativo_solicitado";
    const gc    = _resolveCol(COLS.giro)     || "giro_de_la_empresa";

    const { data, error } = await sb
      .from(table)
      .select(`${pc}, ${gc}`)
      .limit(5000);

    if (error) throw error;

    const programas = [...new Set(
      (data || []).map(r => r[pc]).filter(Boolean).map(v => String(v).trim())
    )].sort();

    const giros = [...new Set(
      (data || []).map(r => r[gc]).filter(Boolean).map(v => String(v).trim())
    )].sort();

    return { programas, giros };
  }

  /**
   * Inserta filas en la tabla actual (operación de carga Excel existente).
   * Usa la misma lógica de batches que la versión original.
   * @param {object[]} rows - Objetos normalizados con columnas snake_case
   * @returns {{ error: null | Error }}
   */
  async function uploadCurrentCompanies(rows) {
    const sb = getClient();
    const table = TABLE();

    const batches = _chunk(rows, BATCH_SIZE);
    for (const batch of batches) {
      const { error } = await sb.from(table).insert(batch);
      if (error) return { error };
    }
    return { error: null };
  }

  /**
   * Elimina todos los registros de la tabla actual.
   * NOTA: Esta operación será reemplazada por el sistema de versiones en Etapa 2.
   * Por ahora conserva el comportamiento original para no romper el panel admin.
   */
  async function deleteAllCompanies() {
    const sb    = getClient();
    const table = TABLE();

    // Intento por id primero, luego fallbacks
    let res = await sb.from(table).delete().not("id", "is", null);
    if (!res.error) return res;

    const nc = _resolveCol(COLS.nombre) || "nombre";
    return await sb.from(table).delete().not(nc, "is", null);
  }

  // ─── Helpers privados ────────────────────────────────────────────

  /** Detecta qué nombre de columna existe realmente en los datos. */
  async function _detectNameCol(sb, table) {
    const { data } = await sb.from(table).select("*").limit(1);
    if (!data || data.length === 0) return "nombre";
    const keys = Object.keys(data[0]);
    for (const candidate of COLS.nombre) {
      if (keys.includes(candidate)) return candidate;
    }
    return "nombre";
  }

  function _resolveCol(candidates) {
    // Se usa en contexto donde ya se conocen las columnas disponibles
    // En producción se podría cachear el resultado de _detectNameCol
    return candidates[0];
  }

  function _resolveSortCol(sortBy, nameCol) {
    const map = {
      nombre:   nameCol,
      programa: _resolveCol(COLS.programa),
      giro:     _resolveCol(COLS.giro),
    };
    return map[sortBy] || nameCol;
  }

  function _chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  return { getCurrentCompanies, getFilterOptions, uploadCurrentCompanies, deleteAllCompanies, COLS };
})();

window.CompaniesService = CompaniesService;
