import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 如果已登入，導向到 dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-4">
          MindFlow - AI Voice Coach
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Maintain emotional wellbeing through voice journaling combined with AI-powered psychological support
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

