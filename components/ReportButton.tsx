"use client";

import { useState } from "react";
import Icon from "./Icon";

const REASONS = [
  ["pingit", "Naskah ini pingit/sakral"],
  ["salah_isi", "Isi transkripsi/terjemahan keliru"],
  ["hak_cipta", "Pelanggaran hak / dipublikasikan tanpa izin"],
  ["lainnya", "Lainnya"],
] as const;

export default function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("pingit");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const send = async () => {
    setState("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, reason, details: details || undefined }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  };

  if (state === "done") return <p className="text-sm text-emerald-700">Terima kasih. Laporan Anda akan ditinjau admin.</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs text-stone-500 hover:text-primary flex items-center gap-1"><Icon name="flag" size={15} /> Laporkan naskah ini</button>;

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-sm">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white">
        {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={1000} placeholder="Keterangan (opsional)"
        className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white" />
      {state === "error" && <p className="text-red-600">Gagal mengirim. Coba lagi.</p>}
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={state === "sending"} className="px-3 py-1.5 rounded-xl bg-primary text-white disabled:bg-stone-300">Kirim laporan</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-stone-600">Batal</button>
      </div>
    </div>
  );
}
