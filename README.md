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

## Belum ada (lihat PRD §14)
Deteksi otomatis lempir/baris, deskew, Sauvola di server, ekspor PDF, status "terverifikasi", multi-lempir per cakepan, evaluasi CER. Peningkatan kontras di Studio hanya filter pratinjau.

## Menjalankan
```bash
npm install
cp .env.example .env.local   # isi OPENAI_API_KEY dan kunci Supabase
npm run dev                  # http://localhost:3000
```
Supabase: jalankan [supabase/schema.sql](supabase/schema.sql), buat bucket `vault` (private) dan `archive` (public), aktifkan Email auth (magic link) dan tambahkan URL aplikasi ke Redirect URLs.

Tanpa `OPENAI_API_KEY`, Studio menampilkan pesan dan mode isi manual. Tanpa Supabase, simpan dinonaktifkan.

## Catatan jujur
- Kemampuan model umum membaca aksara Bali belum terbukti andal. Semua hasil berlabel **Draf AI**; evaluasi CER terencana (PRD §9).

## Kredit
Sampel naskah: Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali (dipakai dengan izin). Next.js, Tailwind CSS, Supabase, Leaflet/OpenStreetMap, OpenAI API, Zod.
