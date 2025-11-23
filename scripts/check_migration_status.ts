/**
 * Migration Status Check Script
 * 
 * This script checks the current state of the database to determine
 * if the 384D migration has been executed.
 * 
 * Usage:
 *   npx tsx scripts/check_migration_status.ts
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

async function checkMigrationStatus(): Promise<void> {
  console.log("🔍 Checking Migration Status\n");
  console.log("=".repeat(60));

  // Check 1: Embedding column type via information_schema
  console.log("\n📋 Check 1: Embedding Column Type");
  console.log("-".repeat(60));
  try {
    // Use a direct SQL query via RPC if available, or check via data
    const { data: embeddings, error } = await supabase
      .from("embeddings")
      .select("embedding")
      .limit(1);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else if (embeddings && embeddings.length > 0) {
      const embedding = embeddings[0].embedding;
      const dimension = Array.isArray(embedding) ? embedding.length : null;
      
      if (dimension === 384) {
        console.log("✅ Embedding dimension: 384D (correct)");
      } else if (dimension === 1536) {
        console.log("⚠️  Embedding dimension: 1536D (needs migration)");
      } else if (dimension) {
        console.log(`⚠️  Embedding dimension: ${dimension}D (unexpected)`);
      } else {
        console.log("⚠️  Could not determine embedding dimension");
      }
    } else {
      console.log("ℹ️  No embeddings found (cannot check dimension)");
      console.log("   This is OK if you haven't created any entries yet.");
    }
  } catch (error) {
    console.log(`❌ Error checking embeddings: ${error}`);
  }

  // Check 2: match_entries function signature
  console.log("\n📋 Check 2: match_entries Function");
  console.log("-".repeat(60));
  try {
    // Try calling with 384D vector
    const dummyVector384 = Array(384).fill(0.1);
    const { error: error384 } = await supabase.rpc("match_entries", {
      query_embedding: dummyVector384,
      match_threshold: 0.0,
      match_count: 1,
      exclude_entry_id: null,
    });

    // Try calling with 1536D vector
    const dummyVector1536 = Array(1536).fill(0.1);
    const { error: error1536 } = await supabase.rpc("match_entries", {
      query_embedding: dummyVector1536,
      match_threshold: 0.0,
      match_count: 1,
      exclude_entry_id: null,
    });

    if (error384 && error1536) {
      // Both failed - check error messages
      if (error384.message.includes("dimension") || error384.message.includes("vector")) {
        if (error384.message.includes("1536")) {
          console.log("⚠️  Function expects 1536D (needs migration)");
        } else if (error384.message.includes("384")) {
          console.log("✅ Function accepts 384D (migration likely complete)");
        } else {
          console.log(`⚠️  Function error: ${error384.message}`);
        }
      } else if (error384.message.includes("authenticated")) {
        console.log("✅ Function exists (authentication required - this is expected)");
        console.log("   Note: Cannot verify dimension without authentication");
      } else {
        console.log(`⚠️  Function error: ${error384.message}`);
      }
    } else if (!error384) {
      console.log("✅ Function accepts 384D (migration complete)");
    } else if (!error1536) {
      console.log("⚠️  Function accepts 1536D (needs migration)");
    }
  } catch (error) {
    console.log(`❌ Error checking function: ${error}`);
  }

  // Check 3: Count existing embeddings
  console.log("\n📋 Check 3: Existing Embeddings");
  console.log("-".repeat(60));
  try {
    const { count, error } = await supabase
      .from("embeddings")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`ℹ️  Found ${count || 0} embedding(s) in database`);
      if (count && count > 0) {
        console.log("   ⚠️  If these are 1536D, you should delete them before migration:");
        console.log("      DELETE FROM public.embeddings;");
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }

  // Summary and recommendations
  console.log("\n" + "=".repeat(60));
  console.log("📝 Summary & Recommendations");
  console.log("=".repeat(60));
  console.log("\nTo complete the migration:");
  console.log("1. Open Supabase Dashboard: https://supabase.com/dashboard");
  console.log("2. Go to SQL Editor");
  console.log("3. If you have existing 1536D embeddings, delete them first:");
  console.log("   DELETE FROM public.embeddings;");
  console.log("4. Copy and run the migration: db/migrate_to_384d.sql");
  console.log("5. Run this script again to verify");
  console.log("\nAfter migration, test RAG with:");
  console.log("   npx tsx scripts/test_rag.ts");
  console.log("");
}

// Run check
checkMigrationStatus().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

