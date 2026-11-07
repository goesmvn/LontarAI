"use client";

import { useCallback, useEffect, useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import { useSession } from "@/lib/useSession";
import { CATEGORY_LABELS } from "@/lib/regencies";

type Stats = {
  email: string; total: number; public: number; private: number; pingit: number; openReports: number;
  byStatus: Record<string, number>; byCategory: Record<string, number>; byRegency: Record<string, number>;
};
type Item = {
  id: string; slug: string; title: string; category: string; regency: string; village_banjar: string;
  owner_name: string; created_at: string; status: string; latin: string; translation_id: string;
  image_url: string | null; openReports: number;
};
type Report = {
  id: string; reason: string; details: string | null; status: string; created_at: string;
  manuscripts: { id: string; slug: string; title: string; visibility: string } | null;
};

const REASON: Record<string, string> = {
  pingit: "Pingit/sakral", salah_isi: "Isi keliru", hak_cipta: "Hak/izin", lainnya: "Lainnya",
};
const STATUS: Record<string, string> = { draf_ai: "Draf AI", dikoreksi: "Dikoreksi", terverifikasi: "Terverifikasi" };

function Bars({ data, labels }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-stone-400">Belum ada data.</p>;
  return (
    <ul className="space-y-1.5">
      {entries.map(([k, v]) => (
        <li key={k} className="text-sm">
          <div className="flex justify-between"><span className="text-stone-700">{labels?.[k] ?? k}</span><span className="text-stone-500">{v}</span></div>
          <div className="h-1.5 rounded bg-stone-100"><div className="h-full rounded bg-terra-500" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage() {
  const { session, ready } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"ringkasan" | "naskah" | "laporan">("ringkasan");
  const [denied, setDenied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyReported, setOnlyReported] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }),
    [session]
  );

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    const s = await fetch("/api/admin/stats", { headers: headers() });
    const sd = await s.json();
    if (!s.ok) { setDenied(sd.error || "Akses ditolak."); setStats(null); return; }
    setDenied(null);
    setStats(sd);
    const [m, r] = await Promise.all([
      fetch("/api/admin/manuscripts", { headers: headers() }).then((x) => x.json()),
      fetch("/api/admin/reports", { headers: headers() }).then((x) => x.json()),
    ]);
    setItems(m.items ?? []);
    setReports(r.items ?? []);
  }, [session, headers]);

  useEffect(() => { load(); }, [load]);

  const act = async (url: string, body: unknown, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const res = await fetch(url, { method: "PATCH", headers: headers(), body: JSON.stringify(body) });
    if (!res.ok) setError((await res.json()).error || "Aksi gagal.");
    load();
  };

  const shown = items.filter((i) => (!onlyReported || i.openReports > 0) && (!filterStatus || i.status === filterStatus));
  const openReports = reports.filter((r) => r.status === "open");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-terra-800">Panel Admin</h1>
        <p className="text-sm text-stone-600">Moderasi arsip publik. Isi Private Vault tidak pernah ditampilkan di sini; hanya jumlahnya.</p>
      </div>
      <AuthPanel />
      {ready && !session && <p className="text-stone-500 text-sm">Masuk dengan email admin untuk melanjutkan.</p>}
      {denied && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{denied}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="flex gap-1 border-b border-stone-200">
            {([["ringkasan", "Ringkasan"], ["naskah", `Naskah publik (${items.length})`], ["laporan", `Laporan (${openReports.length})`]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === id ? "border-terra-600 text-terra-800 font-semibold" : "border-transparent text-stone-500"}`}>{label}</button>
            ))}
          </div>

          {tab === "ringkasan" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[["Total naskah", stats.total], ["Publik", stats.public], ["Privat", stats.private], ["Pingit", stats.pingit], ["Laporan terbuka", stats.openReports]].map(([l, n]) => (
                  <div key={String(l)} className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                    <div className="text-2xl font-bold text-terra-800">{n}</div>
                    <div className="text-xs text-stone-500">{l}</div>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-6">
                <div><h2 className="font-semibold text-sm mb-2">Status transkripsi</h2><Bars data={stats.byStatus} labels={STATUS} /></div>
                <div><h2 className="font-semibold text-sm mb-2">Rumpun</h2><Bars data={stats.byCategory} labels={CATEGORY_LABELS} /></div>
                <div><h2 className="font-semibold text-sm mb-2">Sebaran publik per kabupaten</h2><Bars data={stats.byRegency} /></div>
              </div>
            </div>
          )}

          {tab === "naskah" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 items-center text-sm">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 rounded-lg border border-stone-300">
                  <option value="">Semua status</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label className="flex items-center gap-2"><input type="checkbox" checked={onlyReported} onChange={(e) => setOnlyReported(e.target.checked)} /> Hanya yang dilaporkan</label>
              </div>
              {shown.length === 0 && <p className="text-stone-500 text-sm">Tidak ada naskah.</p>}
              <ul className="space-y-3">
                {shown.map((i) => (
                  <li key={i.id} className="rounded-xl border border-stone-200 bg-white p-3 flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.image_url && <img src={i.image_url} alt="" className="w-28 h-20 object-cover rounded" />}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={`/archive/${i.slug}`} target="_blank" rel="noreferrer" className="font-medium text-stone-800 hover:underline truncate">{i.title}</a>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === "terverifikasi" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{STATUS[i.status]}</span>
                        {i.openReports > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{i.openReports} laporan</span>}
                      </div>
                      <p className="text-xs text-stone-500">{CATEGORY_LABELS[i.category]} · {i.village_banjar}, {i.regency} · {i.owner_name}</p>
                      {i.latin && <p className="text-xs text-stone-600 line-clamp-2 whitespace-pre-line">{i.latin}</p>}
                      <div className="flex flex-wrap gap-3 text-xs pt-1">
                        {i.status === "terverifikasi"
                          ? <button type="button" onClick={() => act(`/api/admin/manuscripts/${i.id}`, { action: "unverify" })} className="text-stone-600 underline">Batalkan verifikasi</button>
                          : <button type="button" onClick={() => act(`/api/admin/manuscripts/${i.id}`, { action: "verify" })} className="text-green-700 underline">Tandai terverifikasi</button>}
                        <button type="button" className="text-red-600 underline"
                          onClick={() => act(`/api/admin/manuscripts/${i.id}`, { action: "takedown" }, `Turunkan "${i.title}" dari arsip publik? Naskah dikembalikan ke Vault pemiliknya.`)}>
                          Turunkan dari publik
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "laporan" && (
            <ul className="space-y-3">
              {reports.length === 0 && <li className="text-stone-500 text-sm">Belum ada laporan.</li>}
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700">{REASON[r.reason]}</span>
                    <span className={`text-xs ${r.status === "open" ? "text-red-700" : "text-stone-400"}`}>{r.status === "open" ? "Terbuka" : r.status === "resolved" ? "Selesai" : "Ditolak"}</span>
                    <span className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <p className="text-sm font-medium text-stone-800">
                    {r.manuscripts?.visibility === "public"
                      ? <a href={`/archive/${r.manuscripts.slug}`} target="_blank" rel="noreferrer" className="hover:underline">{r.manuscripts.title}</a>
                      : <span>{r.manuscripts?.title ?? "(dihapus)"} <span className="text-xs text-stone-400">(tidak lagi publik)</span></span>}
                  </p>
                  {r.details && <p className="text-sm text-stone-600">{r.details}</p>}
                  {r.status === "open" && (
                    <div className="flex gap-3 text-xs pt-1">
                      {r.manuscripts?.visibility === "public" && (
                        <button type="button" className="text-red-600 underline"
                          onClick={() => act(`/api/admin/manuscripts/${r.manuscripts!.id}`, { action: "takedown" }, "Turunkan naskah ini dari arsip publik?")}>
                          Turunkan naskah
                        </button>
                      )}
                      <button type="button" className="text-green-700 underline" onClick={() => act(`/api/admin/reports/${r.id}`, { status: "resolved" })}>Tandai selesai</button>
                      <button type="button" className="text-stone-600 underline" onClick={() => act(`/api/admin/reports/${r.id}`, { status: "dismissed" })}>Tolak laporan</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
