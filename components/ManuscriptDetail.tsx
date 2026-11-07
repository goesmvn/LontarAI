import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/regencies";
import ReportButton from "./ReportButton";
import Icon from "./Icon";
import type { ArchiveItem } from "./ArchiveMap";

const STATUS: Record<string, [string, string]> = {
  terverifikasi: ["Terverifikasi", "text-emerald-700"],
  dikoreksi: ["Dikoreksi manusia", "text-amberink-700"],
  draf_ai: ["Draf, belum diverifikasi", "text-stone-600"],
};

export default function ManuscriptDetail({ item }: { item: ArchiveItem }) {
  const st = STATUS[item.transcription_status] ?? STATUS.draf_ai;
  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url} alt={item.title} className="w-full h-auto block" />
        {item.estimated_creation_era && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 font-mono text-xs text-stone-900">{item.estimated_creation_era}</span>
        )}
      </div>

      {(item.unicode_transcription || item.latin_transliteration) && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Transkripsi Aksara Bali</span>
            <span className={`font-mono text-[11px] uppercase ${st[1]}`}>{st[0]}</span>
          </div>
          {item.unicode_transcription && <p className="font-bali text-2xl text-stone-900 leading-loose whitespace-pre-line">{item.unicode_transcription}</p>}
          {item.latin_transliteration && <p className="font-serif italic text-stone-600 border-t border-stone-200 pt-3 whitespace-pre-line">{item.latin_transliteration}</p>}
        </div>
      )}

      {item.translation_id && <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{item.translation_id}</p>}

      <dl className="grid grid-cols-2 gap-4 text-sm border-t border-stone-200 pt-4">
        <div><dt className="text-stone-500">Rumpun:</dt><dd className="font-medium text-stone-900">{CATEGORY_LABELS[item.category]?.split(" (")[0]}</dd></div>
        <div><dt className="text-stone-500">Akses Publik:</dt><dd className="font-medium text-emerald-700">Dibagikan pemilik</dd></div>
        <div><dt className="text-stone-500">Area:</dt><dd className="font-medium text-stone-900">{item.village_banjar}, {item.regency}</dd></div>
        {item.owner_name && <div><dt className="text-stone-500">Pengempu:</dt><dd className="font-medium text-stone-900">{item.owner_name}</dd></div>}
      </dl>

      <Link href="/studio" className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold flex items-center justify-center gap-2">
        <Icon name="menu_book" size={18} /> Buka di Studio Transkripsi
      </Link>
      <ReportButton slug={item.slug} />
    </div>
  );
}
