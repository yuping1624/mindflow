-- ============================================================================
-- 資料庫設定驗證查詢
-- 執行這些查詢來確認所有設定都正確
-- ============================================================================

-- 1. 檢查所有資料表是否建立
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
-- 預期結果：entries, embeddings, profiles, usage_logs (4個資料表)

-- 2. 檢查 RLS (Row Level Security) 是否啟用
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
-- 預期結果：所有資料表的 rls_enabled 都應該是 true

-- 3. 檢查所有 RLS Policies
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
-- 預期結果：應該看到多個 policies（每個資料表至少一個）

-- 4. 檢查所有索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
-- 預期結果：應該看到多個索引，包括向量索引 embeddings_vector_idx

-- 5. 檢查 Functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
-- 預期結果：應該看到 handle_new_user 和 match_entries

-- 6. 檢查 Triggers (包括 auth schema)
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
   OR trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, trigger_name;
-- 預期結果：應該看到 on_auth_user_created trigger 在 auth schema

-- 7. 檢查 Vector Extension（你已經執行過了）
SELECT 
  extname,
  extversion
FROM pg_extension 
WHERE extname = 'vector';
-- 預期結果：extname = 'vector', extversion = '0.8.0' (或更新版本)

-- ============================================================================
-- 快速檢查摘要（執行這個來快速確認）
-- ============================================================================
SELECT 
  'Tables' as check_type,
  COUNT(*) as count,
  string_agg(tablename, ', ' ORDER BY tablename) as details
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'RLS Policies' as check_type,
  COUNT(*) as count,
  string_agg(policyname, ', ' ORDER BY policyname) as details
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Indexes' as check_type,
  COUNT(*) as count,
  string_agg(indexname, ', ' ORDER BY indexname) as details
FROM pg_indexes 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Functions' as check_type,
  COUNT(*) as count,
  string_agg(routine_name, ', ' ORDER BY routine_name) as details
FROM information_schema.routines
WHERE routine_schema = 'public'

UNION ALL

SELECT 
  'Triggers' as check_type,
  COUNT(*) as count,
  string_agg(trigger_schema || '.' || trigger_name, ', ' ORDER BY trigger_schema, trigger_name) as details
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name = 'on_auth_user_created';

