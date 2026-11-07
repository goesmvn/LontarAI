-- Migrasi 002: Komunitas + Data latih OCR. Aman dijalankan berulang (idempotent).
-- Jalankan HANYA berkas ini di SQL Editor Supabase (jangan jalankan ulang schema.sql penuh).
-- Prasyarat: buat bucket Storage PRIVATE bernama `training` di dashboard.

-- ===== Komunitas Kustodian =====
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  manuscript_id uuid REFERENCES manuscripts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS posts_read_all ON community_posts;
DROP POLICY IF EXISTS posts_insert_own ON community_posts;
DROP POLICY IF EXISTS posts_delete_own ON community_posts;
CREATE POLICY posts_read_all ON community_posts FOR SELECT USING (true);
CREATE POLICY posts_insert_own ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY posts_delete_own ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- ===== Data latih OCR (opt-in) =====
CREATE TABLE IF NOT EXISTS training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manuscript_id uuid REFERENCES manuscripts(id) ON DELETE SET NULL,
  line_index int NOT NULL CHECK (line_index >= 0),
  image_path text NOT NULL,
  latin text NOT NULL CHECK (char_length(latin) BETWEEN 1 AND 500),
  unicode text NOT NULL CHECK (char_length(unicode) <= 1000),
  origin text NOT NULL CHECK (origin IN ('manual','ai_corrected')),
  consent_at timestamptz NOT NULL DEFAULT now(),
  review text NOT NULL DEFAULT 'pending' CHECK (review IN ('pending','approved','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE training_samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ts_own_select ON training_samples;
DROP POLICY IF EXISTS ts_own_insert ON training_samples;
DROP POLICY IF EXISTS ts_own_delete ON training_samples;
CREATE POLICY ts_own_select ON training_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ts_own_insert ON training_samples FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ts_own_delete ON training_samples FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS training_owner ON storage.objects;
CREATE POLICY training_owner ON storage.objects FOR ALL
  USING (bucket_id = 'training' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'training' AND (storage.foldername(name))[1] = auth.uid()::text);
