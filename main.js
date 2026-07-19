// main.js
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

async function testConexion() {
  const { data, error } = await supabase.from("catalog_shirts").select("*").limit(5);
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testConexion();
