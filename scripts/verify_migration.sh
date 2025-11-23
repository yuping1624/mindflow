#!/bin/bash

# Verification Script for 384D Migration
# This script helps verify that the migration was successful
# 
# Usage: ./scripts/verify_migration.sh
#
# Prerequisites:
#   1. Supabase CLI installed (optional, for direct DB access)
#   2. Or use Supabase Dashboard SQL Editor to run verify_384d_migration.sql

echo "🔍 RAG Migration Verification Script"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "   Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set in .env.local"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Instructions
echo "📋 Migration Verification Steps:"
echo ""
echo "Option 1: Use Supabase Dashboard (Recommended)"
echo "  1. Go to https://supabase.com/dashboard"
echo "  2. Select your project"
echo "  3. Open SQL Editor"
echo "  4. Copy and paste the contents of: db/verify_384d_migration.sql"
echo "  5. Run the query"
echo "  6. Review the results"
echo ""

echo "Option 2: Use Supabase CLI (if installed)"
if command -v supabase &> /dev/null; then
    echo "  ✓ Supabase CLI found"
    echo "  Run: supabase db execute --file db/verify_384d_migration.sql"
else
    echo "  ⚠ Supabase CLI not found (optional)"
    echo "  Install: npm install -g supabase"
fi

echo ""
echo "Option 3: Manual Testing"
echo "  1. Create 2-3 journal entries with similar topics (e.g., 'work stress')"
echo "  2. Create a new entry with related content"
echo "  3. Check the entry detail page for 'Related Past Entries'"
echo "  4. Verify similarity badges appear"
echo ""

echo "📝 Next Steps After Verification:"
echo "  1. If migration is successful, test RAG by creating journal entries"
echo "  2. Check that AI responses reference past entries when relevant"
echo "  3. Verify similarity scores are displayed correctly in UI"
echo ""

echo "📚 For detailed migration instructions, see: db/MIGRATION_GUIDE_384D.md"
echo ""

