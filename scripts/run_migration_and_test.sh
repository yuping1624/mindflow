#!/bin/bash

# Migration and RAG Testing Script
# This script guides you through the migration process and runs tests

set -e

echo "🚀 MindFlow RAG Migration & Testing"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check environment variables
echo "📋 Step 1: Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables found${NC}"
echo ""

# Step 2: Migration instructions
echo "📋 Step 2: Database Migration"
echo "----------------------------"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You need to execute the migration manually in Supabase Dashboard${NC}"
echo ""
echo "Please follow these steps:"
echo "1. Open https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to 'SQL Editor' in the left menu"
echo "4. Click 'New Query'"
echo "5. Open the file: db/migrate_to_384d.sql"
echo "6. Copy ALL content (including BEGIN; and COMMIT;)"
echo "7. Paste into SQL Editor"
echo "8. Click 'Run' or press Cmd/Ctrl + Enter"
echo ""
read -p "Have you completed the migration in Supabase Dashboard? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please complete the migration first, then run this script again${NC}"
    exit 0
fi

echo -e "${GREEN}✓ Migration completed${NC}"
echo ""

# Step 3: Verify migration
echo "📋 Step 3: Verifying migration..."
echo "---------------------------------"
echo ""
echo "Running verification script..."
echo ""

# Run the TypeScript test script
if command -v npx &> /dev/null; then
    npx tsx scripts/test_rag.ts
else
    echo -e "${RED}❌ npx not found. Please install Node.js and npm${NC}"
    exit 1
fi

echo ""
echo "===================================="
echo "✅ Migration and verification complete!"
echo ""
echo "Next steps:"
echo "1. Start the dev server: npm run dev"
echo "2. Create 2-3 journal entries with similar topics"
echo "3. Create a new entry related to those topics"
echo "4. Check the entry detail page for 'Related Past Entries'"
echo ""

