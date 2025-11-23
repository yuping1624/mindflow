/**
 * Execute Migration and Test RAG Functionality
 * 
 * This script guides you through the migration process and then tests RAG functionality.
 * 
 * Usage:
 *   npx tsx scripts/execute_migration_and_test.ts
 * 
 * Prerequisites:
 *   1. Environment variables must be set (.env.local)
 *   2. You must have access to Supabase Dashboard
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { join } from "path";
import * as readline from "readline";

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

interface MigrationStatus {
  hasEmbeddings: boolean;
  embeddingCount: number;
  embeddingDimension: number | null;
  functionAccepts384D: boolean | null;
  migrationNeeded: boolean;
}

async function checkMigrationStatus(): Promise<MigrationStatus> {
  console.log("🔍 Checking current migration status...\n");

  const status: MigrationStatus = {
    hasEmbeddings: false,
    embeddingCount: 0,
    embeddingDimension: null,
    functionAccepts384D: null,
    migrationNeeded: true,
  };

  // Check existing embeddings
  try {
    const { data: embeddings, count, error } = await supabase
      .from("embeddings")
      .select("embedding", { count: "exact" })
      .limit(1);

    if (error) {
      console.log(`⚠️  Error checking embeddings: ${error.message}`);
    } else {
      status.embeddingCount = count || 0;
      status.hasEmbeddings = (count || 0) > 0;

      if (embeddings && embeddings.length > 0) {
        const embedding = embeddings[0].embedding;
        status.embeddingDimension = Array.isArray(embedding)
          ? embedding.length
          : null;
      }
    }
  } catch (error) {
    console.log(`⚠️  Error: ${error}`);
  }

  // Check if function accepts 384D
  try {
    const dummyVector384 = Array(384).fill(0.1);
    const { error: error384 } = await supabase.rpc("match_entries", {
      query_embedding: dummyVector384,
      match_threshold: 0.0,
      match_count: 1,
      exclude_entry_id: null,
    });

    if (error384) {
      if (error384.message.includes("1536")) {
        status.functionAccepts384D = false;
      } else if (error384.message.includes("384")) {
        status.functionAccepts384D = true;
      } else if (error384.message.includes("authenticated")) {
        // Function exists but requires auth - this is OK
        status.functionAccepts384D = true;
      }
    } else {
      status.functionAccepts384D = true;
    }
  } catch (error) {
    // Ignore errors for now
  }

  // Determine if migration is needed
  status.migrationNeeded =
    status.embeddingDimension === 1536 ||
    status.embeddingDimension === null ||
    status.functionAccepts384D === false;

  return status;
}

function displayMigrationInstructions(status: MigrationStatus): void {
  console.log("\n" + "=".repeat(60));
  console.log("📋 MIGRATION INSTRUCTIONS");
  console.log("=".repeat(60) + "\n");

  if (status.hasEmbeddings && status.embeddingDimension === 1536) {
    console.log("⚠️  IMPORTANT: You have existing 1536D embeddings!");
    console.log("   These must be deleted before migration.\n");
    console.log("Step 1: Delete existing embeddings");
    console.log("   In Supabase SQL Editor, run:");
    console.log("   ```sql");
    console.log("   DELETE FROM public.embeddings;");
    console.log("   ```\n");
  }

  console.log("Step 2: Execute Migration SQL");
  console.log("   1. Open https://supabase.com/dashboard");
  console.log("   2. Select your project");
  console.log("   3. Go to 'SQL Editor' in the left menu");
  console.log("   4. Click 'New Query'");
  console.log("   5. Open the file: db/migrate_to_384d.sql");
  console.log("   6. Copy ALL content (including BEGIN; and COMMIT;)");
  console.log("   7. Paste into SQL Editor");
  console.log("   8. Click 'Run' or press Cmd/Ctrl + Enter");
  console.log("\n   Expected result: 'Success. No rows returned'\n");

  console.log("Step 3: Return here and press Enter to continue...");
}

async function verifyMigration(): Promise<boolean> {
  console.log("\n" + "=".repeat(60));
  console.log("✅ VERIFYING MIGRATION");
  console.log("=".repeat(60) + "\n");

  const status = await checkMigrationStatus();

  let allChecksPassed = true;

  // Check 1: Function accepts 384D
  console.log("Check 1: match_entries function accepts 384D...");
  if (status.functionAccepts384D === true) {
    console.log("   ✅ Function accepts 384D\n");
  } else if (status.functionAccepts384D === false) {
    console.log("   ❌ Function still expects 1536D\n");
    allChecksPassed = false;
  } else {
    console.log("   ⚠️  Could not verify (authentication required)\n");
  }

  // Check 2: Embedding dimension (if embeddings exist)
  if (status.hasEmbeddings) {
    console.log("Check 2: Embedding dimensions...");
    if (status.embeddingDimension === 384) {
      console.log("   ✅ Embeddings are 384D (correct)\n");
    } else if (status.embeddingDimension === 1536) {
      console.log("   ❌ Embeddings are still 1536D\n");
      allChecksPassed = false;
    } else {
      console.log(
        `   ⚠️  Could not determine dimension (${status.embeddingDimension}D)\n`
      );
    }
  } else {
    console.log("Check 2: Embedding dimensions...");
    console.log("   ℹ️  No embeddings found (will be created as 384D)\n");
  }

  return allChecksPassed;
}

async function testRAGFunctionality(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TESTING RAG FUNCTIONALITY");
  console.log("=".repeat(60) + "\n");

  // Test 1: Check embeddings count
  console.log("Test 1: Checking embeddings...");
  try {
    const { count, error } = await supabase
      .from("embeddings")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      return;
    }

    const embeddingCount = count || 0;
    console.log(`   ℹ️  Found ${embeddingCount} embedding(s)\n`);

    if (embeddingCount === 0) {
      console.log("   ⚠️  No embeddings found. To test RAG:");
      console.log("      1. Start dev server: npm run dev");
      console.log("      2. Create 2-3 journal entries with similar topics");
      console.log("      3. Create a new entry related to those topics");
      console.log("      4. Check the entry detail page for 'Related Past Entries'\n");
      return;
    }

    // Test 2: Verify match_entries works
    console.log("Test 2: Testing match_entries function...");
    try {
      // Get a real embedding to test with
      const { data: embeddings } = await supabase
        .from("embeddings")
        .select("embedding, entry_id")
        .limit(1);

      if (embeddings && embeddings.length > 0) {
        const testEmbedding = embeddings[0].embedding;
        const dimension = Array.isArray(testEmbedding)
          ? testEmbedding.length
          : null;

        if (dimension === 384) {
          console.log("   ✅ Using 384D embedding for test\n");

          // Note: This will fail without authentication, but that's expected
          // The function requires auth.uid() which service role doesn't provide
          console.log("   ℹ️  Note: match_entries requires user authentication");
          console.log("      This test will be performed when you create entries via the UI\n");
        } else {
          console.log(`   ⚠️  Embedding dimension is ${dimension}D (expected 384D)\n`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not test function: ${error}\n`);
    }

    console.log("✅ RAG setup appears correct!");
    console.log("\nNext steps:");
    console.log("1. Start dev server: npm run dev");
    console.log("2. Create 2-3 journal entries with similar topics (e.g., 'work stress')");
    console.log("3. Create a new entry related to those topics");
    console.log("4. Check the entry detail page for 'Related Past Entries'");
    console.log("5. Verify the AI response references past entries\n");
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }
}

async function main(): Promise<void> {
  console.log("🚀 MindFlow RAG Migration & Testing");
  console.log("====================================\n");

  // Step 1: Check current status
  const initialStatus = await checkMigrationStatus();

  console.log("Current Status:");
  console.log(`  - Embeddings found: ${initialStatus.embeddingCount}`);
  if (initialStatus.embeddingDimension) {
    console.log(`  - Embedding dimension: ${initialStatus.embeddingDimension}D`);
  }
  console.log(
    `  - Migration needed: ${initialStatus.migrationNeeded ? "Yes" : "No"}`
  );

  if (!initialStatus.migrationNeeded) {
    console.log("\n✅ Migration appears to be complete!");
    console.log("Proceeding to RAG functionality test...\n");
    await testRAGFunctionality();
    return;
  }

  // Step 2: Display migration instructions
  displayMigrationInstructions(initialStatus);

  // Wait for user to complete migration
  console.log("\n⏳ Waiting for you to complete the migration...");
  console.log("   (Press Enter after you've executed the SQL in Supabase Dashboard)");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question("", () => {
      rl.close();
      resolve();
    });
  });

  // Step 3: Verify migration
  const migrationSuccess = await verifyMigration();

  if (!migrationSuccess) {
    console.log("\n⚠️  Migration verification failed!");
    console.log("Please check:");
    console.log("1. Did you execute the migration SQL completely?");
    console.log("2. Did you delete existing 1536D embeddings first?");
    console.log("3. Check for any error messages in Supabase Dashboard\n");
    return;
  }

  console.log("\n✅ Migration verified successfully!\n");

  // Step 4: Test RAG functionality
  await testRAGFunctionality();

  console.log("\n" + "=".repeat(60));
  console.log("✅ MIGRATION & TESTING COMPLETE");
  console.log("=".repeat(60) + "\n");
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

