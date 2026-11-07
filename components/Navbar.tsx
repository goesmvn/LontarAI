"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

const LINKS = [
  { href: "/", label: "Overview", short: "Beranda", icon: "home", exact: true },
  { href: "/studio", label: "Studio Transkripsi", short: "Studio", icon: "document_scanner" },
  { href: "/archive", label: "Peta Sebaran", short: "Peta", icon: "explore" },
  { href: "/vault", label: "Private Vault", short: "Brankas", icon: "inventory_2" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { session, ready, configured } = useSession();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));

  return (
    <>
      <header className="sticky top-0 z-[2000] bg-white/90 backdrop-blur-md border-b border-linen-line">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif text-lg font-semibold group-hover:bg-primary transition-colors">
              ᬮ
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-serif text-xl font-semibold tracking-tight text-stone-900">LontarAI</span>
              <span className="hidden lg:block font-mono text-[10px] text-stone-500 mt-0.5">Preservasi Naskah Bali</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-linen-mid p-1 rounded-full border border-linen-line">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l) ? "page" : undefined}
                className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
                  active(l) ? "bg-primary text-white font-semibold shadow-sm" : "text-stone-600 font-medium hover:text-stone-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {ready && configured && session ? (
              <div className="flex items-center gap-2 pl-2 border-l border-linen-line">
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold" title={session.user.email ?? ""}>
                  {(session.user.email ?? "?")[0].toUpperCase()}
                </span>
                <button type="button" onClick={() => getBrowserSupabase().auth.signOut()} className="hidden sm:block text-xs text-stone-500 hover:text-primary">
                  Keluar
                </button>
              </div>
            ) : (
              <Link href="/masuk" className="px-4 py-2 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-primary transition-colors">
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[2000] bg-white/95 backdrop-blur-md border-t border-linen-line">
        <div className="flex items-center justify-around h-16">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`flex flex-col items-center justify-center w-16 h-12 ${active(l) ? "text-primary font-semibold" : "text-stone-500"}`}>
              <Icon name={l.icon} size={22} />
              <span className="text-[11px] mt-0.5">{l.short}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
