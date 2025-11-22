import OpenAI from "openai";
import type { TranscriptionProvider } from "@/lib/ai/types";

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioFile: File): Promise<string> {
    const transcription = await this.client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    return transcription.text;
  }

  getName(): string {
    return "OpenAI Whisper";
  }
}

