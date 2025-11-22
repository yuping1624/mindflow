# 🚀 MindFlow 快速開始指南

## ✅ 已完成設定

1. ✅ Next.js 14 專案初始化
2. ✅ Supabase 資料庫設定完成
3. ✅ AI Provider 統一介面架構完成
4. ✅ 支援多個免費 AI 服務

## 📋 下一步：取得 API Keys

### 1. AssemblyAI (語音轉文字) - 必須

**免費額度：每月 5 小時**

1. 前往 [https://www.assemblyai.com/](https://www.assemblyai.com/)
2. 註冊帳號（免費）
3. 在 Dashboard 取得 API Key
4. 複製 API Key

### 2. Groq (LLM) - 必須

**免費額度：有限，但足夠開發**

1. 前往 [https://console.groq.com/](https://console.groq.com/)
2. 註冊帳號（免費）
3. 在 API Keys 頁面建立新的 Key
4. 複製 API Key

### 3. Hugging Face (Embeddings) - 建議

**免費額度：有限，但通常足夠**

1. 前往 [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. 建立新的 Access Token
3. 複製 Token

**注意**：Hugging Face API key 是可選的，但建議設定以獲得更好的 rate limits。

## 🔧 設定環境變數

1. **建立 `.env.local` 檔案**（如果還沒有）：

```bash
cd /Users/yuping/coding/mindflow
touch .env.local
```

2. **編輯 `.env.local`**，加入以下內容：

```bash
# Supabase (從 Supabase Dashboard -> Project Settings -> API 取得)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AssemblyAI (語音轉文字)
ASSEMBLYAI_API_KEY=your-assemblyai-key

# Groq (LLM)
GROQ_API_KEY=your-groq-key

# Hugging Face (Embeddings) - 可選，但建議設定
HUGGINGFACE_API_KEY=your-huggingface-key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **儲存檔案**

## 🧪 測試設定

1. **啟動開發伺服器**：

```bash
npm run dev
```

2. **開啟瀏覽器**：

```
http://localhost:3000
```

3. **檢查是否有錯誤**：

- 如果看到錯誤訊息，檢查：
  - API keys 是否正確設定
  - `.env.local` 檔案是否存在
  - 是否重新啟動了開發伺服器（修改 .env.local 後需要重啟）

## 📚 相關文件

- **Provider 設定詳細說明**: 查看 `PROVIDER_SETUP.md`
- **環境變數設定**: 查看 `ENV_SETUP.md`
- **資料庫設定**: 查看 `db/SETUP_GUIDE.md`

## 🎯 接下來要做什麼？

1. ✅ 取得所有 API keys
2. ✅ 設定 `.env.local`
3. ✅ 測試應用程式啟動
4. 🔜 開始開發功能（登入、語音錄製、日記分析等）

## ❓ 遇到問題？

### 錯誤：API Key 未設定

**解決**：確認 `.env.local` 檔案中已設定對應的 API key

### 錯誤：無法連接到 Supabase

**解決**：
1. 檢查 Supabase 環境變數是否正確
2. 確認 Supabase 專案是否正常運行
3. 檢查網路連線

### 錯誤：Provider 初始化失敗

**解決**：
1. 檢查對應的 API key 是否正確
2. 確認 API key 是否有足夠的額度
3. 查看終端機的詳細錯誤訊息

---

**準備好了嗎？開始開發吧！** 🚀

