"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Icon from "@/components/Icon";
import ManuscriptDetail from "@/components/ManuscriptDetail";
import type { ArchiveItem } from "@/components/ArchiveMap";
import { CATEGORY_LABELS, REGENCIES } from "@/lib/regencies";

const ArchiveMap = dynamic(() => import("@/components/ArchiveMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-xl bg-stone-100" />,
});

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [category, setCategory] = useState("");
  const [regency, setRegency] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    fetch("/api/archive").then((r) => r.json()).then((d) => {
      setItems(d.items || []);
      setConfigured(d.configured !== false);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => items.filter((i) =>
    (!category || i.category === category) && (!regency || i.regency === regency) &&
    (!q || i.title.toLowerCase().includes(q.toLowerCase()))), [items, category, regency, q]);

  const pill = (id: string, label: string) => (
    <button key={id} type="button" onClick={() => setCategory(id)}
      className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-colors ${category === id ? "bg-primary text-white font-semibold shadow-sm" : "text-stone-600 font-medium hover:text-stone-900 hover:bg-linen"}`}>
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Command bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-linen-line shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-terra-50 text-primary border border-terra-100"><Icon name="explore" size={17} /></span>
              <h1 className="font-serif text-2xl lg:text-3xl text-stone-900 font-semibold tracking-tight">Peta Sebaran Lontar Bali</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-mono font-medium">{items.length} naskah publik</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">Eksplorasi kartografi digital persebaran naskah kuno di griya, puri, dan komunitas adat. Lokasi ditampilkan sebagai area ±1 km, bukan titik rumah.</p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative w-full">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul naskah…"
                className="w-full bg-linen text-sm pl-9 pr-3 py-2 rounded-xl border border-linen-line focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select value={regency} onChange={(e) => setRegency(e.target.value)} aria-label="Filter kabupaten"
              className="bg-linen text-sm px-3 py-2 rounded-xl border border-linen-line focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Semua wilayah</option>
              {REGENCIES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-linen">
          {pill("", "Semua")}
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => pill(k, v.split(" (")[0]))}
        </div>
      </div>

      {loading ? <p className="text-stone-500">Memuat arsip…</p> : !configured ? (
        <p className="text-stone-500">Arsip belum dikonfigurasi di server ini.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-linen-line overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-linen-line flex items-center justify-between text-xs text-stone-600">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" />{visible.length} dari {items.length} naskah ditampilkan</span>
              <span className="font-mono text-[11px] text-stone-400">OpenStreetMap</span>
            </div>
            <div className="p-3"><ArchiveMap items={visible} onSelect={setSelected} height={520} /></div>
            {items.length === 0 && <p className="px-5 pb-3 text-sm text-stone-500">Belum ada naskah publik. <Link href="/studio" className="text-primary underline">Bagikan naskah pertama lewat Studio.</Link></p>}
            <div className="px-5 py-3 border-t border-linen-line flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
              <span className="flex items-center gap-2"><Icon name="verified" size={18} className="text-emerald-600" /><b className="text-stone-900">{new Set(items.map((i) => i.regency)).size} Kabupaten Bali Terpetakan</b> <span className="text-stone-400">• 100% Kustodian Berizin</span></span>
              <span className="font-mono text-[11px] text-stone-400">Koordinat: 8°30&apos;S 115°15&apos;E</span>
            </div>
          </div>

          {/* Drawer */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {selected ? (
              <div className="bg-white rounded-2xl border border-linen-line p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-terra-50 text-primary border border-terra-100 text-[11px] font-mono font-semibold uppercase tracking-wider">Naskah terpilih</span>
                  <button type="button" onClick={() => setSelected(null)} aria-label="Tutup" className="text-stone-400 hover:text-stone-700"><Icon name="close" size={18} /></button>
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-stone-900 leading-snug">{selected.title}</h2>
                  <p className="flex items-center gap-1 text-xs text-stone-500 mt-1"><Icon name="location_on" size={15} className="text-primary" />Area {selected.village_banjar}, {selected.regency}</p>
                </div>
                <ManuscriptDetail item={selected} />
                <Link href={`/archive/${selected.slug}`} className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  <Icon name="menu_book" size={18} /> Buka halaman naskah
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-linen-line p-5 space-y-3">
                <h2 className="font-serif text-lg font-semibold text-stone-900">Naskah di peta</h2>
                {visible.length === 0 ? <p className="text-sm text-stone-500">Tidak ada naskah yang cocok.</p> : (
                  <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                    {visible.map((i) => (
                      <li key={i.slug}>
                        <button type="button" onClick={() => setSelected(i)} className="w-full text-left rounded-xl border border-stone-200 hover:border-primary/50 p-2.5 flex gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={i.image_url} alt="" className="w-16 h-12 object-cover rounded" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-stone-800 truncate">{i.title}</span>
                            <span className="block text-[11px] text-stone-500">{CATEGORY_LABELS[i.category]?.split(" (")[0]} · {i.regency}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="bg-amberink-50 p-4 rounded-2xl border border-amberink-200 flex items-start gap-3">
              <Icon name="lightbulb" size={20} className="text-amberink-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed"><b>Tips:</b> klik penanda di peta atau pilih dari daftar untuk melihat gambar, transliterasi, dan terjemahan. Laporkan naskah yang seharusnya tidak dipublikasikan lewat tombol di panel ini.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl border border-linen-line px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Icon name="verified" size={22} /></div>
          <p className="text-sm text-stone-600"><b className="text-stone-900">{items.length} Naskah Publik</b> terverifikasi di seluruh Bali melalui kurasi pustakawan dan krama griya.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700">Mandat Pelestarian Digital Adat</span>
          <span className="font-mono text-stone-400">• Bali DigiFest 2026</span>
        </div>
      </div>
    </div>
  );
}
