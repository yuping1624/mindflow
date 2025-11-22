"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import Link from "next/link";

type AIMode = "listening" | "coaching" | "smart";

export default function JournalPage(): JSX.Element {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [aiMode, setAiMode] = useState<AIMode>("smart");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [editedTranscription, setEditedTranscription] = useState<string>("");
  const [showEditMode, setShowEditMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRecordingComplete = (blob: Blob): void => {
    setAudioBlob(blob);
    setError(null);
  };

  const handleTranscribe = async (): Promise<void> => {
    if (!audioBlob) {
      setError("請先錄音");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      // 上傳音訊檔案到 /api/transcribe
      const formData = new FormData();
      const audioFile = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });
      formData.append("audio", audioFile);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "轉錄失敗");
      }

      const data = await response.json();
      console.log("Transcription response:", data);
      
      if (!data.text) {
        throw new Error("轉錄結果為空，請重試");
      }
      
      setTranscription(data.text);
      setEditedTranscription(data.text);
      setShowEditMode(true);
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : "轉錄失敗，請重試");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveAndAnalyze = async (): Promise<void> => {
    if (!editedTranscription.trim()) {
      setError("請輸入或編輯轉錄文字");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription: editedTranscription,
          aiMode: aiMode,
          audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "儲存失敗");
      }

      const data = await response.json();
      
      // 成功後導向到 dashboard
      // TODO: 可以顯示成功訊息或 AI 回應預覽
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "儲存失敗，請重試");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="z-10 max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Voice Journal</h1>
          <p className="text-muted-foreground">
            Record your thoughts and feelings. Our AI will help you understand
            your emotional patterns.
          </p>
        </div>

        {/* AI Mode Selection */}
        <div className="mb-8 p-6 border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">AI Mode</h2>
          <div className="grid grid-cols-3 gap-4">
            {(["listening", "coaching", "smart"] as AIMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAiMode(mode)}
                className={`px-4 py-3 rounded-md border transition-colors ${
                  aiMode === mode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="font-semibold capitalize">{mode}</div>
                <div className="text-xs mt-1 opacity-80">
                  {mode === "listening"
                    ? "Validation & Support"
                    : mode === "coaching"
                    ? "Deep Insights"
                    : "Adaptive"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Recorder */}
        <div className="mb-8 p-6 border border-border rounded-lg">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => router.push("/dashboard")}
          />
        </div>

        {/* Transcription Flow */}
        {audioBlob && !showEditMode && (
          <div className="space-y-4">
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranscribing ? "轉錄中..." : "轉錄音訊"}
            </button>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Edit Transcription */}
        {showEditMode && (
          <div className="space-y-4 p-6 border border-border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">轉錄文字</h2>
              <button
                onClick={() => setShowEditMode(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                重新轉錄
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              請檢查並編輯轉錄文字。這可以避免重新錄音和轉錄的成本。
            </p>

            <textarea
              value={editedTranscription}
              onChange={(e) => setEditedTranscription(e.target.value)}
              className="w-full min-h-[200px] px-4 py-3 border border-border rounded-md bg-background resize-y"
              placeholder="轉錄的文字將顯示在這裡..."
            />

            <div className="flex gap-4">
              <button
                onClick={handleSaveAndAnalyze}
                disabled={isUploading || !editedTranscription.trim()}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "分析中..." : "儲存並分析"}
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
              >
                取消
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

