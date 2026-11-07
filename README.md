# Bali Bersih

## Description

Bali Bersih adalah aplikasi web berbasis AI yang membantu masyarakat Bali mengelola sampah dengan lebih baik. Pengguna dapat memotret sampah dan mendapatkan klasifikasi AI ke dalam 6 kategori yang relevan untuk Bali, lengkap dengan panduan pembuangan yang tepat. Aplikasi ini juga dilengkapi dengan peta pelaporan sampah liar (illegal dumping) berbasis lokasi, dengan opsi penandaan zona sensitif (pantai, sungai, tempat suci) yang terinspirasi dari filosofi Sad Kerthi dan Tri Hita Karana.

## Problem & Target User

Bali menghadapi krisis sampah yang serius: kurangnya pemilahan sampah di tingkat rumah tangga, penumpukan sampah liar di sungai dan pantai, serta minimnya akses informasi tentang cara pembuangan yang benar. Masalah ini diperburuk oleh volume sampah dari aktivitas pariwisata yang tinggi.

**Target user:** Rumah tangga, wisatawan, dan pengelola sampah tingkat banjar (komunitas adat) di seluruh Bali.

## Key Features

1. **Klasifikasi Sampah AI** — Foto sampah → AI mengklasifikasikan ke 6 kategori (organik, plastik, kertas, logam & kaca, B3, residu) dengan panduan pembuangan spesifik untuk konteks Bali.
2. **Panduan Sampah** — Halaman referensi 6 kategori sampah dengan deskripsi dan instruksi pembuangan.
3. **Lapor Sampah Liar** — Form pelaporan penumpukan sampah dengan foto, lokasi GPS, dan opsi zona sensitif (pantai/sungai/tempat suci).
4. **Peta Laporan** — Peta interaktif menampilkan lokasi laporan sampah liar dengan status (dilaporkan/sedang ditangani/selesai).

## Tech Stack

- **Frontend & Backend:** Next.js 14.2.35 (App Router, React 18, TypeScript)
- **Styling:** Tailwind CSS 3.4
- **AI:** OpenAI GPT-4o-mini (vision) — klasifikasi gambar sampah via API
- **Database & Storage:** Supabase (PostgreSQL + Storage untuk foto laporan)
- **Map:** Leaflet + react-leaflet 4 + OpenStreetMap tiles
- **Hosting:** Vercel
- **Language:** Bahasa Indonesia

## AI Implementation

**Model/API:** OpenAI GPT-4o-mini dengan kemampuan vision (multimodal).

**Fungsi:** Klasifikasi sampah berdasarkan foto menjadi salah satu dari 6 kategori yang relevan untuk Bali, dengan output panduan pembuangan dan tips ramah lingkungan yang dikontekstualisasikan dengan filosofi Bali (Tri Hita Karana, Sad Kerthi).

**Input:** Gambar sampah (base64 data URL, di-resize ke max 1024×1024 JPEG di client-side).

**Output:** JSON terstruktur dengan field:
- `category` — id kategori (organik/plastik/kertas/logam_kaca/b3/residu/none)
- `categoryName` — nama lengkap kategori
- `itemName` — nama item yang terdeteksi
- `recyclable` — boolean apakah bisa didaur ulang
- `disposalInstructions` — cara pembuangan untuk konteks Bali (sebutkan bank sampah/TPS/TPA/tempat khusus)
- `ecoTip` — tips ramah lingkungan yang relevan dengan konteks Bali
- `confidence` — tingkat keyakinan (high/medium/low)

**Endpoint:** `POST /api/classify` — menerima `{ image: string }`, memanggil OpenAI API dengan system prompt yang berisi definisi 6 kategori dan konteks filosofi Bali, mengembalikan `{ success: true, data: ClassificationResult }`.

**Alasan AI diperlukan:** Klasifikasi sampah dari foto membutuhkan computer vision yang tidak dapat dilakukan dengan aturan statis. AI mengenali jenis material, memberikan konteks pembuangan yang spesifik, dan menghasilkan tips yang dinamis — kemampuan yang tidak mungkin dilakukan tanpa AI.

## Architecture / Data Flow

**Klasifikasi AI:**
```
User → Frontend (ambil foto, resize via canvas) → POST /api/classify
→ OpenAI GPT-4o-mini Vision API (system prompt + image)
→ JSON result (category, disposalInstructions, ecoTip)
→ Display di ClassificationResult component
```

**Laporan Sampah:**
```
User → Form (foto + geolocation + zona sensitif)
→ POST /api/reports → Supabase Storage (upload foto)
→ Supabase DB (insert row) → Response 201
→ Laporan tampil di /laporan (Leaflet map dengan marker)
```

## Installation / Run Instructions

```bash
# 1. Clone repository
git clone https://github.com/goesmvn/Bali-Bersih.git
cd Bali-Bersih

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in:
#   OPENAI_API_KEY=your-openai-api-key
#   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 4. Run development server
npm run dev
# App runs at http://localhost:3000
```

**Supabase Setup:**
1. Create a free project at supabase.com
2. Run this SQL in the SQL Editor:
```sql
CREATE TABLE waste_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  description TEXT,
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'reported',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON waste_reports FOR SELECT USING (true);
CREATE POLICY "Public insert" ON waste_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON waste_reports FOR UPDATE USING (true);
```
3. Create a public storage bucket named `report-photos`
4. Copy Project URL and anon key from Settings → API to `.env.local`

## Recent Improvements

- Server-side validation: image format/size (JPEG/PNG/WebP, max 4MB), coordinates restricted to Bali, description max 500 chars.
- Basic per-IP rate limiting (best-effort, in-memory) on `/api/classify` and `/api/reports`.
- Classification output is normalized before being returned to the client.
- Report map: status filter and sensitive-zone badge in popups.
- Local classification history (last 10, stored in the browser only).

## Deployment URL

_(Fill after Vercel deployment)_

## Known Limitations

- **No authentication:** MVP does not have user login. Reports are anonymous (civic reporting model).
- **Indonesian-only UI:** All interface text is in Bahasa Indonesia. No English/Balinese toggle.
- **AI accuracy:** Classification accuracy depends on photo quality, lighting, and angle. Unusual items may be misclassified.
- **Report map:** Limited to Supabase free tier (500MB DB, 1GB storage). No moderation of reported content.
- **No real-time updates:** Report map requires page refresh to see new reports.
- **Geolocation:** Requires user to grant browser location permission.

## Third-party Resources / Credits

- **OpenAI** — GPT-4o-mini vision API for waste classification
- **Supabase** — PostgreSQL database and storage for reports
- **Leaflet** — Open-source JavaScript library for interactive maps
- **react-leaflet** — React components for Leaflet
- **OpenStreetMap** — Map tile data
- **Tailwind CSS** — Utility-first CSS framework
- **create-next-app** — Next.js project scaffolding
- **Geist** — Font family (bundled with Next.js)

Filosofi konteks Bali (Sad Kerthi, Tri Hita Karana) diadopsi dari Peraturan Daerah Provinsi Bali Nomor 2 Tahun 2023 tentang Rencana Tata Ruang Wilayah Provinsi Bali 2023-2043.

## Team Members

_(Fill with team member names and roles)_
