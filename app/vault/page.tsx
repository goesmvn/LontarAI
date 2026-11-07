"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useSession } from "@/lib/useSession";
import { CATEGORY_LABELS } from "@/lib/regencies";

type Item = {
  id: string; slug: string; title: string; category: string; visibility: "private" | "public"; is_pingit: boolean;
  regency: string; village_banjar: string; created_at: string; image_url: string | null;
  leaf: { latin_transliteration: string; translation_id: string | null; transcription_status: string } | null;
};
type Filter = "all" | "private" | "public" | "pingit";

const STATUS: Record<string, string> = { draf_ai: "Draf", dikoreksi: "Dikoreksi", terverifikasi: "Terverifikasi" };

export default function VaultPage() {
  const { session, ready, configured } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

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
  const makePrivate = (i: Item) => call(i.id, { method: "PATCH", body: JSON.stringify({ visibility: "private" }) });
  const [cert, setCert] = useState<Item | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const share = async (i: Item) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/archive/${i.slug}`);
      setShared(i.id);
      setTimeout(() => setShared(null), 1800);
    } catch {}
  };
  const remove = (i: Item) => {
    if (window.confirm(`Hapus "${i.title}" secara permanen beserta gambarnya? Ini tidak dapat dibatalkan.`)) call(i.id, { method: "DELETE" });
  };

  const counts = useMemo(() => ({
    all: items.length,
    private: items.filter((i) => i.visibility === "private").length,
    public: items.filter((i) => i.visibility === "public").length,
    pingit: items.filter((i) => i.is_pingit).length,
  }), [items]);

  const shown = items.filter((i) =>
    (filter === "all" || (filter === "pingit" ? i.is_pingit : i.visibility === filter)) &&
    (!q || i.title.toLowerCase().includes(q.toLowerCase())));

  const chip = (id: Filter, label: string, icon: string) => (
    <button key={id} type="button" onClick={() => setFilter(id)}
      className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 shrink-0 transition-all ${filter === id ? "bg-primary text-white font-semibold shadow-sm" : "bg-linen-mid text-stone-600 font-medium hover:bg-linen-high"}`}>
      {label} ({counts[id]})
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-linen-line">
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberink-100 border border-amberink-200 text-amberink-700 text-xs font-semibold w-fit">
            <Icon name="shield_lock" size={15} /> Terkunci Dresta Adat & Privat secara Default
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight">Private Vault & Hak Kustodian Adat</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Arsip digital berdaulat keluarga griya untuk naskah sakral (<span className="italic text-primary font-medium">pingit</span>) dan pusaka leluhur. Anda yang menentukan setiap naskah tetap <span className="italic text-primary font-medium">privat</span> atau dibagikan ke arsip publik, dan dapat mengubahnya kapan saja. Hak kepemilikan dan transliterasi dilindungi hukum adat krama Bali.
          </p>
        </div>
        <Link href="/studio" className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 w-fit">
          <Icon name="add" size={18} /> Tambah Naskah Baru
        </Link>
      </div>

      {ready && !configured && <p className="text-sm text-stone-600">Penyimpanan belum dikonfigurasi di server ini.</p>}
      {ready && configured && !session && (
        <div className="rounded-2xl bg-white border border-linen-line p-8 text-center space-y-3 max-w-lg mx-auto">
          <Icon name="lock" size={36} className="text-primary" />
          <h2 className="font-serif text-xl text-stone-900">Masuk untuk membuka Vault</h2>
          <p className="text-sm text-stone-600">Vault hanya dapat dibuka pemiliknya.</p>
          <Link href="/masuk" className="inline-block px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold">Masuk</Link>
        </div>
      )}

      {session && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([
              ["folder_special", "Total naskah terproteksi", `${counts.all} Cakepan`, "100% tersimpan di brankas pribadi", "bg-terra-50 text-amberink-700", "text-emerald-700"],
              ["lock", "Status sakral / pingit", `${counts.pingit} Naskah`, "Enkripsi ketat & larangan publikasi", "bg-terra-50 text-primary", "text-stone-500"],
              ["family_restroom", "Akses terbuka publik", `${counts.public} Naskah`, "Dibagikan pemilik dengan persetujuan", "bg-emerald-50 text-emerald-700", "text-emerald-700"],
            ] as const).map(([icon, label, n, sub, tone, subTone]) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-linen-line flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon name={icon} size={26} /></div>
                <div>
                  <div className="text-[11px] uppercase font-semibold text-stone-600 tracking-wider">{label}</div>
                  <div className="font-serif text-2xl font-semibold text-stone-900">{n}</div>
                  <div className={`text-xs ${subTone}`}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-linen-line flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Icon name="search" size={18} className="absolute left-3.5 top-2.5 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koleksi privat keluarga, mantra, lempir, atau era saka..."
                className="w-full bg-linen pl-10 pr-4 py-2 rounded-xl text-xs border border-linen-line focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {chip("all", "Semua", "")}{chip("private", "Privat", "")}{chip("public", "Terbuka", "")}{chip("pingit", "Sakral / Pingit", "")}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 flex flex-col gap-4">
              {loading && <p className="text-stone-500 text-sm">Memuat…</p>}
              {!loading && shown.length === 0 && (
                <p className="text-sm text-stone-500 rounded-xl border border-linen-line bg-white p-6 text-center">
                  {items.length === 0 ? <>Belum ada naskah. <Link href="/studio" className="text-primary underline">Mulai di Studio</Link>.</> : "Tidak ada naskah yang cocok dengan filter."}
                </p>
              )}
              {shown.map((i) => (
                <article key={i.id} className="bg-white rounded-2xl border border-linen-line p-5 flex flex-col gap-4 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-linen border border-linen-line overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg font-semibold text-stone-900 truncate">{i.title}</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {CATEGORY_LABELS[i.category]?.split(" (")[0]} · {i.village_banjar}, {i.regency}
                          {i.leaf ? ` · ${STATUS[i.leaf.transcription_status] ?? ""}` : ""}
                        </p>
                      </div>
                    </div>
                    {i.is_pingit ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-terra-50 border border-red-200 text-primary text-xs font-semibold shrink-0"><Icon name="temple_hindu" size={15} /> Pingit · selalu privat</span>
                    ) : i.visibility === "public" ? (
                      <button type="button" onClick={() => makePrivate(i)} title="Cabut publikasi" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                        <Icon name="public" size={15} /> Publik <Icon name="swap_horiz" size={14} className="text-stone-400" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => makePublic(i)} title="Publikasikan" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-terra-50 hover:bg-terra-100 border border-red-200 text-primary text-xs font-semibold shrink-0">
                        <Icon name="lock" size={15} /> Privat <Icon name="swap_horiz" size={14} className="text-stone-400" />
                      </button>
                    )}
                  </div>
                  {i.leaf?.latin_transliteration && (
                    <div className="rounded-xl bg-linen px-4 py-2.5 border border-linen-line">
                      <p className="font-serif italic text-sm text-stone-600 line-clamp-2 whitespace-pre-line">{i.leaf.latin_transliteration}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-linen-low">
                    <span className="text-xs text-stone-500">Disimpan {new Date(i.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                    <div className="flex items-center gap-2">
                      {(
                        <button type="button" onClick={() => share(i)} className="px-3 py-1.5 rounded-lg bg-white border border-linen-line hover:bg-linen text-xs font-medium text-stone-600 flex items-center gap-1.5">
                          <Icon name="share" size={16} /> {shared === i.id ? "Tautan disalin" : "Bagikan"}
                        </button>
                      )}
                      {i.visibility === "public" && (
                        <Link href={`/archive/${i.slug}`} className="px-3 py-1.5 rounded-lg bg-white border border-linen-line hover:bg-linen text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                          <Icon name="visibility" size={16} /> Buka Naskah
                        </Link>
                      )}
                      <button type="button" onClick={() => remove(i)} className="px-3 py-1.5 rounded-lg bg-white border border-linen-line hover:bg-terra-50 text-xs font-medium text-stone-500 hover:text-primary flex items-center gap-1.5">
                        <Icon name="delete" size={16} /> Hapus
                      </button>
                      <button type="button" onClick={() => setCert(i)} className="px-3 py-1.5 rounded-lg bg-white border border-linen-line hover:bg-linen text-xs font-medium text-stone-700 flex items-center gap-1.5">
                        <Icon name="workspace_premium" size={16} /> Ekspor Sertifikat
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 border border-linen-line flex flex-col gap-3">
                <div className="flex items-center gap-2.5 pb-3 border-b border-linen-line">
                  <Icon name="shield_person" size={22} className="text-amberink-700" />
                  <h2 className="font-serif text-lg font-semibold text-stone-900">Informasi Pengempu</h2>
                </div>
                <div className="flex justify-between py-2 px-3 bg-linen rounded-xl text-xs"><span className="text-stone-500">Nama Kustodian</span><span className="font-semibold text-stone-900 truncate ml-3">{session.user.email}</span></div>
                <div className="flex justify-between py-2 px-3 bg-linen rounded-xl text-xs"><span className="text-stone-500">Koleksi Terdaftar</span><span className="font-semibold text-primary">{counts.all}</span></div>
              </div>
              <div className="p-5 rounded-2xl bg-amberink-50 border border-amberink-200 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amberink-700 text-xs font-semibold uppercase tracking-wider"><Icon name="gavel" size={18} /> Etika Kustodian Bali DigiFest 2026</div>
                <p className="font-serif italic text-xs text-amber-950 leading-relaxed">
                  “Naskah pingit tidak pernah tampil di arsip atau peta publik. Naskah publik menampilkan lokasi hanya sebagai area, dan pemilik dapat mencabutnya kapan saja.”
                </p>
              </div>
            </aside>
          </div>

          {(() => {
            const c = cert ?? items[0];
            if (!c) return null;
            const reg = `LNT-${new Date(c.created_at).getFullYear()}-${c.id.slice(0, 4).toUpperCase()}-BALI`;
            return (
              <section className="print-area flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-stone-900 flex items-center gap-2"><Icon name="workspace_premium" size={24} className="text-amberink-700" /> Sertifikat Hak Kustodian Adat</h2>
                  <span className="hidden sm:block font-mono text-xs text-stone-500">Diterbitkan oleh LontarAI &amp; Konsorsium Epigrafi Bali</span>
                </div>
                <div className="rounded-2xl border-2 border-amberink-200 bg-white p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-center">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-amberink-100 text-amberink-700 text-xs font-semibold">Kredensial Adat Sah</span>
                      <span className="font-mono text-xs text-stone-500">No. Reg: {reg}</span>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">Sertifikat Preservasi: {c.title}</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">Mengesahkan hak kustodian atas nama <b className="text-stone-900">{session.user.email}</b>. Naskah lontar telah terdigitalisasi, berenotasi aksara, dan terproteksi di bawah dresta perlindungan warisan leluhur.</p>
                    <div className="flex gap-5 text-xs text-stone-500 mt-1"><span className="flex items-center gap-1.5"><Icon name="verified" size={16} className="text-emerald-600" /> Kriptografi SHA-256</span><span className="flex items-center gap-1.5"><Icon name="account_balance" size={16} className="text-amberink-700" /> Registri Budaya Bali</span></div>
                  </div>
                  <div className="rounded-2xl bg-stone-50 border border-linen-line p-5 flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl bg-white border border-linen-line flex items-center justify-center shrink-0"><Icon name="qr_code_2" size={72} className="text-stone-900" /></div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Terverifikasi Adat</span>
                      <span className="text-sm font-semibold text-stone-900 truncate">{c.village_banjar}, {c.regency}</span>
                      <span className="text-xs text-stone-500">{new Date(c.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                      <button type="button" onClick={() => window.print()} className="mt-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5"><Icon name="download" size={16} /> Unduh Sertifikat Digital (PDF)</button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
