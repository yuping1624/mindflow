import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardStats } from "@/components/DashboardStats";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 如果未登入，導向到登入頁面
  if (authError || !user) {
    redirect("/login");
  }

  // 取得用戶 profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
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
    <main className="flex min-h-screen flex-col p-8">
      <div className="z-10 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || user.email}!
            </p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Voice Journal Card */}
          <div className="p-6 border border-border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Voice Journal</h2>
            <p className="text-muted-foreground mb-4">
              Record your thoughts and feelings. Our AI will help you understand
              your emotional patterns.
            </p>
            <Link
              href="/dashboard/journal"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Start Recording
            </Link>
          </div>

          {/* Recent Entries Card */}
          <div className="p-6 border border-border rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Entries</h2>
              <Link
                href="/dashboard/entries"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View All
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
              <p className="text-muted-foreground text-sm">
                No entries yet. Start recording to create your first entry!
              </p>
            )}
          </div>

        </div>

        {/* Dashboard Statistics and Charts */}
        <div className="mt-8">
          <DashboardStats />
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
    </main>
  );
}
