# AI Provider 設定指南

## 🎯 統一 Provider 介面架構

這個專案使用統一的 AI Provider 介面，可以輕鬆切換不同的 AI 服務，無需修改業務邏輯。

## 📦 支援的 Providers

### 語音轉文字 (Transcription)
- **AssemblyAI** ⭐ 推薦（免費額度：每月 5 小時）
- **OpenAI Whisper**（備選）

### LLM (語言模型)
- **Groq** ⭐ 推薦（免費額度，超快）
- **Google Gemini**（免費額度：每月 15 RPM）
- **OpenAI GPT**（備選，需要 credits）

### Embeddings (向量嵌入)
- **Hugging Face** ⭐ 推薦（免費）
- **OpenAI**（備選，需要 credits）

## 🚀 快速開始

### 1. 取得 API Keys

#### AssemblyAI (語音轉文字)
1. 前往 [https://www.assemblyai.com/](https://www.assemblyai.com/)
2. 註冊帳號（免費）
3. 在 Dashboard 取得 API Key
4. 免費額度：**每月 5 小時**

#### Groq (LLM)
1. 前往 [https://console.groq.com/](https://console.groq.com/)
2. 註冊帳號（免費）
3. 在 API Keys 頁面建立新的 Key
4. 免費額度：**有限，但通常足夠開發**

#### Hugging Face (Embeddings)
1. 前往 [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. 建立新的 Access Token
3. **注意**：API key 是可選的（有免費額度），但建議設定以獲得更好的 rate limits

### 2. 設定環境變數

在 `.env.local` 檔案中設定：

```bash
# 必須設定的（根據你選擇的 provider）
ASSEMBLYAI_API_KEY=your-assemblyai-key
GROQ_API_KEY=your-groq-key
HUGGINGFACE_API_KEY=your-huggingface-key  # 可選，但建議設定

# 可選的（如果之後想切換到 OpenAI）
OPENAI_API_KEY=sk-proj-your-openai-key

# Provider 選擇（可選，不設定則使用預設值）
AI_TRANSCRIPTION_PROVIDER=assemblyai  # 或 openai
AI_LLM_PROVIDER=groq                  # 或 openai, gemini
AI_EMBEDDING_PROVIDER=huggingface     # 或 openai
```

### 3. 預設配置

如果不設定環境變數，系統會使用以下預設值（都是免費/便宜的方案）：

```typescript
{
  transcription: "assemblyai",  // 每月 5 小時免費
  llm: "groq",                  // 免費額度
  embedding: "huggingface"      // 免費
}
```

## 🔄 切換 Providers

### 方法 1: 環境變數（推薦）

在 `.env.local` 中設定：

```bash
AI_TRANSCRIPTION_PROVIDER=openai
AI_LLM_PROVIDER=openai
AI_EMBEDDING_PROVIDER=openai
```

### 方法 2: 程式碼中動態切換

```typescript
import { getAIManager } from "@/lib/ai/manager";

const aiManager = getAIManager();
// 使用統一的介面，無需關心底層 provider
const text = await aiManager.transcribe(audioFile);
```

## 💰 成本比較

### 免費方案（預設）
- **AssemblyAI**: 每月 5 小時免費
- **Groq**: 免費額度
- **Hugging Face**: 免費額度
- **總成本**: $0/月（在免費額度內）

### 付費方案（如果需要更多使用量）
- **AssemblyAI**: $0.015/分鐘（約 $0.90/小時）
- **Groq**: 非常便宜（約 $0.05-0.59 / 1M tokens）
- **Hugging Face**: 免費額度通常足夠

### OpenAI 方案（備選）
- **Whisper**: $0.006/分鐘
- **GPT-4o-mini**: ~$0.15 / 1M input tokens
- **GPT-4o**: ~$2.50 / 1M input tokens
- **Embeddings**: $0.02 / 1M tokens

## 🛠️ 使用範例

### 語音轉文字

```typescript
import { getAIManager } from "@/lib/ai/manager";

const aiManager = getAIManager();
const result = await aiManager.transcribe(audioFile);
console.log(result.text); // 轉錄的文字
```

### 生成 Embedding

```typescript
const result = await aiManager.generateEmbedding("Hello, world!");
console.log(result.embedding); // 向量陣列
console.log(result.model);     // 使用的模型
```

### Tone 分析

```typescript
const analysis = await aiManager.analyzeTone("I'm feeling great today!");
console.log(analysis.tone);           // "positive"
console.log(analysis.sentiment_score); // 0.8
console.log(analysis.emotionTags);     // ["happy", "energetic"]
```

### LLM 回應

```typescript
const response = await aiManager.generateResponse([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello!" }
]);
console.log(response.content); // AI 回應
console.log(response.tokens);  // Token 使用量
console.log(response.cost);   // 估算成本
```

## ⚠️ 注意事項

### Hugging Face Embedding 維度

Hugging Face 的預設模型 (`all-MiniLM-L6-v2`) 產生 **384 維**的向量，而資料庫 schema 設定為 **1536 維**（OpenAI 的格式）。

**解決方案**：
1. **使用 OpenAI embeddings**（如果有多餘的 credits）
2. **調整資料庫 schema** 支援 384 或 768 維度
3. **使用填充方法**（不推薦，但可用於開發）

### API Key 安全

- ✅ **可以提交到 Git**: `.env.local.example`（不含真實 keys）
- ❌ **絕對不要提交**: `.env.local`（包含真實 keys）
- ✅ **確認 .gitignore**: 已包含 `.env*.local`

## 🔍 故障排除

### 錯誤：API Key 未設定

```
Error: ASSEMBLYAI_API_KEY is not set
```

**解決**：在 `.env.local` 中設定對應的 API key

### 錯誤：Provider 不存在

```
Error: Unknown transcription provider: xxx
```

**解決**：檢查 `AI_TRANSCRIPTION_PROVIDER` 環境變數是否正確

### Hugging Face 模型載入中

如果 Hugging Face API 返回 503 錯誤，表示模型正在載入。系統會自動重試，但可能需要等待幾秒到幾分鐘。

## 📚 更多資訊

- [AssemblyAI 文件](https://www.assemblyai.com/docs)
- [Groq 文件](https://console.groq.com/docs)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [OpenAI API 文件](https://platform.openai.com/docs)
