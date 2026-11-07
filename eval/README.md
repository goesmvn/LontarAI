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
