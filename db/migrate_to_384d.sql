BEGIN;

-- 1. 先移除依賴物件 (索引和舊函數)
DROP INDEX IF EXISTS public.embeddings_vector_idx;
-- 移除舊版函數 (必須先刪除，因為參數型別變了)
DROP FUNCTION IF EXISTS match_entries(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_entries(vector, uuid, float, int, uuid);

-- 2. 清空資料表 (關鍵步驟！)
-- 因為 1536 維的資料無法轉換成 384 維，必須刪除舊資料
TRUNCATE TABLE public.embeddings;

-- 3. 修改欄位維度 (現在表是空的，可以直接改)
ALTER TABLE public.embeddings 
  ALTER COLUMN embedding TYPE vector(384);

-- 4. 重建 HNSW 索引 (針對 384 維度)
CREATE INDEX embeddings_vector_idx 
  ON public.embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. 重建搜尋函數 (參數改成 vector(384))
CREATE OR REPLACE FUNCTION match_entries(
  query_embedding vector(384), -- 這裡改成 384
  match_threshold FLOAT DEFAULT 0.65,
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
  -- 安全性檢查
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

-- 6. 授權給已登入用戶
GRANT EXECUTE ON FUNCTION match_entries(vector(384), float, int, uuid) TO authenticated;

COMMIT;