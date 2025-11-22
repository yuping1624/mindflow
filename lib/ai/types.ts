/**
 * AI Provider 統一介面定義
 * 所有 AI provider 都必須實作這些介面
 */

// 語音轉文字結果
export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

// Embedding 結果
export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

// Tone 分析結果
export interface ToneAnalysis {
  tone: "positive" | "negative" | "neutral" | "seeking_help";
  emotionTags: string[];
  sentiment_score: number; // 0.0 to 1.0
  energy_score: number; // 0.0 to 1.0
}

// LLM 回應結果
export interface LLMResponse {
  content: string;
  model: string;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number;
}

// Provider 配置
export interface ProviderConfig {
  provider: "openai" | "assemblyai" | "groq" | "gemini" | "huggingface";
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

// 語音轉文字 Provider 介面
export interface TranscriptionProvider {
  transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult>;
  getCostEstimate(durationSeconds: number): number;
  getName(): string;
}

// Embedding Provider 介面
export interface EmbeddingProvider {
  // Main embedding method (used by existing providers)
  embed(text: string): Promise<number[]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
  
  // Optional: Advanced embedding method with metadata
  generateEmbedding?(text: string): Promise<EmbeddingResult>;
  
  getCostEstimate(tokenCount: number): number;
  getName(): string;
  getDimensions?(): number;
}

// LLM Provider 介面
export interface LLMProvider {
  // Main chat method (used by existing providers)
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  
  // Optional: Advanced response method with metadata
  generateResponse?(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse>;
  
  analyzeTone(text: string): Promise<ToneAnalysis>;
  getCostEstimate(inputTokens: number, outputTokens: number, model?: string): number;
  getName(): string;
  getModel(): string;
}

// Chat Message (用於現有架構兼容)
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// LLM Options (用於現有架構兼容)
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Provider Type 定義
export type TranscriptionProviderType = "openai" | "assemblyai";
export type LLMProviderType = "openai" | "groq" | "gemini";
export type EmbeddingProviderType = "openai" | "huggingface";

// 統一的 AI Manager 介面
export interface AIManager {
  // 語音轉文字
  transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult>;
  
  // Embedding
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  
  // Tone 分析
  analyzeTone(text: string): Promise<ToneAnalysis>;
  
  // LLM 回應
  generateResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse>;
  
  // 成本估算
  estimateCost(operation: "transcribe" | "embedding" | "tone" | "llm", params: any): number;
}
