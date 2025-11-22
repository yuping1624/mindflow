import Groq from "groq-sdk";
import type { LLMProvider, ChatMessage, LLMOptions, ToneAnalysis } from "@/lib/ai/types";

export class GroqLLMProvider implements LLMProvider {
  private client: Groq;
  private defaultModel: string;

  constructor(model: "llama-3.1-8b-instant" | "llama-3.1-70b-versatile" = "llama-3.1-8b-instant") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }
    this.client = new Groq({ apiKey });
    this.defaultModel = model;
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    return response.choices[0]?.message?.content || "";
  }

  getName(): string {
    return "Groq";
  }

  getModel(): string {
    return this.defaultModel;
  }

  async analyzeTone(text: string): Promise<ToneAnalysis> {
    const systemPrompt = `Analyze the user's journal entry. Return ONLY valid JSON, no other text:
{
  "tone": "positive" | "negative" | "neutral" | "seeking_help",
  "emotionTags": ["tag1", "tag2"],
  "sentiment_score": 0.0 to 1.0,
  "energy_score": 0.0 to 1.0
}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      {
        temperature: 0.3,
        maxTokens: 200,
        model: "llama-3.1-8b-instant",
      }
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);

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

  getCostEstimate(inputTokens: number, outputTokens: number, model?: string): number {
    const m = model || this.defaultModel;
    
    let inputPrice = 0.59;
    let outputPrice = 0.79;

    if (m.includes("8b")) {
      inputPrice = 0.05;
      outputPrice = 0.08;
    } else if (m.includes("mixtral")) {
      inputPrice = 0.24;
      outputPrice = 0.24;
    }

    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }
}

