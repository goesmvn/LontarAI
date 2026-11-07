"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ArchiveItem } from "@/components/ArchiveMap";
import { CATEGORY_LABELS, REGENCIES } from "@/lib/regencies";

const ArchiveMap = dynamic(() => import("@/components/ArchiveMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-xl bg-stone-100" />,
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-terra-800">Arsip Publik Naskah Lontar</h1>
      <p className="text-stone-600 text-sm mt-1 mb-5">
        Naskah yang dibagikan masyarakat dengan persetujuan pemiliknya. Lokasi ditampilkan sebagai area ±1 km, bukan titik rumah.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul…" className="px-3 py-2 rounded-lg border border-stone-300 text-sm flex-1 min-w-[160px]" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm">
          <option value="">Semua rumpun</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={regency} onChange={(e) => setRegency(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-300 text-sm">
          <option value="">Semua kabupaten</option>
          {REGENCIES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {loading ? <p className="text-stone-500">Memuat arsip…</p> : !configured ? (
        <p className="text-stone-500">Arsip belum dikonfigurasi di server ini.</p>
      ) : (
        <>
          <ArchiveMap items={visible} onSelect={setSelected} />
          <p className="text-sm text-stone-500 mt-2">{visible.length} naskah ditampilkan dari {items.length}.</p>
          {items.length === 0 && <p className="text-stone-500 mt-4">Belum ada naskah publik. Jadilah yang pertama membagikan lewat Studio.</p>}
          <ul className="grid sm:grid-cols-2 gap-3 mt-4">
            {visible.map((i) => (
              <li key={i.slug}>
                <button type="button" onClick={() => setSelected(i)} className="w-full text-left rounded-xl border border-stone-200 bg-white hover:border-terra-300 p-3 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image_url} alt="" className="w-20 h-14 object-cover rounded" />
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-800 truncate">{i.title}</span>
                    <span className="block text-xs text-stone-500">{CATEGORY_LABELS[i.category]} · {i.village_banjar}, {i.regency}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between gap-3">
              <h2 className="text-lg font-bold text-terra-800">{selected.title}</h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Tutup" className="text-stone-500">✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.image_url} alt={selected.title} className="w-full rounded-lg" />
            <p className="text-xs text-stone-500">
              {CATEGORY_LABELS[selected.category]} · Area {selected.village_banjar}, {selected.regency}
              {selected.owner_name ? ` · Pengempu: ${selected.owner_name}` : ""}
              {selected.estimated_creation_era ? ` · ${selected.estimated_creation_era}` : ""}
            </p>
            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
              {selected.transcription_status === "terverifikasi" ? "Terverifikasi" : selected.transcription_status === "dikoreksi" ? "Dikoreksi manusia" : "Draf AI, belum diverifikasi"}
            </span>
            {selected.latin_transliteration && <div><h3 className="font-semibold text-sm">Transliterasi</h3><p className="text-sm text-stone-700 whitespace-pre-line">{selected.latin_transliteration}</p></div>}
            {selected.translation_id && <div><h3 className="font-semibold text-sm">Terjemahan</h3><p className="text-sm text-stone-700 whitespace-pre-line">{selected.translation_id}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
