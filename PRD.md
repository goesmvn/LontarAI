# Product Requirement Document (PRD)
## LontarAI — Digital Preservation, Assisted Transliteration & Privacy-First Provenance Archive for Balinese Manuscripts

* **Kompetisi:** Bali DigiFest 2026 — AI Web Innovation Challenge
* **Tema:** *Build with AI, Solve for Bali* (Bali Smart Society & Cultural Preservation)
* **Versi:** 1.1 (pengembangan dari v1.0; v1.0 disimpan di `PRD-v1.0.md`)
* **Status implementasi:** Belum dibangun. Repositori saat ini masih berisi kode Bali Bersih (klasifikasi sampah) yang akan diganti. Checklist di §15 di-reset ke status sebenarnya.

### Ringkasan perubahan dari v1.0
| # | Perubahan | Alasan |
| :-- | :--- | :--- |
| 1 | Model data diubah: `manuscripts` (cakepan) → `leaves` (lempir) → `line_boxes` | Foto referensi menunjukkan satu cakepan terdiri dari banyak lempir dengan penomoran folio (mis. "1 B", "2 A"). Skema v1.0 hanya mendukung satu gambar per naskah. |
| 2 | Tahap baru: deteksi & potong lempir, abaikan label/stempel | Foto riil memuat label katalog, stempel instansi, dan beberapa lempir dalam satu frame. |
| 3 | Posisi AI diubah dari "otomatis akurat" menjadi **draf AI + verifikasi manusia** | Pembacaan aksara Bali oleh model umum belum terbukti andal; klaim "bebas halusinasi" di v1.0 tidak dapat dipertanggungjawabkan. |
| 4 | Privasi diperketat: koordinat publik dikaburkan ke level banjar/desa | v1.0 menyimpan dan (lewat RLS) memaparkan lat/long presisi rumah pengempu pada naskah publik. |
| 5 | Persetujuan (consent) dan status pingit eksplisit | Mengikuti dresta adat dan etika data budaya. |
| 6 | Bagian baru: evaluasi kualitas (CER/WER), risiko, NFR, skenario demo, cakupan MVP | Agar klaim terukur dan realistis untuk juri. |
| 7 | Checklist direset; inkonsistensi teknis dirapikan (satu backend, bukan "FastAPI atau Next.js") | Dokumen harus mencerminkan keadaan nyata. |

---

## 1. Executive Summary & Problem Framing

### 1.1 Masalah
* **Kerapuhan fisik:** Ratusan ribu lempir lontar (*cakepan*) tersebar di griya, puri, pura, banjar, dan koleksi pribadi. Kelembaban, jamur, serangga, dan usia mempercepat kerusakan.
* **Keterbatasan pembaca aksara:** Filolog dan pembaca aksara Bali kuno sedikit dibanding volume naskah yang belum terkatalogisasi; transliterasi satu lempir bisa memakan waktu berjam-jam.
* **Kekhawatiran pemilik:** Takut naskah rusak jika dipindahkan, disalahgunakan, atau bersifat sakral/*pingit* sehingga tidak boleh dibuka umum menurut dresta.
* **Fragmentasi data:** Tidak ada repositori yang memetakan sebaran naskah tanpa mengorbankan privasi pemilik.

### 1.2 Solusi
LontarAI adalah platform web yang membantu **mendigitalkan, membaca (draf), dan memetakan** naskah lontar dengan tiga pilar:
1. **Studio Transkripsi:** pipeline computer vision + model vision-language yang menghasilkan *draf* transkripsi dan transliterasi, selalu bisa dikoreksi manusia.
2. **Provenance Archive:** katalog dengan riwayat kepemilikan, kondisi fisik, dan lokasi.
3. **Privacy-first Sharing:** Private Vault secara default, publikasi opt-in, status pingit, dan lokasi publik yang dikaburkan.

### 1.3 Value Proposition
* **Peneliti/kurator:** draf transliterasi dalam hitungan detik sebagai titik awal, bukan pengganti ahli.
* **Pengempu naskah:** pelestarian mandiri tanpa memindahkan naskah fisik; kendali penuh atas siapa yang boleh melihat.
* **Generasi muda:** akses edukasi budaya berbasis peta untuk naskah yang dibuka pemiliknya.

### 1.4 Prinsip Produk
1. **Human-in-the-loop:** AI memberi draf dengan skor keyakinan; manusia memverifikasi.
2. **Jujur soal ketidakpastian:** bagian yang tidak terbaca ditandai, bukan ditebak.
3. **Private by default:** tidak ada data tampil publik tanpa persetujuan eksplisit.
4. **Hormati dresta:** naskah pingit tidak pernah muncul di API, peta, atau indeks pencarian publik.

---

## 2. Referensi Naskah & Implikasi Desain

Foto referensi: lempir lontar koleksi *Krakah Sanggaraha*, Pusat Dokumentasi Dinas Kebudayaan Provinsi Bali. Karakteristik yang teramati dan implikasinya (isi aksara tidak dibaca atau diklaim di dokumen ini):

| Temuan pada foto | Implikasi pada produk |
| :--- | :--- |
| Dua lempir dalam satu foto, masing-masing berlabel folio (**1 B**, **2 A**) dengan tag plastik | Perlu **deteksi & pemotongan per lempir** serta penyimpanan **folio label** (nomor + sisi A/B). |
| Lempir berbentuk strip memanjang (rasio sekitar 15:1) | Viewer harus mendukung pan horizontal dan zoom; OCR dijalankan pada **potongan (tile)**, bukan satu gambar utuh yang di-resize kecil. |
| Teks tersusun dalam sekitar 4 baris, terbagi dua blok kiri/kanan oleh lubang pengikat di tengah | Segmentasi baris harus menangani **lubang tengah** (bukan aksara) dan urutan baca blok kiri lalu kanan. |
| Lubang di kedua ujung dan tengah | Deteksi lubang sebagai *non-text region*. |
| Stempel instansi dan label kertas berisi judul koleksi | Masking area non-naskah; **ekstraksi metadata dari label** sebagai saran pengisian form. |
| Lempir cokelat keemasan, aksara digores tipis berwarna gelap | Uji binarisasi adaptif (Sauvola); denoise terlalu agresif dapat menghilangkan goresan tipis. |
| Foto sekitar 1400 px lebar untuk dua lempir | Resolusi efektif per lempir rendah; sistem **memperingatkan** jika resolusi di bawah ambang dan menyarankan foto per lempir. |

**Aksi:** foto ini dijadikan Sample 1 *hanya setelah izin tertulis* dari Dinas Kebudayaan Provinsi Bali (lihat §10 dan R6).

---

## 3. Target User Personas

| Persona | Kebutuhan | Pain point | Peran |
| :--- | :--- | :--- | :--- |
| **Ida Bagus, pengempu naskah griya** | Mengarsipkan puluhan cakepan warisan; tidak mendalami aksara kuno; protektif | Takut penyalahgunaan; naskah berjamur | Pengguna Private Vault; menentukan status pingit dan consent |
| **Kadek, mahasiswa sastra Bali / peneliti** | Transkripsi cepat dan pencarian teks Usada/Babad | Tinta pudar, transliterasi manual lambat | Pengguna Studio + Explorer; mengoreksi dan memberi sitasi |
| **Ni Luh, kurator/arsiparis dinas** *(baru)* | Mengkatalogkan koleksi lembaga dengan banyak lempir | Penomoran folio, metadata konsisten | Pengguna katalog multi-lempir, verifikator |
| **Juri kompetisi** | MVP yang berfungsi, arsitektur jelas, etika data | Bosan dengan "wrapper API" | Mencoba demo 1-klik, membaca laporan evaluasi |

---

## 4. Functional Requirements

Prioritas: **P0** = wajib MVP, **P1** = diusahakan, **P2** = roadmap.

### 4.1 Modul 1 — Transcription Studio
| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| FR-1.1 | Unggah PNG/JPG/WebP maks 10 MB (drag-and-drop & kamera mobile); validasi tipe, ukuran, dimensi minimum di server | P0 |
| FR-1.2 | 3 sampel 1-klik (bersih, pudar, retak) dengan keterangan sumber dan izin | P0 |
| FR-1.3 | **Deteksi lempir:** potong otomatis tiap lempir dari foto multi-lempir; pengguna dapat menyesuaikan kotak manual | P1 |
| FR-1.4 | Preprocessing interaktif: grayscale + denoise (bilateral), Sauvola/adaptive threshold, deskew; toggle Original / Enhanced; parameter dapat diatur | P0 (threshold + toggle), P1 (deskew otomatis) |
| FR-1.5 | Deteksi baris + bounding box, termasuk penanganan lubang pengikat dan stempel sebagai area non-teks | P1 |
| FR-1.6 | Transkripsi aksara Bali ke Unicode (blok U+1B00–U+1B7F) **per baris**, dengan skor keyakinan per baris; karakter tak terbaca ditandai `[?]` | P0 |
| FR-1.7 | Transliterasi Latin, terjemahan Indonesia dan Inggris, kategori (usada/wariga/tattwa/babad/kidung/lainnya), ringkasan makna 2–3 kalimat; semua berlabel **"Draf AI"** | P0 |
| FR-1.8 | **Verifikasi side-by-side:** gambar beranotasi (kiri) vs teks editable (kanan); klik baris menyorot kotak pada gambar dan sebaliknya | P0 |
| FR-1.9 | Setiap koreksi disimpan sebagai revisi (siapa, kapan, apa); status: `draf_ai` → `dikoreksi` → `terverifikasi` | P1 |
| FR-1.10 | Penanganan kegagalan: timeout/rate limit/model menolak → pesan jelas, tombol coba lagi, dan mode input manual | P0 |
| FR-1.11 | Pencarian teks pada transliterasi tersimpan | P2 |

### 4.2 Modul 2 — Provenance & Geolocation
| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| FR-2.1 | Form metadata cakepan: judul, pemilik/pengempu, afiliasi (griya/puri/pura/banjar/pribadi/lembaga), perkiraan era, kondisi fisik, jumlah lempir, bahasa | P0 |
| FR-2.2 | Metadata per lempir: folio label (nomor + sisi A/B), kondisi, catatan | P1 |
| FR-2.3 | Lokasi: ekstraksi EXIF GPS bila ada (dengan peringatan bahwa EXIF dapat membocorkan lokasi rumah), atau map picker Leaflet sampai level banjar/desa adat | P0 |
| FR-2.4 | Saran pengisian metadata dari label pada foto (judul koleksi, instansi) yang harus dikonfirmasi pengguna | P2 |

### 4.3 Modul 3 — Privacy & Archive
| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| FR-3.1 | Visibilitas: `private` (default), `public`, dan flag `pingit` yang **mengunci ke private** kecuali pemilik mencabutnya sendiri | P0 |
| FR-3.2 | Publikasi membutuhkan **consent eksplisit** (apa yang akan tampil, dapat dicabut kapan saja) dan pilihan field yang ditampilkan (nama pemilik boleh disembunyikan) | P0 |
| FR-3.3 | **Pengaburan lokasi publik:** koordinat publik dibulatkan/dijitter ke centroid banjar/desa (≥ 1 km); koordinat presisi hanya terlihat oleh pemilik | P0 |
| FR-3.4 | Tautan unik `/archive/:slug` untuk naskah publik; slug acak, bukan judul + lokasi | P1 |
| FR-3.5 | Ekspor 1 klik: JSON terstruktur (P0) dan PDF sertifikat preservasi (P1); ekspor pemilik menyertakan data presisi, ekspor publik tidak | P0/P1 |
| FR-3.6 | Pemilik dapat mencabut publikasi dan menghapus naskah beserta berkas gambar (penghapusan sungguhan) | P0 |
| FR-3.7 | Autentikasi Supabase (magic link). Demo juri tersedia tanpa login melalui sampel | P0 |

### 4.4 Modul 4 — Public Heritage Explorer
| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| FR-4.1 | Peta Bali dengan kluster naskah publik (jumlah per kabupaten/desa) | P1 |
| FR-4.2 | Filter kategori, era, kabupaten; pencarian judul | P1 |
| FR-4.3 | Modal pratinjau: gambar, transliterasi, status verifikasi, atribusi pemilik (jika diizinkan) | P1 |
| FR-4.4 | Statistik beranda dihitung dari data nyata; tidak ada angka karangan | P1 |

---

## 5. Non-Functional Requirements

| Aspek | Target |
| :--- | :--- |
| Latensi | Preprocessing < 1 detik untuk gambar ≤ 10 MP; inferensi AI per lempir target p50 < 8 detik, p95 < 20 detik, dengan progres per tahap. Klaim "< 4 detik" di v1.0 dihapus karena tidak realistis untuk model vision pada gambar resolusi tinggi. |
| Keandalan | Demo sampel tetap jalan bila API AI down, memakai hasil pra-hitung (*cached*) yang ditandai jelas sebagai contoh |
| Keamanan | Secret hanya di env server; validasi input; rate limit per IP dan per user; RLS di semua tabel; bucket privat memakai signed URL berumur pendek |
| Privasi | Data pengguna tidak dipakai melatih model; vendor AI dikonfigurasi tanpa retensi bila memungkinkan; dinyatakan di kebijakan privasi |
| Aksesibilitas | Kontras WCAG AA, navigasi keyboard di studio, font aksara Bali (Noto Sans Balinese) dengan fallback |
| Responsif | Studio dapat dipakai di mobile (tab, bukan split) |
| Biaya | Kuota AI per user/hari untuk mencegah tagihan membengkak |

---

## 6. Arsitektur Teknis

```text
Client (Next.js 14 App Router, Tailwind, Shadcn UI, React-Leaflet)
  - Studio: viewer zoom/pan, toggle filter, overlay bounding box, editor teks
  - Explorer: peta kluster, filter, modal
  - Canvas preprocessing ringan (grayscale, threshold) untuk pratinjau
        │ HTTPS
        ▼
Next.js Route Handlers (satu backend, TypeScript)
  - /api/studio/analyze   : validasi → preprocess → VLM → validasi skema
  - /api/manuscripts      : CRUD (auth, RLS)
  - /api/archive          : data publik (kolom aman, lokasi dikaburkan)
  - rate limiter, validator, signed URL
        │                         │
        ▼                         ▼
 CV Service (opsional, P1)     Supabase
 Python + OpenCV (Sauvola,     - Postgres + RLS
 deskew, deteksi lempir/baris) - Storage: bucket private & public
 dipanggil via HTTP            - Auth
```

Keputusan:
* **Satu backend utama** (Next.js route handlers). Layanan Python/OpenCV hanya untuk langkah CV yang tidak praktis di JS; bila waktu terbatas, MVP memakai threshold berbasis canvas dan melewatkan deteksi lempir otomatis.
* **Model AI di belakang antarmuka provider** (`lib/ai/provider.ts`) agar dapat ditukar (Claude/Gemini/OpenAI) dan dibandingkan pada set evaluasi (§9).
* Output model **divalidasi dengan Zod**; respons tidak valid memicu satu kali retry lalu fallback ke mode manual.

### 6.1 Pipeline Analisis (per lempir)
1. **Validasi** tipe, ukuran, dimensi, resolusi minimum (peringatan bila rendah).
2. **Deteksi lempir** (P1) → potong; abaikan label dan stempel.
3. **Normalisasi:** deskew, koreksi kontras.
4. **Segmentasi baris** + masking lubang (P1). MVP: satu potongan per lempir dengan *tiling* horizontal bertumpuk bila terlalu panjang.
5. **Transkripsi VLM** per baris/tile → Unicode Bali + keyakinan per baris.
6. **Pasca-proses:** normalisasi Unicode (NFC), validasi karakter berada di blok Bali, tandai urutan karakter yang janggal secara ortografis.
7. **Transliterasi, terjemahan, kategori, ringkasan** (panggilan kedua).
8. **Simpan sebagai `draf_ai`**; tampilkan di editor verifikasi.

---

## 7. Database Schema & Keamanan

### 7.1 Tabel
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  organization_type TEXT CHECK (organization_type IN
    ('griya','puri','pura','banjar','akademisi','lembaga','perorangan')),
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satu cakepan (kumpulan lempir)
CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,                    -- acak, untuk URL publik
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('usada','wariga','babad','tattwa','kidung','lainnya')),
  physical_condition TEXT CHECK (physical_condition IN
    ('baik','rapuh','rusak_sebagian','fragmentaris')),
  owner_name TEXT NOT NULL,
  affiliation TEXT,
  custodian_notes TEXT,
  estimated_creation_era TEXT,
  collection_source TEXT,

  -- Lokasi presisi (hanya pemilik) dan lokasi publik (dikaburkan)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  public_latitude DOUBLE PRECISION,
  public_longitude DOUBLE PRECISION,
  regency TEXT NOT NULL,
  village_banjar TEXT NOT NULL,

  -- Privasi & consent
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  is_pingit BOOLEAN NOT NULL DEFAULT FALSE,
  consent_public_at TIMESTAMPTZ,
  show_owner_name BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (NOT (is_pingit AND visibility = 'public')),
  CHECK (visibility = 'private' OR consent_public_at IS NOT NULL),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satu lempir (folio) dalam cakepan
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  folio_number INT,
  folio_side TEXT CHECK (folio_side IN ('A','B')),
  original_image_path TEXT NOT NULL,            -- path storage, bukan URL publik
  processed_image_path TEXT,
  image_width INT, image_height INT,
  condition_notes TEXT,
  transcription_status TEXT NOT NULL DEFAULT 'draf_ai'
    CHECK (transcription_status IN ('draf_ai','dikoreksi','terverifikasi')),
  unicode_transcription TEXT,
  latin_transliteration TEXT,
  translation_id TEXT,
  translation_en TEXT,
  philosophical_context TEXT,
  confidence_score REAL,
  model_name TEXT, model_version TEXT, prompt_version TEXT,
  UNIQUE (manuscript_id, folio_number, folio_side)
);

CREATE TABLE line_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaf_id UUID NOT NULL REFERENCES leaves(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  block TEXT CHECK (block IN ('kiri','kanan','penuh')),
  x REAL, y REAL, w REAL, h REAL,               -- relatif 0..1
  unicode_text TEXT, latin_text TEXT, confidence REAL
);

CREATE TABLE transcription_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaf_id UUID NOT NULL REFERENCES leaves(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES profiles(id),
  field TEXT NOT NULL, old_value TEXT, new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 RLS dan akses publik
```sql
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_revisions ENABLE ROW LEVEL SECURITY;

-- Pemilik: akses penuh ke datanya sendiri
CREATE POLICY own_manuscripts ON manuscripts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Leaves/line_boxes/revisions mengikuti kepemilikan manuscript induk
CREATE POLICY own_leaves ON leaves FOR ALL USING (
  EXISTS (SELECT 1 FROM manuscripts m WHERE m.id = manuscript_id AND m.user_id = auth.uid()));
-- (kebijakan serupa untuk line_boxes dan transcription_revisions)
```
**Akses publik tidak membaca tabel dasar.** Publik hanya membaca lewat **view/RPC** yang mengekspos kolom aman:
```sql
CREATE VIEW public_manuscripts AS
SELECT slug, title, category, estimated_creation_era, regency, village_banjar,
       public_latitude AS latitude, public_longitude AS longitude,
       CASE WHEN show_owner_name THEN owner_name END AS owner_name
FROM manuscripts
WHERE visibility = 'public' AND is_pingit = FALSE;
```
Alasan: kebijakan `SELECT USING (visibility='public')` pada tabel dasar (v1.0) membocorkan kolom presisi (`latitude/longitude`, `custodian_notes`). View menyaring kolom, dan lokasi publik diisi di sisi server saat publikasi.

### 7.3 Storage
* Bucket `vault` (private): semua gambar default; akses via signed URL.
* Bucket `archive` (public): salinan gambar **hanya** setelah publikasi, dihapus otomatis saat dicabut.
* EXIF (termasuk GPS) dibuang dari salinan publik.

---

## 8. Spesifikasi AI & Output Terstruktur

### 8.1 Kontrak output (divalidasi Zod)
```json
{
  "status": "success",
  "data": {
    "category": "usada",
    "script_metadata": { "language": "Kawi/Bali", "reading_direction": "left-to-right", "line_count": 4 },
    "lines": [
      { "index": 1, "block": "kiri", "unicode": "...", "latin": "...", "confidence": 0.62,
        "uncertain_spans": [{ "start": 12, "end": 15 }] }
    ],
    "unicode_transcription": "...",
    "latin_transliteration": "...",
    "translation": { "indonesian": "...", "english": "..." },
    "philosophical_context": "...",
    "confidence_score": 0.62,
    "warnings": ["Resolusi rendah", "Sebagian baris pudar"]
  }
}
```
`confidence_score` adalah **estimasi model + heuristik**, bukan probabilitas terkalibrasi; UI menampilkannya sebagai pita (Tinggi/Sedang/Rendah) berlabel "perkiraan".

### 8.2 Aturan prompt
* Peran: asisten filologi aksara Bali; **dilarang mengarang** bagian tak terbaca, wajib memakai `[?]` dan menurunkan keyakinan.
* Transliterasi mengikuti satu pedoman baku yang dipilih tim dan didokumentasikan di repo. Daftar diakritik di v1.0 (Tedung disebut dua kali) dikoreksi sesuai rujukan (mis. tedung, taleng, ulu, suku, cecek, surang, bisah, adeg-adeg).
* Few-shot hanya dari sampel berizin yang telah diverifikasi ahli.
* Terjemahan dan ringkasan diberi label interpretasi AI, bukan tafsir otoritatif; untuk usada ditambahkan peringatan bahwa isi tidak boleh dipakai sebagai saran medis.

---

## 9. Evaluasi Kualitas

Tanpa pengukuran, klaim teknis lemah. Rencana minimum:

1. **Set uji:** 20–30 lempir (termasuk 3 sampel demo) dengan transkripsi acuan dari ahli/dosen sastra Bali.
2. **Metrik:** Character Error Rate (CER) dan Word Error Rate pada transkripsi Unicode dan transliterasi; ketepatan penandaan `[?]`; waktu rata-rata per lempir.
3. **Perbandingan:** (a) VLM tanpa preprocessing, (b) VLM + preprocessing, (c) provider berbeda. Hasil dilaporkan jujur di README, termasuk kegagalan.
4. **Positioning:** tidak ada klaim "akurat" di UI, hanya "draf AI". Jika CER tinggi, positioning bergeser ke alat bantu baca + verifikasi, bukan OCR otomatis.
5. **Validasi pakar:** minta minimal satu ahli menilai 5 hasil; kutip dengan izin.

---

## 10. Etika, Hukum & Tata Kelola Data

* **Izin foto referensi:** gambar Krakah Sanggaraha memuat stempel dan label Dinas Kebudayaan Provinsi Bali. Minta izin tertulis sebelum dipakai sebagai sampel publik atau materi demo; cantumkan atribusi.
* **Dresta & pingit:** pengguna menentukan status pingit; sistem default private dan tidak membuat naskah pingit dapat diindeks atau diakses publik.
* **Hak kekayaan intelektual:** pengguna menyatakan berhak mengunggah; ada mekanisme laporan dan takedown.
* **Kebijakan data:** retensi, hak hapus, tidak ada pelatihan model dari data pengguna, daftar vendor pemroses (penyedia AI, Supabase).
* **Kepatuhan:** selaraskan dengan UU Pelindungan Data Pribadi (data pemilik dan lokasi rumah termasuk data pribadi).
* **Pelabelan AI:** setiap keluaran AI diberi label dan versi model.

---

## 11. UI/UX Blueprint

1. **Beranda:** estetika bersih dengan aksen terakota/emas Bali, dark/light mode; hero "Preserve Ancient Wisdom with Modern Vision AI"; metrik **dari data nyata** (tampilkan keadaan kosong yang elegan, bukan angka rekaan); CTA "Coba sampel" dan "Mulai arsipkan".
2. **Studio:**
   * Bar atas: Sampel cepat (Usada Gianyar, Babad Klungkung, Wariga Karangasem) + Unggah.
   * Kiri: viewer zoom/pan untuk strip panjang (scroll horizontal), toggle Original/Enhanced, overlay baris yang dapat diklik, penanda lubang/stempel.
   * Kanan: tab [Transliterasi Latin] [Aksara Bali] [Terjemahan & Konteks] [Metadata & Privasi]; badge "Draf AI", pita keyakinan, baris tak pasti disorot.
   * Bar bawah: pilih visibilitas (Private/Publik/Pingit), consent, "Simpan ke Arsip", "Ekspor".
   * Mobile: tab menggantikan split view.
3. **Peta publik:** layar penuh, kluster, kartu pratinjau dengan nama banjar dan kutipan transliterasi; lokasi tampil sebagai area, bukan titik rumah.
4. **Skenario demo juri (3 menit):** pilih Sampel 1 → lihat Enhanced → klik baris → koreksi satu kata → simpan Private → ubah ke Publik (consent + lokasi dikaburkan) → buka peta → ekspor JSON.

---

## 12. Keselarasan dengan Kriteria Penjurian

| Kriteria | Implementasi | Bukti yang disiapkan |
| :--- | :--- | :--- |
| AI & kedalaman teknis (25%) | Pipeline multi-tahap + validasi skema + evaluasi CER | Laporan evaluasi, diagram pipeline, kode `lib/ai` |
| Fungsionalitas & keandalan (25%) | Demo sampel yang selalu jalan (cache), fallback error, progres per tahap | Demo clean-start, uji e2e sampel |
| Relevansi & dampak (15%) | Pelestarian lontar Bali yang rapuh | Data masalah + kutipan pakar/lembaga |
| Inovasi (15%) | Draf AI + verifikasi manusia, Private Vault, lokasi dikaburkan, pingit | Demo alur privasi |
| UX/UI & aksesibilitas (10%) | Studio side-by-side, mobile, WCAG AA | Screenshot, audit Lighthouse |
| Skalabilitas & keamanan (10%) | RLS + view publik, signed URL, rate limit | SQL RLS, uji akses anonim |

Klaim v1.0 bahwa "Google Lens tidak memahami aksara Bali pada lontar" dihapus kecuali diverifikasi lewat uji nyata.

---

## 13. Risiko & Mitigasi

| ID | Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- | :--- |
| R1 | Model umum salah membaca aksara Bali / halusinasi | Hasil menyesatkan | Draf AI + verifikasi manusia, `[?]`, evaluasi CER, label jelas |
| R2 | Resolusi rendah / lempir sangat panjang | OCR buruk | Peringatan resolusi, tiling, saran foto per lempir |
| R3 | Kebocoran lokasi/pemilik | Pelanggaran privasi & adat | View publik, lokasi dikaburkan, buang EXIF, signed URL, uji akses anonim |
| R4 | Naskah pingit terunggah publik | Pelanggaran dresta | Default private, flag pingit mengunci, consent eksplisit |
| R5 | Biaya/latensi API | Demo gagal | Cache sampel, kuota, timeout + fallback |
| R6 | Hak atas foto referensi | Masalah izin | Izin tertulis Dinas, atau foto sendiri/berlisensi terbuka |
| R7 | Cakupan terlalu luas untuk waktu hackathon | MVP tidak selesai | Prioritas P0/P1/P2, potong P2 |
| R8 | Terjemahan/ringkasan dianggap otoritatif atau saran medis | Salah informasi | Label interpretasi AI, disclaimer usada |

---

## 14. Cakupan MVP (P0) vs Roadmap

**MVP (wajib untuk submission):** FR-1.1, 1.2, 1.4 (threshold + toggle), 1.6, 1.7, 1.8, 1.10; FR-2.1, 2.3; FR-3.1, 3.2, 3.3, 3.5 (JSON), 3.6, 3.7; skema DB + RLS + view publik; evaluasi mini (≥ 10 lempir); README, `.env.example`, demo.

**Berikutnya (P1):** deteksi lempir/baris, deskew, revisi dan status verifikasi, peta kluster + filter, PDF sertifikat, multi-lempir per cakepan.

**Roadmap (P2):** pencarian teks penuh, saran metadata dari label, kolaborasi verifikator, model OCR khusus aksara Bali yang di-fine-tune dari data terverifikasi (dengan consent), integrasi dengan arsip dinas.

---

## 15. Status Implementasi (reset)

Status per 2026-11-07: MVP P0 sebagian besar sudah ada (lihat centang di bawah); belum diuji dengan kunci AI/Supabase sungguhan. Repositori berisi Bali Bersih (Next.js 14, Supabase, Leaflet, OpenAI) dengan fondasi yang dapat dipakai ulang: struktur App Router, Tailwind, Leaflet, helper Supabase, serta validasi dan rate limit di `lib/validation.ts`.

### Sprint 1 — Fondasi & data
- [x] Pivot repo ke LontarAI (kode Bali Bersih dihapus)
- [ ] Setup Shadcn UI, tema Bali, dark/light mode, font aksara Bali
- [ ] Izin dan persiapan 3 sampel + hasil acuan
- [x] Skema Supabase + RLS + view publik + bucket (`supabase/schema.sql`)

### Sprint 2 — Studio & AI
- [x] Skema Zod + prompt v1 (provider OpenAI; antarmuka multi-provider belum)
- [x] Endpoint `/api/studio/analyze` dengan validasi, rate limit, fallback
- [x] Viewer strip + preprocessing canvas (Sauvola) — overlay baris belum
- [x] Editor side-by-side + badge Draf AI

### Sprint 3 — Arsip, privasi, peta
- [x] Auth (magic link), form provenance, map picker
- [x] Alur publikasi (consent, pingit, lokasi dikaburkan, buang EXIF)
- [x] Peta publik + filter, ekspor JSON, cetak/PDF (via cetak browser); admin panel + laporan masyarakat

### Sprint 4 — Evaluasi & penyerahan
- [ ] Set uji + laporan CER (skrip siap: `scripts/eval.mjs`, `scripts/run-eval.mjs`; data acuan belum ada)
- [ ] Uji keamanan: akses anonim ke data privat/pingit harus gagal
- [ ] README (template Lampiran B), `.env.example`, video demo, tag `v1.0-submission`
