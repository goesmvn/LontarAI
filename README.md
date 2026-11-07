# LontarAI

Platform web untuk **mendigitalkan, membaca (draf AI), dan mengarsipkan naskah lontar Bali**, dengan pilihan simpan **Private Vault** atau **Arsip Publik** oleh masyarakat. Dibuat untuk Bali DigiFest 2026 (Build with AI, Solve for Bali). Spesifikasi lengkap: [PRD.md](PRD.md).

## Fitur yang sudah ada
- **Studio Transkripsi:** unggah foto lempir (atau pakai sampel Krakah Sanggaraha) → draf aksara Bali Unicode, transliterasi, terjemahan ID/EN, kategori, dan konteks. Hasil per baris dapat dikoreksi; baris ragu diberi penanda dan `[?]`.
- **Simpan privat atau publik:**
  - *Private Vault* (default): hanya pemilik.
  - *Arsip Publik*: butuh persetujuan eksplisit; lokasi dibulatkan ke area ±1 km; nama pemilik opsional.
  - *Pingit*: kunci permanen ke privat, tidak pernah tampil publik.
  - Dari Vault, naskah dapat dipublikasikan, dicabut, atau dihapus permanen (gambar ikut terhapus).
- **Arsip Publik:** peta + daftar, filter rumpun/kabupaten, pencarian judul, modal pratinjau.
- **Keamanan:** akses publik hanya lewat view `public_manuscripts` (kolom aman), RLS untuk pemilik, bucket `vault` privat dan `archive` publik, EXIF dibuang di klien, validasi server, rate limit.

## Panel Admin (`/admin`)
Akses: email yang terdaftar di `ADMIN_EMAILS` (pisahkan koma) + `SUPABASE_SERVICE_ROLE_KEY` di server (jangan pernah ke klien). Fitur: ringkasan statistik, daftar naskah **publik** (tandai terverifikasi, turunkan ke Vault pemiliknya), dan antrean laporan masyarakat (pingit, isi keliru, hak/izin). Isi Private Vault tidak pernah dibaca admin; hanya jumlahnya.

Masyarakat dapat melaporkan naskah publik lewat tombol "Laporkan naskah ini"; naskah punya halaman tautan `/archive/:slug`. Beranda menampilkan statistik nyata.

## Preprocessing & ekspor
- **Enhanced (Sauvola):** binarisasi adaptif di browser (tanpa dependensi); bisa dipakai untuk pratinjau dan **analisis ulang** agar gambar asli vs Enhanced dapat dibandingkan.
- **Unduh JSON** (skema `lontarai.leaf/1`, tanpa koordinat presisi) dan **Cetak / Simpan PDF** (sertifikat preservasi lewat dialog cetak browser).
- **Evaluasi:** `node scripts/run-eval.mjs` lalu `node scripts/eval.mjs` menghitung CER/WER terhadap acuan ahli; lihat [eval/README.md](eval/README.md).

## Belum ada (lihat PRD §14)
Deteksi otomatis lempir/baris, deskew, tiling untuk strip sangat panjang, multi-lempir per cakepan, data acuan dan hasil evaluasi CER.

## Menjalankan
```bash
npm install
cp .env.example .env.local   # isi ANTHROPIC_API_KEY dan kunci Supabase
node --env-file=.env.local scripts/check-setup.mjs   # cek kunci, tabel, RLS, bucket
npm run dev                  # http://localhost:3000
```
AI: default **Claude** (`claude-opus-5-5`, streaming, effort `high`, fallback server-side). Ganti model lewat `LONTAR_AI_MODEL`; OpenAI tersedia sebagai alternatif dengan `AI_PROVIDER=openai`.

Supabase: jalankan [supabase/schema.sql](supabase/schema.sql), buat bucket `vault` (private) dan `archive` (public), aktifkan Email auth (magic link) dan tambahkan URL aplikasi ke Redirect URLs.

Tanpa `ANTHROPIC_API_KEY`, Studio menampilkan pesan dan mode isi manual. Tanpa Supabase, simpan dinonaktifkan.

## Catatan jujur
- Kemampuan model umum membaca aksara Bali belum terbukti andal. Semua hasil berlabel **Draf AI**; evaluasi CER terencana (PRD §9).

## Kredit
Sampel naskah: Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali (dipakai dengan izin). Next.js, Tailwind CSS, Supabase, Leaflet/OpenStreetMap, Claude API (Anthropic), Zod.
