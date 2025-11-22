import OpenAI from "openai";
import type { TranscriptionProvider, TranscriptionResult } from "@/lib/ai/types";

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult> {
    let file: File | Buffer;
    
    if (audioFile instanceof File) {
      file = audioFile;
    } else if (audioFile instanceof Buffer) {
      file = audioFile;
    } else if (typeof audioFile === "string") {
      // URL string - download and convert
      const response = await fetch(audioFile);
      const blob = await response.blob();
      file = new File([blob], "audio.mp3", { type: blob.type });
    } else {
      throw new Error("Unsupported audio file type");
    }

    const transcription = await this.client.audio.transcriptions.create({
      file: file as File,
      model: "whisper-1",
    });

    return {
      text: transcription.text,
      language: undefined, // OpenAI Whisper doesn't return language in this response
    };
  }

  getCostEstimate(durationSeconds: number): number {
    // Whisper: $0.006 per minute = $0.0001 per second
    return durationSeconds * 0.0001;
  }

  getName(): string {
    return "OpenAI Whisper";
  }
}

