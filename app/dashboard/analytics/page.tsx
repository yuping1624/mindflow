import { DashboardStats } from "@/components/DashboardStats";

export default async function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="z-10 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track your emotional journey and discover patterns in your journal entries
          </p>
        </div>

        {/* Statistics and Charts */}
        <DashboardStats />
      </div>
    </div>
  );
}

