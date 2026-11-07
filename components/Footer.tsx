import Link from "next/link";
import Icon from "./Icon";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-stone-200 py-8 mt-12 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span className="font-serif font-semibold text-stone-800 text-sm">LontarAI</span>
          <span>— Pelestarian naskah lontar Bali · Bali DigiFest 2026</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-1"><Icon name="lock" size={15} className="text-emerald-600" /> Privat secara default</span>
          <span>Hasil AI adalah draf, bukan tafsir otoritatif</span>
          <Link href="/admin" className="text-stone-400 hover:text-primary">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
