# Migration Guide: 384D Embeddings

## 概述

此 migration 將 `embeddings` 表的 `embedding` 欄位從 `vector(1536)` 更新為 `vector(384)`，以支援 HuggingFace `all-MiniLM-L6-v2` 模型。

## ⚠️ 重要警告

**如果你已經有現有的 1536D embeddings：**

1. **選項 A（推薦）**：刪除現有 embeddings，讓系統重新生成
   - 執行 migration 前，先刪除所有現有 embeddings：
   ```sql
   DELETE FROM public.embeddings;
   ```
   - 然後執行 migration
   - 之後的 journal entries 會自動生成新的 384D embeddings

2. **選項 B**：保留現有資料（不推薦）
   - Migration 會截斷 1536D 向量到 384D，這會破壞現有資料
   - 現有 embeddings 的相似度搜尋將不準確
   - 建議重新生成所有 embeddings

## 執行步驟

### 步驟 1: 備份資料（可選但推薦）

如果你有重要資料，先備份：

```sql
-- 備份 embeddings 表（可選）
CREATE TABLE embeddings_backup AS SELECT * FROM public.embeddings;
```

### 步驟 2: 清理現有 embeddings（如果適用）

如果你選擇選項 A（重新生成）：

```sql
-- 刪除所有現有 embeddings
DELETE FROM public.embeddings;
```

### 步驟 3: 執行 Migration

1. 登入 [Supabase Dashboard](https://supabase.com)
2. 選擇你的專案
3. 點擊左側選單的 **"SQL Editor"**
4. 點擊 **"New Query"**
5. 複製 `db/migrate_to_384d.sql` 的全部內容
6. 貼上到 SQL Editor
7. 點擊 **"Run"** 或按 `Cmd/Ctrl + Enter`

### 步驟 4: 驗證 Migration

執行以下查詢來確認 migration 成功：

```sql
-- 檢查 embedding 欄位類型
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'embeddings' 
  AND column_name = 'embedding';
-- 應該顯示: embedding | USER-DEFINED | vector (dimension: 384)

-- 檢查 match_entries 函數簽名
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'match_entries';
-- 應該顯示: match_entries(query_embedding vector(384), ...)

-- 檢查索引
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'embeddings';
-- 應該看到 embeddings_vector_idx 使用 vector(384)
```

### 步驟 5: 測試 RAG 功能

1. 建立至少 2-3 個 journal entries（透過 UI 或 API）
2. 確保它們有相似的內容（例如：都提到 "work stress"）
3. 建立一個新的 entry，內容與之前的相似
4. 檢查該 entry 的 detail 頁面，應該能看到 "Related Past Entries"
5. 檢查 AI response 是否引用了過去的 entries

## 故障排除

### 錯誤：`column "embedding" cannot be cast automatically to type vector(384)`

**原因**：pgvector 不支援直接轉換不同維度的向量。

**解決方案**：
1. 刪除所有現有 embeddings（如果可接受）
2. 或使用更複雜的 migration（需要建立新表、遷移資料、重命名）

### 錯誤：`function match_entries(vector, ...) does not exist`

**原因**：舊版本的函數簽名仍然存在。

**解決方案**：Migration 腳本應該已經處理了，但如果仍有問題，手動執行：

```sql
DROP FUNCTION IF EXISTS match_entries(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_entries(vector, uuid, float, int, uuid);
```

然後重新執行 migration 中的 `CREATE OR REPLACE FUNCTION` 部分。

### RAG 沒有返回結果

**可能原因**：
1. 相似度閾值太高（目前是 0.65）
2. 沒有足夠的相似 entries
3. Embeddings 尚未生成

**檢查**：
```sql
-- 檢查是否有 embeddings
SELECT COUNT(*) FROM public.embeddings;

-- 檢查 embedding 維度
SELECT 
  entry_id,
  array_length(embedding::float[], 1) AS dimension
FROM public.embeddings
LIMIT 5;
-- 應該都是 384
```

## 回滾（如果需要）

如果需要回滾到 1536D：

```sql
BEGIN;

-- 刪除 384D 索引
DROP INDEX IF EXISTS public.embeddings_vector_idx;

-- 恢復到 1536D（注意：這會截斷 384D 向量）
ALTER TABLE public.embeddings 
  ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536);

-- 重新建立索引
CREATE INDEX embeddings_vector_idx 
  ON public.embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 恢復 match_entries 函數（使用 1536D 版本）
-- （需要從 schema_improved.sql 複製 1536D 版本）

COMMIT;
```

## 完成後

Migration 完成後，所有新的 journal entries 會自動使用 384D embeddings。確保：

- ✅ Embedding 欄位類型是 `vector(384)`
- ✅ `match_entries` 函數接受 `vector(384)` 參數
- ✅ HNSW 索引已重新建立
- ✅ 新的 entries 能正確生成和檢索 embeddings

