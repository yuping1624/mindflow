import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/types/database";

/**
 * GET /api/entries
 * Get user's journal entries with pagination and optional date filtering
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query
    let query = supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: entries, error } = await query;

    if (error) {
      console.error("Error fetching entries:", error);
      return NextResponse.json(
        { error: "Failed to fetch entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: entries as Entry[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Entries API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch entries",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

