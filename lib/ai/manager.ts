/**
 * AI Provider Manager - 統一管理所有 AI Providers
 * 提供統一的介面來使用不同的 AI 服務
 */

import {
  createTranscriptionProvider,
  createLLMProvider,
  createEmbeddingProvider,
  getDefaultProviders,
} from "./providers";
import type {
  TranscriptionProvider,
  LLMProvider,
  EmbeddingProvider,
  ChatMessage,
  LLMOptions,
  ToneAnalysis,
  TranscriptionResult,
} from "./types";

export class AIProviderManager {
  private transcriptionProvider: TranscriptionProvider;
  private llmProvider: LLMProvider;
  private embeddingProvider: EmbeddingProvider;

  constructor() {
    const providers = getDefaultProviders();
    this.transcriptionProvider = createTranscriptionProvider(providers.transcription);
    this.llmProvider = createLLMProvider(providers.llm);
    this.embeddingProvider = createEmbeddingProvider(providers.embedding);
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult> {
    return this.transcriptionProvider.transcribe(audioFile);
  }

  /**
   * Generate chat completion
   */
  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    return this.llmProvider.chat(messages, options);
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    return this.embeddingProvider.embed(text);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this.embeddingProvider.embedBatch) {
      return this.embeddingProvider.embedBatch(texts);
    }
    // Fallback: generate embeddings one by one
    const embeddings = await Promise.all(
      texts.map((text) => this.embeddingProvider.embed(text))
    );
    return embeddings;
  }

  /**
   * Analyze tone and sentiment (using LLM)
   */
  async analyzeTone(text: string): Promise<ToneAnalysis> {
    const systemPrompt = `Analyze the user's journal entry. Return JSON only, no other text:
{
  "tone": "positive" | "negative" | "neutral" | "seeking_help",
  "emotionTags": ["tag1", "tag2"],
  "sentiment_score": 0.0 to 1.0,
  "energy_score": 0.0 to 1.0
}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ];

    const response = await this.chat(messages, {
      temperature: 0.3,
      maxTokens: 200,
    });

    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found in response");
    } catch (error) {
      console.error("Failed to parse tone analysis:", error);
      // Return default values if parsing fails
      return {
        tone: "neutral",
        emotionTags: [],
        sentiment_score: 0.5,
        energy_score: 0.5,
      };
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      transcription: this.transcriptionProvider.getName(),
      llm: `${this.llmProvider.getName()} (${this.llmProvider.getModel()})`,
      embedding: `${this.embeddingProvider.getName()}${this.embeddingProvider.getDimensions ? ` (${this.embeddingProvider.getDimensions()}D)` : ""}`,
    };
  }
}

// Singleton instance
let aiManager: AIProviderManager | null = null;

export function getAIManager(): AIProviderManager {
  if (!aiManager) {
    aiManager = new AIProviderManager();
  }
  return aiManager;
}

