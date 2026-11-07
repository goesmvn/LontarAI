"use client";

import { useCallback, useEffect, useState } from "react";
import { latinToBali } from "@/lib/aksara";

type Row = { id: string; line_index: number; image_url: string | null; latin: string; unicode: string; origin: string; review: string };

export default function TrainingReview({ headers }: { headers: () => Record<string, string> }) {
  const [review, setReview] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/training?review=${review}`, { headers: headers() });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error || "Gagal memuat.");
    setRows(d.items ?? []); setCounts(d.counts ?? {}); setMsg(null);
  }, [review, headers]);
  useEffect(() => { load(); }, [load]);

  const decide = async (r: Row, decision: "approved" | "rejected") => {
    const latin = (edits[r.id] ?? r.latin).trim();
    const body = decision === "approved" ? { review: decision, latin, unicode: latinToBali(latin) } : { review: decision };
    const res = await fetch(`/api/admin/training/${r.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) });
    if (!res.ok) setMsg((await res.json()).error || "Gagal.");
    load();
  };

  const exportJsonl = async () => {
    const res = await fetch("/api/admin/training/export", { headers: headers() });
    if (!res.ok) return setMsg((await res.json()).error || "Gagal ekspor.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = "lontarai-training.jsonl"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-xs">
          {(["pending", "approved", "rejected"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setReview(k)} className={`px-3 py-1.5 rounded-full ${review === k ? "bg-primary text-white font-semibold" : "bg-stone-100 text-stone-600"}`}>
              {{ pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" }[k]} ({counts[k] ?? 0})
            </button>
          ))}
        </div>
        <button type="button" onClick={exportJsonl} className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-medium hover:bg-stone-50">Unduh manifest JSONL (disetujui)</button>
      </div>
      <p className="text-xs text-stone-500">Hanya potongan baris yang disumbangkan pengguna dengan persetujuan. Periksa transliterasi terhadap gambar sebelum menyetujui; koreksi bila perlu.</p>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {rows.length === 0 && <p className="text-sm text-stone-500 rounded-xl border border-stone-200 bg-white p-6 text-center">Tidak ada sampel di kategori ini.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
            {r.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.image_url} alt="" className="w-full max-h-24 object-contain rounded-lg bg-stone-900" />}
            <div className="flex items-center gap-2 text-[11px] text-stone-500"><span className="px-2 py-0.5 rounded-full bg-stone-100">{r.origin === "manual" ? "diketik manual" : "koreksi draf AI"}</span>Baris {r.line_index + 1}</div>
            <input value={edits[r.id] ?? r.latin} onChange={(e) => setEdits({ ...edits, [r.id]: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 font-serif italic text-sm" />
            <p className="font-bali text-lg text-stone-900">{latinToBali(edits[r.id] ?? r.latin)}</p>
            {review === "pending" && (
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => decide(r, "approved")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Setujui</button>
                <button type="button" onClick={() => decide(r, "rejected")} className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700">Tolak</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
