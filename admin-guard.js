(() => {
  "use strict";

  const LOGIN_PAGE = "adm-loging.html";
  const PROFILES_TABLE = "profiles";

  // ✅ Usar el cliente global (NO crear uno nuevo aquí)
  const supa = window.sb;

  function clearAuthStorage() {
    try {
      const ref = new URL(window.SUPABASE_URL).hostname.split(".")[0];
      const k = `sb-${ref}-auth-token`;
      sessionStorage.removeItem(k);
      localStorage.removeItem(k); // por si quedó algo viejo
    } catch (_) {}
  }

  async function requireAdmin() {
    // Si por alguna razón no existe el cliente global, mandamos a login
    if (!supa) {
      clearAuthStorage();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    const { data } = await supa.auth.getSession();
    const session = data?.session;

    if (!session?.user) {
      clearAuthStorage();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    const { data: profile, error } = await supa
      .from(PROFILES_TABLE)
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (error || !profile || profile.is_admin !== true) {
      await supa.auth.signOut();
      clearAuthStorage();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ✅ si es admin, se queda
  }

  // ✅ Si el usuario se sale / back / cerrar pestaña, limpiamos sesión
  window.addEventListener("pagehide", () => {
    clearAuthStorage();
  });

  document.addEventListener("DOMContentLoaded", requireAdmin);
})();
