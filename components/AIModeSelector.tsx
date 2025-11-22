"use client";

import { useState, useEffect } from "react";
import type { AIMode } from "@/types/database";

interface AIModeSelectorProps {
  currentMode: AIMode;
  onModeChange: (mode: AIMode) => void;
  compact?: boolean;
}

export function AIModeSelector({
  currentMode,
  onModeChange,
  compact = false,
}: AIModeSelectorProps) {
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleModeChange = async (newMode: AIMode) => {
    onModeChange(newMode);
    // Save to localStorage for quick access
    localStorage.setItem("last_ai_mode", newMode);

    // Immediately save to profile (auto-update default)
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          default_ai_mode: newMode,
        }),
      });
    } catch (err) {
      console.error("Failed to save mode preference:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        {(["listening", "coaching", "smart"] as AIMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={isSaving}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors capitalize ${
              currentMode === mode
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            } disabled:opacity-50`}
          >
            {mode}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {(["listening", "coaching", "smart"] as AIMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => handleModeChange(mode)}
          disabled={isSaving}
          className={`px-4 py-3 rounded-md border transition-colors ${
            currentMode === mode
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-accent"
          } disabled:opacity-50`}
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
  );
}

