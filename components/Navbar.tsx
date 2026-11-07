"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

const LINKS = [
  { href: "/", label: "Overview", short: "Beranda", icon: "home", exact: true },
  { href: "/studio", label: "Studio Transkripsi", short: "Studio", icon: "document_scanner" },
  { href: "/batch", label: "Batch Scan", short: "Batch", icon: "photo_library" },
  { href: "/archive", label: "Peta Sebaran", short: "Peta", icon: "explore" },
  { href: "/komunitas", label: "Komunitas", short: "Komunitas", icon: "diversity_3" },
  { href: "/vault", label: "Private Vault", short: "Brankas", icon: "inventory_2" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { session, ready, configured } = useSession();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));

  return (
    <>
      <header className="sticky top-0 z-[2000] bg-[rgba(250,248,245,0.85)] backdrop-blur-[8px] border-b border-stone-200">
        <div className="h-16 w-full px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo LontarAI" className="w-10 h-10 rounded-xl object-contain" />
              <span className="font-serif text-2xl font-semibold tracking-tight text-stone-900">LontarAI</span>
            </Link>
            <span className="hidden 2xl:inline whitespace-nowrap px-2.5 py-1 rounded-full bg-terra-100 text-primary text-xs font-medium">Bali DigiFest 2026</span>
            <span className="hidden 2xl:inline border-l border-stone-200 pl-3 font-mono text-[11px] text-stone-500">Aksara Epigraphic Platform</span>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5 bg-stone-100 p-1 rounded-full border border-stone-200">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l) ? "page" : undefined}
                className={`px-3 py-1.5 whitespace-nowrap rounded-full text-[13px] transition-colors ${
                  active(l) ? "bg-primary text-white font-medium shadow-sm" : "text-stone-600 font-medium hover:text-stone-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button aria-label="Notifikasi" className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors" type="button">
              <Icon name="notifications" size={20} />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-stone-200">
              {ready && configured && session ? (
                <>
                  <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold ring-2 ring-stone-100" title={session.user.email ?? ""}>
                    {(session.user.email ?? "?")[0].toUpperCase()}
                  </span>
                  <div className="hidden lg:flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-stone-900 max-w-[140px] truncate">{session.user.email}</span>
                    <button type="button" onClick={() => getBrowserSupabase().auth.signOut()} className="text-left font-mono text-[11px] text-stone-500 hover:text-primary">Keluar</button>
                  </div>
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/samples/avatar.jpg" alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-stone-100" />
                  <Link href="/masuk" className="hidden lg:flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-stone-900">Tamu</span>
                    <span className="font-mono text-[11px] text-stone-500">Masuk akun</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[2000] bg-[rgba(250,248,245,0.9)] backdrop-blur-[8px] border-t border-stone-200">
        <div className="flex items-center justify-around h-16">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`flex flex-col items-center justify-center w-14 h-12 ${active(l) ? "text-primary font-semibold" : "text-stone-500"}`}>
              <Icon name={l.icon} size={22} />
              <span className="text-[11px] mt-0.5">{l.short}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
