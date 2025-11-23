# Phase 5: RAG Implementation - 需求規劃與問題

## 當前狀態

### 已完成 ✅
- [x] Embedding 生成（在 `/api/journal` 中實現）
  - [x] 使用 AI Manager 生成 embedding
  - [x] 處理不同維度的 embedding（384D, 768D, 1536D）
  - [x] 存儲到 `embeddings` 表
- [x] Database schema 支持
  - [x] `embeddings` 表已創建
  - [x] HNSW 索引已設置（用於高效向量搜索）
  - [x] `match_entries` 函數已定義（兩個版本：舊版需要 `match_user_id`，新版使用 `auth.uid()`）
- [x] 基礎 RAG 檢索
  - [x] 在 `/api/journal` 中調用 `match_entries`
  - [x] 獲取相似條目（similarity threshold: 0.7, count: 5）
  - [x] 存儲 `referenced_entry_ids` 到 entry
- [x] RAG 結果在 AI prompt 中的整合
  - [x] `buildSystemPrompt` 函數已接收 `relatedEntries` 參數
  - [x] 在 prompt 中添加相關條目的上下文（前 3 條，每條截取前 100 字符）
  - [x] 根據 AI mode 調整 prompt 指令

### 待完成 ❌
- [ ] RAG 結果的 UI 顯示
  - [ ] 在 entry detail 頁面顯示相關條目（目前只顯示 `referenced_entry_ids`，但沒有顯示相似度）
  - [ ] 顯示相似度分數
  - [ ] 優化相關條目的顯示格式
- [ ] RAG 參數優化
  - [ ] 可配置的 similarity threshold
  - [ ] 可配置的 match_count
  - [ ] 根據不同場景調整參數（例如：coaching mode 需要更多上下文）
- [ ] RAG Prompt 優化
  - [ ] 改進相關條目在 prompt 中的格式
  - [ ] 根據 AI mode 調整使用的條目數量
  - [ ] 添加條目的 metadata（情感標籤、tone）到 prompt

---

## 需要確認的需求問題

### 1. RAG 在 AI Response 中的使用策略

**問題 1.1：RAG 結果如何整合到 AI prompt？**
- [ ] A. 直接將相關條目的 transcription 附加到 prompt 中
- [ ] B. 總結相關條目的關鍵點，然後加入 prompt
- [ ] C. 根據 AI mode 選擇性使用（例如：coaching mode 使用更多，listening mode 使用較少）
- [ ] D. 其他：___________

**問題 1.2：RAG 結果的格式和結構**
- [ ] A. 簡單列出相關條目的 transcription
- [ ] B. 包含條目的 metadata（日期、情感標籤、tone）
- [ ] C. 格式化為結構化的上下文（例如："On [date], you mentioned: [transcription]")
- [ ] D. 其他：___________

**問題 1.3：RAG 結果的數量**
- [ ] A. 固定數量（例如：5 條）
- [ ] B. 根據 similarity threshold 動態調整（例如：只取 similarity > 0.8 的條目）
- [ ] C. 根據 AI mode 調整（coaching mode 更多，listening mode 更少）
- [ ] D. 其他：___________

### 2. RAG 參數配置

**問題 2.1：Similarity Threshold**
- [ ] A. 固定 0.7（當前值）
- [ ] B. 可配置（用戶設置或根據場景調整）
- [ ] C. 動態調整（例如：如果沒有結果，降低 threshold）
- [ ] D. 其他：___________

**問題 2.2：Match Count**
- [ ] A. 固定 5 條（當前值）
- [ ] B. 可配置（用戶設置或根據場景調整）
- [ ] C. 根據條目總數動態調整（例如：如果用戶只有 10 條，只取 3 條）
- [ ] D. 其他：___________

**問題 2.3：時間範圍過濾**
- [ ] A. 不限制時間範圍（搜索所有歷史條目）
- [ ] B. 只搜索最近 N 天的條目（例如：30 天）
- [ ] C. 可配置的時間範圍
- [ ] D. 其他：___________

### 3. UI/UX 設計

**問題 3.1：相關條目的顯示位置**
- [ ] A. 只在 entry detail 頁面顯示
- [ ] B. 在 entry list 頁面也顯示（例如：badge 顯示 "3 related entries"）
- [ ] C. 在 AI response 中直接引用（例如："Based on your previous entry on [date]..."）
- [ ] D. 其他：___________

**問題 3.2：相似度分數的顯示**
- [ ] A. 顯示具體分數（例如：85% similarity）
- [ ] B. 只顯示標籤（例如："Highly Related", "Related", "Somewhat Related"）
- [ ] C. 不顯示分數，只顯示條目
- [ ] D. 其他：___________

**問題 3.3：相關條目的交互**
- [ ] A. 只顯示預覽，點擊查看詳情
- [ ] B. 直接展開顯示完整內容
- [ ] C. 提供快速操作（例如：跳轉到相關條目、比較兩個條目）
- [ ] D. 其他：___________

### 4. 進階功能（可選）

**問題 4.1：RAG 結果的排序策略**
- [ ] A. 只按相似度排序
- [ ] B. 結合相似度和時間（例如：最近的相關條目優先）
- [ ] C. 結合相似度和情感（例如：相似情感的條目優先）
- [ ] D. 其他：___________

**問題 4.2：RAG 結果的過濾**
- [ ] A. 不過濾（顯示所有相似條目）
- [ ] B. 過濾掉相同情感的條目（避免重複）
- [ ] C. 過濾掉太舊的條目（例如：超過 90 天）
- [ ] D. 其他：___________

**問題 4.3：RAG 性能優化**
- [ ] A. 當前實現足夠（HNSW 索引已優化）
- [ ] B. 需要緩存熱門查詢結果
- [ ] C. 需要批量處理 embedding 生成
- [ ] D. 其他：___________

### 5. 技術實現細節

**問題 5.1：match_entries 函數版本**
- [ ] A. 使用舊版本（需要 `match_user_id` 參數）
- [ ] B. 升級到新版本（使用 `auth.uid()`，更安全）
- [ ] C. 保持兼容兩個版本
- [ ] D. 其他：___________

**問題 5.2：Embedding 維度處理**
- [ ] A. 保持當前填充策略（384D → 1536D）
- [ ] B. 遷移到 OpenAI embeddings（原生 1536D）
- [ ] C. 更新 schema 支持多種維度
- [ ] D. 其他：___________

**問題 5.3：錯誤處理**
- [ ] A. RAG 失敗時繼續處理（當前實現）
- [ ] B. RAG 失敗時顯示警告但繼續
- [ ] C. RAG 失敗時要求重試
- [ ] D. 其他：___________

---

## 建議的實現方案（待確認）

### 方案 A：基礎實現（推薦 MVP）
1. 確保 RAG 結果正確整合到 AI prompt 中
2. 在 entry detail 頁面顯示相關條目（帶相似度分數）
3. 使用固定參數（threshold: 0.7, count: 5）
4. 根據 AI mode 調整 RAG 使用策略

### 方案 B：進階實現
1. 實現可配置的 RAG 參數
2. 優化 prompt 以更好地利用 RAG 結果
3. 實現時間範圍過濾
4. 添加 RAG 結果的排序和過濾邏輯

### 方案 C：完整實現
1. 實現所有進階功能
2. 添加 RAG 性能優化
3. 實現批量 embedding 生成（用於歷史數據）
4. 添加 RAG 分析工具（例如：顯示哪些條目最常被引用）

---

## ✅ 實現完成

根據用戶的決策，Phase 5 已經完成實現。詳細內容請參考 `.cursor/PHASE5_IMPLEMENTATION.md`。

### 主要實現內容：
1. ✅ 修復 embedding 維度問題（移除填充，直接使用 384D）
2. ✅ 更新 match_entries 調用（使用安全版本，移除 match_user_id）
3. ✅ 優化 buildSystemPrompt（結構化格式，mode-specific 使用）
4. ✅ 設置 RAG 參數（threshold=0.65, count=5, prompt_count=3）
5. ✅ 更新 entry detail 頁面（顯示相似度標籤）
6. ✅ 更新 plan.md

### 重要提醒：
- **必須執行 migration**：`db/migrate_to_384d.sql` 將資料庫 schema 更新為 `vector(384)`
- 如果已有 1536D 的 embeddings，需要重新生成

---

## 技術備註

### 當前實現狀態
- **Embedding 生成**：✅ 已實現（`app/api/journal/route.ts` 第 88-132 行）
- **RAG 檢索**：✅ 已實現（`app/api/journal/route.ts` 第 153-178 行）
- **存儲 referenced_entry_ids**：✅ 已實現（`app/api/journal/route.ts` 第 214 行）
- **AI Prompt 整合**：✅ 已實現（`app/api/journal/route.ts` 第 181 行，`buildSystemPrompt` 函數第 284-314 行）
  - 當前實現：將前 3 條相關條目的 transcription（前 100 字符）添加到 prompt
  - 格式：簡單列表形式（`- [date]: [transcription]...`）

### 資料庫函數
- **舊版本**：`match_entries(query_embedding, match_user_id, match_threshold, match_count, exclude_entry_id)`
- **新版本**：`match_entries(query_embedding, match_threshold, match_count, exclude_entry_id)` - 使用 `auth.uid()` 自動獲取用戶 ID

### 已知問題
1. **函數簽名不一致**：代碼中使用舊版本（需要 `match_user_id` 參數，第 163 行），但資料庫可能有新版本（使用 `auth.uid()`）
2. **Embedding 維度**：當前使用填充策略將 384D 轉換為 1536D，可能影響相似度計算準確性
3. **RAG 結果格式**：當前只使用 transcription 的前 100 字符，可能丟失重要上下文
4. **UI 顯示**：entry detail 頁面已顯示 `referencedEntries`，但沒有顯示相似度分數

