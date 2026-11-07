"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { resizeToJpeg } from "@/lib/image";
import { enhanceImage } from "@/lib/cv";
import { latinToBali } from "@/lib/aksara";
import { downloadJson } from "@/lib/export";
import { REGENCIES } from "@/lib/regencies";
import { useSession } from "@/lib/useSession";

type LeafStatus = "terindeks" | "memproses" | "selesai" | "review";
type Leaf = {
  id: string; label: string; name: string; src: string; enhanced?: string; status: LeafStatus;
  latin: string; useEnhanced: boolean;
};

const CENTROID: Record<string, [number, number]> = {
  Badung: [-8.58, 115.18], Bangli: [-8.45, 115.35], Buleleng: [-8.12, 115.09], Denpasar: [-8.65, 115.22],
  Gianyar: [-8.54, 115.33], Jembrana: [-8.36, 114.67], Karangasem: [-8.45, 115.61], Klungkung: [-8.54, 115.4], Tabanan: [-8.54, 115.12],
};
const STATUS_META: Record<LeafStatus, { label: string; cls: string; icon: string }> = {
  terindeks: { label: "Terindeks", cls: "text-stone-600", icon: "check_circle" },
  memproses: { label: "Memproses…", cls: "text-blue-600", icon: "refresh" },
  selesai: { label: "Selesai", cls: "text-emerald-700", icon: "check_circle" },
  review: { label: "Perlu Review", cls: "text-amber-700", icon: "warning" },
};
const PAGE_SIZE = 8;
const folio = (i: number) => `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "a" : "b"}`;

export default function BatchPage() {
  const { session } = useSession();
  const [title, setTitle] = useState("Cakepan Baru");
  const [owner, setOwner] = useState("");
  const [regency, setRegency] = useState<string>("Gianyar");
  const [banjar, setBanjar] = useState("");
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "review" | "selesai">("all");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setNote(null);
    const start = leaves.length;
    const next: Leaf[] = [];
    const arr = Array.from(files);
    for (let n = 0; n < arr.length; n++) {
      const f = arr[n];
      try {
        const src = await resizeToJpeg(f);
        next.push({ id: crypto.randomUUID(), label: folio(start + n), name: f.name, src, status: "terindeks", latin: "", useEnhanced: false });
      } catch { setNote(`Gagal memuat ${f.name}.`); }
    }
    setLeaves((l) => [...l, ...next]);
    if (!active && next[0]) setActive(next[0].id);
  };

  const patch = (id: string, p: Partial<Leaf>) => setLeaves((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const binarize = async (ids: string[]) => {
    setBusy("Binarisasi Sauvola…");
    for (const id of ids) {
      const l = leaves.find((x) => x.id === id);
      if (!l) continue;
      patch(id, { status: "memproses" });
      try {
        const enhanced = await enhanceImage(l.src);
        patch(id, { enhanced, useEnhanced: true, status: l.latin.trim() ? "selesai" : "terindeks" });
      } catch { patch(id, { status: "review" }); }
    }
    setBusy(null);
  };

  const shown = useMemo(() => leaves.filter((l) => filter === "all" || (filter === "review" ? l.status === "review" || l.status === "terindeks" : l.status === "selesai")), [leaves, filter]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageItems = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const cur = leaves.find((l) => l.id === active) ?? null;
  const done = leaves.filter((l) => l.status === "selesai").length;
  const processed = leaves.filter((l) => l.enhanced).length;
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const target = picked.size ? leaves.filter((l) => picked.has(l.id)) : leaves;

  const setLatin = (v: string) => cur && patch(cur.id, { latin: v, status: v.trim() ? "selesai" : "terindeks" });

  const exportJson = () => downloadJson(`${title.replace(/\W+/g, "-").toLowerCase()}.json`, {
    schema: "lontarai.cakepan/1", exported_at: new Date().toISOString(), title, leaves: leaves.map((l) => ({ folio: l.label, latin: l.latin, aksara: latinToBali(l.latin), status: l.status })),
  });

  const saveVault = async () => {
    if (!session) { setNote("Masuk terlebih dahulu untuk menyimpan ke Vault."); return; }
    if (!owner.trim() || !banjar.trim()) { setNote("Isi nama pemilik dan banjar/desa pada panel Cakepan Aktif."); return; }
    const [lat, lng] = CENTROID[regency];
    let ok = 0;
    for (const l of target) {
      setBusy(`Menyimpan lempir ${l.label} (${ok + 1}/${target.length})…`);
      const res = await fetch("/api/manuscripts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title: `${title} — Lempir ${l.label}`, category: "lainnya", owner_name: owner, affiliation: "Pribadi", regency, village_banjar: banjar,
          latitude: lat, longitude: lng, visibility: "private", is_pingit: false, consent_public: false, show_owner_name: false,
          image: l.src, folio_label: l.label,
          analysis: { unicode_transcription: latinToBali(l.latin), latin_transliteration: l.latin, translation: { indonesian: "", english: "" }, philosophical_context: "", confidence_score: 0, status: l.latin.trim() ? "dikoreksi" : "draf_ai", lines: [] },
        }),
      });
      if (res.ok) ok++; else { setNote((await res.json()).error || "Gagal menyimpan."); break; }
    }
    setBusy(null);
    if (ok === target.length) setNote(`${ok} lempir tersimpan ke Private Vault.`);
  };

  const stat = (icon: string, label: string, big: string, sub: string) => (
    <div className="bg-white rounded-2xl border border-linen-line p-5 flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-terra-50 text-primary flex items-center justify-center shrink-0"><Icon name={icon} size={22} /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-stone-500">{label}</div>
        <div className="font-serif text-2xl font-semibold text-stone-900">{big}</div>
        <div className="text-xs text-stone-500">{sub}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Icon name="home_storage" size={16} /> Koleksi Saya <span>/</span> Brankas Konservasi <span>/</span> <span className="text-stone-900 font-medium">Batch Studio Pemindaian</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberink-100 border border-amberink-200 text-amberink-700 text-xs font-semibold"><Icon name="burst_mode" size={15} /> Arsiparis Kolektif • Tahap Pemindaian Massal</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight mt-3">Batch Studio: Digitalisasi Multi-Cakepan Lontar</h1>
          <p className="text-sm text-stone-600 mt-2">Unggah banyak foto lempir sekaligus. Binarisasi Sauvola berjalan di perangkat Anda, transliterasi diketik per lempir, lalu simpan ke Private Vault.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2.5 rounded-xl bg-white border border-linen-line hover:bg-linen text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm">
            <Icon name="add_box" size={18} className="text-primary" /> Tambah Lempir (+)
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <button type="button" disabled={!leaves.length || !!busy} onClick={() => binarize(leaves.map((l) => l.id))}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-stone-300 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <Icon name="auto_awesome" size={18} /> Mulai Otomasi Batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stat("library_books", "Antrean Lempir", `${leaves.length} Lempir`, `${done} selesai • ${leaves.length - done} belum`)}
        {stat("document_scanner", "Transkripsi", `${done} Lempir`, `${leaves.length ? Math.round((done / leaves.length) * 100) : 0}% diketik manual`)}
        {stat("lock", "Mode Penyimpanan", "Private Vault", "Batch selalu privat; publikasi lewat Vault")}
        {stat("contrast", "Binarize Aktif", `${processed}/${leaves.length}`, "Sauvola adaptif di perangkat")}
      </div>

      {busy && <div className="rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2.5 flex items-center gap-2"><Icon name="refresh" size={18} className="animate-spin" />{busy}</div>}
      {note && !busy && <div className="rounded-xl bg-amberink-50 border border-amberink-200 text-amberink-800 text-sm px-4 py-2.5">{note}</div>}

      <section className="bg-white rounded-2xl border border-linen-line p-5 grid md:grid-cols-4 gap-4">
        <div className="md:col-span-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Cakepan Aktif Terbuka</h2>
          <span className="flex gap-2 text-xs"><span className="px-2.5 py-1 rounded-full bg-terra-50 text-primary border border-terra-100 font-semibold flex items-center gap-1"><Icon name="lock" size={14} /> Private Vault</span></span>
        </div>
        {[
          ["Judul cakepan", title, setTitle, "Usada Taru Pramana"],
          ["Pemilik / griya", owner, setOwner, "Ida Bagus Made"],
          ["Banjar / desa", banjar, setBanjar, "Sanur Kauh"],
        ].map(([lab, val, set, ph]) => (
          <label key={lab as string} className="block"><span className="block text-xs font-semibold text-stone-700 mb-1">{lab as string}</span>
            <input value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} placeholder={ph as string} className="w-full bg-stone-100 px-3 py-2 rounded-lg text-sm border border-transparent focus:bg-white" /></label>
        ))}
        <label className="block"><span className="block text-xs font-semibold text-stone-700 mb-1">Kabupaten/kota</span>
          <select value={regency} onChange={(e) => setRegency(e.target.value)} className="w-full bg-stone-100 px-3 py-2 rounded-lg text-sm">{REGENCIES.map((r) => <option key={r}>{r}</option>)}</select></label>
      </section>

      {leaves.length === 0 ? (
        <label className="rounded-2xl border-2 border-dashed border-terra-300 bg-white p-14 text-center cursor-pointer hover:bg-terra-50/30 block">
          <Icon name="folder_zip" size={44} className="text-primary" />
          <p className="font-serif text-xl text-stone-900 mt-2">Unggah foto lempir untuk memulai</p>
          <p className="text-sm text-stone-500 mt-1">Pilih banyak berkas sekaligus (JPG, PNG, WebP). Urutan nama berkas menjadi urutan lempir 1a, 1b, 2a…</p>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-linen-line overflow-hidden">
            <div className="px-5 py-3 border-b border-linen-low flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase text-primary">Inspeksi Aktif: Lempir {cur?.label}</div>
                <div className="text-xs text-stone-500 truncate max-w-xs">{cur?.name}</div>
              </div>
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button type="button" aria-label="Perkecil" onClick={() => setZoom(Math.max(100, zoom - 25))} className="p-1.5"><Icon name="zoom_out" size={18} /></button>
                <span className="text-xs font-mono w-10 text-center">{zoom}%</span>
                <button type="button" aria-label="Perbesar" onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5"><Icon name="zoom_in" size={18} /></button>
                <button type="button" aria-label="Kontras tinggi" disabled={!cur || !!busy} onClick={() => cur && (cur.enhanced ? patch(cur.id, { useEnhanced: !cur.useEnhanced }) : binarize([cur.id]))}
                  className={`p-1.5 rounded ${cur?.useEnhanced ? "bg-white text-primary" : ""}`}><Icon name="contrast" size={18} /></button>
              </div>
            </div>
            {cur && (
              <div className="p-4 grid gap-4">
                <div className="overflow-auto max-h-[460px] rounded-xl border border-stone-200 bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cur.useEnhanced && cur.enhanced ? cur.enhanced : cur.src} alt={`Lempir ${cur.label}`} style={{ width: `${zoom}%`, maxWidth: "none" }} className="block" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-700 mb-1">Transliterasi Latin lempir {cur.label} <span className="font-normal text-stone-400">(diketik manual)</span></div>
                  <textarea value={cur.latin} onChange={(e) => setLatin(e.target.value)} rows={3} placeholder="Ong awighnamastu. Nihan katuturan…"
                    className="w-full bg-stone-100 px-3 py-2 rounded-lg text-sm font-serif italic border border-transparent focus:bg-white" />
                  {cur.latin.trim() && <p className="font-bali text-xl mt-2 text-stone-900 leading-loose">{latinToBali(cur.latin)}</p>}
                  <Link href="/studio" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2">Buka penuh di Studio Transkripsi <Icon name="arrow_outward" size={14} /></Link>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-linen-line p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Galeri Lempir <span className="font-sans text-xs font-normal text-stone-500">({leaves.length} daun terindeks)</span></h2>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setPicked(new Set(leaves.map((l) => l.id)))} className="text-primary font-medium">Pilih Semua ({leaves.length})</button>
                <button type="button" onClick={() => setPicked(new Set())} className="text-stone-500">Batal</button>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              {([["all", `Semua (${leaves.length})`], ["review", "Perlu Review"], ["selesai", "Selesai"]] as const).map(([k, v]) => (
                <button key={k} type="button" onClick={() => { setFilter(k); setPage(0); }} className={`px-3 py-1 rounded-full ${filter === k ? "bg-primary text-white font-semibold" : "bg-stone-100 text-stone-600"}`}>{v}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {pageItems.map((l) => {
                const m = STATUS_META[l.status];
                return (
                  <div key={l.id} className={`rounded-xl border overflow-hidden cursor-pointer ${active === l.id ? "border-primary ring-1 ring-primary" : "border-stone-200"}`} onClick={() => setActive(l.id)}>
                    <div className="relative h-24 bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.useEnhanced && l.enhanced ? l.enhanced : l.src} alt="" className="w-full h-full object-cover" />
                      <input type="checkbox" aria-label={`Pilih lempir ${l.label}`} checked={picked.has(l.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(l.id)} className="absolute top-2 left-2 accent-[#a83223]" />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-semibold text-stone-900">Lempir {l.label}</div>
                      <div className={`text-[11px] flex items-center gap-1 ${m.cls}`}><Icon name={m.icon} size={13} />{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Menampilkan {pageItems.length} dari {shown.length} lempir</span>
              <span className="flex items-center gap-1">
                <button type="button" aria-label="Sebelumnya" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1 disabled:opacity-30"><Icon name="chevron_left" size={18} /></button>
                Hal {page + 1} dari {pages}
                <button type="button" aria-label="Berikutnya" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="p-1 disabled:opacity-30"><Icon name="chevron_right" size={18} /></button>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-3 z-10 bg-white rounded-2xl border border-linen-line shadow-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-stone-700"><Icon name="checklist" size={20} className="text-primary" /><b>{picked.size || leaves.length} Lempir {picked.size ? "Terpilih" : "(semua)"}</b>
          <span className="text-xs text-stone-500">Batch Aksi Otomasi</span></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!leaves.length || !!busy} onClick={() => binarize(target.map((l) => l.id))} className="px-3.5 py-2 rounded-lg border border-linen-line text-xs font-medium flex items-center gap-1.5 hover:bg-linen disabled:opacity-40"><Icon name="contrast" size={16} /> Auto-Binarize Sauvola</button>
          <button type="button" disabled={!leaves.length} onClick={exportJson} className="px-3.5 py-2 rounded-lg border border-linen-line text-xs font-medium flex items-center gap-1.5 hover:bg-linen disabled:opacity-40"><Icon name="data_object" size={16} /> Ekspor JSON</button>
          <button type="button" disabled={!leaves.length || !!busy} onClick={saveVault} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 disabled:bg-stone-300"><Icon name="lock" size={16} /> Simpan ke Vault</button>
        </div>
      </div>
    </div>
  );
}
