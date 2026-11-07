"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

// Roles live in logic only (not shown in the UI). New accounts start as "kustodian"; admin access is decided server-side (ADMIN_EMAILS).
const DEFAULT_ROLE = "kustodian" as const;

export default function MasukPage() {
  const { session, ready, configured } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/vault`, data: { role: DEFAULT_ROLE } },
    });
    setSending(false);
    if (error) setError("Gagal mengirim tautan masuk. Periksa email Anda dan coba lagi.");
    else setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-[420px]">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo LontarAI" className="w-14 h-14 rounded-2xl object-contain" />
            <span className="font-serif text-3xl text-stone-900 tracking-tight">LontarAI</span>
          </div>
          <p className="text-xs uppercase tracking-wider text-amberink-700 font-semibold mt-5">Kedaulatan Arsip Digital Naskah Lontar</p>
          <p className="font-serif italic text-stone-500 mt-2 text-lg leading-relaxed">Gerbang otentikasi naskah bersejarah, pelestarian sastra klasik, dan tata kelola brankas sakral.</p>
        </header>

        <div className="bg-white rounded-3xl shadow-[0_20px_40px_-8px_rgba(38,30,20,0.08)] border border-linen-line p-6 sm:p-8">
          {!ready ? null : !configured ? (
            <p className="text-sm text-stone-600">Layanan masuk belum dikonfigurasi di server ini.</p>
          ) : session ? (
            <div className="text-center space-y-4">
              <Icon name="verified_user" size={36} className="text-emerald-600" />
              <p className="text-sm text-stone-700">Anda sudah masuk sebagai <b>{session.user.email}</b>.</p>
              <div className="flex flex-col gap-2">
                <Link href="/vault" className="px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold">Buka Private Vault</Link>
                <Link href="/studio" className="px-5 py-3 rounded-xl bg-stone-100 text-stone-800 text-sm font-medium">Ke Studio Transkripsi</Link>
              </div>
            </div>
          ) : sent ? (
            <div className="text-center space-y-3">
              <Icon name="mark_email_read" size={36} className="text-primary" />
              <h2 className="font-serif text-xl text-stone-900">Cek email Anda</h2>
              <p className="text-sm text-stone-600">Tautan masuk dikirim ke <b>{email}</b>. Buka tautan itu di perangkat ini.</p>
              <button type="button" onClick={() => setSent(false)} className="text-xs text-primary underline">Gunakan email lain</button>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-5">
              <label className="block">
                <span className="block text-sm font-semibold text-stone-900 mb-2">Email atau ID Kustodian Krama</span>
                <div className="relative">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contoh: id.griya@krama.lontar.id"
                    className="w-full bg-stone-100 pl-4 pr-11 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white border border-transparent" />
                  <Icon name="badge" size={22} className="absolute right-3.5 top-3 text-stone-500" />
                </div>
              </label>
              <p className="text-xs text-stone-500 -mt-2">Tanpa kata sandi brankas: kami mengirim tautan masuk sekali pakai ke email Anda.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sending || !email.includes("@")}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-semibold text-base shadow-md disabled:bg-stone-300 flex items-center justify-center gap-2">
                {sending ? "Mengirim…" : "Masuk ke Studio & Brankas"} <Icon name="arrow_forward" size={20} />
              </button>
            </form>
          )}

          <div className="flex items-center gap-4 my-6 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <span className="flex-1 h-px bg-stone-200" />Opsi Masuk Cepat<span className="flex-1 h-px bg-stone-200" />
          </div>
          <Link href="/studio" className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm text-stone-800 transition-colors">
            <span>Coba Studio tanpa masuk</span>
            <span className="px-2.5 py-1 rounded-full bg-terra-100 text-amberink-800 text-[11px] font-semibold uppercase">Tamu</span>
          </Link>

          <div className="mt-6 rounded-xl bg-stone-100 p-4 flex items-start gap-3 text-stone-600 text-sm leading-snug">
            <Icon name="shield_lock" size={20} className="text-primary shrink-0" />
            <span><b className="text-stone-900">Protokol Kerahasiaan Pingit:</b> naskah bertanda sakral tidak pernah tampil di arsip publik, dan hanya pemilik yang dapat membukanya di Vault.</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-stone-100 p-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/samples/taru-pramana.jpg" alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amberink-700">Koleksi Terkini</div>
            <div className="font-serif text-xl font-semibold text-stone-900 leading-tight">Kakawin Sutasoma &amp; Usadha Pari</div>
            <div className="text-sm text-stone-500">Naskah terselamatkan di seluruh Nusantara</div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-stone-600 flex items-center justify-center gap-5">
          <Link href="/studio" className="flex items-center gap-1.5 hover:text-primary"><Icon name="support_agent" size={18} /> Bantuan Konservasi</Link>
          <Link href="/vault" className="flex items-center gap-1.5 hover:text-primary"><Icon name="menu_book" size={18} /> Panduan Kustodian</Link>
        </div>
        <p className="mt-3 text-center text-xs text-stone-500">© 2026 LontarAI · Bali DigiFest. Hak Cipta Terlindungi.</p>
      </div>
    </div>
  );
}
