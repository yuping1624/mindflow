-- ============================================================================
-- MindFlow Database Schema - IMPROVED VERSION
-- Includes all security fixes, performance optimizations, and data integrity
-- ============================================================================

BEGIN;

-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  default_ai_mode TEXT DEFAULT 'smart' CHECK (default_ai_mode IN ('listening', 'coaching', 'smart')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
  ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx 
  ON public.profiles(email);

-- Auto-create profile on user signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 3. ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  transcription TEXT NOT NULL CHECK (length(transcription) <= 50000),
  audio_url TEXT CHECK (audio_url IS NULL OR length(audio_url) <= 500),
  
  -- AI Analysis
  ai_response TEXT CHECK (ai_response IS NULL OR length(ai_response) <= 10000),
  ai_mode TEXT CHECK (ai_mode IN ('listening', 'coaching', 'smart')),
  emotion_tags TEXT[], 
  detected_tone TEXT, 
  
  -- Data Strategy & BI (FIXED: sentiment_score range, cost_usd type)
  sentiment_score FLOAT CHECK (sentiment_score >= 0.0 AND sentiment_score <= 1.0),
  energy_score FLOAT CHECK (energy_score >= 0.0 AND energy_score <= 1.0),
  tokens_used INT DEFAULT 0 CHECK (tokens_used >= 0),
  cost_usd NUMERIC(10, 4) DEFAULT 0.0 CHECK (cost_usd >= 0.0),  -- FIXED: numeric instead of float
  
  -- RAG (ADDED: missing referenced_entry_ids)
  referenced_entry_ids UUID[] DEFAULT '{}',
  
  -- Full-Text Search
  transcription_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', transcription)) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can all on own entries" 
  ON public.entries FOR ALL 
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS entries_user_created_idx 
  ON public.entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS entries_sentiment_idx 
  ON public.entries(user_id, sentiment_score, created_at DESC);

CREATE INDEX IF NOT EXISTS entries_transcription_fts_idx 
  ON public.entries USING gin(transcription_tsv);

-- ============================================================================
-- 4. EMBEDDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536) NOT NULL, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can all on own embeddings" 
  ON public.embeddings FOR ALL 
  USING (auth.uid() = user_id);

-- Vector Index (HNSW - optimal for this use case)
CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
  ON public.embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for entry_id lookups
CREATE INDEX IF NOT EXISTS embeddings_entry_id_idx 
  ON public.embeddings(entry_id);

-- ============================================================================
-- 5. USAGE LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  feature TEXT,       
  model_used TEXT,    
  input_tokens INT CHECK (input_tokens >= 0),
  output_tokens INT CHECK (output_tokens >= 0),
  estimated_cost NUMERIC(10, 4) CHECK (estimated_cost >= 0.0),  -- FIXED: numeric instead of float
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" 
  ON public.usage_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- SECURITY: Only service role should insert usage logs
-- Users should NOT be able to insert their own usage logs
-- This prevents cost manipulation
-- If you need user-inserted logs, uncomment below:
-- CREATE POLICY "Users can insert own usage logs" 
--   ON public.usage_logs FOR INSERT 
--   WITH CHECK (auth.uid() = user_id);

-- Performance Index
CREATE INDEX IF NOT EXISTS usage_logs_user_created_idx 
  ON public.usage_logs(user_id, created_at DESC);

-- ============================================================================
-- 6. RAG SEARCH FUNCTION (SECURED)
-- ============================================================================
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
SECURITY DEFINER  -- Required to access auth.uid()
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- SECURITY: Verify user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to search entries';
  END IF;
  
  -- Return query with user isolation enforced
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
  WHERE emb.user_id = current_user_id  -- SECURITY: Use auth context, not parameter
    AND (exclude_entry_id IS NULL OR e.id != exclude_entry_id)
    AND 1 - (emb.embedding <=> query_embedding) > match_threshold
  ORDER BY emb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_entries(vector, float, int, uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Check extensions
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- Check indexes
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

