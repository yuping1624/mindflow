-- ============================================================================
-- Verification Script: 384D Migration (FINAL FIXED VERSION)
-- ============================================================================

-- 1. 檢查 Embedding 欄位型別
SELECT 
  '1. Embedding Column Type' AS check_name,
  column_name, 
  udt_name,
  CASE 
    WHEN udt_name = 'vector' THEN '✓ Column is vector type'
    ELSE '✗ Column is not vector type'
  END AS status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'embeddings' 
  AND column_name = 'embedding';

-- 2. 檢查實際向量維度 (使用 vector_dims 函數)
SELECT 
  '2. Vector Dimension Check' AS check_name,
  COUNT(*) AS total_embeddings,
  COUNT(CASE WHEN vector_dims(embedding) = 384 THEN 1 END) AS correct_384d,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠ No embeddings found (OK if you just truncated)'
    WHEN COUNT(CASE WHEN vector_dims(embedding) != 384 THEN 1 END) = 0 THEN '✓ All embeddings are 384D'
    ELSE '✗ Some embeddings have incorrect dimension'
  END AS status
FROM public.embeddings;

-- 3. 檢查 match_entries 函數參數
SELECT 
  '3. match_entries Function' AS check_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%vector(384)%' THEN '✓ Function uses vector(384)'
    ELSE '✗ Function does not use vector(384)'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'match_entries';

-- 4. 檢查 HNSW 索引
SELECT 
  '4. HNSW Index' AS check_name,
  indexname, 
  indexdef,
  CASE 
    WHEN indexdef LIKE '%hnsw%' AND indexdef LIKE '%vector_cosine_ops%' THEN '✓ HNSW index exists'
    ELSE '✗ HNSW index missing'
  END AS status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'embeddings'
  AND indexname = 'embeddings_vector_idx';

-- 5. 檢查權限 (修正版：查詢 information_schema)
SELECT 
  '5. Permissions' AS check_name,
  routine_name AS function_name,
  grantee,
  privilege_type,
  CASE 
    WHEN grantee = 'authenticated' AND privilege_type = 'EXECUTE' THEN '✓ Granted to authenticated'
    ELSE '⚠ Check permissions'
  END AS status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'match_entries'
  AND grantee = 'authenticated';