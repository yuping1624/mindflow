# MindFlow - AI Voice Coach | Product Requirements Document (PRD) v2.3

| Metadata | Details |
| :--- | :--- |
| **Version** | 2.3 (Revised with Risk Mitigation) |
| **Date** | 2025-11-21 |
| **Status** | Ready for Development |
| **Reviewer** | Yuna Tseng |

-----

## 1\. Critical Design Philosophy

  * **Human Connection:** This AI must feel like a trusted friend who listens, not a therapist who lectures.
  * **Business Viability:** We treat data as a strategic asset. We optimize for Unit Economics using intelligent model routing and prove value through User Sentiment Delta tracking.
  * **Technical Robustness:** Security and cost-efficiency are built into the architecture from day one.

-----

## 2\. Project Overview

  * **Product Name:** MindFlow - AI Voice Coach
  * **Purpose:** MindFlow is a web application that helps users maintain emotional wellbeing through voice journaling combined with AI-powered psychological support.
  * **Core Value Proposition:**
    1.  **Validation First:** AI validates feelings before offering insights.
    2.  **Pattern Recognition (RAG):** Discovers blind spots users can't see themselves by recalling past entries.
    3.  **Adaptive Personality:** Switches between listening and coaching modes.
    4.  **Measurable Impact:** Tracks emotional trajectory to prove wellbeing improvements.
  * **Target Users:** Individuals seeking mental wellness support, personal growth, or structured self-reflection.

-----

## 3\. User Flow

### 2.1 Authentication Flow

1.  User lands on `/login`.
2.  Supabase Auth handles Email/Password or Google OAuth.
3.  Redirect to `/dashboard` upon success.

### 2.2 Voice Journaling Flow (Cost-Optimized)

1.  **Mode Selection:** User selects Listening / Coaching / Smart Mode.
2.  **Recording:** User records voice entry.
3.  **Transcription:** Audio sent to `/api/transcribe` (Whisper).
4.  **Text Review (CRITICAL FOR COST SAVING):**
      * User sees the transcribed text.
      * User allows to **EDIT text manually**. (This avoids re-recording/re-transcribing costs if there are minor errors).
5.  **Submission:** User clicks "Save & Analyze".
6.  **Processing:** System calculates sentiment, retrieves memories, and generates response.

### 2.3 AI Analysis & Routing Flow (The "Brain")

**Technical Concept: How RAG Works Here**

  * **Embedding:** Converting user text into mathematical coordinates (vectors).
  * **Retrieval:** Finding past entries that are "mathematically close" to current feelings, even if keywords differ (e.g., "tired" matches "exhausted").

**Process Steps:**

1.  **Tone Detection (Fast/Cheap):** System identifies primary emotion and energy level using `gpt-4o-mini`.
2.  **Model Routing:**
      * Simple Validation → Routes to `gpt-4o-mini`.
      * Complex Coaching → Routes to `gpt-4o`.
3.  **RAG Retrieval:** Fetches relevant past entries from `pgvector`.
      * *New Cost Control:* Implements embedding caching/deduplication to prevent redundant calculations.
4.  **Response Generation:** AI generates response based on Mode + Tone + History.
5.  **Data Logging:** Sentiment score, cost of session, and tokens used are logged.

-----

## 3\. Tech Stack & Config

### 3.1 Core Stack

  * **Framework:** Next.js 14 (App Router), TypeScript, React 18.
  * **Database & Auth:** Supabase (PostgreSQL + GoTrue).
  * **Vector Store:** Supabase pgvector.
  * **AI Models:** OpenAI (Whisper, GPT-4o, GPT-4o-mini, text-embedding-3-small).
  * **State Management:** Zustand.

### 3.2 UI Libraries

  * Shadcn/UI, Tailwind CSS, Lucide React.

### 3.3 Environment Variables (MANDATORY & SECURITY WARNING)

> **⚠️ SECURITY WARNING:**
>
>   * **SUPABASE\_SERVICE\_ROLE\_KEY:** This key possesses full privileges to bypass Row Level Security (RLS). It must **NEVER** appear in frontend code (`NEXT_PUBLIC_...`). It is strictly for use in Next.js API Routes or Server Actions.
>   * **OpenAI Credit Check:** Ensure your OpenAI account has sufficient Credit Balance (Pre-paid credits) before development. Simply having a credit card linked may not be sufficient for API access depending on account tier.

Create a `.env.local` file with these exact keys:

```bash
# Supabase (Retrieve from Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # BACKEND ONLY

# OpenAI
OPENAI_API_KEY=sk-proj-...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

-----

## 4\. Database Schema (Enhanced)

> **⚠️ CRITICAL SETUP INSTRUCTION:**
> The SQL commands below **cannot** be run via migration scripts reliably in all environments. You **MUST** manually copy-paste and run steps 4.1 and 4.2 in the **Supabase SQL Editor dashboard** before starting development to ensure the `vector` extension and indexes are correctly activated.

### 4.1 Extensions

```sql
-- Enable Vector extension for RAG
-- Note: Must be enabled manually in Dashboard if this fails
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 Tables

**Profiles**

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  default_ai_mode TEXT DEFAULT 'smart',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Add RLS policies here...
```

**Entries (Updated for Data Strategy)**

```sql
CREATE TABLE public.entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content
  transcription TEXT NOT NULL,
  audio_url TEXT,

  -- AI Analysis & Metadata
  ai_response TEXT,
  ai_mode TEXT CHECK (ai_mode IN ('listening', 'coaching', 'smart')),
  emotion_tags TEXT[],
  detected_tone TEXT,

  -- Data Strategy & BI Columns
  sentiment_score FLOAT, -- 0.0 (Negative) to 1.0 (Positive)
  energy_score FLOAT,    -- 0.0 (Low) to 1.0 (High Energy)
  tokens_used INT,       -- Total tokens for this entry
  cost_usd FLOAT,        -- Estimated cost for this entry

  -- RAG
  referenced_entry_ids UUID[],

  -- Search
  transcription_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', transcription)) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add RLS policies (uid = user_id)
```

**Embeddings**

```sql
CREATE TABLE public.embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536) NOT NULL, -- Matches text-embedding-3-small
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL PERFORMANCE INDEX
-- Must be created after some data exists for optimal performance,
-- but acceptable to create early for ivfflat.
CREATE INDEX embeddings_vector_idx ON public.embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Usage Logs (For Unit Economics)**

```sql
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  feature TEXT,       -- 'transcription', 'tone_detect', 'chat_response'
  model_used TEXT,    -- 'whisper', 'gpt-4o', 'gpt-4o-mini'
  input_tokens INT,
  output_tokens INT,
  estimated_cost FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.3 Helper Functions (RAG)

```sql
-- Function to find similar entries
CREATE OR REPLACE FUNCTION match_entries(
  query_embedding vector(1536),
  match_user_id UUID, -- SECURITY: API must pass auth.uid() here
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  exclude_entry_id UUID DEFAULT NULL
)
RETURNS TABLE (
  entry_id UUID,
  transcription TEXT,
  emotion_tags TEXT[],
  detected_tone TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS entry_id,
    e.transcription,
    e.emotion_tags,
    e.detected_tone,
    e.created_at,
    1 - (emb.embedding <=> query_embedding) AS similarity
  FROM embeddings emb
  JOIN entries e ON emb.entry_id = e.id
  WHERE emb.user_id = match_user_id -- DATA ISOLATION CHECK
    AND (exclude_entry_id IS NULL OR e.id != exclude_entry_id)
    AND 1 - (emb.embedding <=> query_embedding) > match_threshold
  ORDER BY emb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

-----

## 5\. API Routes Structure

### `POST /api/transcribe`

  * **Input:** FormData with audio file.
  * **Model:** Whisper-1.
  * **Logic:** Return raw text. Allow client to edit text before saving.

### `POST /api/journal` (The Router Gateway)

  * **Security:** Verify `supabase.auth.getUser()` first.
  * **Cost Control:** Check daily usage limit for the user before processing.
  * **Logic:**
    1.  Save transcription to DB.
    2.  **Embedding Cache Check:** (Optional) Check if similar text exists to reuse embedding (hash check).
    3.  Generate Embedding (`text-embedding-3-small`).
    4.  **Tone Detection:** Call `gpt-4o-mini` to get tone, sentiment\_score.
    5.  **Routing Decision:**
          * IF `aiMode == 'listening'` → Use `gpt-4o-mini`.
          * IF `aiMode == 'coaching'` → Use `gpt-4o`.
          * IF `aiMode == 'smart'`:
              * IF `sentiment_score < 0.3` (High Distress) → `gpt-4o` (Safety/Depth).
              * ELSE → `gpt-4o-mini`.
    6.  **RAG Retrieval:** Call `match_entries` RPC.
    7.  **Generate Response:** Call selected model with history context.
    8.  **Logging:** Record costs to `usage_logs`.

-----

## 6\. Logic & Prompts

### 6.1 Tone Detection (Low Cost)

  * **Model:** `gpt-4o-mini`
  * **System Prompt:**
    ```json
    Analyze the user's journal entry. Return JSON:
    {
      "tone": "positive" | "negative" | "neutral" | "seeking_help",
      "emotionTags": ["tag1", "tag2"],
      "sentiment_score": 0.0 to 1.0,
      "energy_score": 0.0 to 1.0
    }
    ```

### 6.2 Mode-Aware System Prompts

  * **Context Injection:** "User mentioned [Previous Entry Date]: [Summary]. Use this context naturally."
  * **IF Listening Mode (gpt-4o-mini):** "Validate. Mirror emotions. Keep under 50 words. No advice."
  * **IF Coaching Mode (gpt-4o):** "Validate FIRST. Reference patterns. Ask one gentle question."

-----

## 7\. Data Strategy & Business Intelligence

### 7.1 User Sentiment Delta (Impact Tracking)

  * **Metric:** Sentiment Delta (Current Entry Score vs. 7-Day Moving Average).
  * **Visualization:** "Mood Horizon" chart in Dashboard.

### 7.2 Intelligent Model Routing & Cost Control (Optimized)

  * **Goal:** Keep Cost Per Session (CpS) \< $0.03.
  * **Strategy:**
    1.  **Model Hierarchy:** Use `gpt-4o-mini` for \>60% of interactions (Tone detect + Listening mode). Use `gpt-4o` only when deep reasoning is required.
    2.  **Embedding Optimization:** Implement simple caching or deduplication for identical text entries.
    3.  **Daily Limits:** Enforce a soft limit (e.g., 5 AI-analyzed entries per day) per user to prevent cost runaways during beta.
    4.  **Batch Processing:** (Future Phase) Consider delaying non-critical Tone Detection for batch processing if real-time analysis isn't strictly required for the UI update.

-----

## 8\. Success Metrics

  * **Business:** Average Margin per User \> 70%.
  * **User:** Positive Sentiment Delta after 14 days.
  * **Tech:** API Errors \< 1%.

-----

**End of PRD.**