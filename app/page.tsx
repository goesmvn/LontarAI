"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STEPS = [
  { icon: "📷", title: "Foto lempir", text: "Unggah foto lontar dari ponsel atau kamera. Tanpa kata sandi, tanpa memindahkan naskah fisik." },
  { icon: "🔍", title: "Draf AI + koreksi Anda", text: "AI membuat draf aksara Bali, transliterasi, dan terjemahan. Bagian yang tak terbaca ditandai, dan Anda dapat mengoreksinya." },
  { icon: "🔒", title: "Pilih privat atau publik", text: "Simpan di Private Vault atau bagikan ke Arsip Publik dengan persetujuan Anda. Naskah pingit tidak pernah dipublikasikan." },
];

type Stats = { configured: boolean; publicCount?: number; regencies?: number; totalCount?: number | null };

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-terra-800 text-balance">
          Lestarikan kearifan lontar Bali dengan bantuan AI
        </h1>
        <p className="text-stone-600 mt-4 max-w-2xl mx-auto">
          LontarAI membantu masyarakat, pengempu naskah, dan peneliti mendigitalkan lempir lontar, membaca isinya sebagai draf,
          dan menyimpannya dengan kendali penuh: privat atau dibagikan ke arsip publik.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Link href="/studio" className="px-7 py-3 rounded-full bg-terra-600 text-white font-semibold hover:bg-terra-700">Mulai di Studio</Link>
          <Link href="/archive" className="px-7 py-3 rounded-full bg-white border border-terra-300 text-terra-800 font-semibold hover:bg-terra-50">Jelajahi Arsip</Link>
        </div>
      </section>

      {stats?.configured && (
        <section className="grid grid-cols-3 gap-3 mt-12 text-center">
          {[
            [stats.publicCount ?? 0, "Naskah di arsip publik"],
            [stats.regencies ?? 0, "Dari 9 kabupaten/kota"],
            [stats.totalCount ?? "—", "Naskah terlindungi di Vault"],
          ].map(([n, label]) => (
            <div key={String(label)} className="rounded-2xl bg-terra-50 border border-terra-100 py-4">
              <div className="text-2xl font-bold text-terra-800">{n}</div>
              <div className="text-xs text-stone-600 px-1">{label}</div>
            </div>
          ))}
        </section>
      )}

      <section className="grid sm:grid-cols-3 gap-4 mt-14">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-2xl border border-terra-100 bg-white p-5">
            <div className="text-3xl mb-2">{s.icon}</div>
            <h2 className="font-semibold text-stone-800">{s.title}</h2>
            <p className="text-sm text-stone-600 mt-1">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-2xl bg-amber-50 border border-amber-200 p-5 text-sm text-stone-700">
        <h2 className="font-semibold text-stone-800 mb-1">Komitmen privasi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Semua naskah privat secara default; publikasi hanya dengan persetujuan eksplisit dan dapat dicabut.</li>
          <li>Lokasi di arsip publik dibulatkan ke area ±1 km; titik tepat hanya terlihat oleh pemilik.</li>
          <li>Metadata EXIF (termasuk GPS) pada foto dihapus sebelum diunggah.</li>
        </ul>
      </section>
    </div>
  );
}
