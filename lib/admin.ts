import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerToken, getServerSupabase, getServiceSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Admin = verified Supabase user whose email is listed in ADMIN_EMAILS (comma-separated).
 * Returns the service client on success, or a ready NextResponse error.
 * Admins moderate PUBLIC content only; private vault content is never read here.
 */
export async function requireAdmin(
  request: Request
): Promise<{ db: SupabaseClient; email: string } | { error: NextResponse }> {
  const err = (m: string, s: number) => ({ error: NextResponse.json({ error: m }, { status: s }) });
  if (!isSupabaseConfigured()) return err("Supabase belum dikonfigurasi.", 503);
  const db = getServiceSupabase();
  if (!db) return err("SUPABASE_SERVICE_ROLE_KEY belum diatur.", 503);

  const token = bearerToken(request.headers);
  if (!token) return err("Masuk terlebih dahulu.", 401);
  const { data, error } = await getServerSupabase().auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return err("Sesi tidak valid.", 401);

  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(email)) return err("Anda tidak memiliki akses admin.", 403);
  return { db, email };
}
