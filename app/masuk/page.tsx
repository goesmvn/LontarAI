"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

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
      options: { emailRedirectTo: `${window.location.origin}/vault` },
    });
    setSending(false);
    if (error) setError("Gagal mengirim tautan masuk. Periksa email Anda dan coba lagi.");
    else setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md relative">
        <header className="text-center mb-8">
          <span className="w-12 h-12 mx-auto rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif text-2xl mb-3">ᬮ</span>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">Masuk ke LontarAI</h1>
          <p className="text-xs uppercase tracking-wider text-amberink-700 font-semibold mt-1">Brankas & studio pribadi Anda</p>
          <p className="font-serif italic text-stone-500 mt-2">Tanpa kata sandi. Kami kirim tautan masuk ke email Anda.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-xl border border-linen-line p-6 sm:p-8">
          {!ready ? null : !configured ? (
            <p className="text-sm text-stone-600">Layanan masuk belum dikonfigurasi di server ini.</p>
          ) : session ? (
            <div className="text-center space-y-4">
              <Icon name="verified_user" size={36} className="text-emerald-600" />
              <p className="text-sm text-stone-700">Anda sudah masuk sebagai <b>{session.user.email}</b>.</p>
              <div className="flex flex-col gap-2">
                <Link href="/vault" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">Buka Private Vault</Link>
                <Link href="/studio" className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-800 text-sm font-medium">Ke Studio Transkripsi</Link>
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
            <form onSubmit={send} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold text-stone-800 mb-1.5">Alamat email</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.com"
                  className="w-full bg-linen-low px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white border border-transparent" />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sending || !email.includes("@")}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-semibold text-sm shadow-md disabled:bg-stone-300 flex items-center justify-center gap-2">
                {sending ? "Mengirim…" : "Kirim tautan masuk"} <Icon name="arrow_forward" size={18} />
              </button>
            </form>
          )}
          <div className="mt-6 rounded-lg bg-linen-low p-3 flex items-start gap-2.5 text-stone-600 text-xs leading-snug">
            <Icon name="shield_lock" size={18} className="text-primary shrink-0" />
            <span><b className="text-stone-800">Privasi:</b> naskah Anda privat secara default. Hanya Anda yang dapat membukanya kecuali Anda sendiri memilih membagikannya ke arsip publik.</span>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-stone-500">
          Hanya ingin mencoba? <Link href="/studio" className="text-primary underline">Studio dapat dipakai tanpa masuk</Link>; masuk hanya diperlukan untuk menyimpan.
        </p>
      </div>
    </div>
  );
}
