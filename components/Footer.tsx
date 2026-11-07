import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-stone-200 py-10 mt-0 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span className="font-serif font-semibold text-stone-800 text-sm">LontarAI</span>
          <span>— Inisiatif Pelestarian Warisan Aksara Nusantara</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/studio" className="hover:text-stone-800 transition-colors">Pedoman Transkripsi</Link>
          <Link href="/vault" className="hover:text-stone-800 transition-colors">Etika Kustodian</Link>
          <Link href="/admin" className="hover:text-stone-800 transition-colors">Kontak Komunitas</Link>
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
