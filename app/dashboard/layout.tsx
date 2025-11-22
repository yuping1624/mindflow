import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold">MindFlow</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              <DashboardNav />
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || user?.email || "User"}
              </span>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

