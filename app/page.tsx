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
  { icon: "edit_note", title: "Transkripsi dibantu", text: "Ketik ejaan Latin per baris, aksara Bali Unicode terbentuk otomatis. Zoom per baris dan binarisasi Sauvola membantu membaca goresan pudar." },
  { icon: "translate", title: "Terjemahan & konteks", text: "Isi terjemahan Indonesia/Inggris sendiri, atau minta bantuan AI untuk menebak tata letak dan rumpun naskah (opsional, selalu berlabel draf)." },
  { icon: "verified_user", title: "Privasi & naskah sakral", text: "Privat secara default. Publikasi butuh persetujuan, lokasi dikaburkan ±1 km, dan naskah pingit tidak pernah tampil di arsip publik." },
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
              <Icon name="auto_stories" size={15} /> Arsip digital warisan leluhur
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 font-medium tracking-tight leading-[1.15]">
              Menjaga aksara kuno, tetap hidup di era digital
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-stone-600 leading-relaxed">
              Platform untuk memotret, mentranskripsi, dan menyimpan naskah lontar Bali — privat untuk keluarga, atau dibagikan ke arsip publik dengan persetujuan pemiliknya.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/studio" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-medium text-sm shadow-sm transition-all">
                Mulai transkripsi <Icon name="arrow_forward" size={18} />
              </Link>
              <Link href="/archive" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-sm border border-stone-200 transition-colors">
                <Icon name="explore" size={18} className="text-stone-500" /> Jelajahi peta koleksi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real stats */}
      <section className="border-b border-linen-line bg-stone-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {[
            [num(stats?.publicCount), "Naskah di arsip publik", "Dibagikan pemilik dengan persetujuan"],
            [stats?.configured ? `${stats?.regencies ?? 0} / 9` : "—", "Kabupaten/kota terwakili", "Lokasi ditampilkan sebagai area ±1 km"],
            [num(stats?.totalCount), "Naskah tersimpan (termasuk privat)", "Isi naskah privat tidak pernah dihitung atau ditampilkan"],
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
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-wider uppercase text-stone-500">Koleksi sampel</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mt-1">Coba langsung dengan naskah autentik</h2>
            <p className="text-sm text-stone-600 mt-1">Sampel dipakai dengan izin Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group">
              <div className="relative h-48 bg-stone-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/samples/krakah-sanggaraha.webp" alt="Lempir lontar Krakah Sanggaraha" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-stone-800 text-[11px] font-semibold border border-stone-200">Lempir 1 B & 2 A</span>
              </div>
              <div className="p-5 flex-1">
                <h3 className="font-serif text-xl font-medium text-stone-900">Krakah Sanggaraha</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">Koleksi Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali. Dua lempir, masing-masing empat baris aksara dengan lubang pengikat di tengah.</p>
              </div>
              <div className="p-5 pt-0">
                <Link href="/studio?sample=krakah" className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-primary text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                  Coba transkripsi <Icon name="arrow_forward" size={15} />
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-5 flex flex-col items-center justify-center text-center gap-3 md:col-span-2">
              <Icon name="add_photo_alternate" size={40} className="text-primary" />
              <h3 className="font-serif text-xl font-medium text-stone-900">Punya lontar di griya, puri, atau banjar?</h3>
              <p className="text-sm text-stone-600 max-w-lg">Foto satu lempir per gambar dengan resolusi setinggi mungkin dan pencahayaan merata. Naskah tidak perlu dipindahkan; simpan privat atau bagikan atas keputusan Anda.</p>
              <Link href="/studio" className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium">Unggah foto naskah</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent archive */}
      <section className="py-12 border-t border-linen-line bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-xl font-medium text-stone-900">Arsip publik terbaru</h3>
              <p className="text-xs text-stone-500 mt-0.5">Naskah yang dibagikan pemiliknya.</p>
            </div>
            <Link href="/archive" className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50">Lihat semua</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-stone-500 rounded-xl border border-stone-200 bg-stone-50 p-6 text-center">
              Belum ada naskah publik. Jadilah yang pertama membagikan lewat Studio.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr><th className="py-3 px-4">Judul</th><th className="py-3 px-4">Rumpun</th><th className="py-3 px-4">Wilayah</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Buka</th></tr>
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
