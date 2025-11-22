-- ============================================================================
-- 修復 Trigger：確保新用戶註冊時自動建立 Profile
-- ============================================================================

-- 檢查 trigger 是否存在
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 如果上面查詢沒有結果，執行以下來建立 trigger：

-- 1. 確保 function 存在（應該已經存在，但確認一下）
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

-- 2. 建立 trigger（在 auth schema 的 users 資料表上）
-- 注意：這需要在 Supabase 的 SQL Editor 中執行，因為需要權限操作 auth schema
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 3. 驗證 trigger 已建立
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

