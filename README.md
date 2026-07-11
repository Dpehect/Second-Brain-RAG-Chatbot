# Second-Brain RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot that lets users upload documents (PDF, DOCX, DOC, TXT, Markdown), automatically parses and indexes them into a vector store, and provides a conversational interface to query their personal knowledge base. Built on Next.js 16 App Router with Supabase as the backend.

---

## Architecture Overview

```
Client (React 19)
  |
  v
Next.js 16 App Router (Turbopack)
  |
  +-- Server Components (Dashboard, Documents, Chat pages)
  +-- Server Actions (Document upload, Conversation CRUD)
  +-- API Routes (POST /api/chat - streaming response)
  |
  v
Supabase
  +-- Auth (Email/Password + Google OAuth via PKCE)
  +-- PostgreSQL (pgvector extension for vector similarity search)
  +-- Storage (Private bucket for uploaded files)
  +-- Row Level Security (per-user data isolation)
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.10 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Auth & Database | Supabase (Auth, PostgreSQL, Storage) | supabase-js 2.110 |
| Vector Search | pgvector (PostgreSQL extension) | -- |
| AI SDK | Vercel AI SDK | 7.0.22 |
| LLM Providers | OpenAI, Anthropic, xAI (Grok), Ollama (local) | -- |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2, 384-dim) or OpenAI text-embedding-3-small | 2.17.2 |
| PDF Parsing | pdf-parse | 2.4.5 |
| DOCX Parsing | mammoth | 1.12.0 |
| DOC Parsing | word-extractor | 1.0.4 |
| Styling | Tailwind CSS 4 + shadcn/ui components | 4.x |
| Deployment | Vercel (Serverless Functions) | -- |

---

## RAG Pipeline

The document processing pipeline runs entirely as a Next.js Server Action (`src/lib/actions/document.ts`). All heavy library imports are **dynamic** (`await import(...)`) to prevent Vercel serverless functions from exceeding memory limits during module evaluation.

### Ingestion Flow

```
File Upload (FormData)
  |
  v
1. Auth check (Supabase getUser)
  |
  v
2. Create document record in PostgreSQL (status: pending)
  |
  v
3. Upload file binary to Supabase Storage (private bucket)
  |
  v
4. Parse file content to plaintext
   - PDF:  pdf-parse (pdfjs-dist under the hood)
   - DOCX: mammoth (extractRawText)
   - DOC:  word-extractor (OLE Compound File parser)
   - TXT/MD: Buffer.toString('utf-8')
  |
  v
5. Chunk text into overlapping segments
   - Chunk size: 1000 chars
   - Overlap: 200 chars
   - Boundary detection: newlines > spaces (150-char lookback)
  |
  v
6. Generate 384-dimensional vector embeddings per chunk
   - Primary: OpenAI text-embedding-3-small (dimensions: 384)
   - Fallback (serverless): Placeholder vector [1, 0, 0, ..., 0]
   - Fallback (local): @xenova/transformers all-MiniLM-L6-v2 (ONNX/WASM)
  |
  v
7. Batch insert chunks + embeddings into document_chunks table
   - Batch size: 100 rows per INSERT to avoid query parameter limits
  |
  v
8. Generate document analysis report
   - If LLM available: Semantic analysis via generateText()
   - If offline: Local statistical analyzer (word freq, sentence extraction, keyphrase detection)
  |
  v
9. Update document status to 'completed', store analysis report
```

### Query Flow

```
User message (POST /api/chat)
  |
  v
1. Generate query embedding (same pipeline as ingestion)
  |
  v
2. Call match_document_chunks RPC (pgvector cosine similarity)
   - Threshold: 0.25
   - Max results: 4 chunks
   - Filtered by user_id (RLS enforced)
  |
  v
3. Build system prompt with retrieved context + source citations
  |
  v
4. Stream LLM response via Vercel AI SDK streamText()
   - Provider selection: Ollama (local) > Anthropic > xAI > OpenAI
   - If no LLM: Return raw retrieved chunks as formatted markdown
  |
  v
5. Save assistant response + source metadata to messages table
```

---

## Database Schema

### Tables

**profiles** - Auto-created via trigger on auth.users insert.

| Column | Type | Constraint |
|--------|------|-----------|
| id | uuid | PK, references auth.users ON DELETE CASCADE |
| email | text | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

**documents** - Uploaded file metadata and processing state.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| user_id | uuid | FK to auth.users, CASCADE |
| name | text | Original filename |
| storage_path | text | Supabase Storage path |
| size | bigint | File size in bytes |
| mime_type | text | MIME type string |
| status | text | pending / processing / completed / failed |
| error_message | text | Nullable, failure reason |
| analysis | text | Nullable, generated feedback report (markdown) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**document_chunks** - Chunked text with vector embeddings.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| document_id | uuid | FK to documents, CASCADE |
| user_id | uuid | FK to auth.users, CASCADE |
| content | text | Chunk plaintext |
| embedding | vector(384) | pgvector column, 384 dimensions |
| metadata | jsonb | {fileName, fileSize, mimeType, charCount} |
| chunk_index | integer | Position in document |
| created_at | timestamptz | DEFAULT now() |

**conversations** - Chat sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| user_id | uuid | FK to auth.users, CASCADE |
| title | text | Auto-set from first user message (35 chars) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**messages** - Individual chat messages.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| conversation_id | uuid | FK to conversations, CASCADE |
| user_id | uuid | FK to auth.users, CASCADE |
| role | text | user / assistant / system |
| content | text | Message body |
| sources | jsonb | Array of {documentId, documentName, content, chunkIndex, similarity} |
| created_at | timestamptz | DEFAULT now() |

### Indexes

- `document_chunks_embedding_hnsw_idx` on `document_chunks` using HNSW (`vector_cosine_ops`)

### RPC Functions

**match_document_chunks(query_embedding, match_threshold, match_count, filter_user_id)**

Performs cosine similarity search against the `document_chunks` table, joining with `documents` to return the source filename. Returns rows where `1 - (embedding <=> query_embedding) > match_threshold`, ordered by distance, limited to `match_count`.

---

## Project Structure

```
src/
  app/
    (auth)/
      login/page.tsx          -- Email + Google OAuth login
      signup/page.tsx         -- Email + Google OAuth signup
      actions.ts              -- Server actions for auth forms
    api/
      chat/route.ts           -- POST handler, streaming LLM responses
    auth/
      callback/route.ts       -- OAuth PKCE code exchange
    dashboard/
      page.tsx                -- Dashboard home (redirect to chat)
      layout.tsx              -- Sidebar + main content layout
      chat/
        [[...id]]/page.tsx    -- Chat interface (catch-all route)
      documents/
        page.tsx              -- Document management page
  components/
    chat/
      chat-box.tsx            -- Message list + input (useChat hook)
      chat-initializer.tsx    -- Client-side conversation bootstrap
      sidebar.tsx             -- Conversation list + new chat button
    documents/
      upload-zone.tsx         -- Drag-and-drop file upload
      document-list.tsx       -- Document cards with status + analysis viewer
    ui/                       -- shadcn/ui primitives (button, card, input, etc.)
  lib/
    actions/
      conversation.ts         -- createConversation, deleteConversation
      document.ts             -- uploadAndProcessDocument, generateDocumentAnalysis, deleteDocument
    rag/
      parser.ts               -- PDF/DOCX/DOC/TXT text extraction (dynamic imports)
      chunker.ts              -- Overlapping text splitter (1000/200 chars)
      embedder.ts             -- Vector embedding generation (dynamic imports)
      analyzer.ts             -- Document feedback report generator (dynamic imports)
    supabase/
      client.ts               -- Browser Supabase client (createBrowserClient)
      server.ts               -- Server Supabase client (createServerClient with cookies)
      middleware.ts            -- Auth session refresh middleware
    shim.ts                   -- Empty module for Turbopack native binary aliases
```

---

## Serverless Constraints and Mitigations

Vercel serverless functions impose strict resource limits (512MB RAM, 10s default timeout). The following design decisions address these constraints:

1. **Dynamic imports everywhere.** No top-level imports of `@xenova/transformers`, `pdf-parse`, `mammoth`, `word-extractor`, `@ai-sdk/openai`, or `@ai-sdk/anthropic`. All are loaded via `await import(...)` inside function bodies to prevent module-level side effects from exhausting memory during cold starts.

2. **Turbopack resolve aliases.** `onnxruntime-node` and `sharp` are aliased to an empty shim module (`src/lib/shim.ts`) in `next.config.ts` to prevent Turbopack from bundling native C++ binaries.

3. **Embedding fallback chain.** On Vercel without an OpenAI key, the embedder returns a placeholder vector instead of attempting to load the 30MB+ ONNX model into WASM memory.

4. **maxDuration = 60.** Document processing and chat routes set `export const maxDuration = 60` to extend the Vercel function timeout from the default 10 seconds.

5. **Client-side conversation initialization.** New chat creation uses a client component (`ChatInitializer`) with `useEffect` to call the server action, avoiding `revalidatePath` during server-side render (which Next.js 16 disallows).

---

## Environment Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LLM Providers (at least one recommended for chat)
OPENAI_API_KEY=sk-...            # Also enables cloud embeddings
ANTHROPIC_API_KEY=sk-ant-...     # Claude models
XAI_API_KEY=xai-...              # Grok models

# No key needed for Ollama -- auto-detected at http://localhost:11434
```

---

## Local Development

```bash
git clone https://github.com/Dpehect/Second-Brain-RAG-Chatbot.git
cd Second-Brain-RAG-Chatbot
npm install
cp .env.example .env.local       # Fill in Supabase credentials
npm run dev                      # http://localhost:3000
```

For fully offline operation (no cloud APIs), install and run Ollama:

```bash
ollama run llama3
```

The application auto-detects Ollama at `localhost:11434` and uses it for both chat responses and document analysis.

---

## Deployment

The application is configured for zero-config deployment on Vercel:

1. Connect the GitHub repository to a Vercel project.
2. Set environment variables in Vercel dashboard (Supabase URL, anon key, optional LLM keys).
3. Vercel auto-detects `next build` and deploys with Turbopack.

Supabase setup requires running the SQL schema migration in the Supabase SQL Editor (tables, RLS policies, pgvector extension, HNSW index, RPC function, and auth trigger).

---

## File Size Limits

- Maximum upload size: **10 MB** (enforced both client-side and server-side)
- Supported formats: PDF, DOCX, DOC (Word 97-2003), TXT, Markdown

---

## License

MIT
