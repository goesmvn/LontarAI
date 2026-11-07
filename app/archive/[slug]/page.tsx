"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/archive" className="text-sm text-terra-700 underline">← Kembali ke arsip</Link>
      {state === "loading" && <p className="text-stone-500 mt-6">Memuat…</p>}
      {state === "missing" && <p className="text-stone-600 mt-6">Naskah tidak ditemukan atau sudah tidak dipublikasikan.</p>}
      {item && (
        <>
          <h1 className="text-2xl font-bold text-terra-800 mt-3 mb-4">{item.title}</h1>
          <ManuscriptDetail item={item} />
        </>
      )}
    </div>
  );
}
