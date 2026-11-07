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

## Tolok ukur strategi pembacaan (7 Nov 2026, baris aksara CETAK dengan kunci jawaban)

6 baris uji (font Noto Sans Balinese, latar menyerupai daun, sedikit blur), 1 pembacaan per baris, Opus 5.5 effort rendah.
CER = jarak edit karakter Latin (tanpa spasi, diakritik, dan tanda [?]) / panjang kunci. Makin kecil makin baik.

| Strategi | CER |
|---|---|
| Tanpa tabel rujukan | 0,52 |
| Tabel rujukan dasar | 0,18 |
| Tabel rujukan lengkap (gantungan, vokal, tanda) | 0,14 |
| Tabel lengkap + 4 contoh bergambar dengan jawaban | **0,12** |

Strategi terakhir dipakai di `/api/studio/read-lines` (2 pembacaan per ubin, konsensus, prefix di-cache).
Catatan: ini teks cetak, bukan tulisan tangan di lontar; akurasi lontar nyata jauh lebih rendah (pada foto lontar uji, baris pertama
terbaca plausibel, baris lain konsistensi 13-39%). Enam baris adalah sampel kecil. Langkah berikutnya yang paling berdampak: ganti contoh
bergambar dari font dengan potongan lontar nyata yang sudah disetujui (data latih), supaya jurang domain mengecil.

## Pipeline karakter -> kata -> Latin (7 Nov 2026, teks cetak, 12 baris)

Urutan baru di Studio ("Cek dengan AI"): (1) segmentasi kluster aksara per baris (`lib/glyphs.ts`), (2) pembacaan tiap kluster lewat potongan
berkotak bernomor + tabel rujukan + 3 contoh (`/api/studio/read-glyphs`), (3) perangkaian kata dengan kamus awal (`lib/lexicon.ts`),
(4) tulis aksara Unicode lalu Latin. CER (makin kecil makin baik):

| Cara membaca karakter | CER kalimat lama (kata ada di kamus) | CER kata di luar kamus |
|---|---|---|
| Tiap karakter dipotong dan dibaca TERPISAH (lembar sel) | 0,49 | 0,44 |
| Kotak bernomor di atas baris (konteks baris tetap) | 0,28 | 0,25 |
| + 3 contoh bergambar | 0,15 | 0,25 |
| + perangkaian kamus | **0,12** | 0,24 |

Temuan: segmentasi karakter akurat pada teks cetak (12 kotak untuk 12 karakter), tetapi model umum jauh lebih buruk bila tiap karakter
dibaca terpisah tanpa konteks. Kamus membantu bila kata ada di dalamnya dan hampir netral untuk kata di luar kamus; ia kadang
"mengoreksi" menjadi kata yang benar tetapi keliru (mis. "pinaka" -> "rahina"), karena itu bagian yang dikoreksi kamus ditandai.
`SEED_WORDS` adalah daftar awal buatan sendiri, bukan kamus resmi; perlu ditinjau ahli dan dapat diperluas lewat `public/lexicon/extra.json`.
Belum diuji pada foto lontar nyata dengan pipeline ini (kredit API habis saat pengujian); akurasi lontar tulisan tangan diperkirakan jauh lebih rendah.
