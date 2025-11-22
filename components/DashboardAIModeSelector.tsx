"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AIMode } from "@/types/database";

export function DashboardAIModeSelector() {
  const [currentMode, setCurrentMode] = useState<AIMode>("smart");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load mode on mount
  useEffect(() => {
    const lastMode = localStorage.getItem("last_ai_mode") as AIMode | null;
    if (lastMode && ["listening", "coaching", "smart"].includes(lastMode)) {
      setCurrentMode(lastMode);
    } else {
      // Fallback: load from profile
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.profile?.default_ai_mode) {
            setCurrentMode(data.profile.default_ai_mode);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, []);

  const handleModeChange = async (newMode: AIMode) => {
    setCurrentMode(newMode);
    localStorage.setItem("last_ai_mode", newMode);

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

  return (
    <div className="p-6 border border-border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">AI Mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how the AI responds to your journal entries
          </p>
        </div>
        <Link
          href="/dashboard/journal"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Start Journal →
        </Link>
      </div>
      <div className="flex gap-2">
        {(["listening", "coaching", "smart"] as AIMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={isSaving}
            className={`px-4 py-2 text-sm rounded-md border transition-colors capitalize ${
              currentMode === mode
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            } disabled:opacity-50`}
          >
            {mode}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Current: <span className="capitalize font-medium">{currentMode}</span>
        {isSaving && " (saving...)"}
      </p>
    </div>
  );
}

