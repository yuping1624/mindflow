import OpenAI from "openai";
import type { EmbeddingProvider } from "@/lib/ai/types";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  }

  getName(): string {
    return "OpenAI";
  }

  getDimensions(): number {
    return 1536; // text-embedding-3-small dimension
  }
}

