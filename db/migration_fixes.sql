-- ============================================================================
-- Migration Script: Apply Security & Performance Fixes
-- Run this AFTER your initial schema.sql to apply improvements
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SECURITY FIXES
-- ============================================================================

-- 1.1 Add missing INSERT policy for profiles
CREATE POLICY IF NOT EXISTS "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 1.2 Add missing DELETE policy for profiles (optional but good practice)
CREATE POLICY IF NOT EXISTS "Users can delete own profile" 
  ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- 1.3 Secure match_entries function (CRITICAL SECURITY FIX)
-- Drop old function first
DROP FUNCTION IF EXISTS match_entries(vector, uuid, float, int, uuid);

-- Create secured version
CREATE OR REPLACE FUNCTION match_entries(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  exclude_entry_id UUID DEFAULT NULL
)
RETURNS TABLE (
  entry_id UUID,
  transcription TEXT,
  emotion_tags TEXT[],
  detected_tone TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to search entries';
  END IF;
  
  RETURN QUERY
  SELECT
    e.id AS entry_id,
    e.transcription,
    e.emotion_tags,
    e.detected_tone,
    e.created_at,
    1 - (emb.embedding <=> query_embedding) AS similarity
  FROM embeddings emb
  JOIN entries e ON emb.entry_id = e.id
  WHERE emb.user_id = current_user_id
    AND (exclude_entry_id IS NULL OR e.id != exclude_entry_id)
    AND 1 - (emb.embedding <=> query_embedding) > match_threshold
  ORDER BY emb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_entries(vector, float, int, uuid) TO authenticated;

-- ============================================================================
-- 2. DATA TYPE FIXES
-- ============================================================================

-- 2.1 Fix cost_usd: float -> numeric (CRITICAL for financial accuracy)
ALTER TABLE public.entries 
  ALTER COLUMN cost_usd TYPE NUMERIC(10, 4) USING cost_usd::numeric(10, 4);

ALTER TABLE public.usage_logs 
  ALTER COLUMN estimated_cost TYPE NUMERIC(10, 4) USING estimated_cost::numeric(10, 4);

-- 2.2 Fix sentiment_score range to match PRD (0.0-1.0 instead of -1.0-1.0)
ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_sentiment_score_check;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_sentiment_score_check 
  CHECK (sentiment_score IS NULL OR (sentiment_score >= 0.0 AND sentiment_score <= 1.0));

-- 2.3 Add CHECK constraint to default_ai_mode
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_default_ai_mode_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_default_ai_mode_check 
  CHECK (default_ai_mode IN ('listening', 'coaching', 'smart'));

-- ============================================================================
-- 3. ADD MISSING COLUMNS
-- ============================================================================

-- 3.1 Add referenced_entry_ids to entries (mentioned in PRD but missing)
ALTER TABLE public.entries 
  ADD COLUMN IF NOT EXISTS referenced_entry_ids UUID[] DEFAULT '{}';

-- ============================================================================
-- 4. ADD DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- 4.1 Ensure cost is non-negative
ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_cost_non_negative;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_cost_non_negative 
  CHECK (cost_usd >= 0.0);

-- 4.2 Ensure tokens are non-negative
ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_tokens_non_negative;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_tokens_non_negative 
  CHECK (tokens_used >= 0);

-- 4.3 Add length constraints to text fields (prevent DoS)
ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_transcription_length;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_transcription_length 
  CHECK (length(transcription) <= 50000);

ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_ai_response_length;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_ai_response_length 
  CHECK (ai_response IS NULL OR length(ai_response) <= 10000);

ALTER TABLE public.entries 
  DROP CONSTRAINT IF EXISTS entries_audio_url_length;

ALTER TABLE public.entries 
  ADD CONSTRAINT entries_audio_url_length 
  CHECK (audio_url IS NULL OR length(audio_url) <= 500);

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

-- 5.1 Profile email index
CREATE INDEX IF NOT EXISTS profiles_email_idx 
  ON public.profiles(email);

-- 5.2 Entries: user + created_at (for dashboard queries)
CREATE INDEX IF NOT EXISTS entries_user_created_idx 
  ON public.entries(user_id, created_at DESC);

-- 5.3 Entries: sentiment analysis queries
CREATE INDEX IF NOT EXISTS entries_sentiment_idx 
  ON public.entries(user_id, sentiment_score, created_at DESC);

-- 5.4 Entries: Full-text search index
CREATE INDEX IF NOT EXISTS entries_transcription_fts_idx 
  ON public.entries USING gin(transcription_tsv);

-- 5.5 Embeddings: entry_id lookup
CREATE INDEX IF NOT EXISTS embeddings_entry_id_idx 
  ON public.embeddings(entry_id);

-- 5.6 Usage logs: user + created_at
CREATE INDEX IF NOT EXISTS usage_logs_user_created_idx 
  ON public.usage_logs(user_id, created_at DESC);

-- ============================================================================
-- 6. IMPROVE TRIGGER (add conflict handling)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. USAGE LOGS SECURITY (IMPORTANT: Choose one approach)
-- ============================================================================

-- OPTION A: Restrict INSERT to service role only (RECOMMENDED)
-- Users should NOT be able to insert usage logs directly
-- Backend API should use service role key to insert logs
-- No policy needed - RLS will block all user inserts by default

-- OPTION B: Allow users to insert their own logs (if needed)
-- Uncomment below if you need user-inserted logs:
-- CREATE POLICY IF NOT EXISTS "Users can insert own usage logs" 
--   ON public.usage_logs FOR INSERT 
--   WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these to verify the migration:
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
-- \d+ public.entries  -- Check column types
-- \d+ public.usage_logs  -- Check column types

