"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ManuscriptDetail from "@/components/ManuscriptDetail";
import type { ArchiveItem } from "@/components/ArchiveMap";

export default function ArchiveDetailPage({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<ArchiveItem | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    fetch(`/api/archive/${params.slug}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setItem(d.item); setState("ok"); })
      .catch(() => setState("missing"));
  }, [params.slug]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/archive" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-primary"><Icon name="arrow_back" size={18} /> Kembali ke Peta Sebaran</Link>
      {state === "loading" && <p className="text-stone-500 mt-6">Memuat…</p>}
      {state === "missing" && <p className="text-stone-600 mt-6 rounded-2xl border border-stone-200 bg-white p-8 text-center">Naskah tidak ditemukan atau sudah tidak dipublikasikan.</p>}
      {item && (
        <div className="mt-4 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8">
          <span className="px-2.5 py-1 rounded-full bg-terra-50 text-primary border border-terra-100 font-mono text-[11px] font-semibold uppercase tracking-wider">Naskah Terpilih</span>
          <h1 className="font-serif text-3xl text-stone-900 font-medium mt-3 mb-5">{item.title}</h1>
          <ManuscriptDetail item={item} />
        </div>
      )}
    </div>
  );
}
