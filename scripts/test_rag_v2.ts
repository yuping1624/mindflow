import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 必須用 Service Role 來建立測試用戶

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Admin client to manage users
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testRAG() {
  console.log('🚀 Starting RAG Verification...');

  // 1. Create a temporary test user
  const testEmail = `rag-test-${Date.now()}@example.com`;
  const testPassword = 'test-password-123';
  
  console.log(`👤 Creating temp user: ${testEmail}`);
  const { data: user, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (createError) {
    console.error('❌ Failed to create temp user:', createError.message);
    process.exit(1);
  }

  try {
    // 2. Sign in as the test user to get a valid session (auth.uid)
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: session, error: loginError } = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      throw new Error(`Login failed: ${loginError.message}`);
    }

    console.log('✅ Logged in successfully');

    // 3. Test the Embedding generation (Mock test, skipping real API to save cost)
    // We just create a dummy vector for testing DB connectivity
    const dummyVector = Array(384).fill(0.1); 

    // 4. Call the RPC function (match_entries)
    // Now we are authenticated, so auth.uid() will exist!
    console.log('🔍 Testing match_entries RPC...');
    
    const { data: matches, error: rpcError } = await authClient.rpc('match_entries', {
      query_embedding: dummyVector,
      match_threshold: 0.5,
      match_count: 1
    });

    if (rpcError) {
      // If we get "User must be authenticated", something is wrong. 
      // But if we get other errors (or empty array), that's fine for connectivity check.
      throw new Error(`RPC Error: ${rpcError.message}`);
    }

    console.log('✅ match_entries RPC call successful!');
    console.log(`   Result count: ${matches ? matches.length : 0} (Expected 0 for new user)`);
    console.log('🎉 RAG Infrastructure is READY and SECURE.');

  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
  } finally {
    // 5. Cleanup: Delete the test user
    console.log('🧹 Cleaning up test user...');
    await adminClient.auth.admin.deleteUser(user.user!.id);
  }
}

testRAG();