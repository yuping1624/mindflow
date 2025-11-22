/**
 * Hugging Face Provider - Embeddings
 * 免費額度：有限
 * 付費：按使用量計費
 */

import type { EmbeddingProvider, EmbeddingResult } from "../types";

export class HuggingFaceProvider implements EmbeddingProvider {
  private apiKey: string;
  private baseURL: string = "https://api-inference.huggingface.co/pipeline";
  private model: string = "sentence-transformers/all-MiniLM-L6-v2"; // 384 dimensions
  // 或使用 "sentence-transformers/all-mpnet-base-v2" (768 dimensions)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || "";
    // Hugging Face API key 是可選的（有免費額度）
    // 但建議設定以獲得更好的 rate limits
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // 使用 Hugging Face Inference API
      const response = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
        {
          method: "POST",
          headers: {
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text,
            options: {
              wait_for_model: true, // 等待模型載入
            },
          }),
        }
      );

      if (!response.ok) {
        // 如果模型還在載入，等待後重試
        if (response.status === 503) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.generateEmbedding(text); // 重試
        }

        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
      }

      const embedding = await response.json();

      // Hugging Face 返回的是二維陣列（批次），我們只需要第一個
      const embeddingArray = Array.isArray(embedding[0]) ? embedding[0] : embedding;

      // 如果維度是 384，我們需要轉換成 1536（Supabase 的格式）
      // 或者使用不同的模型
      // 這裡我們使用 all-MiniLM-L6-v2 (384 dims) 並填充到 1536
      // 更好的做法是使用支援 1536 維度的模型或調整資料庫 schema
      
      // 簡單的填充方法（不理想，但可用）
      // 更好的方案：使用 "sentence-transformers/all-mpnet-base-v2" (768 dims)
      // 或調整資料庫使用 384 或 768 維度
      
      let finalEmbedding: number[];
      if (embeddingArray.length === 384) {
        // 填充到 1536（重複並調整）
        finalEmbedding = [
          ...embeddingArray,
          ...embeddingArray.map((v: number) => v * 0.5),
          ...embeddingArray.map((v: number) => v * 0.25),
          ...embeddingArray.map((v: number) => v * 0.125),
        ].slice(0, 1536);
      } else if (embeddingArray.length === 768) {
        // 填充到 1536（重複）
        finalEmbedding = [...embeddingArray, ...embeddingArray];
      } else {
        finalEmbedding = embeddingArray.slice(0, 1536);
      }

      return {
        embedding: finalEmbedding,
        model: this.model,
      };
    } catch (error) {
      console.error("Hugging Face embedding error:", error);
      throw error;
    }
  }

  getCostEstimate(tokenCount: number): number {
    // Hugging Face 有免費額度
    // 付費定價需要查看最新文件
    // 這裡假設免費額度內為 0
    return 0;
  }
}


