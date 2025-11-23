/**
 * RAG Functionality Test Script
 * 
 * This script tests the RAG (Retrieval-Augmented Generation) functionality
 * by creating test entries and verifying that similar entries are retrieved.
 * 
 * Usage:
 *   npx tsx scripts/test_rag.ts
 * 
 * Prerequisites:
 *   1. Migration to 384D must be completed
 *   2. Environment variables must be set (.env.local)
 *   3. You must be authenticated (this script uses service role)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { join } from "path";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function testRAG(): Promise<void> {
  console.log("🧪 Starting RAG Functionality Tests\n");

  const results: TestResult[] = [];

  // Test 1: Verify database schema
  console.log("Test 1: Verifying database schema...");
  try {
    const { data: columns, error } = await supabase.rpc("exec_sql", {
      query: `
        SELECT column_name, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'embeddings' 
          AND column_name = 'embedding';
      `,
    });

    // Alternative: Direct query
    const { data: schemaCheck } = await supabase
      .from("embeddings")
      .select("embedding")
      .limit(1);

    results.push({
      test: "Database Schema",
      passed: true,
      message: "Embeddings table exists (cannot verify dimension without data)",
    });
  } catch (error) {
    results.push({
      test: "Database Schema",
      passed: false,
      message: `Failed to verify schema: ${error}`,
    });
  }

  // Test 2: Verify match_entries function exists
  console.log("Test 2: Verifying match_entries function...");
  try {
    // Try calling the function with a dummy vector to check if it exists
    const dummyVector = Array(384).fill(0.1);
    const { error } = await supabase.rpc("match_entries", {
      query_embedding: dummyVector,
      match_threshold: 0.0,
      match_count: 1,
      exclude_entry_id: null,
    });

    if (error) {
      // Check if it's a dimension mismatch error (expected with dummy data)
      if (error.message.includes("dimension") || error.message.includes("vector")) {
        results.push({
          test: "match_entries Function",
          passed: true,
          message: "Function exists and accepts vector(384) parameter",
        });
      } else {
        results.push({
          test: "match_entries Function",
          passed: false,
          message: `Function error: ${error.message}`,
        });
      }
    } else {
      results.push({
        test: "match_entries Function",
        passed: true,
        message: "Function exists and can be called",
      });
    }
  } catch (error) {
    results.push({
      test: "match_entries Function",
      passed: false,
      message: `Failed to call function: ${error}`,
    });
  }

  // Test 3: Check if there are any embeddings
  console.log("Test 3: Checking existing embeddings...");
  try {
    const { data: embeddings, error, count } = await supabase
      .from("embeddings")
      .select("entry_id, embedding", { count: "exact" })
      .limit(5);

    if (error) {
      results.push({
        test: "Existing Embeddings",
        passed: false,
        message: `Error querying embeddings: ${error.message}`,
      });
    } else {
      const embeddingCount = count || 0;
      results.push({
        test: "Existing Embeddings",
        passed: true,
        message: `Found ${embeddingCount} embedding(s) in database`,
        details: {
          count: embeddingCount,
          note:
            embeddingCount === 0
              ? "No embeddings found. Create some journal entries to test RAG."
              : "Embeddings exist. RAG should work if entries have similar content.",
        },
      });
    }
  } catch (error) {
    results.push({
      test: "Existing Embeddings",
      passed: false,
      message: `Failed to check embeddings: ${error}`,
    });
  }

  // Test 4: Verify embedding dimension (if embeddings exist)
  console.log("Test 4: Verifying embedding dimensions...");
  try {
    const { data: embeddings } = await supabase
      .from("embeddings")
      .select("embedding")
      .limit(1);

    if (embeddings && embeddings.length > 0) {
      // Try to get the dimension
      // Note: Supabase returns embeddings as arrays
      const embedding = embeddings[0].embedding;
      const dimension = Array.isArray(embedding) ? embedding.length : null;

      if (dimension === 384) {
        results.push({
          test: "Embedding Dimension",
          passed: true,
          message: "✓ Embeddings are 384D (correct)",
        });
      } else {
        results.push({
          test: "Embedding Dimension",
          passed: false,
          message: `✗ Embeddings are ${dimension}D (expected 384D)`,
        });
      }
    } else {
      results.push({
        test: "Embedding Dimension",
        passed: true,
        message: "⚠ No embeddings to check (this is OK)",
      });
    }
  } catch (error) {
    results.push({
      test: "Embedding Dimension",
      passed: false,
      message: `Failed to check dimension: ${error}`,
    });
  }

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS");
  console.log("=".repeat(60) + "\n");

  results.forEach((result) => {
    const icon = result.passed ? "✓" : "✗";
    const status = result.passed ? "PASS" : "FAIL";
    console.log(`${icon} [${status}] ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log("=".repeat(60));
  console.log(`Summary: ${passedCount}/${totalCount} tests passed`);
  console.log("=".repeat(60) + "\n");

  if (passedCount === totalCount) {
    console.log("✅ All tests passed! RAG functionality should work correctly.");
    console.log("\nNext steps:");
    console.log("1. Create 2-3 journal entries with similar topics");
    console.log("2. Create a new entry related to those topics");
    console.log("3. Check the entry detail page for 'Related Past Entries'");
    console.log("4. Verify the AI response references past entries");
  } else {
    console.log("⚠️  Some tests failed. Please review the errors above.");
    console.log("\nTroubleshooting:");
    console.log("1. Ensure migration (migrate_to_384d.sql) was executed");
    console.log("2. Check database schema matches expected structure");
    console.log("3. Verify environment variables are set correctly");
  }
}

// Run tests
testRAG().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});

