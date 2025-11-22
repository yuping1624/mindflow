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
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const router = useRouter();

  const handleRecordingComplete = (blob: Blob): void => {
    setAudioBlob(blob);
    setError(null);
    setAiResponse(null);
    setEntryId(null);
    setTranscription("");
    setEditedTranscription("");
    setShowEditMode(false);
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
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "儲存失敗";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Journal entry created successfully:", data);
      
      // 檢查響應中是否有錯誤
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 檢查是否成功創建
      if (!data.success && !data.entryId) {
        throw new Error("未能成功創建日記條目，請重試");
      }
      
      // 保存 AI 回應和 entry ID，顯示結果而不是立即跳轉
      setAiResponse(data.aiResponse || null);
      setEntryId(data.entryId || null);
      setIsUploading(false);
    } catch (err) {
      console.error("Save error:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "儲存失敗，請重試";
      setError(errorMessage);
      // 確保錯誤訊息顯示，不要跳轉
      setIsUploading(false);
      return; // 不要繼續執行，避免跳轉
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

        {/* AI Response Display */}
        {aiResponse && (
          <div className="mt-8 p-6 border border-border rounded-lg bg-muted/50">
            <h2 className="text-lg font-semibold mb-4">AI 回應</h2>
            <p className="text-muted-foreground whitespace-pre-wrap mb-4">{aiResponse}</p>
            <div className="flex gap-4">
              {entryId && (
                <Link
                  href={`/dashboard/entries/${entryId}`}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  查看完整詳情
                </Link>
              )}
              <button
                onClick={() => {
                  setAiResponse(null);
                  setEntryId(null);
                  setAudioBlob(null);
                  setTranscription("");
                  setEditedTranscription("");
                  setShowEditMode(false);
                  router.push("/dashboard");
                }}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                返回 Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

