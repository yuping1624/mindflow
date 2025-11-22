import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/types/database";

/**
 * GET /api/entries/[id]
 * Get a single journal entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: entry, error } = await supabase
      .from("entries")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Get referenced entries if any
    let referencedEntries: Entry[] = [];
    if (entry.referenced_entry_ids && entry.referenced_entry_ids.length > 0) {
      const { data: refEntries } = await supabase
        .from("entries")
        .select("id, transcription, emotion_tags, detected_tone, created_at")
        .in("id", entry.referenced_entry_ids)
        .eq("user_id", user.id);

      referencedEntries = (refEntries || []) as Entry[];
    }

    return NextResponse.json({
      entry: entry as Entry,
      referencedEntries,
    });
  } catch (error) {
    console.error("Entry API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/entries/[id]
 * Update a journal entry (currently only transcription can be edited)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const { transcription } = body;

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "Invalid transcription" },
        { status: 400 }
      );
    }

    // Verify entry exists and belongs to user
    const { data: existingEntry, error: fetchError } = await supabase
      .from("entries")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingEntry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Update transcription
    const { data: updatedEntry, error: updateError } = await supabase
      .from("entries")
      .update({ transcription })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating entry:", updateError);
      return NextResponse.json(
        { error: "Failed to update entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry: updatedEntry as Entry,
    });
  } catch (error) {
    console.error("Update entry API error:", error);
    return NextResponse.json(
      {
        error: "Failed to update entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/entries/[id]
 * Delete a journal entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify entry exists and belongs to user
    const { data: existingEntry, error: fetchError } = await supabase
      .from("entries")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingEntry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Delete entry (CASCADE will handle related embeddings)
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting entry:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete entry API error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete entry",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

