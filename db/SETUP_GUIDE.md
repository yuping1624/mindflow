# Supabase 資料庫設定指南

## 📋 設定步驟

### 步驟 1: 登入 Supabase Dashboard

1. 前往 [https://supabase.com](https://supabase.com)
2. 登入你的帳號
3. 選擇你的專案（或建立新專案）

### 步驟 2: 開啟 SQL Editor

1. 在左側選單點擊 **"SQL Editor"**
2. 點擊 **"New Query"** 建立新查詢

### 步驟 3: 執行 SQL Schema

#### 選項 A: 全新專案（推薦）

如果你還沒有建立任何資料表，直接使用改進版的 schema：

1. 開啟 `db/schema_improved.sql`
2. **複製全部內容**
3. 貼上到 Supabase SQL Editor
4. 點擊 **"Run"** 或按 `Cmd/Ctrl + Enter`

#### 選項 B: 已有舊資料庫

如果你已經執行過 `schema.sql`，使用 migration：

1. 先執行 `db/schema.sql`（如果還沒執行過）
2. 然後執行 `db/migration_fixes.sql` 來套用修正

### 步驟 4: 驗證設定

執行以下查詢來確認一切正常：

```sql
-- 檢查 extension 是否啟用
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 檢查所有資料表
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
-- 應該看到: entries, embeddings, profiles, usage_logs

-- 檢查 RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 檢查索引
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### 步驟 5: 取得環境變數

設定完成後，需要取得 Supabase 的連線資訊：

1. 在左側選單點擊 **"Project Settings"**
2. 點擊 **"API"**
3. 複製以下資訊到你的 `.env.local`：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **不要分享這個 key！**

## ⚠️ 重要注意事項

1. **Service Role Key 安全**
   - `SUPABASE_SERVICE_ROLE_KEY` 擁有完整權限
   - **絕對不要**放在前端程式碼中
   - 只能在 API Routes 或 Server Actions 中使用

2. **Vector Extension**
   - 如果 `vector` extension 無法啟用，可能需要：
     - 檢查 Supabase 專案方案是否支援
     - 聯絡 Supabase 支援

3. **RLS (Row Level Security)**
   - 所有資料表都已啟用 RLS
   - 確保使用者只能存取自己的資料

## 🐛 常見問題

### Q: SQL 執行失敗，顯示 "permission denied"
**A:** 確保你在 SQL Editor 中執行，不是在 Query Tool。SQL Editor 有完整權限。

### Q: vector extension 無法建立
**A:** 
- 檢查 Supabase 專案方案（某些方案可能不支援）
- 嘗試手動在 Dashboard → Database → Extensions 中啟用

### Q: Trigger 沒有自動建立 profile
**A:** 
- 檢查 trigger 是否正確建立：`SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- 測試註冊新使用者，檢查 `profiles` 資料表是否有新資料

### Q: 如何測試 RLS 是否正常運作？
**A:** 在 SQL Editor 中執行：
```sql
-- 以不同使用者身份測試（需要先有測試使用者）
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';
SELECT * FROM profiles; -- 應該只能看到自己的資料
```

## ✅ 完成檢查清單

- [ ] SQL schema 已成功執行
- [ ] 所有 4 個資料表已建立（profiles, entries, embeddings, usage_logs）
- [ ] Vector extension 已啟用
- [ ] RLS policies 已建立
- [ ] 索引已建立（包括 HNSW 向量索引）
- [ ] 環境變數已設定到 `.env.local`
- [ ] 測試註冊新使用者，確認 profile 自動建立

## 📚 下一步

設定完成後，你可以：
1. 開始開發前端功能
2. 實作 API routes (`/api/transcribe`, `/api/journal`)
3. 測試資料庫連線

