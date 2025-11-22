import type { EmbeddingProvider } from "@/lib/ai/types";

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor(
    model: string = "sentence-transformers/all-MiniLM-L6-v2",
    dimensions: number = 384
  ) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not set");
    }
    this.apiKey = apiKey;
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const result = await response.json();
    return Array.isArray(result[0]) ? result[0] : result;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: texts }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const result = await response.json();
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

