"use client";

import Link from "next/link";
import Icon from "./Icon";
import { CATEGORY_LABELS } from "@/lib/regencies";
import type { DraftMeta } from "@/lib/draft";

export type DashItem = {
  id: string; slug: string; title: string; category: string; visibility: "private" | "public"; is_pingit: boolean;
  regency: string; village_banjar: string; created_at: string; image_url: string | null;
  leaf: { latin_transliteration: string; transcription_status: string } | null;
};

const STATUS: Record<string, [string, string]> = {
  terverifikasi: ["Terverifikasi", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  dikoreksi: ["Dikoreksi", "bg-amberink-100 text-amberink-700 border-amberink-200"],
  draf_ai: ["Draf", "bg-stone-100 text-stone-600 border-stone-200"],
};

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.round(m / 60)} jam lalu`;
  return new Date(t).toLocaleDateString("id-ID", { dateStyle: "medium" });
};

export type DashboardProps = {
  name: string; email: string;
  items: DashItem[]; donated: number; loading: boolean; error: string | null;
  draft: DraftMeta | null;
  nameInput: string; onNameInput: (v: string) => void; onSaveName: () => void; nameState: "idle" | "saving" | "saved" | "error";
  onExport: () => void; exporting: boolean; onDiscardDraft: () => void;
};

export default function DashboardView(p: DashboardProps) {
  const total = p.items.length;
  const priv = p.items.filter((i) => i.visibility === "private").length;
  const pub = p.items.filter((i) => i.visibility === "public").length;
  const pingit = p.items.filter((i) => i.is_pingit).length;
  const transcribed = p.items.filter((i) => i.leaf?.latin_transliteration?.trim()).length;
  const pct = total ? Math.round((transcribed / total) * 100) : 0;

  const stat = (icon: string, label: string, value: string | number, sub: string, tone: string) => (
    <div className="bg-white rounded-2xl border border-linen-line p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon name={icon} size={24} /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-stone-500">{label}</div>
        <div className="font-serif text-2xl font-semibold text-stone-900 leading-tight">{value}</div>
        <div className="text-xs text-stone-500 leading-snug">{sub}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-linen-line">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amberink-700">Dasbor kustodian</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight">Selamat datang, {p.name}</h1>
          <p className="text-sm text-stone-600 mt-1">{p.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio" className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"><Icon name="add_photo_alternate" size={18} /> Mulai Transkripsi</Link>
          <Link href="/batch" className="px-4 py-2.5 rounded-xl bg-white border border-linen-line hover:bg-linen text-xs font-semibold flex items-center gap-1.5"><Icon name="photo_library" size={18} className="text-primary" /> Batch Scan</Link>
        </div>
      </div>

      {p.draft && (
        <div className="rounded-2xl border border-amberink-200 bg-amberink-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-amberink-200 text-amberink-700 flex items-center justify-center shrink-0"><Icon name="edit_note" size={22} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-stone-900 truncate">Draf belum disimpan: {p.draft.title || "Tanpa judul"}</div>
              <div className="text-xs text-stone-600">{p.draft.filled}/{p.draft.lines} baris terisi · diubah {ago(p.draft.updatedAt)} · tersimpan hanya di peramban ini</div>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href="/studio?draft=1" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Lanjutkan</Link>
            <button type="button" onClick={p.onDiscardDraft} className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-stone-700">Buang</button>
          </div>
        </div>
      )}

      {p.error && <p className="text-sm text-red-600">{p.error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stat("folder_special", "Total naskah", total, `${transcribed} sudah bertranskripsi (${pct}%)`, "bg-terra-50 text-amberink-700")}
        {stat("lock", "Privat", priv, "Hanya Anda yang melihat", "bg-terra-50 text-primary")}
        {stat("public", "Publik", pub, "Tampil di arsip dan peta", "bg-emerald-50 text-emerald-700")}
        {stat("temple_hindu", "Pingit", pingit, "Selalu privat", "bg-stone-100 text-stone-700")}
        {stat("volunteer_activism", "Data latih", p.donated, "Baris disumbangkan", "bg-amberink-100 text-amberink-700")}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-8 bg-white rounded-2xl border border-linen-line">
          <div className="px-5 py-4 border-b border-linen-low flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-stone-900">Naskah terbaru</h2>
            <Link href="/vault" className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50">Buka Vault</Link>
          </div>
          {p.loading && <p className="p-6 text-sm text-stone-500">Memuat…</p>}
          {!p.loading && p.items.length === 0 && (
            <div className="p-10 text-center space-y-3">
              <Icon name="auto_stories" size={36} className="text-primary" />
              <p className="text-sm text-stone-600">Belum ada naskah. Mulai dengan memotret satu lempir lontar.</p>
              <Link href="/studio" className="inline-block px-5 py-2 rounded-full bg-primary text-white text-sm font-medium">Mulai di Studio</Link>
            </div>
          )}
          <ul className="divide-y divide-stone-100">
            {p.items.slice(0, 5).map((i) => {
              const st = STATUS[i.leaf?.transcription_status ?? "draf_ai"] ?? STATUS.draf_ai;
              return (
                <li key={i.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 border border-linen-line overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-lg font-semibold text-stone-900 truncate">{i.title}</div>
                    <div className="text-xs text-stone-500 truncate">{CATEGORY_LABELS[i.category]?.split(" (")[0]} · {i.village_banjar}, {i.regency} · {new Date(i.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${st[1]}`}>{st[0]}</span>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1"><Icon name={i.is_pingit ? "temple_hindu" : i.visibility === "public" ? "public" : "lock"} size={13} />{i.is_pingit ? "Pingit" : i.visibility === "public" ? "Publik" : "Privat"}</span>
                  </div>
                  <Link href={i.visibility === "public" && !i.is_pingit ? `/archive/${i.slug}` : "/vault"} aria-label={`Buka ${i.title}`} className="text-stone-400 hover:text-stone-800 p-1"><Icon name="arrow_forward" size={20} /></Link>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-linen-line p-5 space-y-3">
            <h2 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2"><Icon name="badge" size={20} className="text-primary" /> Profil</h2>
            <label className="block">
              <span className="block text-xs font-semibold text-stone-700 mb-1">Nama tampilan</span>
              <input value={p.nameInput} onChange={(e) => p.onNameInput(e.target.value)} maxLength={80} placeholder="mis. Ida Bagus Made" className="w-full bg-stone-100 px-3 py-2 rounded-lg text-sm border border-transparent focus:bg-white" />
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={p.onSaveName} disabled={!p.nameInput.trim() || p.nameState === "saving"} className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-primary disabled:bg-stone-300 text-white text-xs font-semibold">{p.nameState === "saving" ? "Menyimpan…" : "Simpan nama"}</button>
              {p.nameState === "saved" && <span className="text-xs text-emerald-700">Tersimpan</span>}
              {p.nameState === "error" && <span className="text-xs text-red-600">Gagal menyimpan</span>}
            </div>
            <p className="text-xs text-stone-500">Nama ini tampil di linimasa Komunitas dan avatar Anda.</p>
          </div>

          <div className="bg-white rounded-2xl border border-linen-line p-5 space-y-3">
            <h2 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2"><Icon name="shield_lock" size={20} className="text-primary" /> Data saya</h2>
            <p className="text-xs text-stone-600 leading-relaxed">Unduh salinan semua catatan naskah Anda (judul, lokasi area, status, transkripsi). Gambar tidak termasuk karena tautannya bersifat sementara; ambil gambar dari Vault.</p>
            <button type="button" onClick={p.onExport} disabled={p.exporting || total === 0} className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1.5"><Icon name="download" size={16} /> {p.exporting ? "Menyiapkan…" : "Unduh data saya (JSON)"}</button>
          </div>

          <div className="bg-amberink-50 border border-amberink-200 rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-amberink-700 text-xs font-semibold uppercase tracking-wider"><Icon name="gavel" size={18} /> Etika kustodian</div>
            <p className="font-serif italic text-xs text-amber-950 leading-relaxed">Naskah pingit tidak pernah tampil di arsip publik. Lokasi publik hanya berupa area ±1 km, dan Anda dapat mencabut publikasi atau data latih kapan saja.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
