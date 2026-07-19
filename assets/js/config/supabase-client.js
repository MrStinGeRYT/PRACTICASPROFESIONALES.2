/**
 * supabase-client.js
 * Cliente único compartido de Supabase.
 * Se carga una sola vez y se accede a través de window.sb.
 * Usar sessionStorage para que la sesión expire al cerrar la pestaña.
 */
(function () {
  "use strict";

  if (window.sb) return; // evitar instancias duplicadas

  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[supabase-client] Faltan SUPABASE_URL o SUPABASE_ANON_KEY.");
    return;
  }

  if (!window.supabase?.createClient) {
    console.error("[supabase-client] La librería @supabase/supabase-js no está cargada.");
    return;
  }

  window.sb = window.supabase.createClient(url, key, {
    auth: {
      storage:            window.sessionStorage,
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: false,
    },
  });
})();
