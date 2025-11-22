"use client";

import { useState, useEffect } from "react";
import { StatsCards } from "./StatsCards";
import { MoodHorizonChart } from "./MoodHorizonChart";

interface DashboardStatsData {
  totalEntries: number;
  averageSentiment: number;
  mostCommonEmotions: Array<{ emotion: string; count: number }>;
  moodHorizonData: Array<{
    date: string;
    sentiment: number;
    movingAverage: number;
  }>;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(err instanceof Error ? err.message : "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 border border-border rounded-lg bg-background animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-24 mb-4"></div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="p-6 border border-border rounded-lg bg-background animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <StatsCards
        totalEntries={stats.totalEntries}
        averageSentiment={stats.averageSentiment}
        mostCommonEmotions={stats.mostCommonEmotions}
      />

      {/* Mood Horizon Chart */}
      <div className="p-6 border border-border rounded-lg bg-background">
        <h2 className="text-xl font-semibold mb-4">Mood Horizon</h2>
        <p className="text-sm text-muted-foreground mb-4">
          7-day moving average of your emotional journey
        </p>
        <MoodHorizonChart data={stats.moodHorizonData} />
      </div>
    </div>
  );
}

