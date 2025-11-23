# 🚀 Migration 執行步驟（立即執行）

## 當前狀態

根據診斷結果：
- ✅ `match_entries` 函數存在
- ⚠️  資料庫中有 **2 個現有的 embeddings**（可能是 1536D）
- ⚠️  Migration 尚未執行

---

## ⚡ 快速執行（3 步驟）

### 步驟 1: 刪除現有 Embeddings（必須）

**在 Supabase SQL Editor 中執行：**

```sql
DELETE FROM public.embeddings;
```

**為什麼？** 現有的 embeddings 可能是 1536D，直接 migration 會破壞資料。刪除後，系統會自動重新生成 384D embeddings。

### 步驟 2: 執行 Migration

1. 開啟 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案
3. 點擊左側選單的 **"SQL Editor"**
4. 點擊 **"New Query"**
5. **開啟檔案**：`db/migrate_to_384d.sql`
6. **複製全部內容**（包括 `BEGIN;` 和 `COMMIT;`）
7. **貼上到 SQL Editor**
8. **點擊 "Run"** 或按 `Cmd/Ctrl + Enter`

**預期結果：** 應該看到 "Success. No rows returned" 或類似的成功訊息。

### 步驟 3: 驗證 Migration

執行以下命令：

```bash
npx tsx scripts/check_migration_status.ts
```

或

```bash
npx tsx scripts/test_rag.ts
```

**預期結果：** 所有測試應該通過（或至少 embedding dimension 應該是 384D）。

---

## 🧪 測試 RAG 功能

Migration 完成並驗證後：

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **建立測試 Entries**：
   - 登入應用程式
   - 建立 2-3 個 journal entries，內容相似（例如都提到 "work stress" 或 "anxiety"）
   - 建立一個新的 entry，內容與之前的相關

3. **檢查結果**：
   - 打開新 entry 的詳細頁面
   - 應該看到 "Related Past Entries" 區塊
   - 確認相似度標籤顯示正確（"Deep Connection", "Related" 等）

---

## ❓ 遇到問題？

### 問題 1: Migration 失敗

**錯誤訊息：** "cannot cast type vector(1536) to vector(384)"

**解決方案：** 確保你已經執行了 `DELETE FROM public.embeddings;` 在 migration 之前。

### 問題 2: 函數不存在

**錯誤訊息：** "function match_entries does not exist"

**解決方案：** 檢查 migration SQL 是否完整執行（包括 `CREATE OR REPLACE FUNCTION` 部分）。

### 問題 3: 測試失敗

**錯誤訊息：** "Embeddings are 1536D (expected 384D)"

**解決方案：** 
1. 確認 migration 已執行
2. 刪除所有 embeddings：`DELETE FROM public.embeddings;`
3. 重新建立 journal entries（系統會自動生成 384D）

---

## 📋 檢查清單

完成後，確認以下項目：

- [ ] 已刪除現有 embeddings
- [ ] Migration SQL 已執行
- [ ] `npx tsx scripts/check_migration_status.ts` 顯示正確狀態
- [ ] 建立新的 journal entry 時，系統生成 384D embeddings
- [ ] Entry 詳細頁面顯示 "Related Past Entries"
- [ ] AI 回應中引用了相關的過去 entries

---

完成 migration 後，請告知我，我會協助測試 RAG 功能！
