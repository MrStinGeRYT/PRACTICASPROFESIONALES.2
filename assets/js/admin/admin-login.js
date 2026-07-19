/**
 * admin-login.js — Lógica de inicio de sesión administrativo
 *
 * CORRECCIONES respecto al original:
 * - Usa AuthService.login() en lugar de crear un segundo cliente Supabase
 * - Ruta de redirección actualizada: ./admin-dashboard.html
 * - Manejo de errores mejorado con mensajes en español
 * - Botón de mostrar/ocultar contraseña
 * - aria-live para lectores de pantalla
 */
(function () {
  "use strict";

  const REDIRECT_TO = "./admin-dashboard.html";

  const form       = document.getElementById("form-login");
  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const msgEl      = document.getElementById("login-message");
  const submitBtn  = form?.querySelector('[type="submit"]');
  const toggleBtn  = document.getElementById("toggle-password");

  if (!form) return;

  // ── Mostrar / ocultar contraseña ──────────────────────────────
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener("click", () => {
      const isText = passInput.type === "text";
      passInput.type = isText ? "password" : "text";
      toggleBtn.textContent = isText ? "👁" : "🙈";
      toggleBtn.setAttribute("aria-label", isText ? "Mostrar contraseña" : "Ocultar contraseña");
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────
  function showMessage(text, type = "danger") {
    if (!msgEl) return;
    msgEl.removeAttribute("hidden");
    msgEl.className = `alert alert--${type}`;
    // Usar textContent — no innerHTML
    msgEl.textContent = text;
    msgEl.setAttribute("role", "alert");
  }

  function hideMessage() {
    if (!msgEl) return;
    msgEl.setAttribute("hidden", "");
    msgEl.textContent = "";
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? "Iniciando sesión…" : "Iniciar sesión";
  }

  // ── Lógica de login ───────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault();
    hideMessage();

    const email    = emailInput?.value?.trim().toLowerCase() || "";
    const password = passInput?.value || "";

    if (!email || !password) {
      showMessage("Por favor ingresa tu correo y contraseña.", "warning");
      return;
    }

    setLoading(true);

    try {
      // 1. Autenticar
      await window.AuthService.login(email, password);

      // 2. Verificar rol admin
      const isAdmin = await window.AuthService.validateAdmin();
      if (!isAdmin) {
        showMessage("No tienes permisos de administrador.", "danger");
        await window.AuthService.logout();
        setLoading(false);
        return;
      }

      showMessage("Acceso autorizado. Redirigiendo…", "success");
      setTimeout(() => {
        window.location.href = REDIRECT_TO;
      }, 600);

    } catch (err) {
      console.error("[admin-login]", err);
      const isCredentials = /invalid.login.credentials/i.test(err?.message || "");
      showMessage(
        isCredentials
          ? "Correo o contraseña incorrectos."
          : "Error al iniciar sesión. Revisa tu conexión e intenta de nuevo.",
        "danger"
      );
      setLoading(false);
    }
  }

  form.addEventListener("submit", onSubmit);
})();
