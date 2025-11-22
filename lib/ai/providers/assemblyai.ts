/**
 * AssemblyAI Provider - 語音轉文字
 * 免費額度：每月 5 小時
 * 付費：$0.00025/秒 (約 $0.015/分鐘)
 */

import type { TranscriptionProvider, TranscriptionResult } from "../types";

export class AssemblyAIProvider implements TranscriptionProvider {
  private apiKey: string;
  private baseURL: string = "https://api.assemblyai.com/v2";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ASSEMBLYAI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ASSEMBLYAI_API_KEY is not set");
    }
  }

  async transcribe(audioFile: File | Buffer | string): Promise<TranscriptionResult> {
    try {
      // Step 1: Upload audio file
      let body: Blob;
      if (audioFile instanceof File) {
        body = audioFile;
      } else if (audioFile instanceof Buffer) {
        body = new Blob([new Uint8Array(audioFile)]);
      } else if (typeof audioFile === "string") {
        const response = await fetch(audioFile);
        body = await response.blob();
      } else {
        throw new Error("Unsupported audio file type");
      }

      const uploadResponse = await fetch(`${this.baseURL}/upload`, {
        method: "POST",
        headers: {
          authorization: this.apiKey,
        },
        body: body,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(`AssemblyAI upload failed: ${error.error || uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json();

      // Step 2: Submit transcription request
      const transcriptResponse = await fetch(`${this.baseURL}/transcript`, {
        method: "POST",
        headers: {
          authorization: this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          audio_url: upload_url,
        }),
      });

      if (!transcriptResponse.ok) {
        const error = await transcriptResponse.json();
        throw new Error(`AssemblyAI transcript failed: ${error.error || transcriptResponse.statusText}`);
      }

      const { id } = await transcriptResponse.json();

      // Step 3: Poll for results
      let transcript;
      let pollCount = 0;
      const maxPolls = 60; // 最多等待 60 次（約 5 分鐘）

      while (pollCount < maxPolls) {
        const statusResponse = await fetch(`${this.baseURL}/transcript/${id}`, {
          headers: {
            authorization: this.apiKey,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`AssemblyAI status check failed: ${statusResponse.statusText}`);
        }

        transcript = await statusResponse.json();

        if (transcript.status === "completed") {
          break;
        } else if (transcript.status === "error") {
          throw new Error(`AssemblyAI transcription error: ${transcript.error}`);
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
        pollCount++;
      }

      if (!transcript || transcript.status !== "completed") {
        throw new Error("AssemblyAI transcription timeout");
      }

      return {
        text: transcript.text,
        language: transcript.language_code,
        duration: transcript.audio_duration ? transcript.audio_duration / 1000 : undefined,
      };
    } catch (error) {
      console.error("AssemblyAI transcription error:", error);
      throw error;
    }
  }

  getCostEstimate(durationSeconds: number): number {
    // $0.00025 per second = $0.015 per minute
    return durationSeconds * 0.00025;
  }

  getName(): string {
    return "AssemblyAI";
  }
}


