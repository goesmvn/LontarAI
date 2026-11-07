export default function Footer() {
  return (
    <footer className="border-t border-terra-100 bg-terra-50 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center">
        <p className="text-terra-800 font-semibold">LontarAI</p>
        <p className="text-stone-600 text-sm mt-1">Dibuat untuk Bali DigiFest 2026 — Build with AI, Solve for Bali.</p>
        <p className="text-stone-500 text-xs mt-2">
          Hasil AI adalah draf dan bukan tafsir otoritatif. Sampel naskah: Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali.
        </p>
        <a href="/admin" className="inline-block mt-2 text-xs text-stone-400 hover:text-terra-700">Admin</a>
      </div>
    </footer>
  );
}
