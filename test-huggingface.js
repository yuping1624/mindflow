/**
 * Hugging Face API 測試腳本
 * 
 * 使用方法：
 * 1. 確保 .env.local 中有 HUGGINGFACE_API_KEY
 * 2. 運行: node test-huggingface.js
 * 
 * 或者直接設置環境變數：
 * HUGGINGFACE_API_KEY=your-key node test-huggingface.js
 */

const fs = require('fs');
const path = require('path');

// 讀取 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      // 跳過註釋和空行
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const match = trimmedLine.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // 移除引號
        value = value.replace(/^["']|["']$/g, '');
        // 移除尾隨註釋
        value = value.split('#')[0].trim();
        if (!process.env[key] && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

// 載入環境變數
loadEnvFile();

const API_KEY = process.env.HUGGINGFACE_API_KEY;

// 驗證 API Key 格式
if (API_KEY && !API_KEY.startsWith('hf_')) {
  console.warn('⚠️  警告: API Key 似乎不是有效的 Hugging Face token 格式（應該以 hf_ 開頭）');
}
const TEST_TEXT = "This is a test sentence for embedding generation.";

// 測試的模型列表（優先測試 BAAI/bge-small-en-v1.5）
const MODELS = [
  "BAAI/bge-small-en-v1.5", // 優先測試這個
  "sentence-transformers/all-MiniLM-L6-v2",
  "sentence-transformers/all-mpnet-base-v2",
];

// 測試的端點格式
// 根據 Hugging Face 文檔，Inference API 的格式是: https://api-inference.huggingface.co/models/{model}
// 但根據錯誤訊息，api-inference.huggingface.co 已棄用，要使用 router.huggingface.co
// 然而 router API 可能需要不同的格式或配置
const ENDPOINT_FORMATS = [
  {
    name: "Inference API - /models/{model} (標準格式)",
    url: (model) => `https://api-inference.huggingface.co/models/${model}`,
    note: "雖然已棄用，但可能仍可使用",
  },
  {
    name: "Router API - /models/{model}",
    url: (model) => `https://router.huggingface.co/models/${model}`,
    note: "新端點，但格式可能不同",
  },
  {
    name: "Router API - /inference/{model}",
    url: (model) => `https://router.huggingface.co/inference/${model}`,
    note: "嘗試不同的路徑格式",
  },
  {
    name: "Router API - /pipeline/feature-extraction/{model}",
    url: (model) => `https://router.huggingface.co/pipeline/feature-extraction/${model}`,
    note: "Fallback path used in implementation",
  },
  {
    name: "Router API - /hf-inference/models/{model}",
    url: (model) => `https://router.huggingface.co/hf-inference/models/${model}`,
    note: "Suggested by search results",
  },
  {
    name: "Router API - /hf-inference/pipeline/feature-extraction/{model}",
    url: (model) => `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${model}`,
    note: "Suggested by search results (fallback)",
  },
  {
    name: "User Suggested - /hf-inference/models/{model}/pipeline/feature-extraction",
    url: (model) => `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`,
    note: "User suggested specific path",
  },
];

async function testEndpoint(endpointFormat, model) {
  const url = endpointFormat.url(model);
  console.log(`\n📡 Testing: ${endpointFormat.name}`);
  if (endpointFormat.note) {
    console.log(`   Note: ${endpointFormat.note}`);
  }
  console.log(`   Model: ${model}`);
  console.log(`   URL: ${url}`);

  try {
    const startTime = Date.now();

    // 驗證 API Key
    if (!API_KEY || API_KEY.length < 10) {
      throw new Error('Invalid API Key');
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: TEST_TEXT,
        options: {
          wait_for_model: true,
        },
      }),
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Duration: ${duration}ms`);

    if (response.ok) {
      // 檢查回應格式
      if (Array.isArray(responseData)) {
        const embedding = Array.isArray(responseData[0]) ? responseData[0] : responseData;
        console.log(`   ✅ Success! Embedding dimension: ${embedding.length}`);
        console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(", ")}...]`);
        return { success: true, dimension: embedding.length, data: embedding };
      } else if (responseData.error) {
        console.log(`   ❌ Error in response: ${responseData.error}`);
        return { success: false, error: responseData.error };
      } else {
        console.log(`   ⚠️  Unexpected response format:`, responseData);
        return { success: false, error: "Unexpected response format" };
      }
    } else {
      console.log(`   ❌ Failed: ${responseData.error || responseData.message || responseText}`);
      return { success: false, error: responseData.error || responseData.message || response.statusText };
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("=".repeat(80));
  console.log("Hugging Face API 測試腳本");
  console.log("=".repeat(80));

  if (!API_KEY) {
    console.error("\n❌ 錯誤: HUGGINGFACE_API_KEY 未設定");
    console.log("\n請在 .env.local 中設定，或使用環境變數：");
    console.log("  HUGGINGFACE_API_KEY=your-key node test-huggingface.js");
    process.exit(1);
  }

  console.log(`\n✅ API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`📝 Test Text: "${TEST_TEXT}"`);

  const results = [];

  // 測試每個模型和每個端點格式
  for (const model of MODELS) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`測試模型: ${model}`);
    console.log("=".repeat(80));

    for (const endpointFormat of ENDPOINT_FORMATS) {
      const result = await testEndpoint(endpointFormat, model);
      results.push({
        model,
        endpoint: endpointFormat.name,
        ...result,
      });

      // 如果成功，就不需要測試其他格式了
      if (result.success) {
        console.log(`\n✅ 找到可用的端點！跳過其他格式測試。`);
        break;
      }

      // 等待一下再測試下一個端點
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 總結
  console.log(`\n${"=".repeat(80)}`);
  console.log("測試總結");
  console.log("=".repeat(80));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log("\n✅ 成功的測試:");
    successful.forEach((r) => {
      console.log(`   - ${r.model} via ${r.endpoint}`);
      console.log(`     維度: ${r.dimension}`);
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ 失敗的測試:");
    failed.forEach((r) => {
      console.log(`   - ${r.model} via ${r.endpoint}`);
      console.log(`     錯誤: ${r.error}`);
    });
  }

  // 推薦配置
  if (successful.length > 0) {
    const best = successful[0];
    console.log(`\n💡 推薦配置:`);
    console.log(`   使用模型: ${best.model}`);
    console.log(`   使用端點: ${best.endpoint}`);
    console.log(`   嵌入維度: ${best.dimension}`);

    if (best.dimension !== 1536) {
      console.log(`\n⚠️  注意: 此模型產生 ${best.dimension} 維向量，`);
      console.log(`   而資料庫需要 1536 維。系統會自動填充，但建議：`);
      console.log(`   1. 使用 OpenAI embeddings (1536 維)`);
      console.log(`   2. 或調整資料庫 schema 支援 ${best.dimension} 維`);
    }
  } else {
    console.log(`\n❌ 所有測試都失敗了。建議：`);
    console.log(`   1. 檢查 API Key 是否有 Read 權限`);
    console.log(`   2. 檢查網路連線`);
    console.log(`   3. 考慮切換到 OpenAI embeddings`);
  }
}

// 運行測試
runTests().catch((error) => {
  console.error("\n❌ 測試腳本執行錯誤:", error);
  process.exit(1);
});

