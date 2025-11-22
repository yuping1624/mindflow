import OpenAI from "openai";
import type { LLMProvider, ChatMessage, LLMOptions, ToneAnalysis } from "@/lib/ai/types";

export class OpenAILLMProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o-mini") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
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
    return "OpenAI";
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
        model: "gpt-4o-mini",
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
    
    let inputPrice = 0.15; // gpt-4o-mini
    let outputPrice = 0.6;

    if (m.includes("gpt-4o") && !m.includes("mini")) {
      inputPrice = 2.5;
      outputPrice = 10.0;
    }

    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }
}

