-- ============================================================================
-- 驗證 Trigger 是否正確建立
-- ============================================================================

-- 檢查 trigger 是否存在（在 auth schema）
SELECT 
  trigger_schema,
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 預期結果：
-- trigger_schema: auth (或 public)
-- trigger_name: on_auth_user_created
-- event_object_table: users
-- action_timing: AFTER
-- event_manipulation: INSERT

-- 檢查 function 是否存在
SELECT 
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 預期結果：
-- routine_schema: public
-- routine_name: handle_new_user
-- routine_type: FUNCTION

