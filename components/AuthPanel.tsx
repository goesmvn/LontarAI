"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

export default function AuthPanel() {
  const { session, ready, configured } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;
  if (!configured) {
    return <p className="text-sm text-stone-500">Penyimpanan belum dikonfigurasi di server ini.</p>;
  }
  if (session) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-600 truncate">Masuk sebagai {session.user.email}</span>
        <button type="button" onClick={() => getBrowserSupabase().auth.signOut()} className="text-primary hover:underline shrink-0">
          Keluar
        </button>
      </div>
    );
  }

  const send = async () => {
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setError("Gagal mengirim tautan masuk.");
    else setSent(true);
  };

  return (
    <div className="rounded-2xl bg-amberink-50 border border-amberink-200 p-4 space-y-2">
      <p className="text-sm text-stone-700">Masuk dengan email untuk menyimpan naskah. Tidak perlu kata sandi; kami kirim tautan masuk.</p>
      {sent ? (
        <p className="text-sm text-emerald-700">Tautan masuk dikirim ke {email}. Buka email Anda.</p>
      ) : (
        <div className="flex gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm" />
          <button type="button" onClick={send} disabled={!email.includes("@")}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:bg-stone-300">Kirim</button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
