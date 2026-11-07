# Evaluasi kualitas (PRD §9)

1. Taruh foto lempir di `eval/images/` (mis. `usada-01.jpg`).
2. Buat transkripsi acuan dari ahli di `eval/refs/usada-01.json`:
   ```json
   { "unicode_transcription": "ᬑᬁ…", "latin_transliteration": "Ong awighnamastu…" }
   ```
3. Jalankan server (`npm run dev`), lalu:
   ```bash
   node scripts/run-eval.mjs http://localhost:3000   # simpan prediksi ke eval/preds/
   node scripts/eval.mjs                              # hitung CER/WER
   ```
Hasil ekspor JSON dari Studio (setelah dikoreksi ahli) juga dapat dipakai sebagai referensi.
Catat hasil per konfigurasi (gambar asli vs Enhanced, model berbeda) di README utama, termasuk kegagalan.

## Temuan uji pembacaan aksara oleh model umum (7 Nov 2026)

Uji kecil (bukan evaluasi formal): satu baris aksara **cetak** (font Noto Sans Balinese) "ong awighnamastu nihan katuturan usadha".
- Claude Opus 5.5 tanpa bantuan: dua kata pertama benar, sisanya dikarang. Fable 5.1: seluruhnya dikarang (teks tidak berhubungan).
- Opus 5.5 + tabel rujukan glif + izin menandai `[?]`: kata pertama benar, sisanya keliru atau `[?]`; hasil antar-run konsisten. Effort tinggi tidak lebih baik dari rendah (2,5x lebih lambat).
- Lontar tulisan tangan lebih sulit daripada teks cetak, jadi akurasi nyata lebih rendah dari angka di atas.

Kesimpulan: model bahasa umum tidak dapat membaca aksara Bali dengan andal. Fitur "Baca Baris (AI, draf)" memakai tabel rujukan, tiga pembacaan per baris,
dan hanya mempertahankan bagian yang konsisten (sisanya `[?]`; baris dengan konsistensi < 30% dikosongkan). Ini membantu sebagai draf, bukan pengganti
pembaca aksara. Peningkatan sungguhan membutuhkan model baris-ke-teks yang dilatih pada data lontar (lihat docs/REFERENSI.md).
