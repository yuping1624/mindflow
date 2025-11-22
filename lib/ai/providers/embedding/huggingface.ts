import type { EmbeddingProvider } from "@/lib/ai/types";

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor(
    model?: string,
    dimensions?: number
  ) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not set");
    }
    this.apiKey = apiKey;

    // 從環境變數或參數獲取模型
    this.model = model || process.env.HUGGINGFACE_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

    // 根據模型設定維度
    if (dimensions) {
      this.dimensions = dimensions;
    } else if (this.model.includes("bge-small")) {
      this.dimensions = 384; // bge-small-en-v1.5 is 384D
    } else if (this.model.includes("mpnet")) {
      this.dimensions = 768; // all-mpnet-base-v2 is 768D
    } else {
      this.dimensions = 384; // all-MiniLM-L6-v2 is 384D (default)
    }
  }

  async embed(text: string, retryCount: number = 0): Promise<number[]> {
    const maxRetries = 3;

    try {
      // Hugging Face Inference API endpoint
      // Use the new router API with hf-inference path and pipeline/feature-extraction
      let apiUrl = `https://router.huggingface.co/hf-inference/models/${this.model}/pipeline/feature-extraction`;

      let response;
      let errorDetails = ""; // Declare errorDetails here

      response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
          },
        }),
      });

      // Store error details for better error messages
      if (!response.ok) {
        try {
          const errorText = await response.text();
          errorDetails = errorText;
        } catch {
          errorDetails = response.statusText;
        }
      }

      if (!response.ok) {
        // Handle 503 Service Unavailable (model loading)
        if (response.status === 503 && retryCount < maxRetries) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
          console.log(`Model loading, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.embed(text, retryCount + 1);
        }

        // Handle 410 Gone (endpoint deprecated - should not happen with router API)
        if (response.status === 410) {
          throw new Error(
            `HuggingFace API endpoint deprecated (410 Gone). ` +
            `The old api-inference.huggingface.co endpoint is no longer supported. ` +
            `Please ensure you're using the latest code version with router.huggingface.co. ` +
            `Error: ${errorDetails || response.statusText}`
          );
        }

        // Handle 404 Not Found (model or endpoint not found)
        if (response.status === 404) {
          throw new Error(
            `HuggingFace model or endpoint not found (404). ` +
            `Model: "${this.model}". ` +
            `Please verify the model name is correct or try a different model. ` +
            `Error: ${errorDetails || response.statusText}`
          );
        }

        // Handle other errors
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(
          `HuggingFace API error (${response.status}): ${errorData.error || errorData.message || response.statusText}`
        );
      }

      const result = await response.json();

      // Handle error in response body (Hugging Face sometimes returns 200 with error)
      if (result.error) {
        throw new Error(`HuggingFace API error: ${result.error}`);
      }

      return Array.isArray(result[0]) ? result[0] : result;
    } catch (error) {
      // If it's already a formatted error, re-throw it
      if (error instanceof Error && error.message.includes("HuggingFace")) {
        throw error;
      }
      // Otherwise, wrap it
      throw new Error(
        `HuggingFace embedding failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Use new router API endpoint
    // Format: https://router.huggingface.co/hf-inference/models/{model}/pipeline/feature-extraction
    const apiUrl = `https://router.huggingface.co/hf-inference/models/${this.model}/pipeline/feature-extraction`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: texts,
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(
        `HuggingFace API error (${response.status}): ${errorData.error || errorData.message || response.statusText}`
      );
    }

    const result = await response.json();

    // Handle error in response body
    if (result.error) {
      throw new Error(`HuggingFace API error: ${result.error}`);
    }

    return result;
  }

  getCostEstimate(tokenCount: number): number {
    // Hugging Face has free tier
    return 0;
  }

  getName(): string {
    return "Hugging Face";
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

