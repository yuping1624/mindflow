/**
 * Provider Factory - 統一建立和管理 AI Providers
 */

import type {
  TranscriptionProvider,
  LLMProvider,
  EmbeddingProvider,
  TranscriptionProviderType,
  LLMProviderType,
  EmbeddingProviderType,
} from "@/lib/ai/types";

// Transcription Providers
import { OpenAITranscriptionProvider } from "./transcription/openai";
import { AssemblyAITranscriptionProvider } from "./transcription/assemblyai";

// LLM Providers
import { OpenAILLMProvider } from "./llm/openai";
import { GroqLLMProvider } from "./llm/groq";
import { GeminiLLMProvider } from "./llm/gemini";

// Embedding Providers
import { OpenAIEmbeddingProvider } from "./embedding/openai";
import { HuggingFaceEmbeddingProvider } from "./embedding/huggingface";

/**
 * Create Transcription Provider
 */
export function createTranscriptionProvider(
  type: TranscriptionProviderType = "assemblyai"
): TranscriptionProvider {
  switch (type) {
    case "openai":
      return new OpenAITranscriptionProvider();
    case "assemblyai":
      return new AssemblyAITranscriptionProvider();
    default:
      throw new Error(`Unknown transcription provider: ${type}`);
  }
}

/**
 * Create LLM Provider
 */
export function createLLMProvider(
  type: LLMProviderType = "groq",
  model?: string
): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAILLMProvider(
        (model as "gpt-4o" | "gpt-4o-mini") || "gpt-4o-mini"
      );
    case "groq":
      return new GroqLLMProvider(
        (model as "llama-3.1-8b-instant" | "llama-3.1-70b-versatile") ||
          "llama-3.1-8b-instant"
      );
    case "gemini":
      return new GeminiLLMProvider(
        (model as "gemini-pro" | "gemini-1.5-pro") || "gemini-pro"
      );
    default:
      throw new Error(`Unknown LLM provider: ${type}`);
  }
}

/**
 * Create Embedding Provider
 * 
 * Note: Hugging Face models have different dimensions than OpenAI.
 * - all-MiniLM-L6-v2: 384 dimensions
 * - all-mpnet-base-v2: 768 dimensions
 * 
 * If you need 1536 dimensions (to match OpenAI), consider using OpenAI
 * or updating the database schema to support different dimensions.
 */
export function createEmbeddingProvider(
  type: EmbeddingProviderType = "huggingface"
): EmbeddingProvider {
  switch (type) {
    case "openai":
      return new OpenAIEmbeddingProvider();
    case "huggingface":
      // Model can be set via HUGGINGFACE_EMBEDDING_MODEL environment variable
      // Default: sentence-transformers/all-MiniLM-L6-v2 (384D)
      // Alternative: BAAI/bge-small-en-v1.5 (384D, often more reliable)
      // Alternative: sentence-transformers/all-mpnet-base-v2 (768D)
      return new HuggingFaceEmbeddingProvider();
    default:
      throw new Error(`Unknown embedding provider: ${type}`);
  }
}

/**
 * Get default provider types from environment variables
 */
export function getDefaultProviders() {
  return {
    transcription: (process.env.AI_TRANSCRIPTION_PROVIDER ||
      "assemblyai") as TranscriptionProviderType,
    llm: (process.env.AI_LLM_PROVIDER || "groq") as LLMProviderType,
    embedding: (process.env.AI_EMBEDDING_PROVIDER ||
      "huggingface") as EmbeddingProviderType,
  };
}

