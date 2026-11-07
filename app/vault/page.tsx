"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";
import { useSession } from "@/lib/useSession";
import { CATEGORY_LABELS } from "@/lib/regencies";

type Item = {
  id: string; title: string; category: string; visibility: "private" | "public"; is_pingit: boolean;
  regency: string; village_banjar: string; image_url: string | null;
  leaf: { latin_transliteration: string; transcription_status: string } | null;
};

export default function VaultPage() {
  const { session, ready } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const res = await fetch("/api/manuscripts", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Gagal memuat."); else setItems(data.manuscripts);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const call = async (id: string, init: RequestInit) => {
    if (!session) return;
    setError(null);
    const res = await fetch(`/api/manuscripts/${id}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) setError((await res.json()).error || "Gagal.");
    load();
  };

  const makePublic = (i: Item) => {
    if (window.confirm("Publikasikan naskah ini? Gambar, transliterasi, dan terjemahan akan dapat dilihat siapa saja (lokasi hanya berupa area ±1 km). Anda dapat mencabutnya kapan saja. Dengan melanjutkan, Anda menyatakan berhak atas naskah ini dan naskah bukan pingit.")) {
      call(i.id, { method: "PATCH", body: JSON.stringify({ visibility: "public", consent_public: true }) });
    }
  };
  const makePrivate = (i: Item) =>
    call(i.id, { method: "PATCH", body: JSON.stringify({ visibility: "private" }) });
  const remove = (i: Item) => {
    if (window.confirm(`Hapus "${i.title}" secara permanen beserta gambarnya? Ini tidak dapat dibatalkan.`)) call(i.id, { method: "DELETE" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <h1 className="text-2xl font-bold text-terra-800">Vault Saya</h1>
      <AuthPanel />
      {ready && session && (
        <>
          {loading && <p className="text-stone-500">Memuat…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!loading && items.length === 0 && (
            <p className="text-stone-500">Belum ada naskah. <Link href="/studio" className="text-terra-700 underline">Mulai di Studio</Link>.</p>
          )}
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image_url && <img src={i.image_url} alt="" className="w-24 h-16 object-cover rounded" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-stone-800 truncate">{i.title}</p>
                  <p className="text-xs text-stone-500">{CATEGORY_LABELS[i.category]} · {i.village_banjar}, {i.regency}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${i.visibility === "public" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-700"}`}>
                    {i.is_pingit ? "🛕 Pingit · privat" : i.visibility === "public" ? "🌏 Publik" : "🔒 Privat"}
                  </span>
                  <div className="flex gap-3 mt-2 text-xs">
                    {i.visibility === "public"
                      ? <button type="button" onClick={() => makePrivate(i)} className="text-terra-700 underline">Cabut publikasi</button>
                      : !i.is_pingit && <button type="button" onClick={() => makePublic(i)} className="text-terra-700 underline">Publikasikan</button>}
                    <button type="button" onClick={() => remove(i)} className="text-red-600 underline">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
