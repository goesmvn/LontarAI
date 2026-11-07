-- LontarAI schema. Run in the Supabase SQL editor.

CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category TEXT NOT NULL DEFAULT 'lainnya'
    CHECK (category IN ('usada','wariga','babad','tattwa','kidung','lainnya')),
  physical_condition TEXT CHECK (physical_condition IN ('baik','rapuh','rusak_sebagian','fragmentaris')),
  owner_name TEXT NOT NULL CHECK (char_length(owner_name) BETWEEN 1 AND 200),
  affiliation TEXT,
  custodian_notes TEXT CHECK (char_length(custodian_notes) <= 1000),
  estimated_creation_era TEXT,

  -- Precise location: visible to the owner only. Public location is blurred server-side.
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  public_latitude DOUBLE PRECISION,
  public_longitude DOUBLE PRECISION,
  regency TEXT NOT NULL,
  village_banjar TEXT NOT NULL,

  -- Privacy
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  is_pingit BOOLEAN NOT NULL DEFAULT FALSE,
  consent_public_at TIMESTAMPTZ,
  show_owner_name BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (NOT (is_pingit AND visibility = 'public')),
  CHECK (visibility = 'private' OR (consent_public_at IS NOT NULL AND public_latitude IS NOT NULL)),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  folio_label TEXT,                                   -- e.g. '1 B'
  image_bucket TEXT NOT NULL CHECK (image_bucket IN ('vault','archive')),
  image_path TEXT NOT NULL,
  transcription_status TEXT NOT NULL DEFAULT 'draf_ai'
    CHECK (transcription_status IN ('draf_ai','dikoreksi','terverifikasi')),
  unicode_transcription TEXT NOT NULL DEFAULT '',
  latin_transliteration TEXT NOT NULL DEFAULT '',
  translation_id TEXT, translation_en TEXT, philosophical_context TEXT,
  lines JSONB NOT NULL DEFAULT '[]',
  confidence_score REAL,
  model_name TEXT, prompt_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_manuscripts ON manuscripts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_leaves ON leaves FOR ALL
  USING (EXISTS (SELECT 1 FROM manuscripts m WHERE m.id = manuscript_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM manuscripts m WHERE m.id = manuscript_id AND m.user_id = auth.uid()));

-- Anonymous/public access goes ONLY through this view (safe columns, blurred location).
-- The view runs with its owner's rights; the WHERE clause is the access rule.
CREATE VIEW public_manuscripts AS
SELECT m.slug, m.title, m.category, m.estimated_creation_era, m.regency, m.village_banjar,
       m.public_latitude AS latitude, m.public_longitude AS longitude,
       CASE WHEN m.show_owner_name THEN m.owner_name END AS owner_name,
       m.created_at,
       l.image_path, l.unicode_transcription, l.latin_transliteration,
       l.translation_id, l.transcription_status
FROM manuscripts m
JOIN LATERAL (
  SELECT * FROM leaves WHERE manuscript_id = m.id AND image_bucket = 'archive'
  ORDER BY created_at LIMIT 1
) l ON TRUE
WHERE m.visibility = 'public' AND m.is_pingit = FALSE;

GRANT SELECT ON public_manuscripts TO anon, authenticated;

-- Storage: create two buckets in the dashboard:
--   `vault`   (PRIVATE)  and  `archive` (PUBLIC)
-- Owners may only touch files under their own user-id folder.
CREATE POLICY vault_owner ON storage.objects FOR ALL
  USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY archive_owner_write ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'archive' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY archive_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'archive' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Community reports on public manuscripts (takedown / wrong content / sacred content).
-- Anyone may submit; nobody can read them except via the service role (admin API).
CREATE TABLE manuscript_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('pingit','salah_isi','hak_cipta','lainnya')),
  details TEXT CHECK (char_length(details) <= 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE manuscript_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY anyone_can_report ON manuscript_reports FOR INSERT WITH CHECK (status = 'open');

-- Slug -> id lookup for reporting, exposing nothing else.
CREATE FUNCTION public_manuscript_id(p_slug TEXT) RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM manuscripts WHERE slug = p_slug AND visibility = 'public' AND is_pingit = FALSE
$$;
GRANT EXECUTE ON FUNCTION public_manuscript_id(TEXT) TO anon, authenticated;

-- ============ Komunitas Kustodian (linimasa) ============
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  manuscript_id uuid REFERENCES manuscripts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_read_all ON community_posts FOR SELECT USING (true);
CREATE POLICY posts_insert_own ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY posts_delete_own ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- ============ Data latih OCR (opt-in) ============
-- Pasangan (potongan baris, transliterasi terverifikasi) yang DISUMBANGKAN pengguna secara sukarela.
-- Bucket `training` (PRIVATE) harus dibuat di dashboard. Naskah pingit tidak pernah disumbangkan (dicek di API).
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
CREATE POLICY ts_own_select ON training_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ts_own_insert ON training_samples FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ts_own_delete ON training_samples FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY training_owner ON storage.objects FOR ALL
  USING (bucket_id = 'training' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'training' AND (storage.foldername(name))[1] = auth.uid()::text);
