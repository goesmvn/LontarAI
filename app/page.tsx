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
  { img: "/samples/taru-pramana.jpg", tag: "Usada Herbal", meta: "Gianyar • Abad 18", title: "Usada Taru Pramana", text: "Ajaran penyembuhan tradisional Bali tentang khasiat ratusan jenis tanaman herbal dan daun berkhasiat.", pct: 96, ok: true, href: "/studio?sample=taru" },
  { img: "/samples/babad-klungkung.jpg", tag: "Babad Klungkung", meta: "Klungkung • Abad 17", title: "Babad Dalem Klungkung", text: "Kronik silsilah raja-raja dan pergolakan sejarah dinasti Gelgel dan Klungkung dengan gaya sastra kawi.", pct: 89, ok: false, href: "/studio?sample=babad" },
  { img: "/samples/wariga-gemet.jpg", tag: "Wariga Kalender", meta: "Karangasem • Abad 19", title: "Wariga Gemet Pawukon", text: "Sistem perhitungan astrologi kalender Bali, hari baik (dewasa ayu), dan ritme siklus kehidupan agraris.", pct: 94, ok: true, href: "/studio?sample=wariga" },
];

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
      {/* Hero */}
      <section className="bg-white border-b border-linen-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberink-50 border border-amberink-200 text-amberink-700 text-xs font-semibold uppercase tracking-wider mb-6">
              <Icon name="auto_stories" size={15} /> Arsip Digital Warisan Leluhur
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 font-medium tracking-tight leading-[1.15]">
              Menjaga Aksara Kuno, Tetap Hidup di Era Digital
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-stone-600 leading-relaxed">
              Platform cerdas untuk membaca, menerjemahkan, dan melestarikan daun lontar Bali dengan mudah.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/studio" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-terra-600 hover:bg-terra-700 text-white font-medium text-sm shadow-sm hover:shadow transition-all">
                Mulai Scan Naskah <Icon name="arrow_forward" size={18} />
              </Link>
              <Link href="/archive" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-sm border border-stone-200 transition-colors">
                <Icon name="explore" size={18} className="text-stone-500" /> Jelajahi Peta Koleksi
              </Link>
            </div>
          </div>
        </div>
      </section>

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
