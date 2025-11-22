# Phase 4: AI Mode Selection - 需求規劃與問題

## 當前狀態

### 已完成 ✅
- [x] AI Mode 選擇器 UI（在 `/dashboard/journal` 頁面）
- [x] Mode-specific prompts（在 `app/api/journal/route.ts` 中實現）
- [x] Mode-aware response generation（根據 mode 調整 maxTokens 和 prompt）
- [x] Database schema 支持 `default_ai_mode`（在 `profiles` 表中）

### 已完成 ✅
- [x] 用戶偏好保存（立即保存到 profile，同時存儲到 localStorage）
- [x] 允許 per-entry mode override（每次日記都可以選擇不同 mode）
- [x] 從 profile 和 localStorage 讀取並應用 last_used_mode
- [x] Dashboard 快速模式切換
- [x] 展開的詳細模式說明（點擊 "Learn more" 查看）

---

## 需要確認的需求問題

### 1. 用戶偏好保存機制

**問題 1.1：保存時機**
- [A，未來希望朝向C] 用戶選擇 mode 後，應該何時保存到 profile？
  - A. 立即保存（每次選擇 mode 都更新 profile）
  - B. 在創建日記條目時保存
  - C. 提供獨立的"設為預設"按鈕
  - D. 其他：___________

**問題 1.2：預設模式應用**
- [B] 當用戶進入 journal 頁面時，應該如何應用 default mode？
  - A. 自動選擇 profile 中的 default_ai_mode
  - B. 顯示上次使用的 mode（需要額外存儲）
  - C. 總是從 "smart" 開始，但顯示用戶的預設偏好
  - D. 其他：___________

**問題 1.3：模式覆蓋**
- [B，未來希望朝向C] 用戶在單次日記中選擇不同的 mode，是否應該：
  - A. 只影響本次日記，不更新預設值
  - B. 自動更新為新的預設值
  - C. 詢問用戶是否要設為預設
  - D. 其他：___________

### 2. UI/UX 設計

**問題 2.1：模式選擇器位置**
- [B，未來希望朝向C] 模式選擇器應該放在哪裡？
  - A. 只在 journal 頁面（當前實現）
  - B. Dashboard 也應該有快速切換
  - C. 設置頁面（如果有的話）
  - D. 其他：___________

**問題 2.2：模式說明**
- [B] 用戶需要更詳細的模式說明嗎？
  - A. 當前簡短說明足夠（"Validation & Support", "Deep Insights", "Adaptive"）
  - B. 需要展開的詳細說明（點擊查看）
  - C. 需要工具提示（tooltip）
  - D. 其他：___________

**問題 2.3：模式指示器**
- [C] 在日記條目列表中，是否應該顯示使用的 mode？
  - A. 是，顯示 mode badge
  - B. 否，只在詳情頁顯示
  - C. 可選，用戶可以選擇是否顯示
  - D. 其他：___________

### 3. 技術實現細節

**問題 3.1：API 設計**
- [D] 更新 default_ai_mode 應該通過：
  - A. 新的 API 端點 `/api/profile/update-mode`
  - B. 在 `/api/journal` 中同時更新（如果提供 `setAsDefault` 參數）
  - C. 使用 Server Action
  - D. **✅ 已實現：使用 `/api/profile` PATCH 端點**（符合 RESTful 設計，易於擴展）

**問題 3.2：數據同步**
- [D] 如果用戶在多個設備/標籤頁使用，mode 選擇應該：
  - A. 實時同步（需要 WebSocket 或 polling）
  - B. 只在頁面載入時同步（足夠）
  - C. 不需要同步（每個標籤頁獨立）
  - D. **✅ 已實現：混合方案**（localStorage 用於快速訪問，profile 用於跨設備同步，頁面載入時同步）

### 4. 進階功能（可選）

**問題 4.1：模式推薦**
- [B，未來希望朝向C] 是否應該根據用戶的情感狀態推薦 mode？
  - A. 是，基於最近的 sentiment_score 推薦
  - B. 否，讓用戶自己選擇
  - C. 可選功能，用戶可以開啟/關閉
  - D. 其他：___________

**問題 4.2：模式統計**
- [B，未來希望朝向C] 是否應該追蹤用戶使用各 mode 的頻率？
  - A. 是，顯示在 dashboard 統計中
  - B. 否，不需要
  - C. 可選，僅供內部分析
  - D. 其他：___________

**問題 4.3：自定義模式**
- [B，未來希望朝向C] 未來是否考慮允許用戶自定義 mode 的 prompt？
  - A. 是，這是 Phase 4 的一部分
  - B. 否，保持三個固定模式
  - C. 未來考慮（Phase 7+）
  - D. 其他：___________

---

## 已實現方案 ✅

### 實現方案（基於用戶選擇）
1. ✅ **立即保存**：每次用戶選擇 mode 都立即更新 profile 和 localStorage
2. ✅ **上次使用的 mode**：使用 localStorage 存儲 `last_ai_mode`，頁面載入時優先使用
3. ✅ **自動更新預設值**：選擇 mode 時自動更新 profile 的 `default_ai_mode`
4. ✅ **Dashboard 快速切換**：在 Dashboard 添加模式選擇器卡片
5. ✅ **展開的詳細說明**：點擊 "Learn more" 查看每個模式的詳細說明
6. ✅ **API 端點**：`/api/profile` PATCH 端點用於更新 profile
7. ✅ **數據同步策略**：localStorage（快速）+ Profile（跨設備同步）+ 頁面載入時同步

### 技術決策說明

**問題 3.1 答案（API 設計）**：
- 選擇了 **獨立的 `/api/profile` PATCH 端點**
- 理由：
  - 符合 RESTful 設計原則
  - 易於擴展（未來可以更新其他 profile 欄位）
  - 職責單一，易於維護
  - 符合 Next.js 14 最佳實踐

**問題 3.2 答案（數據同步）**：
- 選擇了 **混合方案**（localStorage + Profile + 頁面載入同步）
- 理由：
  - localStorage 提供快速訪問，無需等待 API 調用
  - Profile 存儲確保跨設備同步
  - 頁面載入時同步確保數據一致性
  - 適合 MVP，未來可以升級到實時同步

---

## 實現總結

### 創建的文件
1. `/app/api/profile/route.ts` - Profile API（GET 和 PATCH）
2. `/components/DashboardAIModeSelector.tsx` - Dashboard 模式選擇器組件
3. `/components/AIModeSelector.tsx` - 可重用的模式選擇器組件（未來使用）

### 修改的文件
1. `/app/dashboard/journal/page.tsx` - 添加模式保存邏輯和詳細說明
2. `/app/dashboard/page.tsx` - 添加 Dashboard 快速切換
3. `.cursor/plan.md` - 更新 Phase 4 狀態

### 功能特點
- ✅ 立即保存模式選擇（無需額外按鈕）
- ✅ 跨頁面/設備同步（localStorage + Profile）
- ✅ 詳細的模式說明（可展開）
- ✅ Dashboard 快速切換
- ✅ 符合 `.cursorrules` 和 PRD 要求

