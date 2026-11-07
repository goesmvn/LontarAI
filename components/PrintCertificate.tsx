import type { AnalysisResult } from "@/lib/ai/schema";
import type { ExportMeta } from "@/lib/export";

/** Hidden on screen; shown only when printing (Cetak / Simpan sebagai PDF). */
export default function PrintCertificate({
  image, meta, analysis, edited,
}: { image: string; meta: ExportMeta; analysis: AnalysisResult; edited: boolean }) {
  return (
    <div className="print-area hidden">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Sertifikat Digital Preservasi Naskah Lontar</h1>
      <p style={{ fontSize: 12, color: "#555" }}>LontarAI · dicetak {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
      <hr style={{ margin: "12px 0" }} />
      <table style={{ fontSize: 13, marginBottom: 12 }}>
        <tbody>
          {([["Judul", meta.title], ["Pemilik/pengempu", meta.owner], ["Lokasi (area)", [meta.village_banjar, meta.regency].filter(Boolean).join(", ")],
            ["Perkiraan era", meta.era], ["Sumber", meta.source], ["Rumpun", analysis.category],
            ["Status", edited ? "Dikoreksi manusia" : "Draf AI (belum diverifikasi)"]] as const)
            .filter(([, v]) => v)
            .map(([k, v]) => <tr key={k}><td style={{ paddingRight: 16, color: "#555" }}>{k}</td><td>{v}</td></tr>)}
        </tbody>
      </table>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" style={{ width: "100%", border: "1px solid #ccc" }} />
      <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>Aksara Bali</h2>
      <p className="font-bali" style={{ whiteSpace: "pre-line", fontSize: 16 }}>{analysis.unicode_transcription}</p>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>Transliterasi</h2>
      <p style={{ whiteSpace: "pre-line", fontSize: 13 }}>{analysis.latin_transliteration}</p>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>Terjemahan</h2>
      <p style={{ whiteSpace: "pre-line", fontSize: 13 }}>{analysis.translation.indonesian}</p>
      <p style={{ fontSize: 11, color: "#777", marginTop: 16 }}>
        Dokumen ini memuat hasil draf AI ({analysis.model}) dan bukan tafsir otoritatif. Verifikasi oleh pembaca aksara Bali diperlukan sebelum dipakai sebagai rujukan.
      </p>
    </div>
  );
}
