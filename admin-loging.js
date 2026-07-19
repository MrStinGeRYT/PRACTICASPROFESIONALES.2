/* admin-loging.js */

(() => {
  "use strict";

  const REDIRECT_TO = "admin-lobby.html"; // tu panel admin
  const PROFILES_TABLE = "profiles";

  const form = document.getElementById("form-login");
  const emailInput = document.getElementById("usuario");
  const passInput =
    document.getElementById("contraseña") ||
    document.querySelector('input[type="password"]');

  const msg = document.getElementById("mensaje");
  const submitBtn = form?.querySelector('button[type="submit"]');

  function showMessage(text, type = "danger") {
    msg.classList.remove("d-none", "alert-danger", "alert-success", "alert-warning", "alert-info");
    msg.classList.add(`alert-${type}`);
    msg.textContent = text;
  }
  function hideMessage() {
    msg.classList.add("d-none");
    msg.textContent = "";
  }
  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Iniciando..." : "Iniciar Sesión";
  }

  function getClient() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;

    if (!url || !key) {
      showMessage("Falta SUPABASE_URL o SUPABASE_ANON_KEY en supabase-config.js", "danger");
      return null;
    }
    if (!window.supabase?.createClient) {
      showMessage("No se cargó supabase-js. Revisa el <script> CDN.", "danger");
      return null;
    }

    // ✅ sessionStorage => se borra al cerrar la pestaña
    return window.supabase.createClient(url, key, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }

  async function onLogin(e) {
    e.preventDefault();
    hideMessage();

    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      showMessage("Revisa tu usuario y contraseña.", "warning");
      return;
    }

    const sb = getClient();
    if (!sb) return;

    setLoading(true);

    try {
      const email = emailInput.value.trim().toLowerCase();
      const password = passInput.value;

      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        const msgErr = /Invalid login credentials/i.test(error.message)
          ? "Usuario o contraseña incorrectos."
          : error.message;
        showMessage(msgErr, "danger");
        setLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) {
        showMessage("No se pudo iniciar sesión. Intenta nuevamente.", "danger");
        setLoading(false);
        return;
      }

      // ✅ Verificar rol admin en profiles
      const { data: profile, error: profErr } = await sb
        .from(PROFILES_TABLE)
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profErr || !profile) {
        console.error(profErr);
        showMessage("No se encontró tu perfil de admin (profiles).", "danger");
        await sb.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.is_admin !== true) {
        showMessage("No tienes permisos de administrador.", "danger");
        await sb.auth.signOut();
        setLoading(false);
        return;
      }

      showMessage("Acceso autorizado. Redirigiendo...", "success");
      setTimeout(() => (window.location.href = REDIRECT_TO), 500);
    } catch (err) {
      console.error(err);
      showMessage("Error inesperado. Revisa consola (F12).", "danger");
      setLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    form.addEventListener("submit", onLogin);
  });
})();
