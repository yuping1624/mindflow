-- Transaction 開始：確保全部成功或全部失敗
BEGIN;

-- 1. 啟用向量擴充功能
create extension if not exists vector with schema public;

-- 2. 建立使用者 Profile 表格 (與 Auth 連動)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  default_ai_mode text default 'smart',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 安全性設定
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- [新增] 自動化 Trigger：當使用者註冊時，自動建立 Profile
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. 建立日記條目 (Entries)
create table if not exists public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- 內容資料
  transcription text not null,
  audio_url text,
  
  -- AI 分析資料
  ai_response text,
  ai_mode text check (ai_mode in ('listening', 'coaching', 'smart')),
  emotion_tags text[], 
  detected_tone text, 
  
  -- 數據分析欄位
  sentiment_score float check (sentiment_score >= -1.0 and sentiment_score <= 1.0),
  energy_score float check (energy_score >= 0.0 and energy_score <= 1.0),
  tokens_used int default 0,
  cost_usd float default 0.0,
  
  -- 全文檢索索引 (Full Text Search)
  transcription_tsv tsvector generated always as (to_tsvector('english', transcription)) stored,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.entries enable row level security;
create policy "Users can all on own entries" 
  on public.entries for all 
  using (auth.uid() = user_id);

-- 4. 建立向量儲存 (Embeddings)
create table if not exists public.embeddings (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references public.entries(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  embedding vector(1536) not null, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.embeddings enable row level security;
create policy "Users can all on own embeddings" 
  on public.embeddings for all 
  using (auth.uid() = user_id);

-- [優化] 改用 HNSW 索引：效能與準確度的平衡比 ivfflat 更好
create index if not exists embeddings_vector_idx 
  on public.embeddings using hnsw (embedding vector_cosine_ops);

-- 5. 建立用量紀錄 (Usage Logs)
create table if not exists public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  feature text,       
  model_used text,    
  input_tokens int,
  output_tokens int,
  estimated_cost float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.usage_logs enable row level security;
create policy "Users can view own usage" 
  on public.usage_logs for select 
  using (auth.uid() = user_id);

-- 6. RAG 搜尋函數 (維持原本邏輯，因為已經很標準)
create or replace function match_entries(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float default 0.7,
  match_count int default 5,
  exclude_entry_id uuid default null
)
returns table (
  entry_id uuid,
  transcription text,
  emotion_tags text[],
  detected_tone text,
  created_at timestamp with time zone,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id as entry_id,
    e.transcription,
    e.emotion_tags,
    e.detected_tone,
    e.created_at,
    1 - (emb.embedding <=> query_embedding) as similarity
  from embeddings emb
  join entries e on emb.entry_id = e.id
  where emb.user_id = match_user_id
    and (exclude_entry_id is null or e.id != exclude_entry_id)
    and 1 - (emb.embedding <=> query_embedding) > match_threshold
  order by emb.embedding <=> query_embedding
  limit match_count;
end;
$$;

COMMIT;