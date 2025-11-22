import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DashboardAIModeSelector } from "@/components/DashboardAIModeSelector";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 取得用戶 profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, default_ai_mode, created_at")
    .eq("id", user.id)
    .single();

  // 取得最近的日記條目（最多 5 條）
  const { data: recentEntries } = await supabase
    .from("entries")
    .select("id, transcription, detected_tone, emotion_tags, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="p-8">
      <div className="z-10 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || user.email}!
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Voice Journal Card */}
          <Link
            href="/dashboard/journal"
            className="p-6 border border-border rounded-lg hover:bg-accent transition-colors block"
          >
            <div className="text-4xl mb-3">🎤</div>
            <h2 className="text-xl font-semibold mb-2">Voice Journal</h2>
            <p className="text-muted-foreground text-sm">
              Record your thoughts and feelings. Our AI will help you understand
              your emotional patterns.
            </p>
          </Link>

          {/* Entries Card */}
          <Link
            href="/dashboard/entries"
            className="p-6 border border-border rounded-lg hover:bg-accent transition-colors block"
          >
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-xl font-semibold mb-2">All Entries</h2>
            <p className="text-muted-foreground text-sm">
              View and manage all your journal entries. Search, filter, and explore your journey.
            </p>
          </Link>

          {/* Analytics Card */}
          <Link
            href="/dashboard/analytics"
            className="p-6 border border-border rounded-lg hover:bg-accent transition-colors block"
          >
            <div className="text-4xl mb-3">📈</div>
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-muted-foreground text-sm">
              Track your emotional journey with charts, statistics, and insights.
            </p>
          </Link>
        </div>

        {/* AI Mode Selector */}
        <div className="mb-8">
          <DashboardAIModeSelector />
        </div>

        {/* Recent Entries Preview */}
        <div className="p-6 border border-border rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Entries</h2>
            <Link
              href="/dashboard/entries"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View All →
            </Link>
          </div>
          {recentEntries && recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/dashboard/entries/${entry.id}`}
                  className="block p-3 border border-border rounded-md hover:bg-accent transition-colors"
                >
                  <p className="text-sm line-clamp-2 mb-2">
                    {entry.transcription}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {entry.detected_tone && (
                      <span className="capitalize">{entry.detected_tone}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-4">
                No entries yet. Start recording to create your first entry!
              </p>
              <Link
                href="/dashboard/journal"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Start Recording
              </Link>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="mt-8 p-4 border border-border rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-2">Account Information</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Email: {user.email}</p>
            <p>Default AI Mode: {profile?.default_ai_mode || "smart"}</p>
            <p>Member since: {new Date(profile?.created_at || user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
