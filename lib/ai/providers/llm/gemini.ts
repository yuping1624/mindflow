import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, ChatMessage, LLMOptions } from "@/lib/ai/types";

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
}

