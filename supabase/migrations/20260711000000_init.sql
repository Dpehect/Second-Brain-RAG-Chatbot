-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create profile trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. Create documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  storage_path text not null,
  size bigint not null,
  mime_type text not null,
  status text not null default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message text,
  analysis text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.documents enable row level security;

-- Documents Policies
create policy "Users can view their own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can insert their own documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own documents" on public.documents
  for delete using (auth.uid() = user_id);


-- 4. Create document_chunks table
create table if not exists public.document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  embedding vector(384), -- local all-MiniLM-L6-v2 uses 384 dimensions
  metadata jsonb not null default '{}'::jsonb,
  chunk_index integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexing for fast semantic search using HNSW
create index if not exists document_chunks_embedding_hnsw_idx 
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Enable RLS
alter table public.document_chunks enable row level security;

-- Document Chunks Policies
create policy "Users can view their own chunks" on public.document_chunks
  for select using (auth.uid() = user_id);

create policy "Users can manage their own chunks" on public.document_chunks
  for all using (auth.uid() = user_id);


-- 5. Create conversations table
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.conversations enable row level security;

-- Conversations Policies
create policy "Users can manage their own conversations" on public.conversations
  for all using (auth.uid() = user_id);


-- 6. Create messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  sources jsonb default '[]'::jsonb, -- stores citation references (chunks, docs)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.messages enable row level security;

-- Messages Policies
create policy "Users can manage their own messages" on public.messages
  for all using (auth.uid() = user_id);


-- 7. PGVector Match Function (Semantic Search RPC)
create or replace function public.match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  metadata jsonb,
  chunk_index int,
  similarity float
)
language plpgsql security definer
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    d.name as document_name,
    dc.content,
    dc.metadata,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.user_id = filter_user_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
