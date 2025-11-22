import { NextRequest, NextResponse } from "next/server";
import { getAIManager } from "@/lib/ai/manager";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const aiManager = getAIManager();
    const result = await aiManager.transcribe(audioFile);

    return NextResponse.json({ 
      text: result.text,
      language: result.language,
      duration: result.duration 
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

