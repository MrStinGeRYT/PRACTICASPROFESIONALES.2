/**
 * auth-guard.js — Protección de rutas administrativas
 * Redirige a login si el usuario no tiene sesión activa o no es admin.
 *
 * CORRECCIONES respecto al original:
 * - Eliminado el listener pagehide (causaba pérdida de sesión con navegación hacia atrás)
 * - Usa el cliente compartido window.sb en lugar de crear uno nuevo
 * - La ruta de redirección es relativa al contexto actual (/pages/)
 */
(async () => {
  "use strict";

  // La ruta de login es relativa: desde /pages/ → ./admin-login.html
  const LOGIN_PAGE = "./admin-login.html";

  function redirectToLogin() {
    window.location.replace(LOGIN_PAGE);
  }

  // Esperar a que el cliente esté disponible
  const supa = window.sb;
  if (!supa) {
    redirectToLogin();
    return;
  }

  try {
    const isAdmin = await window.AuthService.validateAdmin();
    if (!isAdmin) {
      redirectToLogin();
    }
    // Si es admin, la página continúa cargando normalmente
  } catch (err) {
    console.error("[auth-guard]", err);
    redirectToLogin();
  }
})();
