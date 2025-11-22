/**
 * Groq Provider - LLM (使用 Llama 3 等開源模型)
 * 免費額度：有限
 * 付費：非常便宜，超快推理速度
 */

import type { LLMProvider, LLMResponse, ToneAnalysis } from "../types";

export class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string = "https://api.groq.com/openai/v1";
  private defaultModel: string = "llama-3.1-70b-versatile"; // 或 "mixtral-8x7b-32768"

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }
  }

  async generateResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse> {
    try {
      const model = options?.model || this.defaultModel;
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Groq API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content,
        model: data.model,
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        cost: this.getCostEstimate(
          data.usage?.prompt_tokens || 0,
          data.usage?.completion_tokens || 0,
          model
        ),
      };
    } catch (error) {
      console.error("Groq API error:", error);
      throw error;
    }
  }

  async analyzeTone(text: string): Promise<ToneAnalysis> {
    const systemPrompt = `Analyze the user's journal entry. Return ONLY valid JSON, no other text:
{
  "tone": "positive" | "negative" | "neutral" | "seeking_help",
  "emotionTags": ["tag1", "tag2"],
  "sentiment_score": 0.0 to 1.0,
  "energy_score": 0.0 to 1.0
}`;

    const response = await this.generateResponse(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      {
        temperature: 0.3,
        maxTokens: 200,
        model: "llama-3.1-8b-instant", // 使用較小的模型以節省成本
      }
    );

    try {
      // 嘗試從回應中提取 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);

      return {
        tone: parsed.tone,
        emotionTags: parsed.emotionTags || [],
        sentiment_score: Math.max(0, Math.min(1, parsed.sentiment_score || 0.5)),
        energy_score: Math.max(0, Math.min(1, parsed.energy_score || 0.5)),
      };
    } catch (error) {
      console.error("Failed to parse tone analysis:", error);
      // 返回預設值
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
    
    // Groq 定價（2024，可能變動）
    // llama-3.1-70b-versatile: $0.59 / 1M input, $0.79 / 1M output
    // llama-3.1-8b-instant: $0.05 / 1M input, $0.08 / 1M output
    // mixtral-8x7b-32768: $0.24 / 1M input, $0.24 / 1M output
    
    let inputPrice = 0.59; // 預設使用 70b 模型價格
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


