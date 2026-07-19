/**
 * auth-service.js — Etapa 1
 * Capa de servicio para autenticación.
 * Envuelve las operaciones actuales de Supabase Auth sin modificar el esquema.
 *
 * NOTA ETAPA 2: Aquí se añadirá soporte de roles adicionales
 * y verificación de permisos por periodo cuando se implementen las RLS.
 */

const AuthService = (() => {
  "use strict";

  const PROFILES_TABLE = "profiles";

  function getClient() {
    const client = window.sb;
    if (!client) throw new Error("Cliente Supabase no inicializado. Carga supabase-client.js primero.");
    return client;
  }

  /**
   * Inicia sesión con email y contraseña.
   * @returns {{ user, session } | null} o lanza error
   */
  async function login(email, password) {
    const sb = getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /**
   * Cierra la sesión actual y limpia el storage.
   */
  async function logout() {
    const sb = getClient();
    try {
      await sb.auth.signOut();
    } catch (_) {
      // silencioso — limpiar storage de todas formas
    }
    _clearAuthStorage();
  }

  /**
   * Devuelve el usuario de la sesión activa, o null si no hay sesión.
   */
  async function getCurrentUser() {
    const sb = getClient();
    const { data } = await sb.auth.getSession();
    return data?.session?.user ?? null;
  }

  /**
   * Verifica que el usuario actual tenga is_admin = true en profiles.
   * @returns {boolean}
   */
  async function validateAdmin() {
    const sb = getClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return false;

    const { data: profile, error } = await sb
      .from(PROFILES_TABLE)
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error || !profile) return false;
    return profile.is_admin === true;
  }

  /**
   * Limpia los tokens de sesión del storage.
   * @private
   */
  function _clearAuthStorage() {
    try {
      const ref = new URL(window.SUPABASE_URL).hostname.split(".")[0];
      const key = `sb-${ref}-auth-token`;
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (_) {}
  }

  return { login, logout, getCurrentUser, validateAdmin };
})();

window.AuthService = AuthService;
