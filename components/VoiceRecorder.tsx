"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
}: VoiceRecorderProps): JSX.Element {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化時間顯示 (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 開始錄音
  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(audioBlob);
        
        // 停止所有音訊軌道
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 開始計時
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("無法存取麥克風。請確認已授予麥克風權限。");
    }
  };

  // 停止錄音
  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 播放預覽
  const playPreview = (): void => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 停止播放
  const stopPreview = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // 重新錄音
  const reRecord = (): void => {
    stopPreview();
    setAudioUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6">
      {/* 錄音控制 */}
      <div className="flex flex-col items-center space-y-4">
        {!audioUrl ? (
          <>
            {/* 錄音按鈕 */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold transition-all ${
                isRecording
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isRecording ? (
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 9a1 1 0 10-2 0v2a1 1 0 102 0V9z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* 錄音時間 */}
            {isRecording && (
              <div className="text-2xl font-mono font-semibold">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* 提示文字 */}
            <p className="text-sm text-muted-foreground text-center">
              {isRecording
                ? "正在錄音中... 點擊按鈕停止"
                : "點擊按鈕開始錄音"}
            </p>
          </>
        ) : (
          <>
            {/* 播放預覽 */}
            <div className="w-full space-y-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* 播放控制 */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={isPlaying ? stopPreview : playPreview}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? "停止" : "播放預覽"}
                </button>
                <button
                  onClick={reRecord}
                  className="px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
                >
                  重新錄音
                </button>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    取消
                  </button>
                )}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                錄音長度: {formatTime(recordingTime)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

