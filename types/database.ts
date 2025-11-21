export type AIMode = "listening" | "coaching" | "smart";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  default_ai_mode: AIMode;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  transcription: string;
  audio_url: string | null;
  ai_response: string | null;
  ai_mode: AIMode | null;
  emotion_tags: string[] | null;
  detected_tone: string | null;
  sentiment_score: number | null;
  energy_score: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  referenced_entry_ids: string[] | null;
  created_at: string;
}

export interface Embedding {
  id: string;
  entry_id: string;
  user_id: string;
  embedding: number[];
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string | null;
  feature: string;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export interface ToneAnalysis {
  tone: "positive" | "negative" | "neutral" | "seeking_help";
  emotionTags: string[];
  sentiment_score: number;
  energy_score: number;
}

