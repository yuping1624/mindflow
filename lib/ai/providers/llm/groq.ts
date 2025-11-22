import Groq from "groq-sdk";
import type { LLMProvider, ChatMessage, LLMOptions } from "@/lib/ai/types";

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
}

