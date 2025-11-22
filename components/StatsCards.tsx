"use client";

interface StatsCardsProps {
  totalEntries: number;
  averageSentiment: number;
  mostCommonEmotions: Array<{ emotion: string; count: number }>;
}

export function StatsCards({
  totalEntries,
  averageSentiment,
  mostCommonEmotions,
}: StatsCardsProps) {
  // Determine sentiment label and color
  const getSentimentLabel = (score: number): { label: string; color: string } => {
    if (score >= 0.7) {
      return { label: "Very Positive", color: "text-green-600" };
    } else if (score >= 0.5) {
      return { label: "Positive", color: "text-green-500" };
    } else if (score >= 0.3) {
      return { label: "Neutral", color: "text-yellow-500" };
    } else {
      return { label: "Negative", color: "text-red-500" };
    }
  };

  const sentimentInfo = getSentimentLabel(averageSentiment);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Entries Card */}
      <div className="p-6 border border-border rounded-lg bg-background">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Entries
          </h3>
        </div>
        <p className="text-3xl font-bold">{totalEntries}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Journal entries created
        </p>
      </div>

      {/* Average Sentiment Card */}
      <div className="p-6 border border-border rounded-lg bg-background">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Average Sentiment
          </h3>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold">
            {Math.round(averageSentiment * 100)}%
          </p>
          <p className={`text-sm font-medium ${sentimentInfo.color}`}>
            {sentimentInfo.label}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on all entries
        </p>
      </div>

      {/* Most Common Emotions Card */}
      <div className="p-6 border border-border rounded-lg bg-background">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Top Emotions
          </h3>
        </div>
        {mostCommonEmotions.length > 0 ? (
          <div className="space-y-1">
            {mostCommonEmotions.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">{item.emotion}</span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </div>
    </div>
  );
}

