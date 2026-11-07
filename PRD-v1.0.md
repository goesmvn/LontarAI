# Product Requirement Document (PRD)
## Project: LontarAI — Digital Preservation, Intelligent Transliteration, & Hyperlocal Provenance Engine for Balinese Manuscripts

* **Target Kompetisi:** Bali DigiFest 2026 — AI Web Innovation Challenge
* **Tema:** *Build with AI, Solve for Bali* (Kategori: Bali Smart Society & Cultural Preservation)
* **Status Dokumen:** Version 1.0 (Production & Hackathon Roadmap)
* **Target Audience Juri:** Tech-savvy / Milenial (Menilai arsitektur clean, fungsionalitas riil, UX modern, dan etika data budaya)

---

## 1. Executive Summary & Problem Framing

### 1.1 Latar Belakang & Masalah Riil (Problem Statement)
* **Kerapuhan Fisik & Ancaman Kepunahan:** Terdapat ratusan ribu lembaran naskah lontar (*cakepan*) kuno yang tersebar di griya, banjar adat, pura, dan koleksi perseorangan di Bali. Faktor kelembaban, jamur, serangga, dan usia membuat naskah mengalami degradasi fisik yang cepat.
* **Keterbatasan Ahli Paleografi:** Jumlah filolog dan pembaca aksara Bali kuno sangat terbatas dibandingkan volume naskah yang belum terkatalogisasi. Proses membaca dan mentransliterasi satu lempir naskah lapuk membutuhkan waktu berjam-jam secara manual.
* **Ketakutan Kehilangan Hak Cipta & Naskah Sakral (*Pingit*):** Banyak pemilik enggan menyerahkan atau mempublikasikan naskah karena kekhawatiran naskah fisik rusak saat dibawa, atau naskah tersebut bersifat sakral/esoteris (*kadiatmikan*) yang tidak boleh dibuka untuk umum menurut *dresta* adat Bali.
* **Fragmentasi Data:** Belum adanya repositori digital terdesentralisasi yang mencatat metadata geolokasi sebaran naskah di seluruh pulau Bali tanpa mengorbankan privasi pemilik naskah.

### 1.2 Solusi Produk: LontarAI
LontarAI adalah platform web terpadu yang memadukan **Computer Vision (Adaptive Preprocessing & OCR Aksara Bali)**, **Multimodal LLM Reasoning (Transliterasi Latin, Terjemahan, & Konteks Filosofis)**, serta **Hyperlocal Provenance Archive (Peta Sebaran Interaktif dengan Granular Privacy Control: Public vs. Private Vault)**.

### 1.3 Value Proposition
1. **Bagi Kurator/Peneliti:** Memangkas waktu transkripsi dari hitungan jam menjadi hitungan detik per lempir naskah.
2. **Bagi Pemilik Naskah (Griya/Banjar):** Preservasi mandiri tanpa memindahkan naskah fisik, dengan kendali penuh apakah naskah ingin diarsipkan privat atau dibagikan ke repositori publik.
3. **Bagi Generasi Muda & Budayawan:** Akses repositori edukasi budaya interaktif berbasis peta wilayah Bali.

---

## 2. Target User Personas

| Persona | Profil & Kebutuhan | Pain Point Utama | Peran dalam LontarAI |
| :--- | :--- | :--- | :--- |
| **Ida Bagus (Pengempu Naskah Griya)** | Memiliki puluhan cakepan lontar warisan leluhur; tidak paham aksara kuno secara mendalam; protektif terhadap privasi keluarga. | Takut naskah disalahgunakan orang asing; naskah mulai lapuk dan berjamur. | Pengguna Private Vault (Menyimpan arsip digital terenkripsi untuk keluarga). |
| **Kadek (Mahasiswa Sastra Bali / Peneliti)** | Aktif meneliti naskah Usada (pengobatan tradisional) dan Babad; membutuhkan transkripsi cepat dan pencarian teks. | Kesulitan membaca naskah dengan kontras tinta pudar; proses transliterasi manual lambat. | Pengguna Studio Transkripsi & Public Explorer untuk sitasi riset. |
| **Juri Kompetisi (Tech-Savvy / Milenial)** | Menilai MVP fungsional, arsitektur kode, reliabilitas inferensi AI, dan kepatuhan data etis. | Bosan dengan "ChatGPT wrapper" tanpa logic pipeline nyata; butuh demo instan yang anti-gagal. | Penguji fungsionalitas via 1-Click Demo Samples & Technical Verification. |

---

## 3. Product Features & Functional Requirements

### 3.1 Module 1: The Transcription Studio (Core AI Pipeline)
* **FR-1.1: Image Ingestion & 1-Click Samples:**
  * Pengguna dapat mengunggah file foto naskah (PNG, JPG, WebP) maksimal 10 MB melalui drag-and-drop.
  * Tersedia panel **"Quick Test Samples"** (3 naskah dengan variasi kondisi: bersih, pudar, dan retak) agar juri/pengguna dapat menguji instan tanpa perlu mencari file sendiri.
* **FR-1.2: Adaptive Computer Vision Preprocessing:**
  * Pengguna dapat mengaktifkan filter preprocessing visual secara interaktif:
    * *Grayscale Conversion & Denoising* (Bilateral Filter untuk menjaga ketajaman guratan aksara).
    * *Sauvola / Adaptive Thresholding* untuk mengatasi pencahayaan tidak merata dan noda jamur daun lontar.
    * *Deskewing* otomatis (koreksi rotasi lempir lontar).
* **FR-1.3: Vision-Based OCR & Segmentation:**
  * Deteksi koordinat teks baris lontar (*line bounding boxes*).
  * Ekstraksi karakter ke teks standar Unicode Aksara Bali (`\u1B00` – `\u1B7F`).
* **FR-1.4: Contextual Transliteration & Philosophical Synthesis (LLM Engine):**
  * Transliterasi otomatis dari Aksara Bali Unicode ke huruf Latin dengan ejaan fonetik baku Bali.
  * Terjemahan bahasa ganda: Bahasa Indonesia dan Bahasa Inggris.
  * Ekstraksi metadata tematik otomatis: Identifikasi rumpun naskah (*Usada/Pengobatan*, *Wariga/Astronomi-Kalender*, *Tattwa/Filsafat*, *Babad/Sejarah*, *Kidung/Sastra*).
  * Analisis konteks: Ringkasan ajaran/makna filosofis naskah dalam 2–3 kalimat ringkas.
* **FR-1.5: Side-by-Side Verification UI:**
  * Antarmuka perbandingan berdampingan: Gambar asli beranotasi bounding box di sisi kiri vs. Hasil transliterasi, terjemahan, dan teks Unicode yang dapat diedit (*editable input field*) di sisi kanan.

### 3.2 Module 2: Provenance & Geolocation Management
* **FR-2.1: Metadata Pencatatan Kepemilikan:**
  * Form input metadata: Judul Naskah, Nama Pemilik/Pengempu (*Custodian*), Afiliasi (Griya, Puri, Pura, Banjar, Pribadi), Perkiraan Abad/Tahun Pembuatan.
* **FR-2.2: Hyperlocal Geolocation Pinning:**
  * Ekstraksi metadata koordinat EXIF gambar otomatis jika tersedia.
  * Opsi penandaan manual menggunakan interactive map picker (Leaflet/OpenStreetMap) hingga tingkat Banjar/Desa Adat di wilayah Bali.

### 3.3 Module 3: Granular Privacy & Decentralized Archive
* **FR-3.1: Dual Privacy Mode Selector:**
  * **Public Repository:** Naskah dipublikasikan ke katalog umum Bali Digi-Archive, dapat diakses publik, dan memiliki tautan shareable unik (`/archive/:slug`).
  * **Private Vault:** Naskah hanya dapat diakses oleh akun pemilik terautentikasi. Naskah berstatus sakral (*pingit*) tidak akan muncul di API publik atau peta publik.
* **FR-3.2: Export & Preservation Output:**
  * Ekspor hasil katalogisasi dalam 1 klik ke format PDF (dokumen sertifikat digital preservasi) dan JSON terstruktur.

### 3.4 Module 4: Public Heritage Explorer (Peta Interaktif Bali)
* **FR-4.1: Interactive Clustered Map:**
  * Visualisasi peta pulau Bali dengan penanda kluster lokasi naskah publik (contoh: 18 Naskah Usada di Gianyar, 12 Naskah Babad di Klungkung).
* **FR-4.2: Filter & Search Engine:**
  * Filter naskah berdasarkan rumpun kategori (*Usada, Wariga, Babad*), era waktu, dan kabupaten.
  * Quick modal view untuk membaca transliterasi naskah langsung dari pin peta.

---

## 4. Technical Architecture & Tech Stack

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  Next.js 14 (App Router) + Tailwind CSS + Shadcn UI + Lucide Icons + Leaflet.js   |
|  - Workspace UI (Side-by-Side Studio)                                            |
|  - Interactive Leaflet Map Component                                              |
|  - Client-side Canvas Image Manipulation                                         |
+-----------------------------------------------------------------------------------+
                                       │ HTTPS / JSON Payload
                                       ▼
+-----------------------------------------------------------------------------------+
|                                BACKEND TIER                                       |
|  FastAPI (Python 3.11) OR Next.js Serverless Route Handlers                       |
|  - Auth Middleware (Supabase JWT Verification)                                    |
|  - Rate Limiter & Security Validator                                              |
|  - Storage Coordinator                                                            |
+-----------------------------------------------------------------------------------+
        │                                         │
        ▼                                         ▼
+-----------------------+              +--------------------------------------------+
|  AI PROCESSING ENGINE  |              |        DATA & STORAGE LAYER (Supabase)     |
|                       |              |                                            |
| 1. OpenCV Preprocessor|              | 1. PostgreSQL Database                      |
|    - Sauvola / Otsu   |              |    - Row-Level Security (RLS) Enforced     |
|    - Denoise Filter   |              |    - PostGIS / Geolocation Columns         |
|                       |              |                                            |
| 2. Vision OCR Layer   |              | 2. Supabase Storage (S3-Compatible Bucket) |
|    - Balinese Unicode |              |    - Private Bucket (Vault images)         |
|                       |              |    - Public Bucket (Archive images)        |
| 3. LLM Reasoning API  |              +--------------------------------------------+
|    - Structured JSON  |
|    - Few-shot Prompt  |
+-----------------------+
```

### 4.1 Detail Tech Stack
* **Frontend:** Next.js 14, React, Tailwind CSS, Shadcn UI, Framer Motion (micro-interactions), Lucide Icons, React-Leaflet.
* **Backend:** FastAPI (Python) untuk modularitas Computer Vision atau Next.js Serverless Routes dengan Pyodide/ONNX.
* **Computer Vision:** OpenCV (Python/Node.js binding) untuk binarisasi naskah kuno.
* **AI Model Engine:** Multimodal Vision Model (Gemini 1.5 Flash / Claude 3.5 Sonnet / Custom OCR Engine) dengan penegakan skema JSON terstruktur (*Pydantic Output Parser*).
* **Database & Auth:** Supabase (PostgreSQL dengan enkripsi data dan Row-Level Security).
* **Deployment:** Vercel (Frontend & Serverless API) + Supabase Cloud.

---

## 5. Database Schema & Privacy Security Model

### 5.1 Database Tables (PostgreSQL / Supabase)

#### Tabel: `profiles`
Menyimpan informasi pengguna atau lembaga adat.
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    organization_type TEXT CHECK (organization_type IN ('griya', 'puri', 'pura', 'banjar', 'akademisi', 'perorangan')),
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabel: `manuscripts`
Menyimpan data fisik, metadata, koordinat geolokasi, dan konten transliterasi naskah.
```sql
CREATE TABLE manuscripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('usada', 'wariga', 'babad', 'tattwa', 'kidung', 'lainnya')),
    physical_condition TEXT CHECK (physical_condition IN ('baik', 'rapuh', 'rusak_sebagian', 'fragmentaris')),
    
    -- Provenance & Metadata
    owner_name TEXT NOT NULL,
    custodian_notes TEXT,
    estimated_creation_era TEXT,
    
    -- Geolocation
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    regency TEXT NOT NULL, -- e.g., 'Gianyar', 'Karangasem', 'Klungkung'
    village_banjar TEXT NOT NULL,
    
    -- Storage Reference
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT,
    
    -- AI Outputs
    unicode_transcription TEXT NOT NULL,
    latin_transliteration TEXT NOT NULL,
    translation_id TEXT NOT NULL,
    translation_en TEXT,
    philosophical_context TEXT,
    
    -- Privacy Access Control
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 Row-Level Security (RLS) Policy — Menjawab Kriteria Data Privacy & Ethics
Untuk memastikan integritas naskah privat:
```sql
-- Aktifkan RLS
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;

-- 1. Kebijakan Baca: Naskah publik dapat dibaca semua orang, naskah privat hanya oleh pemilik
CREATE POLICY "Public manuscripts are viewable by everyone" 
ON manuscripts FOR SELECT 
USING (visibility = 'public' OR auth.uid() = user_id);

-- 2. Kebijakan Insert: Hanya user terdaftar yang dapat menambahkan naskah
CREATE POLICY "Users can insert their own manuscripts" 
ON manuscripts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Kebijakan Modifikasi: Hanya pemilik naskah yang berhak mengedit atau menghapus
CREATE POLICY "Users can update their own manuscripts" 
ON manuscripts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manuscripts" 
ON manuscripts FOR DELETE 
USING (auth.uid() = user_id);
```

---

## 6. AI Prompt Engineering & Structured Output Specification

Untuk memastikan hasil ekstraksi AI selalu valid secara format dan bebas dari halusinasi sintaks, endpoint AI menggunakan validasi skema JSON ketat:

### 6.1 System Prompt Context
```text
You are an expert paleographer and philologist specializing in Balinese palm-leaf manuscripts (Lontar) and Balinese script (Aksara Bali).
You are analyzing an ancient Balinese lontar leaf image.
Your role:
1. Identify and transcribe the Balinese script into standardized Balinese Unicode characters.
2. Provide a rigorous, phonetic Latin transliteration following standard Balinese transliteration rules (incorporating diacritics: Tedung, Taleng, Ulu, Cecek, Bisah, Surang, Tedung).
3. Provide translations in formal Indonesian and natural English.
4. Categorize the domain (usada/wariga/babad/tattwa/kidung).
5. Extract the core philosophical or cultural takeaway in 2 sentences.
Output strictly in the specified JSON schema.
```

### 6.2 JSON Output Schema Contract
```json
{
  "status": "success",
  "data": {
    "category": "usada",
    "script_metadata": {
      "language": "Kawi / Jawa Kuna bercampur Bali Tradisional",
      "reading_direction": "left-to-right",
      "line_count": 4
    },
    "unicode_transcription": "ᬑᬁᬅᬯᬶᬖ᭄ᬦᬫᬲ᭄ᬢᬸ᭟ᬦᬶᬳᬦ᭄ᬓᬢᬸᬢᬸᬭᬦ᭄ᬉᬱᬤ...",
    "latin_transliteration": "Ong awighnamastu. Nihan katuturan usada...",
    "translation": {
      "indonesian": "Semoga tiada rintangan. Inilah petunjuk pengobatan herbal tradisional...",
      "english": "May there be no obstacles. Herein begins the account of traditional herbal remedy..."
    },
    "philosophical_context": "Naskah ini mengandung prinsip Tri Hita Karana dalam konteks kesehatan raga dan jiwa, menekankan harmoni antara tanaman obat pekarangan dengan metabolisme manusia.",
    "confidence_score": 0.94
  }
}
```

---

## 7. User Interface & User Experience (UX) Blueprint

1. **Dashboard Home:**
   * Modern SaaS aesthetic (clean typography, subtle subtle warm terracotta/gold accents khas Bali, dark/light mode toggle).
   * Hero section: *"Preserve Ancient Wisdom with Modern Vision AI"*.
   * Metrik instan: Total Lempir Terdigitalisasi, Persebaran di 9 Kabupaten/Kota di Bali, Jumlah Naskah Terlindungi di Private Vault.
2. **Workspace (Studio Transkripsi):**
   * Top Bar: Tombol Pilih Sampel Cepat (Sample 1: Usada Gianyar, Sample 2: Babad Klungkung, Sample 3: Wariga Karangasem) + Tombol Upload.
   * Split View:
     * *Left Canvas:* Viewer gambar dengan zoom/pan interaktif dan tombol toggle filter (Original / Enhanced Binarized).
     * *Right Panel:* Hasil AI dalam tab terorganisir: [Transliterasi Latin], [Aksara Bali Asli], [Terjemahan & Filosofi], dan [Form Metadata Lokasi & Privasi].
   * Bottom Action Bar: Tombol Switch Visibility (`Public` / `Private`) dan Tombol *"Simpan ke Repositori"*.
3. **Public Map View:**
   * Peta layar penuh dengan penanda dinamis. Klik pada marker membuka kartu preview naskah dengan informasi nama Banjar, pemilik yang mengizinkan publikasi, dan kutipan transliterasi.

---

## 8. Alignment with Bali DigiFest 2026 Evaluation Criteria

| Kriteria Penjurian & Bobot | Implementasi Nyata pada LontarAI | Dampak Penilaian Juri Milenial |
| :--- | :--- | :--- |
| **AI Implementation & Technical Depth (25%)** | Pipeline multi-tahap (OpenCV Binarization + Vision OCR + LLM Context Structured Output). Bukan sekadar satu panggilan API mentah. | Mendapat nilai teknis maksimal karena ada preprocessing computer vision dan penanganan failure mode. |
| **Product Functionality & Reliability (25%)** | MVP siap pakai di web dengan tombol 1-Click Demo Samples, penanganan error jika API down, dan waktu respon di bawah 4 detik. | Juri dapat langsung mencoba live tanpa hambatan registrasi atau upload mandiri. |
| **Problem Relevance & Impact (15%)** | Menyelesaikan krisis nyata pelestarian naskah lontar Bali yang terancam punah dan lapuk. | Sesuai dengan misi utama *Solve for Bali* secara otentik. |
| **Innovation & Differentiation (15%)** | Menggabungkan AI transkripsi dengan perlindungan data kultural (*Private Vault*) dan pemetaan geospasial naskah adat. | Jauh lebih bernilai dibanding OCR standar (Google Lens tidak memahami Aksara Bali pada daun lontar). |
| **UX/UI & Accessibility (10%)** | Antarmuka modern bergaya Vercel/Linear dengan Tailwind CSS, responsif mobile, dan visual side-by-side. | Menyenangkan digunakan oleh juri milenial yang mengutamakan usability dan design polish. |
| **Scalability & Security (10%)** | Skema PostgreSQL + Row-Level Security, pemisahan secret via `.env`, dan siap dikembangkan menjadi repositori resmi dinas arsip. | Memenuhi standar kebersihan source code dan keamanan data kompetisi. |

---

## 9. Implementation Checklist & Hackathon Timeline

### Sprint 1: Setup & Data Prep (Hari 1–3)
- [x] Inisialisasi Next.js 14 App Router + Tailwind + Shadcn UI.
- [x] Siapkan 3 dataset gambar lempir lontar berkualitas tinggi dan representatif untuk fitur *1-Click Demo Samples*.
- [x] Susun modul OpenCV preprocessing (Python/API helper).

### Sprint 2: AI Pipeline & Core Studio (Hari 4–7)
- [x] Hubungkan Vision Language Model dengan structured JSON schema output.
- [x] Bangun komponen frontend Split Workspace (Original vs Transkripsi).
- [x] Implementasikan fallback error state jika AI API timeout/rate limit.

### Sprint 3: Database, Provenance & Map (Hari 8–10)
- [x] Setup tabel Supabase dengan Row-Level Security (`public` vs `private`).
- [x] Integrasikan Leaflet.js untuk pemetaan koordinat Banjar/Kabupaten sebaran lontar.
- [x] Implementasikan fitur ekspor PDF/JSON.

### Sprint 4: Hardening, Dokumentasi & Demo (Hari 11–14)
- [x] Buat file `.env.example` yang rapi dan pastikan tidak ada secret di commit git.
- [x] Tulis `README.md` komprehensif sesuai template Lampiran B Panduan Peserta.
- [x] Rekam video demo clean-start 5 menit (sesuai spesifikasi Tahap 2).
- [x] Kunci versi ke tag `v1.0-submission`.