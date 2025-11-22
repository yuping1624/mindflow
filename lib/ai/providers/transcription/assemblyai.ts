import type { TranscriptionProvider } from "@/lib/ai/types";

export class AssemblyAITranscriptionProvider implements TranscriptionProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("ASSEMBLYAI_API_KEY is not set");
    }
    this.apiKey = apiKey;
  }

  async transcribe(audioFile: File): Promise<string> {
    // Step 1: Upload audio file
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: this.apiKey,
      },
      body: await audioFile.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText}`);
    }

    const { upload_url } = await uploadResponse.json();

    // Step 2: Start transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
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
      throw new Error(`AssemblyAI transcription failed: ${transcriptResponse.statusText}`);
    }

    const { id } = await transcriptResponse.json();

    // Step 3: Poll for results
    let transcript: any;
    while (true) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: {
          authorization: this.apiKey,
        },
      });

      transcript = await pollResponse.json();

      if (transcript.status === "completed") {
        break;
      } else if (transcript.status === "error") {
        throw new Error(`AssemblyAI transcription error: ${transcript.error}`);
      }

      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return transcript.text;
  }

  getName(): string {
    return "AssemblyAI";
  }
}

