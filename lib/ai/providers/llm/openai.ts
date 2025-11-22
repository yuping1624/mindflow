import OpenAI from "openai";
import type { LLMProvider, ChatMessage, LLMOptions } from "@/lib/ai/types";

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
}

