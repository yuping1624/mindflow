import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, ChatMessage, LLMOptions, ToneAnalysis } from "@/lib/ai/types";

export class GeminiLLMProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(model: "gemini-pro" | "gemini-1.5-pro" = "gemini-pro") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model;
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
    });

    // Convert messages to Gemini format
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Build history for chat
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    for (let i = 0; i < conversationMessages.length - 1; i++) {
      const msg = conversationMessages[i];
      if (msg.role === "user" || msg.role === "assistant") {
        history.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const prompt = systemMessage 
      ? `${systemMessage.content}\n\n${lastMessage.content}`
      : lastMessage.content;

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }

  getName(): string {
    return "Google Gemini";
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
    // Gemini pricing (approximate)
    const m = model || this.defaultModel;
    let inputPrice = 0.5;
    let outputPrice = 1.5;

    if (m.includes("1.5")) {
      inputPrice = 1.25;
      outputPrice = 5.0;
    }

    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }
}

