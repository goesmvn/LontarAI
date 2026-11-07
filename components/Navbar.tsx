"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/archive", label: "Arsip" },
  { href: "/vault", label: "Vault" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-[2000] bg-white/90 backdrop-blur border-b border-terra-100">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-terra-800">
          <span className="text-xl">📜</span><span>LontarAI</span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname.startsWith(l.href) ? "bg-terra-600 text-white" : "text-stone-600 hover:bg-terra-50 hover:text-terra-800"}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
