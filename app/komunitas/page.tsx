"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useSession } from "@/lib/useSession";
import { CATEGORY_LABELS } from "@/lib/regencies";

type Post = { id: string; user_id: string; author_name: string; body: string; created_at: string };
type Pub = { slug: string; title: string; category: string; regency: string; village_banjar: string; image_url: string | null };
type Tab = "linimasa" | "katalog" | "jaringan";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.round(m / 60)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium" });
};

export default function KomunitasPage() {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>("linimasa");
  const [posts, setPosts] = useState<Post[]>([]);
  const [pub, setPub] = useState<Pub[]>([]);
  const [mine, setMine] = useState<{ pub: number; priv: number; pingit: number } | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email?.split("@")[0] || "Tamu";

  const loadPosts = useCallback(async () => {
    const d = await fetch("/api/community").then((r) => r.json()).catch(() => ({ posts: [] }));
    setPosts(d.posts ?? []);
    if (d.error) setErr(d.error);
  }, []);

  useEffect(() => {
    loadPosts();
    fetch("/api/archive").then((r) => r.json()).then((d) => setPub(d.items ?? [])).catch(() => {});
  }, [loadPosts]);

  useEffect(() => {
    if (!session) return setMine(null);
    fetch("/api/manuscripts", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json()).then((d) => {
        const ms = d.manuscripts ?? [];
        setMine({ pub: ms.filter((m: { visibility: string }) => m.visibility === "public").length, priv: ms.filter((m: { visibility: string }) => m.visibility === "private").length, pingit: ms.filter((m: { is_pingit: boolean }) => m.is_pingit).length });
      }).catch(() => {});
  }, [session]);

  const send = async () => {
    if (!session) return;
    setSending(true); setErr(null);
    const res = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ body: text, author_name: name }) });
    setSending(false);
    if (!res.ok) return setErr((await res.json()).error || "Gagal mengirim.");
    setText(""); loadPosts();
  };
  const del = async (id: string) => {
    if (!session || !window.confirm("Hapus catatan ini?")) return;
    await fetch(`/api/community/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    loadPosts();
  };

  const tabBtn = (id: Tab, icon: string, label: string) => (
    <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 -mb-px ${tab === id ? "border-primary text-primary font-semibold" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
      <Icon name={icon} size={18} />{label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <section className="bg-white rounded-3xl border border-linen-line overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-terra-100 via-amberink-100 to-stone-100" />
        <div className="px-6 sm:px-8 pb-6 -mt-10 flex flex-col lg:flex-row gap-6 lg:items-end justify-between">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-serif text-4xl border-4 border-white shrink-0">{name[0]?.toUpperCase()}</div>
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amberink-700">Jaringan Kustodian Bali Dwipa</span>
              <h1 className="font-serif text-3xl text-stone-900 font-medium flex items-center gap-2">{name}{session && <Icon name="verified" size={22} className="text-primary" />}</h1>
              <p className="text-sm text-stone-600 max-w-xl mt-1">{session ? "Pengempu naskah di LontarAI. Bagikan catatan konservasi dan temuan transkripsi bersama komunitas." : "Masuk untuk membagikan catatan dan melihat statistik koleksi Anda."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {session ? <>
              <Link href="/studio" className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5"><Icon name="add_photo_alternate" size={16} /> Tambah Naskah</Link>
              <Link href="/vault" className="px-4 py-2.5 rounded-xl bg-white border border-linen-line text-xs font-semibold flex items-center gap-1.5 hover:bg-linen"><Icon name="inventory_2" size={16} /> Buka Vault</Link>
            </> : <Link href="/masuk" className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold">Masuk</Link>}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-linen-low text-center">
          {[["import_contacts", mine?.pub ?? "—", "Cakepan Terbuka"], ["lock", mine ? `${mine.pingit} Naskah` : "—", "Pingit Terproteksi"], ["library_books", mine?.priv ?? "—", "Naskah Privat"]].map(([ic, n, l]) => (
            <div key={l as string} className="py-4"><div className="font-serif text-2xl font-semibold text-stone-900">{n}</div><div className="text-xs text-stone-500 flex items-center justify-center gap-1"><Icon name={ic as string} size={14} />{l}</div></div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-linen-line px-2 flex overflow-x-auto">
            {tabBtn("linimasa", "dynamic_feed", "Linimasa Preservasi")}
            {tabBtn("katalog", "library_books", `Katalog Naskah Publik (${pub.length})`)}
            {tabBtn("jaringan", "hub", "Jaringan Banjar")}
          </div>

          {tab === "linimasa" && <>
            <div className="bg-white rounded-2xl border border-linen-line p-5">
              {session ? <>
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="Bagikan catatan konservasi atau temuan lempir lontar baru..." className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm border border-transparent focus:bg-white" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-stone-400">Catatan bersifat publik. Jangan menulis lokasi tepat naskah pingit.</span>
                  <button type="button" disabled={!text.trim() || sending} onClick={send} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-stone-300 text-white text-xs font-semibold flex items-center gap-1.5"><Icon name="send" size={15} /> Kirim</button>
                </div>
              </> : <p className="text-sm text-stone-600">Masuk untuk membagikan catatan. <Link href="/masuk" className="text-primary underline">Masuk</Link></p>}
              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            </div>
            {posts.length === 0 && <p className="text-sm text-stone-500 text-center bg-white rounded-2xl border border-linen-line p-8">Belum ada catatan. Jadilah yang pertama membagikan.</p>}
            {posts.map((p) => (
              <article key={p.id} className="bg-white rounded-2xl border border-linen-line p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif">{p.author_name[0]?.toUpperCase()}</div>
                    <div><div className="text-sm font-semibold text-stone-900">{p.author_name}</div><div className="text-xs text-stone-500 flex items-center gap-1">{ago(p.created_at)} • <Icon name="public" size={13} /> Publik</div></div>
                  </div>
                  {session?.user.id === p.user_id && <button type="button" aria-label="Hapus" onClick={() => del(p.id)} className="text-stone-400 hover:text-primary"><Icon name="delete" size={18} /></button>}
                </div>
                <p className="text-sm text-stone-800 leading-relaxed mt-3 whitespace-pre-line">{p.body}</p>
              </article>
            ))}
          </>}

          {tab === "katalog" && (pub.length === 0
            ? <p className="text-sm text-stone-500 text-center bg-white rounded-2xl border border-linen-line p-8">Belum ada naskah publik.</p>
            : <div className="grid sm:grid-cols-2 gap-4">{pub.map((m) => (
              <Link key={m.slug} href={`/archive/${m.slug}`} className="bg-white rounded-2xl border border-linen-line overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-stone-100">{m.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.image_url} alt="" className="w-full h-full object-cover" />}</div>
                <div className="p-4"><h3 className="font-serif text-lg font-semibold text-stone-900">{m.title}</h3><p className="text-xs text-stone-500">{CATEGORY_LABELS[m.category]?.split(" (")[0]} · {m.village_banjar}, {m.regency}</p></div>
              </Link>))}</div>)}

          {tab === "jaringan" && (
            <div className="bg-white rounded-2xl border border-linen-line p-6 text-sm text-stone-600">
              <h3 className="font-serif text-xl text-stone-900 mb-2">Kustodian per kabupaten</h3>
              <div className="flex flex-wrap gap-2">{Array.from(new Set(pub.map((m) => m.regency))).map((r) => <span key={r} className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs">{r} ({pub.filter((m) => m.regency === r).length})</span>)}</div>
              {pub.length === 0 && <p>Belum ada data. Jaringan terbentuk dari naskah publik.</p>}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-terra-50 border border-terra-100 rounded-2xl p-5">
            <h3 className="font-serif text-lg font-semibold text-stone-900">Punya Lontar di Banjar atau Rumah Tua Anda?</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">Foto lempir dari griya Anda, tanpa memindahkan naskah. Simpan privat atau bagikan atas keputusan sendiri.</p>
            <Link href="/studio" className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5"><Icon name="add_circle" size={16} /> Mulai Digitalisasi</Link>
          </div>
          <div className="bg-amberink-50 border border-amberink-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-amberink-700 text-xs font-semibold uppercase tracking-wider"><Icon name="gavel" size={18} /> Protokol Kesucian &amp; Hak Adat</div>
            <p className="font-serif italic text-xs text-amber-950 mt-2 leading-relaxed">Naskah berstatus pingit tidak pernah tampil di arsip publik. Hormati restu pemangku sebelum membagikan naskah sakral.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
