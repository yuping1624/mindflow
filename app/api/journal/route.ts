import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAIManager } from "@/lib/ai/manager";
import type { AIMode } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    // Security: Verify user authentication
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
    const { transcription, aiMode, audioUrl } = body;

    if (!transcription || !aiMode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate aiMode
    if (!["listening", "coaching", "smart"].includes(aiMode)) {
      return NextResponse.json(
        { error: "Invalid AI mode" },
        { status: 400 }
      );
    }

    const aiManager = getAIManager();
    const serviceSupabase = createServiceRoleClient();

    // Step 1: Save transcription to DB (temporary entry)
    const { data: entry, error: entryError } = await serviceSupabase
      .from("entries")
      .insert({
        user_id: user.id,
        transcription: transcription,
        audio_url: audioUrl || null,
        ai_mode: aiMode as AIMode,
      })
      .select()
      .single();

    if (entryError || !entry) {
      console.error("Error creating entry:", entryError);
      return NextResponse.json(
        { error: "Failed to create entry" },
        { status: 500 }
      );
    }

    try {
      // Step 2: Generate Embedding
      const embedding = await aiManager.embed(transcription);

      // Handle dimension mismatch: Hugging Face returns 384D, DB expects 1536D
      // For now, we'll pad the embedding to 1536 dimensions
      // TODO: Consider using OpenAI embeddings or updating schema to support 384D
      let finalEmbedding: number[];
      if (embedding.length === 384) {
        // Pad to 1536 by repeating and scaling
        finalEmbedding = [
          ...embedding,
          ...embedding.map((v) => v * 0.5),
          ...embedding.map((v) => v * 0.25),
          ...embedding.map((v) => v * 0.125),
        ].slice(0, 1536);
      } else if (embedding.length === 768) {
        finalEmbedding = [...embedding, ...embedding];
      } else if (embedding.length === 1536) {
        finalEmbedding = embedding;
      } else {
        // Fallback: pad or truncate to 1536
        finalEmbedding = [...embedding, ...new Array(1536 - embedding.length).fill(0)].slice(0, 1536);
      }

      // Save embedding (Supabase pgvector expects array format)
      const { error: embeddingError } = await serviceSupabase
        .from("embeddings")
        .insert({
          entry_id: entry.id,
          user_id: user.id,
          embedding: finalEmbedding, // Supabase client handles array conversion
        });

      if (embeddingError) {
        console.error("Error saving embedding:", embeddingError);
        // Continue anyway, embedding is not critical for basic functionality
      }

      // Step 3: Tone Detection
      const toneAnalysis = await aiManager.analyzeTone(transcription);

      // Step 4: Model Routing Decision
      // Note: Current AI manager uses default provider (Groq)
      // For production, you may want to create provider instances based on routing
      // For now, we'll use the default provider and adjust prompts based on mode
      const isHighDistress = toneAnalysis.sentiment_score < 0.3;
      const needsPowerfulModel = aiMode === "coaching" || (aiMode === "smart" && isHighDistress);
      
      // Log model decision for future optimization
      const selectedModel = needsPowerfulModel ? "powerful" : "standard";

      // Step 5: RAG Retrieval - Find similar past entries
      let relatedEntries: any[] = [];
      try {
        // Call match_entries function (uses auth.uid() internally, no user_id param needed)
        // Note: For service role client, we need to use regular client for RPC calls
        // because RPC functions use auth.uid() which requires user context
        const { data: matchedEntries, error: ragError } = await supabase
          .rpc("match_entries", {
            query_embedding: finalEmbedding, // Pass as array, Supabase handles conversion to vector
            match_threshold: 0.7,
            match_count: 5,
            exclude_entry_id: entry.id,
          });

        if (!ragError && matchedEntries) {
          relatedEntries = matchedEntries;
        } else if (ragError) {
          console.error("RAG retrieval error:", ragError);
        }
      } catch (ragError) {
        console.error("RAG retrieval error:", ragError);
        // Continue without RAG context - not critical for basic functionality
      }

      // Step 6: Generate AI Response
      const systemPrompt = buildSystemPrompt(aiMode as AIMode, relatedEntries);
      const userMessage = transcription;

      // Use chat method from AI manager
      // Adjust maxTokens based on mode (listening = shorter, coaching = longer)
      const maxTokens = aiMode === "listening" ? 100 : aiMode === "coaching" ? 500 : 300;
      
      const llmResponse = await aiManager.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        {
          temperature: aiMode === "listening" ? 0.7 : 0.8,
          maxTokens: maxTokens,
        }
      );

      // Step 7: Update entry with AI analysis results
      const { error: updateError } = await serviceSupabase
        .from("entries")
        .update({
          ai_response: llmResponse,
          emotion_tags: toneAnalysis.emotionTags,
          detected_tone: toneAnalysis.tone,
          sentiment_score: toneAnalysis.sentiment_score,
          energy_score: toneAnalysis.energy_score,
          referenced_entry_ids: relatedEntries.map((e) => e.entry_id),
          // TODO: Calculate and log tokens_used and cost_usd
        })
        .eq("id", entry.id);

      if (updateError) {
        console.error("Error updating entry:", updateError);
      }

      // Step 8: Log usage (simplified - TODO: implement proper cost tracking)
      // TODO: Calculate actual tokens and costs from AI responses
      // For now, log basic usage information
      await serviceSupabase.from("usage_logs").insert({
        user_id: user.id,
        feature: "journal_analysis",
        model_used: "groq", // Current default provider
        input_tokens: Math.ceil(transcription.length / 4), // Rough estimate
        output_tokens: Math.ceil(llmResponse.length / 4), // Rough estimate
        estimated_cost: 0.0, // TODO: Calculate actual cost based on provider
      });

      return NextResponse.json({
        success: true,
        entryId: entry.id,
        aiResponse: llmResponse,
        toneAnalysis: toneAnalysis,
        relatedEntriesCount: relatedEntries.length,
      });
    } catch (error) {
      console.error("Journal processing error:", error);
      
      // Clean up entry if processing failed
      await serviceSupabase.from("entries").delete().eq("id", entry.id);
      
      return NextResponse.json(
        {
          error: "Failed to process journal entry",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Journal API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt based on AI mode and related entries
 */
function buildSystemPrompt(
  aiMode: AIMode,
  relatedEntries: any[]
): string {
  let prompt = "";

  // Add context from related entries if available
  if (relatedEntries.length > 0) {
    prompt += "User's previous journal entries for context:\n";
    relatedEntries.slice(0, 3).forEach((entry, index) => {
      const date = new Date(entry.created_at).toLocaleDateString();
      prompt += `- ${date}: ${entry.transcription.substring(0, 100)}...\n`;
    });
    prompt += "\nUse this context naturally in your response.\n\n";
  }

  // Mode-specific instructions
  if (aiMode === "listening") {
    prompt +=
      "You are a compassionate listener. Validate the user's feelings. Mirror their emotions. Keep your response under 50 words. Do NOT give advice.";
  } else if (aiMode === "coaching") {
    prompt +=
      "You are a supportive coach. Validate FIRST. Reference patterns from their past entries if relevant. Ask one gentle, thought-provoking question. Keep response under 150 words.";
  } else {
    // Smart mode
    prompt +=
      "You are an adaptive AI coach. Validate the user's feelings first. If they seem distressed, provide deeper support. If they're doing well, offer gentle encouragement. Reference patterns from their past entries when relevant. Keep response appropriate to their emotional state.";
  }

  return prompt;
}
