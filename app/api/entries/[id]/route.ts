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

    // Get referenced entries with similarity scores
    // We need to get the current entry's embedding and call match_entries to get similarity
    let referencedEntriesWithSimilarity: Array<Entry & { similarity?: number }> = [];
    
    if (entry.referenced_entry_ids && entry.referenced_entry_ids.length > 0) {
      // Get current entry's embedding
      const { data: currentEmbedding } = await supabase
        .from("embeddings")
        .select("embedding")
        .eq("entry_id", entry.id)
        .eq("user_id", user.id)
        .single();

      if (currentEmbedding?.embedding) {
        // Call match_entries to get similarity scores for all entries
        // We'll filter to only referenced ones after
        const { data: matchedEntries, error: matchError } = await supabase
          .rpc("match_entries", {
            query_embedding: currentEmbedding.embedding,
            match_threshold: 0.0, // Get all entries regardless of threshold to find referenced ones
            match_count: 100, // Get enough to cover all referenced entries
            exclude_entry_id: entry.id, // Exclude current entry
          });

        if (!matchError && matchedEntries) {
          // Create a map of entry_id -> similarity for referenced entries
          const referencedIdsSet = new Set(entry.referenced_entry_ids);
          const similarityMap = new Map(
            matchedEntries
              .filter((m: any) => referencedIdsSet.has(m.entry_id))
              .map((m: any) => [m.entry_id, m.similarity])
          );

          // Get full entry data for referenced entries
          const { data: refEntries } = await supabase
            .from("entries")
            .select("id, transcription, emotion_tags, detected_tone, created_at")
            .in("id", entry.referenced_entry_ids)
            .eq("user_id", user.id);

          if (refEntries) {
            referencedEntriesWithSimilarity = refEntries.map((refEntry) => ({
              ...refEntry,
              similarity: similarityMap.get(refEntry.id),
            })) as Array<Entry & { similarity?: number }>;
          }
        }
      }

      // Fallback: if we can't get similarity (e.g., no embedding), just return entries without it
      if (referencedEntriesWithSimilarity.length === 0) {
        const { data: refEntries } = await supabase
          .from("entries")
          .select("id, transcription, emotion_tags, detected_tone, created_at")
          .in("id", entry.referenced_entry_ids)
          .eq("user_id", user.id);

        referencedEntriesWithSimilarity = (refEntries || []) as Array<Entry & { similarity?: number }>;
      }
    }

    return NextResponse.json({
      entry: entry as Entry,
      referencedEntries: referencedEntriesWithSimilarity,
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

