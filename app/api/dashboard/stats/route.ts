import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics including:
 * - Total entries count
 * - Average sentiment score
 * - Most common emotions
 * - 7-day moving average sentiment data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all entries for the user
    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("sentiment_score, emotion_tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (entriesError) {
      console.error("Error fetching entries:", entriesError);
      return NextResponse.json(
        { error: "Failed to fetch entries" },
        { status: 500 }
      );
    }

    const entriesList = entries || [];

    // Calculate statistics
    const totalEntries = entriesList.length;

    // Average sentiment score
    const validSentimentScores = entriesList
      .map((e) => e.sentiment_score)
      .filter((score): score is number => score !== null && score !== undefined);
    const averageSentiment =
      validSentimentScores.length > 0
        ? validSentimentScores.reduce((sum, score) => sum + score, 0) /
          validSentimentScores.length
        : 0.5; // Default neutral

    // Most common emotions
    const emotionCounts: Record<string, number> = {};
    entriesList.forEach((entry) => {
      if (entry.emotion_tags && Array.isArray(entry.emotion_tags)) {
        entry.emotion_tags.forEach((tag: string) => {
          emotionCounts[tag] = (emotionCounts[tag] || 0) + 1;
        });
      }
    });
    const mostCommonEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    // Calculate 7-day moving average sentiment
    const now = new Date();
    // Set time to end of day for accurate date comparison
    now.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // Get entries from last 7 days (including today)
    const recentEntries = entriesList.filter((entry) => {
      const entryDate = new Date(entry.created_at);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= sevenDaysAgo && entryDate <= now;
    });

    // Group by date and calculate daily averages
    const dailyData: Record<string, number[]> = {};
    recentEntries.forEach((entry) => {
      if (entry.sentiment_score !== null && entry.sentiment_score !== undefined) {
        const entryDate = new Date(entry.created_at);
        entryDate.setHours(0, 0, 0, 0);
        const dateKey = entryDate.toISOString().split("T")[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = [];
        }
        dailyData[dateKey].push(entry.sentiment_score);
      }
    });

    // Calculate daily averages for dates with data
    const dailyAverages: Record<string, number> = {};
    Object.keys(dailyData).forEach((date) => {
      dailyAverages[date] =
        dailyData[date].reduce((sum, score) => sum + score, 0) /
        dailyData[date].length;
    });

    // Get all dates in the last 7 days (including today)
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Calculate 7-day moving average for each day
    const moodHorizonData: Array<{
      date: string;
      sentiment: number | null;
      movingAverage: number | null;
    }> = [];

    dates.forEach((date, index) => {
      const daySentiment = dailyAverages[date] ?? null;

      // Calculate 7-day moving average (only for dates with data)
      // Look back up to 6 days from current date
      const windowStart = Math.max(0, index - 6);
      const windowDates = dates.slice(windowStart, index + 1);
      const windowSentiments: number[] = [];

      windowDates.forEach((d) => {
        if (dailyAverages[d] !== undefined) {
          windowSentiments.push(dailyAverages[d]);
        }
      });

      // Only calculate moving average if we have at least one data point
      const movingAverage =
        windowSentiments.length > 0
          ? windowSentiments.reduce((sum, score) => sum + score, 0) /
            windowSentiments.length
          : null;

      moodHorizonData.push({
        date,
        sentiment: daySentiment,
        movingAverage,
      });
    });

    return NextResponse.json({
      totalEntries,
      averageSentiment: Math.round(averageSentiment * 100) / 100,
      mostCommonEmotions,
      moodHorizonData,
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

