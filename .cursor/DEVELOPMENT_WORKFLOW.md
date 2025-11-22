# Professional Development Workflow with Cursor

## 📋 專業工程師的開發流程

### Phase 0: 專案規劃階段（Before Coding）

#### 1. 需求文件（PRD/Requirements）
**目的**：明確專案目標和功能需求
- ✅ 你已經有 `PRD.md` - 很好！
- 包含：功能需求、用戶流程、技術規格、成功指標

#### 2. 技術架構設計（Technical Design）
**目的**：決定技術選型和架構
- 技術棧選擇（你已選好：Next.js, Supabase, etc.）
- 資料庫設計（你已設計好 schema）
- API 設計
- 系統架構圖（可選，但大型專案建議）

#### 3. 開發計劃（Development Plan）
**目的**：將大專案拆解成可執行的小任務
- ✅ 你現在有 `plan.md`
- 包含：功能拆分、優先順序、里程碑、時間估算

**專業建議**：
- 使用 **User Stories** 格式：作為 [角色]，我想要 [功能]，以便 [價值]
- 使用 **MoSCoW** 優先順序：Must have, Should have, Could have, Won't have
- 設定 **MVP**（最小可行產品）範圍

#### 4. 開發規範（Coding Standards）
**目的**：確保程式碼品質和一致性
- ✅ 你現在有 `.cursorrules`
- 包含：程式碼風格、命名規範、最佳實踐、安全規範

**專業建議**：
- 參考業界標準（如 Airbnb JavaScript Style Guide）
- 根據團隊習慣調整
- 定期更新（隨著專案成長）

---

## 🚀 實際開發流程

### Step 1: 專案初始化
```
1. 建立專案結構
2. 設定開發環境
3. 安裝依賴
4. 設定 CI/CD（可選）
```

### Step 2: 基礎設施設定
```
1. 資料庫設定（你已完成）
2. 認證系統（你已完成）
3. 環境變數配置
4. 錯誤處理機制
```

### Step 3: 功能開發（迭代循環）

#### 3.1 選擇功能（從 plan.md）
- 選擇下一個優先級高的功能
- 確認依賴關係（某些功能需要先完成其他功能）

#### 3.2 設計實現方案
- 思考：這個功能需要哪些檔案？
- 思考：需要哪些 API endpoints？
- 思考：需要哪些 UI components？
- 思考：資料庫需要什麼變更？

#### 3.3 使用 Cursor 開發
```
1. 開啟 Composer (Cmd/Ctrl + I)
2. 描述需求："根據 plan.md 的 Phase 1，實作語音錄製功能"
3. Cursor 會參考：
   - .cursorrules（遵循規範）
   - plan.md（了解需求）
   - 現有程式碼（保持一致性）
4. 審查生成的程式碼
5. 測試功能
6. 重複直到完成
```

#### 3.4 更新計劃
- 在 plan.md 中標記完成的功能
- 記錄遇到的問題和解決方案
- 調整後續計劃（如果需要）

#### 3.5 提交程式碼
```
1. 測試通過
2. 程式碼審查（自己或團隊）
3. Commit（使用 conventional commits）
4. Push
```

---

## 💡 專業工程師的實際做法

### 1. 不是所有專案都需要完整的文檔

**小型專案（1-2 週）**：
- PRD（簡單版）
- 基本的 plan.md
- 簡單的 .cursorrules

**中型專案（1-3 個月）**：
- 完整的 PRD
- 詳細的 plan.md（分階段）
- 完整的 .cursorrules
- 技術設計文件（可選）

**大型專案（3+ 個月）**：
- 完整的 PRD + 需求分析
- 詳細的技術設計文件
- 完整的 plan.md（分階段、里程碑）
- 完整的 .cursorrules + 團隊規範
- API 文件
- 測試計劃

### 2. 文檔是活的，不是一次性的

**專業做法**：
- ✅ 開始時建立基本結構
- ✅ 開發過程中持續更新
- ✅ 完成功能後更新計劃
- ✅ 發現新需求時更新 PRD
- ✅ 遇到問題時更新規則

**不專業的做法**：
- ❌ 一開始寫超詳細，之後都不更新
- ❌ 寫完就忘記，從不參考
- ❌ 計劃和實際開發脫節

### 3. 使用 Cursor 的最佳實踐

#### 開發前
```
1. 確保 PRD 清楚
2. 更新 plan.md 標記下一個任務
3. 檢查 .cursorrules 是否涵蓋新功能的需求
```

#### 開發中
```
1. 使用 Composer 描述需求
2. 引用相關檔案："參考 app/login/page.tsx 的樣式"
3. 遵循規則："使用 .cursorrules 中的命名規範"
4. 參考計劃："實作 plan.md 中 Phase 1 的語音錄製"
```

#### 開發後
```
1. 測試功能
2. 更新 plan.md（標記完成）
3. 如果發現新規則，更新 .cursorrules
4. 如果發現新需求，更新 PRD
```

---

## 🎯 你的專案目前狀態

### ✅ 已完成（專業水準）
- [x] PRD.md - 完整的需求文件
- [x] plan.md - 詳細的開發計劃
- [x] .cursorrules - 完整的開發規範
- [x] 專案結構 - 清晰的組織
- [x] 基礎設施 - 資料庫、認證、AI 架構

### 📝 建議補充（進階）
- [ ] API 設計文件（如果 API 複雜）
- [ ] 測試計劃（如果要做測試）
- [ ] 部署文件（如果要做部署）
- [ ] 錯誤處理策略文件（如果專案複雜）

---

## 🔄 實際工作流程範例

### 場景：要實作語音錄製功能

#### 1. 準備階段（5 分鐘）
```
- 查看 plan.md：確認這是 Phase 1 的任務
- 查看 PRD.md：確認功能需求細節
- 檢查 .cursorrules：確認相關規範
```

#### 2. 設計階段（10 分鐘）
```
- 思考：需要哪些檔案？
  - components/VoiceRecorder.tsx
  - app/dashboard/journal/page.tsx
  - 可能需要更新 API route
- 思考：需要哪些依賴？
  - 可能需要 audio recording library
```

#### 3. 開發階段（使用 Cursor）
```
開啟 Composer，輸入：
"根據 plan.md 的 Phase 1，實作語音錄製功能。
需要：
1. 建立 VoiceRecorder component
2. 可以開始/停止錄音
3. 顯示錄音時間
4. 可以播放預覽
5. 可以上傳到 /api/transcribe
遵循 .cursorrules 的規範"
```

#### 4. 測試階段
```
- 測試錄音功能
- 測試上傳功能
- 測試錯誤處理
```

#### 5. 更新階段（5 分鐘）
```
- 在 plan.md 中標記完成
- 如果有新發現，更新 .cursorrules
- Commit 程式碼
```

---

## 📚 專業建議總結

### 文檔優先順序
1. **PRD** - 最重要，定義要做什麼
2. **plan.md** - 次重要，定義怎麼做
3. **.cursorrules** - 重要，確保品質
4. **其他文檔** - 根據專案複雜度決定

### 開發節奏
- **不要**：一開始寫超多文檔，然後才開始寫程式碼
- **要**：建立基本結構，邊開發邊完善
- **要**：文檔和程式碼同步更新

### Cursor 使用
- **要**：充分利用 plan.md 和 .cursorrules
- **要**：在對話中引用這些文件
- **要**：讓 Cursor 理解你的專案結構和規範

---

## 🎓 學習資源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [User Stories Format](https://www.atlassian.com/agile/project-management/user-stories)
- [MoSCoW Prioritization](https://www.productplan.com/glossary/moscow-prioritization/)

---

**記住**：文檔是工具，不是目的。好的文檔應該幫助你更快、更好地開發，而不是成為負擔。

