#!/usr/bin/env node
// Usage: node --env-file=.env.local scripts/check-setup.mjs
// Verifies Claude + Supabase configuration without changing any data.
const env = process.env;
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { failed++; console.log(`  ✗ ${m}`); };
const warn = (m) => console.log(`  ! ${m}`);

console.log("Claude");
if (!env.ANTHROPIC_API_KEY) bad("ANTHROPIC_API_KEY belum diisi");
else {
  const model = env.LONTAR_AI_MODEL || "claude-opus-5-5";
  const r = await fetch(`https://api.anthropic.com/v1/models/${model}`, {
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  }).catch((e) => ({ ok: false, status: String(e) }));
  r.ok ? ok(`kunci valid, model ${model} tersedia`) : bad(`gagal memeriksa model ${model} (status ${r.status})`);
}

console.log("Supabase");
const url = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon) bad("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi");
else {
  const rest = (path, key, init = {}) =>
    fetch(`${url}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers } });

  let r = await rest("/rest/v1/public_manuscripts?select=slug&limit=1", anon).catch(() => null);
  r?.ok ? ok("view public_manuscripts dapat dibaca (anon)") : bad("view public_manuscripts tidak ada. Jalankan supabase/schema.sql");

  r = await rest("/rest/v1/manuscripts?select=id&limit=1", anon).catch(() => null);
  if (r?.ok) {
    const rows = await r.json();
    rows.length === 0 ? ok("anon tidak dapat membaca tabel manuscripts (RLS aktif)") : bad("BAHAYA: anon dapat membaca tabel manuscripts. Periksa RLS");
  } else warn("tabel manuscripts tidak dapat diakses oleh anon (diharapkan 0 baris atau ditolak)");

  r = await rest("/rest/v1/rpc/public_manuscript_id", anon, { method: "POST", body: JSON.stringify({ p_slug: "tidak-ada" }) }).catch(() => null);
  r?.ok ? ok("fungsi public_manuscript_id tersedia") : bad("fungsi public_manuscript_id tidak ada. Jalankan bagian laporan di schema.sql");

  if (!svc) warn("SUPABASE_SERVICE_ROLE_KEY kosong: panel admin dan statistik Vault nonaktif");
  else {
    r = await rest("/storage/v1/bucket", svc).catch(() => null);
    if (!r?.ok) bad("tidak dapat membaca daftar bucket (cek service role key)");
    else {
      const buckets = await r.json();
      const vault = buckets.find((b) => b.name === "vault"), arch = buckets.find((b) => b.name === "archive");
      !vault ? bad("bucket `vault` belum dibuat") : vault.public ? bad("bucket `vault` harus PRIVATE") : ok("bucket `vault` private");
      !arch ? bad("bucket `archive` belum dibuat") : !arch.public ? bad("bucket `archive` harus PUBLIC") : ok("bucket `archive` public");
    }
    r = await rest("/rest/v1/manuscript_reports?select=id&limit=1", svc).catch(() => null);
    r?.ok ? ok("tabel manuscript_reports ada") : bad("tabel manuscript_reports tidak ada");
  }
  if (!env.ADMIN_EMAILS) warn("ADMIN_EMAILS kosong: tidak ada yang bisa membuka /admin");
}

console.log(failed ? `\n${failed} masalah ditemukan.` : "\nSemua pemeriksaan lolos.");
process.exit(failed ? 1 : 0);
