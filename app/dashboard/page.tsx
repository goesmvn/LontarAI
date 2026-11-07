"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import DashboardView, { type DashItem } from "@/components/DashboardView";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { clearDraft, readDraftMeta, type DraftMeta } from "@/lib/draft";

export default function DashboardPage() {
  const { session, ready, configured } = useSession();
  const [items, setItems] = useState<DashItem[]>([]);
  const [donated, setDonated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftMeta | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameState, setNameState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [exporting, setExporting] = useState(false);

  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string };
  const email = session?.user.email ?? "";
  const name = meta.full_name?.trim() || email.split("@")[0] || "Kustodian";

  useEffect(() => { setDraft(readDraftMeta()); }, []);
  useEffect(() => { setNameInput(meta.full_name ?? ""); }, [meta.full_name]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true); setError(null);
    const auth = { Authorization: `Bearer ${session.access_token}` };
    const [m, t] = await Promise.all([
      fetch("/api/manuscripts", { headers: auth }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))).catch(() => null),
      fetch("/api/training", { headers: auth }).then((r) => r.json()).catch(() => null),
    ]);
    if (!m?.ok) setError(m?.d?.error || "Gagal memuat naskah."); else setItems(m.d.manuscripts ?? []);
    setDonated(t?.total ?? 0);
    setLoading(false);
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const saveName = async () => {
    setNameState("saving");
    const { error: e } = await getBrowserSupabase().auth.updateUser({ data: { full_name: nameInput.trim() } });
    setNameState(e ? "error" : "saved");
  };

  const exportData = async () => {
    if (!session) return;
    setExporting(true);
    const data = {
      schema: "lontarai.account-export/1", exported_at: new Date().toISOString(), account: { email, display_name: name },
      training_samples_donated: donated,
      manuscripts: items.map((i) => ({ id: i.id, title: i.title, category: i.category, visibility: i.visibility, pingit: i.is_pingit, regency: i.regency, village_banjar: i.village_banjar, created_at: i.created_at, transcription_status: i.leaf?.transcription_status, latin_transliteration: i.leaf?.latin_transliteration })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `lontarai-data-saya-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    setExporting(false);
  };

  const discardDraft = async () => {
    if (!window.confirm("Buang draf yang belum disimpan? Ini tidak dapat dibatalkan.")) return;
    await clearDraft(); setDraft(null);
  };

  if (ready && !configured) return <div className="max-w-xl mx-auto px-4 py-16 text-center text-stone-600">Dasbor membutuhkan layanan masuk (Supabase) yang belum dikonfigurasi di server ini.</div>;
  if (ready && !session) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Icon name="space_dashboard" size={40} className="text-primary" />
        <h1 className="font-serif text-2xl text-stone-900">Masuk untuk membuka dasbor</h1>
        <p className="text-sm text-stone-600">Dasbor menampilkan ringkasan naskah, draf, dan pengaturan akun Anda.</p>
        <Link href="/masuk" className="inline-block px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold">Masuk</Link>
        {draft && <p className="text-xs text-stone-500">Draf lokal tersedia: <Link href="/studio?draft=1" className="text-primary underline">lanjutkan di Studio</Link>.</p>}
      </div>
    );
  }
  if (!session) return null;

  return (
    <DashboardView name={name} email={email} items={items} donated={donated} loading={loading} error={error} draft={draft}
      nameInput={nameInput} onNameInput={(v) => { setNameInput(v); setNameState("idle"); }} onSaveName={saveName} nameState={nameState}
      onExport={exportData} exporting={exporting} onDiscardDraft={discardDraft} />
  );
}
