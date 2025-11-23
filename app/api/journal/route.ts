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

    // Initialize AI Manager (may throw if API keys are missing)
    let aiManager;
    try {
      aiManager = getAIManager();
    } catch (aiError) {
      console.error("Failed to initialize AI Manager:", aiError);
      return NextResponse.json(
        {
          error: "AI service configuration error",
          details: aiError instanceof Error ? aiError.message : "Failed to initialize AI providers. Please check your API keys.",
        },
        { status: 500 }
      );
    }

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
      let embedding: number[];
      try {
        embedding = await aiManager.embed(transcription);
      } catch (embedError) {
        console.error("Embedding generation error:", embedError);
        const errorMessage = embedError instanceof Error ? embedError.message : "Unknown error";
        
        // If Hugging Face fails with 410 Gone, suggest using OpenAI as fallback
        if (errorMessage.includes("410 Gone") || errorMessage.includes("model unavailable")) {
          throw new Error(
            `${errorMessage}. ` +
            `Suggestion: Set AI_EMBEDDING_PROVIDER=openai in your .env.local file to use OpenAI embeddings instead, ` +
            `or try a different Hugging Face model by setting HUGGINGFACE_EMBEDDING_MODEL environment variable.`
          );
        }
        
        throw new Error(`Failed to generate embedding: ${errorMessage}`);
      }

      // Use embedding directly - no padding
      // Database schema should be updated to vector(384) for HuggingFace models
      // For OpenAI embeddings (1536D), the schema would need to be vector(1536)
      const finalEmbedding = embedding;
      
      // Validate embedding dimension
      if (finalEmbedding.length !== 384 && finalEmbedding.length !== 1536) {
        throw new Error(
          `Unsupported embedding dimension: ${finalEmbedding.length}. ` +
          `Expected 384 (HuggingFace) or 1536 (OpenAI).`
        );
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
      let toneAnalysis;
      try {
        toneAnalysis = await aiManager.analyzeTone(transcription);
      } catch (toneError) {
        console.error("Tone analysis error:", toneError);
        throw new Error(`Failed to analyze tone: ${toneError instanceof Error ? toneError.message : "Unknown error"}`);
      }

      // Step 4: Model Routing Decision
      // Note: Current AI manager uses default provider (Groq)
      // For production, you may want to create provider instances based on routing
      // For now, we'll use the default provider and adjust prompts based on mode
      const isHighDistress = toneAnalysis.sentiment_score < 0.3;
      const needsPowerfulModel = aiMode === "coaching" || (aiMode === "smart" && isHighDistress);
      
      // Log model decision for future optimization
      const selectedModel = needsPowerfulModel ? "powerful" : "standard";

      // Step 5: RAG Retrieval - Find similar past entries
      // Constants for RAG parameters
      const MIN_SIMILARITY_THRESHOLD = 0.65; // Slightly looser for HuggingFace models
      const RAG_MATCH_COUNT = 5; // Retrieve top 5 from DB
      const RAG_PROMPT_COUNT = 3; // Only inject top 3 into LLM prompt to save tokens
      
      let relatedEntries: any[] = [];
      try {
        // Call match_entries function (secure version using auth.uid())
        // The function uses auth.uid() internally, so we don't pass user_id
        const { data: matchedEntries, error: ragError } = await supabase
          .rpc("match_entries", {
            query_embedding: finalEmbedding, // Pass as array, Supabase handles conversion to vector
            match_threshold: MIN_SIMILARITY_THRESHOLD,
            match_count: RAG_MATCH_COUNT,
            exclude_entry_id: entry.id,
          });

        if (!ragError && matchedEntries) {
          relatedEntries = matchedEntries;
        } else if (ragError) {
          console.error("RAG retrieval error:", ragError);
          // Graceful degradation: Continue without RAG context
          // Log error but don't fail the entire request
        }
      } catch (ragError) {
        console.error("RAG retrieval error:", ragError);
        // Graceful degradation: Continue without RAG context
        // Log error but don't fail the entire request
      }

      // Step 6: Generate AI Response
      const systemPrompt = buildSystemPrompt(aiMode as AIMode, relatedEntries);
      const userMessage = transcription;

      // Use chat method from AI manager
      // Adjust maxTokens based on mode (listening = shorter, coaching = longer)
      const maxTokens = aiMode === "listening" ? 100 : aiMode === "coaching" ? 500 : 300;
      
      let llmResponse: string;
      try {
        llmResponse = await aiManager.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          {
            temperature: aiMode === "listening" ? 0.7 : 0.8,
            maxTokens: maxTokens,
          }
        );
      } catch (llmError) {
        console.error("LLM response generation error:", llmError);
        throw new Error(`Failed to generate AI response: ${llmError instanceof Error ? llmError.message : "Unknown error"}`);
      }

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
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      // Clean up entry if processing failed
      try {
        await serviceSupabase.from("entries").delete().eq("id", entry.id);
      } catch (cleanupError) {
        console.error("Error cleaning up entry:", cleanupError);
      }
      
      return NextResponse.json(
        {
          error: "Failed to process journal entry",
          details: error instanceof Error ? error.message : "Unknown error",
          // Include more details in development
          ...(process.env.NODE_ENV === "development" ? {
            errorType: error instanceof Error ? error.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
          } : {}),
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
  // Use structured format with metadata (Option C from planning)
  // Only inject top 3 entries to save tokens
  if (relatedEntries.length > 0) {
    prompt += "User's previous journal entries for context:\n\n";
    relatedEntries.slice(0, 3).forEach((entry, index) => {
      const date = new Date(entry.created_at).toISOString().split("T")[0]; // YYYY-MM-DD format
      const tone = entry.detected_tone || "Neutral";
      const transcription = entry.transcription;
      
      // Structured format: [Date: YYYY-MM-DD] [Tone: Neutral] Content: "..."
      prompt += `[Date: ${date}] [Tone: ${tone}] Content: "${transcription}"\n\n`;
    });
    
    // Mode-specific RAG usage instructions
    if (aiMode === "coaching") {
      prompt += "Use this context to identify patterns and provide deeper insights. Reference specific past entries when relevant.\n\n";
    } else if (aiMode === "smart") {
      prompt += "Use this context to understand the user's emotional journey. Reference patterns when they provide meaningful insights.\n\n";
    } else {
      // listening mode - minimal RAG usage
      prompt += "You may reference this context if it helps validate the user's feelings, but keep it minimal.\n\n";
    }
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
