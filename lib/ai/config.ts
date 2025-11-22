/**
 * AI Provider 配置
 * 透過環境變數控制使用哪個 provider
 */

export type TranscriptionProviderType = "openai" | "assemblyai";
export type LLMProviderType = "openai" | "groq" | "gemini";
export type EmbeddingProviderType = "openai" | "huggingface";

export interface AIProviderConfig {
  transcription: TranscriptionProviderType;
  llm: LLMProviderType;
  embedding: EmbeddingProviderType;
}

/**
 * 從環境變數讀取 provider 配置
 * 如果沒有設定，使用免費/便宜的預設值
 */
export function getAIProviderConfig(): AIProviderConfig {
  return {
    transcription: (process.env.AI_TRANSCRIPTION_PROVIDER || "assemblyai") as TranscriptionProviderType,
    llm: (process.env.AI_LLM_PROVIDER || "groq") as LLMProviderType,
    embedding: (process.env.AI_EMBEDDING_PROVIDER || "huggingface") as EmbeddingProviderType,
  };
}

/**
 * 檢查必要的環境變數是否已設定
 */
export function validateAIProviderConfig(config: AIProviderConfig): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  // 檢查 Transcription Provider
  if (config.transcription === "assemblyai" && !process.env.ASSEMBLYAI_API_KEY) {
    missing.push("ASSEMBLYAI_API_KEY");
  }
  if (config.transcription === "openai" && !process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  // 檢查 LLM Provider
  if (config.llm === "groq" && !process.env.GROQ_API_KEY) {
    missing.push("GROQ_API_KEY");
  }
  if (config.llm === "gemini" && !process.env.GEMINI_API_KEY) {
    missing.push("GEMINI_API_KEY");
  }
  if (config.llm === "openai" && !process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  // 檢查 Embedding Provider
  if (config.embedding === "huggingface") {
    // Hugging Face API key 是可選的（有免費額度）
    // 但建議設定以獲得更好的 rate limits
  }
  if (config.embedding === "openai" && !process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}


