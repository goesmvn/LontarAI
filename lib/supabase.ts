import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return env() !== null;
}

let browserClient: SupabaseClient | null = null;

/** Browser client: holds the user session (magic-link auth). */
export function getBrowserSupabase(): SupabaseClient {
  const e = env();
  if (!e) throw new Error("Supabase belum dikonfigurasi.");
  browserClient ??= createClient(e.url, e.key);
  return browserClient;
}

/** Server client acting as the caller (RLS applies) when a bearer token is given, else anonymous. */
export function getServerSupabase(accessToken?: string): SupabaseClient {
  const e = env();
  if (!e) throw new Error("Supabase belum dikonfigurasi.");
  return createClient(e.url, e.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function bearerToken(headers: Headers): string | undefined {
  const h = headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
}

/** Service-role client (server only, bypasses RLS). Used exclusively by admin/stat routes. */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
