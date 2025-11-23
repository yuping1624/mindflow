# Migration Execution Guide - 384D Embeddings

## 🎯 目標

執行 migration 將資料庫 schema 從 `vector(1536)` 更新為 `vector(384)`，以支援 HuggingFace `all-MiniLM-L6-v2` 模型。

## 📋 執行步驟

### 步驟 1: 準備工作

1. **檢查現有資料**（可選）
   - 如果你有重要的 embeddings 資料，考慮先備份
   - 如果沒有重要資料，可以直接執行 migration

2. **確認環境變數**
   - 確保 `.env.local` 中有正確的 Supabase 憑證

### 步驟 2: 執行 Migration

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的 **"SQL Editor"**
4. 點擊 **"New Query"**
5. 開啟 `db/migrate_to_384d.sql` 檔案
6. **複製全部內容**（包括 `BEGIN;` 和 `COMMIT;`）
7. 貼上到 Supabase SQL Editor
8. 點擊 **"Run"** 或按 `Cmd/Ctrl + Enter`
9. 確認沒有錯誤訊息

### 步驟 3: 驗證 Migration

**選項 A: 使用 SQL 驗證腳本（推薦）**

1. 在 Supabase SQL Editor 中開啟新查詢
2. 複製 `db/verify_384d_migration.sql` 的全部內容
3. 貼上並執行
4. 檢查所有項目都顯示 ✓

**選項 B: 使用 Shell 腳本**

```bash
./scripts/verify_migration.sh
```

這會提供驗證步驟的指引。

### 步驟 4: 測試 RAG 功能

#### 4.1 建立測試 Entries

1. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

2. 登入應用程式

3. 建立 2-3 個 journal entries，內容相似（例如都提到 "work stress"）：
   - Entry 1: "I'm feeling stressed about work today. The deadline is approaching."
   - Entry 2: "Work has been really overwhelming this week. I need a break."
   - Entry 3: "The pressure at work is getting to me. I can't sleep well."

4. 建立一個新的 entry，內容與之前的相關：
   - Entry 4: "Another stressful day at work. I'm worried about my performance."

#### 4.2 驗證 RAG 結果

1. 打開 Entry 4 的詳細頁面
2. 檢查是否顯示 "Related Past Entries" 區塊
3. 確認：
   - ✓ 顯示了相關的 entries（Entry 1, 2, 3）
   - ✓ 每個 entry 都有相似度標籤（"Deep Connection", "Related", "Somewhat Related"）
   - ✓ 可以點擊相關 entry 跳轉到該 entry 的詳細頁面
   - ✓ AI response 可能引用了過去的 entries（在 coaching 或 smart mode）

#### 4.3 檢查後端日誌

查看終端機的日誌輸出，確認：
- ✓ Embedding 生成成功（384D）
- ✓ RAG 檢索成功（沒有錯誤）
- ✓ `match_entries` 函數被正確調用

## 🔍 故障排除

### Migration 失敗

**錯誤**: `column "embedding" cannot be cast automatically`

**解決方案**:
1. 如果沒有重要資料，先刪除所有 embeddings：
   ```sql
   DELETE FROM public.embeddings;
   ```
2. 然後重新執行 migration

**錯誤**: `function match_entries(vector, ...) does not exist`

**解決方案**:
Migration 應該已經處理了，但如果仍有問題，手動執行：
```sql
DROP FUNCTION IF EXISTS match_entries(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_entries(vector, uuid, float, int, uuid);
```
然後重新執行 migration 中的 `CREATE OR REPLACE FUNCTION` 部分。

### RAG 沒有返回結果

**可能原因**:
1. 相似度閾值太高（目前是 0.65）
2. 沒有足夠的相似 entries
3. Embeddings 尚未生成

**檢查步驟**:
1. 確認 entries 有 embeddings：
   ```sql
   SELECT COUNT(*) FROM public.embeddings;
   ```

2. 檢查 embedding 維度：
   ```sql
   SELECT 
     entry_id,
     array_length(embedding::float[], 1) AS dimension
   FROM public.embeddings
   LIMIT 5;
   ```
   應該都是 384

3. 手動測試 `match_entries` 函數：
   ```sql
   -- 取得一個 entry 的 embedding
   SELECT embedding FROM public.embeddings LIMIT 1;
   
   -- 使用該 embedding 測試 match_entries
   SELECT * FROM match_entries(
     (SELECT embedding FROM public.embeddings LIMIT 1)::vector(384),
     0.5,  -- 降低閾值測試
     5,
     NULL
   );
   ```

### AI Response 沒有引用過去 Entries

**可能原因**:
1. RAG 檢索失敗（檢查後端日誌）
2. 沒有找到足夠相似的 entries
3. AI mode 是 "listening"（會最小化使用 RAG）

**解決方案**:
1. 使用 "coaching" 或 "smart" mode 測試
2. 確保有足夠的相似 entries
3. 檢查後端日誌中的 RAG 錯誤

## ✅ 成功標準

Migration 成功後，你應該能夠：

- [x] 在 Supabase Dashboard 中確認 `embeddings.embedding` 欄位是 `vector(384)`
- [x] `match_entries` 函數接受 `vector(384)` 參數
- [x] 新的 journal entries 能正確生成 384D embeddings
- [x] RAG 檢索能返回相似的 past entries
- [x] Entry detail 頁面顯示相關 entries 和相似度標籤
- [x] AI responses 在適當的 mode 下引用過去的 entries

## 📚 相關文件

- `db/MIGRATION_GUIDE_384D.md` - 詳細的 migration 指南
- `db/verify_384d_migration.sql` - SQL 驗證腳本
- `db/migrate_to_384d.sql` - Migration SQL 腳本
- `.cursor/PHASE5_IMPLEMENTATION.md` - Phase 5 實現總結

## 🚀 下一步

Migration 完成後，你可以：

1. 開始使用 RAG 功能來增強 AI responses
2. 根據實際使用情況調整 `MIN_SIMILARITY_THRESHOLD`（目前在 `app/api/journal/route.ts` 中設為 0.65）
3. 監控 RAG 的效能和準確度
4. 考慮實作進階功能（如時間範圍過濾、情感標籤過濾等）

