"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MoodHorizonData {
  date: string;
  sentiment: number | null;
  movingAverage: number | null;
}

interface MoodHorizonChartProps {
  data: MoodHorizonData[];
}

export function MoodHorizonChart({ data }: MoodHorizonChartProps) {
  // Format date for display and filter out null values
  const formattedData = data
    .map((item) => ({
      ...item,
      dateLabel: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      sentimentPercent:
        item.sentiment !== null ? Math.round(item.sentiment * 100) : null,
      movingAveragePercent:
        item.movingAverage !== null
          ? Math.round(item.movingAverage * 100)
          : null,
    }))
    .filter((item) => item.sentiment !== null || item.movingAverage !== null); // Only show dates with data

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-md p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {payload[0].payload.dateLabel}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) {
              return null;
            }
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value}%
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No data available yet. Start recording to see your mood trends!</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="dateLabel"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
        />
        <YAxis
          domain={[0, 100]}
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="sentimentPercent"
          name="Daily Sentiment"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="movingAveragePercent"
          name="7-Day Average"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

