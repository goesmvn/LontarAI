import { CATEGORY_LABELS } from "@/lib/regencies";
import ReportButton from "./ReportButton";
import type { ArchiveItem } from "./ArchiveMap";

const STATUS: Record<string, string> = {
  terverifikasi: "Terverifikasi",
  dikoreksi: "Dikoreksi manusia",
  draf_ai: "Draf AI, belum diverifikasi",
};

export default function ManuscriptDetail({ item }: { item: ArchiveItem }) {
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image_url} alt={item.title} className="w-full rounded-lg" />
      <p className="text-xs text-stone-500">
        {CATEGORY_LABELS[item.category]} · Area {item.village_banjar}, {item.regency}
        {item.owner_name ? ` · Pengempu: ${item.owner_name}` : ""}
        {item.estimated_creation_era ? ` · ${item.estimated_creation_era}` : ""}
      </p>
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${item.transcription_status === "terverifikasi" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
        {STATUS[item.transcription_status] ?? STATUS.draf_ai}
      </span>
      {item.unicode_transcription && (
        <div><h3 className="font-semibold text-sm">Aksara Bali</h3>
          <p className="font-bali text-lg text-stone-800 whitespace-pre-line">{item.unicode_transcription}</p></div>
      )}
      {item.latin_transliteration && (
        <div><h3 className="font-semibold text-sm">Transliterasi</h3>
          <p className="text-sm text-stone-700 whitespace-pre-line">{item.latin_transliteration}</p></div>
      )}
      {item.translation_id && (
        <div><h3 className="font-semibold text-sm">Terjemahan</h3>
          <p className="text-sm text-stone-700 whitespace-pre-line">{item.translation_id}</p></div>
      )}
      <ReportButton slug={item.slug} />
    </div>
  );
}
