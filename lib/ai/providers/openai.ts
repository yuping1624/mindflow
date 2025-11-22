/**
 * OpenAI Provider - 完整的 AI 服務
 * 作為備選方案，當有 credits 時可以使用
 */

import OpenAI from "openai";
import type {
  TranscriptionProvider,
  EmbeddingProvider,
  LLMProvider,
  TranscriptionResult,
  EmbeddingResult,
  LLMResponse,
  ToneAnalysis,
  ChatMessage,
  LLMOptions,
} from "../types";

export class OpenAIProvider
  implements TranscriptionProvider, EmbeddingProvider, LLMProvider
{
  private client: OpenAI;
  private embeddingModel: string = "text-embedding-3-small"; // 1536 dimensions

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey: key });
  }

  // Transcription
  async transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult> {
    try {
      let file: File | Buffer;
      
      if (audioFile instanceof File) {
        file = audioFile;
      } else if (audioFile instanceof Buffer) {
        file = audioFile;
      } else if (typeof audioFile === "string") {
        // URL string - 下載後轉換
        const response = await fetch(audioFile);
        const blob = await response.blob();
        file = new File([blob], "audio.mp3", { type: blob.type });
      } else {
        throw new Error("Unsupported audio file type");
      }

      const transcription = await this.client.audio.transcriptions.create({
        file: file as File,
        model: "whisper-1",
      });

      return {
        text: transcription.text,
        language: undefined, // OpenAI Whisper doesn't return language in this response
      };
    } catch (error) {
      console.error("OpenAI transcription error:", error);
      throw error;
    }
  }

  // Transcription cost estimate
  getCostEstimate(durationSeconds: number): number;
  // Embedding cost estimate
  getCostEstimate(tokenCount: number): number;
  // LLM cost estimate
  getCostEstimate(inputTokens: number, outputTokens: number, model?: string): number;
  
  getCostEstimate(
    durationSecondsOrTokens: number,
    outputTokens?: number,
    model?: string
  ): number {
    // If called with 3 args or 2 args (second is number), it's LLM
    if (outputTokens !== undefined || arguments.length === 3) {
      const inputTokens = durationSecondsOrTokens;
      const m = model || "gpt-4o-mini";
      let inputPrice = 0.15;
      let outputPrice = 0.6;
      if (m.includes("gpt-4o") && !m.includes("mini")) {
        inputPrice = 2.5;
        outputPrice = 10.0;
      }
      return (inputTokens / 1_000_000) * inputPrice + ((outputTokens || 0) / 1_000_000) * outputPrice;
    }
    
    // If called with 1 arg, check context - for transcription it's duration, for embedding it's tokens
    // We'll use a heuristic: if value is < 1000, it's likely duration in seconds
    // Otherwise it's token count
    if (durationSecondsOrTokens < 1000) {
      // Transcription: $0.006 per minute = $0.0001 per second
      return durationSecondsOrTokens * 0.0001;
    } else {
      // Embedding: $0.02 per 1M tokens
      return (durationSecondsOrTokens / 1_000_000) * 0.02;
    }
  }

  // Embedding
  async embed(text: string): Promise<number[]> {
    const result = await this.generateEmbedding(text);
    return result.embedding;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model: this.embeddingModel,
      };
    } catch (error) {
      console.error("OpenAI embedding error:", error);
      throw error;
    }
  }

  // LLM
  async generateResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse> {
    try {
      const model = options?.model || "gpt-4o-mini";
      
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      });

      return {
        content: response.choices[0].message.content || "",
        model: response.model,
        tokens: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
        },
        cost: this.getCostEstimate(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0,
          model
        ),
      };
    } catch (error) {
      console.error("OpenAI LLM error:", error);
      throw error;
    }
  }

  async analyzeTone(text: string): Promise<ToneAnalysis> {
    const systemPrompt = `Analyze the user's journal entry. Return ONLY valid JSON, no other text:
{
  "tone": "positive" | "negative" | "neutral" | "seeking_help",
  "emotionTags": ["tag1", "tag2"],
  "sentiment_score": 0.0 to 1.0,
  "energy_score": 0.0 to 1.0
}`;

    const response = await this.generateResponse(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      {
        temperature: 0.3,
        maxTokens: 200,
        model: "gpt-4o-mini",
      }
    );

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);

      return {
        tone: parsed.tone,
        emotionTags: parsed.emotionTags || [],
        sentiment_score: Math.max(0, Math.min(1, parsed.sentiment_score || 0.5)),
        energy_score: Math.max(0, Math.min(1, parsed.energy_score || 0.5)),
      };
    } catch (error) {
      console.error("Failed to parse tone analysis:", error);
      return {
        tone: "neutral",
        emotionTags: [],
        sentiment_score: 0.5,
        energy_score: 0.5,
      };
    }
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const response = await this.generateResponse(
      messages.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        model: options?.model,
      }
    );
    return response.content;
  }

  getName(): string {
    return "OpenAI";
  }

  getModel(): string {
    return "gpt-4o-mini";
  }
}


