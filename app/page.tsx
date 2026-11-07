"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { CATEGORY_LABELS } from "@/lib/regencies";

type Stats = { configured: boolean; publicCount?: number; regencies?: number; totalCount?: number | null };
type Item = { slug: string; title: string; category: string; regency: string; transcription_status: string };

const STATUS: Record<string, [string, string]> = {
  terverifikasi: ["Terverifikasi", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  dikoreksi: ["Dikoreksi", "bg-amber-50 text-amber-700 border-amber-200"],
  draf_ai: ["Draf", "bg-stone-100 text-stone-600 border-stone-200"],
};

const FEATURES = [
  { icon: "center_focus_strong", title: "Instant OCR Aksara", text: "Deteksi goresan aksara Bali lapuk seketika hanya melalui bidikan kamera ponsel." },
  { icon: "translate", title: "Terjemahan Latin & Makna Filosofis", text: "Konversi instan ke aksara Latin beserta tafsir kontekstual Bahasa Indonesia & Inggris." },
  { icon: "verified_user", title: "Privasi & Arsip Sakral Aman", text: "Koleksi naskah berstatus tenget/sakral disimpan privat dengan persetujuan krama adat." },
];

const SAMPLES = [
  { img: "/samples/taru-pramana.jpg", tag: "Usada Herbal", meta: "Gianyar • Abad 18", title: "Usada Taru Pramana", text: "Ajaran penyembuhan tradisional Bali tentang khasiat ratusan jenis tanaman herbal dan daun berkhasiat.", pct: 96, ok: true, href: "/studio" },
  { img: "/samples/babad-klungkung.jpg", tag: "Babad Klungkung", meta: "Klungkung • Abad 17", title: "Babad Dalem Klungkung", text: "Kronik silsilah raja-raja dan pergolakan sejarah dinasti Gelgel dan Klungkung dengan gaya sastra kawi.", pct: 89, ok: false, href: "/studio" },
  { img: "/samples/wariga-gemet.jpg", tag: "Wariga Kalender", meta: "Karangasem • Abad 19", title: "Wariga Gemet Pawukon", text: "Sistem perhitungan astrologi kalender Bali, hari baik (dewasa ayu), dan ritme siklus kehidupan agraris.", pct: 94, ok: true, href: "/studio" },
];


const SLIDES = [
  { tag: "Epigrafi Digital • Transliterasi", head: "Menghidupkan Kembali Hikmah Leluhur dengan", accent: "Bantuan Aksara", body: "Ketik transliterasi Latin per baris dan aksara Bali Unicode terbentuk otomatis. Zoom, kontras tinggi (Sauvola), terjemahan, lalu simpan privat atau publik.", cta: "Mulai Transkripsi", href: "/studio", cta2: "Jelajahi Peta Terbuka", href2: "/archive", icon: "document_scanner", pills: ["Sauvola adaptif", "Aksara Bali Unicode", "Draf AI opsional"] },
  { tag: "Studio Batch • Multi-Cakepan", head: "Digitalisasi Massal Multi-Cakepan", accent: "Tanpa Repot", body: "Unggah puluhan lempir sekaligus, binarisasi otomatis, penomoran lempir, galeri status, lalu simpan ke Vault dalam satu aksi.", cta: "Eksplorasi Studio Batch", href: "/batch", cta2: "Lihat Studio Transkripsi", href2: "/studio", icon: "photo_library", pills: ["Unggah banyak lempir", "Auto-binarize", "Ekspor JSON"] },
  { tag: "Privasi Tradisi • Hak Kustodian", head: "Kedaulatan Budaya Penuh:", accent: "Private Vault vs Open Heritage", body: "Naskah pingit tidak pernah tampil publik. Anda menetapkan akses setiap naskah dan dapat mencabutnya kapan saja.", cta: "Buat Brankas Griya", href: "/vault", cta2: "Komunitas Kustodian", href2: "/komunitas", icon: "lock", pills: ["Privat secara default", "Lokasi ±1 km", "Sertifikat kustodian"] },
];

function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, [paused]);
  const sl = SLIDES[i];
  return (
    <section className="relative bg-white border-b border-linen-line overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center min-h-[460px]">
        <div key={i} className="animate-[fadein_.5s_ease]">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberink-50 border border-amberink-200 text-amberink-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Icon name="auto_stories" size={15} /> {sl.tag}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 font-medium tracking-tight leading-[1.12]">
            {sl.head} <span className="italic text-primary">{sl.accent}</span>
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed max-w-xl">{sl.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={sl.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-medium text-sm shadow-sm transition-all">{sl.cta} <Icon name="arrow_forward" size={18} /></Link>
            <Link href={sl.href2} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-sm border border-stone-200 transition-colors"><Icon name="explore" size={18} className="text-stone-500" /> {sl.cta2}</Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden border border-stone-200 shadow-lg bg-stone-900 aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={["/samples/taru-pramana.jpg", "/samples/babad-klungkung.jpg", "/samples/wariga-gemet.jpg"][i]} alt="" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
              {sl.pills.map((p) => <span key={p} className="px-2.5 py-1 rounded-full bg-white/95 text-stone-800 text-[11px] font-semibold border border-stone-200 flex items-center gap-1"><Icon name="verified" size={13} className="text-emerald-600" />{p}</span>)}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
        <button type="button" aria-label="Sebelumnya" onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)} className="p-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-100"><Icon name="chevron_left" size={18} /></button>
        {SLIDES.map((_, n) => <button key={n} type="button" aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-primary" : "w-3 bg-stone-300"}`} />)}
        <button type="button" aria-label="Berikutnya" onClick={() => setI((i + 1) % SLIDES.length)} className="p-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-100"><Icon name="chevron_right" size={18} /></button>
      </div>
    </section>
  );
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/archive").then((r) => r.json()).then((d) => setRecent((d.items ?? []).slice(0, 5))).catch(() => {});
  }, []);

  const num = (v: number | null | undefined) => (stats?.configured && v != null ? v.toLocaleString("id-ID") : "—");

  return (
    <div>
      {/* Hero slider */}
      <HeroSlider />

      {/* Real stats */}
      <section className="border-b border-linen-line bg-stone-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {[
            [num(stats?.publicCount), "Lempir Terbaca", "Naskah di arsip publik, dibagikan dengan persetujuan"],
            [stats?.configured ? `${stats?.regencies ?? 0} / 9` : "—", "Wilayah di Bali", "Kabupaten/kota terwakili, lokasi ±1 km"],
            [num(stats?.totalCount), "Hak Kustodian Adat", "Naskah privat tidak pernah ditampilkan ke publik"],
          ].map(([n, label, sub]) => (
            <div key={label} className="border-l-2 border-stone-300 pl-5">
              <div className="font-serif text-3xl sm:text-4xl font-medium text-stone-900 tracking-tight">{n}</div>
              <div className="text-xs font-semibold tracking-wide uppercase text-stone-500 mt-1">{label}</div>
              <p className="text-xs text-stone-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-linen-line bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-stone-800 flex items-center justify-center shrink-0 shadow-sm">
                <Icon name={f.icon} size={22} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modern epigraphic architecture */}
      <section className="py-14 bg-stone-50 border-b border-linen-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-semibold tracking-wider uppercase text-amberink-700">Arsitektur Epigrafik Modern</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mt-1">Teknologi khusus anatomi aksara Bali</h2>
            <p className="text-sm text-stone-600 mt-2">Dirancang untuk menjawab kerapuhan fisik lontar serta variasi goresan tangan pujangga lintas abad.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ["document_scanner", "Transliterasi Instan", "Ketik ejaan Latin, aksara Bali Unicode terbentuk otomatis dengan aturan gantungan, gempelan, dan sandhangan.", "Coba transliterasi langsung", "/studio"],
              ["photo_library", "Studio Batch Scan Massal", "Proses satu cakepan penuh (puluhan lempir) beruntun dengan binarisasi Sauvola otomatis dan penomoran lempir.", "Buka Batch Studio", "/batch"],
              ["map", "Peta Sebaran Lontar", "Geolokasi naskah berdasarkan griya, puri, dan banjar adat. Lokasi publik dikaburkan ±1 km.", "Buka peta interaktif", "/archive"],
            ].map(([icon, t, d, cta, href]) => (
              <div key={t} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-3">
                <div className="w-11 h-11 rounded-xl bg-terra-50 text-primary flex items-center justify-center"><Icon name={icon} size={24} /></div>
                <h3 className="font-serif text-xl font-medium text-stone-900">{t}</h3>
                <p className="text-sm text-stone-600 leading-relaxed flex-1">{d}</p>
                <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{cta} <Icon name="chevron_right" size={16} /></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy: Vault vs Open Heritage */}
      <section className="py-14 bg-white border-b border-linen-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-amberink-700"><Icon name="lock" size={15} /> Privasi Tradisi • Hak Kustodian</span>
            <h2 className="font-serif text-3xl text-stone-900 font-medium mt-2 leading-tight">Kedaulatan Budaya Penuh: Private Vault <span className="italic text-primary">vs</span> Open Heritage</h2>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed">Menghormati pakem sakral naskah pingit. Keluarga dan griya memiliki hak menetapkan akses: simpan privat, atau rilis terbuka untuk riset akademik filologi.</p>
            <Link href="/vault" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-stone-900 hover:bg-primary text-white text-sm font-medium transition-colors">Buat Brankas Griya <Icon name="arrow_forward" size={16} /></Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-terra-200 bg-terra-50/50 p-5">
              <Icon name="encrypted" size={26} className="text-primary" />
              <h3 className="font-serif text-lg font-semibold text-stone-900 mt-2">Brankas Terkunci (Pingit)</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">Akses privat hanya pemilik. Naskah pingit tidak pernah tampil di arsip publik.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <Icon name="public" size={26} className="text-emerald-700" />
              <h3 className="font-serif text-lg font-semibold text-stone-900 mt-2">Korpus Terbuka (Open Heritage)</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">Dibagikan atas persetujuan pemilik untuk telaah filologi, dengan atribusi dan tombol cabut.</p>
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-amberink-200 bg-amberink-50 p-4 flex items-center gap-3 text-xs text-amberink-800">
              <Icon name="workspace_premium" size={22} /> Sertifikat Hak Kustodian tersedia di Private Vault untuk setiap naskah Anda.
            </div>
          </div>
        </div>
      </section>

      {/* Sample showcase */}
      <section className="py-14 sm:py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-500">Koleksi Terpilih</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mt-1">Eksplorasi Naskah Pilihan</h2>
              <p className="text-sm text-stone-600 mt-1">Coba langsung transkripsi lempir lontar autentik dalam 1 ketukan.</p>
            </div>
            <Link href="/archive" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900">
              Lihat Semua Koleksi <Icon name="chevron_right" size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLES.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-stone-800 text-[11px] font-semibold tracking-wide border border-stone-200 shadow-sm">{c.tag}</span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2 py-0.5 rounded-full bg-stone-900/70 backdrop-blur-sm text-white text-[10px] font-medium">{c.meta}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-medium text-stone-900 group-hover:text-terra-600 transition-colors">{c.title}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{c.text}</p>
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>Tingkat Preservasi: {c.pct}%</span>
                      <span className={`font-medium ${c.ok ? "text-emerald-600" : "text-amber-600"}`}>{c.ok ? "Siap Diterjemahkan" : "Perlu Verifikasi"}</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <Link href={c.href} className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-terra-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <span>Coba Transkrip</span> <Icon name="arrow_forward" size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent archive */}
      <section className="py-12 border-t border-linen-line bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-xl font-medium text-stone-900">Arsip Transkripsi Terbaru</h3>
              <p className="text-xs text-stone-500 mt-0.5">Daftar naskah yang baru saja selesai diproses atau ditinjau komunitas.</p>
            </div>
            <Link href="/archive" className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50">Filter Kategori</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-stone-500 rounded-xl border border-stone-200 bg-stone-50 p-6 text-center">
              Belum ada naskah publik. Jadilah yang pertama membagikan lewat Studio.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr><th className="py-3 px-4 font-medium">Judul Naskah</th><th className="py-3 px-4 font-medium">Kategori</th><th className="py-3 px-4 font-medium">Asal Wilayah</th><th className="py-3 px-4 font-medium">Status</th><th className="py-3 px-4 text-right font-medium">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {recent.map((r) => (
                    <tr key={r.slug} className="hover:bg-stone-50/70">
                      <td className="py-3.5 px-4 font-medium text-stone-900">{r.title}</td>
                      <td className="py-3.5 px-4 text-stone-500">{CATEGORY_LABELS[r.category] ?? r.category}</td>
                      <td className="py-3.5 px-4 text-stone-500">{r.regency}</td>
                      <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS[r.transcription_status]?.[1] ?? STATUS.draf_ai[1]}`}>{STATUS[r.transcription_status]?.[0] ?? "Draf"}</span></td>
                      <td className="py-3.5 px-4 text-right"><Link href={`/archive/${r.slug}`} className="text-stone-400 hover:text-stone-800"><Icon name="arrow_forward" size={18} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
