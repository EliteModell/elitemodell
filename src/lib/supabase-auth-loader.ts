export async function loadSupabaseAuth() {
  const { supabaseAuth } = await import("@/lib/supabase-client");
  return supabaseAuth;
}
