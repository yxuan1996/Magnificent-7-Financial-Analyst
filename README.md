# Magnificent-7-Financial-Analyst
An AI-powered financial analysis chatbot for the Magnificent 7 tech companies, demonstrating RAG with Hybrid Search
# Magnificent 7 — Financial Analyst

An AI-powered financial analysis chatbot for the Magnificent 7 tech companies, demonstrating **RAG with Hybrid Search** using:

- **Pinecone** — Vector database storing chunked annual report text and tables  
- **Neo4j** — Graph database for financial facts, key persons, and key developments  
- **LangChain (LangGraph)** — ReAct agent with specialised tools for each data source  
- **Supabase SSR** — Authentication (login-only)  
- **Next.js 15** — App Router with streaming API routes  

---

## Project Structure

```
magnificent7-financial-analyst/
├── app/
│   ├── layout.tsx              # Root layout with fonts & metadata
│   ├── page.tsx                # Root → redirects to /login or /chat
│   ├── globals.css             # Tailwind base + custom utilities
│   ├── login/
│   │   └── page.tsx            # Login page (server component)
│   ├── chat/
│   │   └── page.tsx            # Chat page (protected, server component)
│   └── api/
│       ├── auth/callback/
│       │   └── route.ts        # Supabase OAuth callback
│       └── chat/
│           └── route.ts        # Streaming chat API (invokes LangChain agent)
│
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx       # Email + password login form
│   └── chat/
│       ├── types.ts            # Shared TypeScript types & constants
│       ├── ChatInterface.tsx   # Root chat component (layout + state)
│       ├── ChatHeader.tsx      # Top bar: logo, tickers, sign-out
│       ├── MessageList.tsx     # Scrollable message list + empty state
│       ├── MessageBubble.tsx   # Single message + typing indicator
│       └── ChatInput.tsx       # Fixed bottom input bar
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client (for Client Components)
│   │   └── server.ts           # Server client (for Server Components)
│   ├── pinecone.ts             # Pinecone singleton client
│   ├── neo4j.ts                # Neo4j driver + query helper
│   └── langchain/
│       ├── agent.ts            # LangGraph ReAct agent + runAgent generator
│       └── tools/
│           ├── vectorTools.ts          # search_report_text, search_report_tables
│           ├── financialGraphTools.ts  # get_financial_metric, compare_*
│           ├── keyPersonTools.ts       # get_key_persons
│           └── keyDevelopmentTools.ts  # get_key_developments
│
├── middleware.ts               # Session refresh + route protection
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── .env.local.example
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.17+ |
| npm / pnpm / yarn | latest |
| Supabase project | — |
| Pinecone account + index | — |
| Neo4j instance | 5.x |
| OpenAI API key | GPT-4o access |

---

## Local Setup

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd magnificent7-financial-analyst
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in **all** values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-index-name

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

### 4. Configure Supabase Authentication

1. In your Supabase dashboard, go to **Authentication → Providers** and enable **Email**.
2. Disable **Sign-ups** (Settings → Authentication → Disable signups) since this app is login-only.
3. Create user accounts manually via the Supabase dashboard under **Authentication → Users**.
4. Set the **redirect URL** for auth callbacks:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.vercel.app/api/auth/callback`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Pinecone Data Schema

The vector index stores two types of chunks, differentiated by metadata keys:

| Chunk type | Metadata key | Other expected metadata |
|-----------|-------------|------------------------|
| Paragraph text | `text` | `ticker`, `fiscal_year`, `source` |
| Markdown table | `table_markdown` | `ticker`, `fiscal_year`, `source` |

---

## Neo4j Graph Schema

### Financial Facts (from 10-K filings)

```cypher
(:Company {ticker, name})
(:Document {id, source})
(:FiscalYear {year})
(:Metric {name})
(:Fact {value, unit})

(Document)-[:BELONGS_TO]->(Company)
(Document)-[:BELONGS_TO]->(FiscalYear)
(Document)-[:REPORTS]->(Fact)
(Fact)-[:FOR_METRIC]->(Metric)
```

### Key Persons & Developments (from annual reports)

```cypher
(:KeyPerson {name, role, description})
(:KeyDevelopment {category, title, description})

(Document)-[:MENTIONS]->(KeyPerson)
(Document)-[:MENTIONS]->(KeyDevelopment)
```

**KeyPerson roles:** `CEO`, `CFO`, `COO`, `Chairperson`, `BoardMember`

**KeyDevelopment categories:** `M&A`, `Restructuring`, `Litigation`, `ProductLaunch`, `RegulatoryAction`, `GuidanceChange`

---

## LangChain Agent Tools

| Tool name | Source | Description |
|-----------|--------|-------------|
| `search_report_text` | Pinecone | Semantic search over narrative text |
| `search_report_tables` | Pinecone | Semantic search over financial tables |
| `get_financial_metric` | Neo4j | Single metric for one company/year |
| `compare_metric_across_years` | Neo4j | Trend of one metric over all years |
| `compare_metric_across_companies` | Neo4j | Peer comparison for one metric/year |
| `get_key_persons` | Neo4j | Executives and board members |
| `get_key_developments` | Neo4j | Corporate events by category/year |

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/<you>/magnificent7-financial-analyst.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Vercel auto-detects Next.js — no build config changes needed.

### 3. Add environment variables

In your Vercel project → **Settings → Environment Variables**, add **all** variables from your `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`

> ⚠️ **Neo4j URI for production:** Use a cloud-hosted Neo4j instance (e.g. Neo4j Aura) with a `neo4j+s://` URI so it's reachable from Vercel's serverless functions.

### 4. Deploy

Click **Deploy**. Vercel will build and deploy your app automatically on every push to `main`.

### 5. Update Supabase callback URL

Add your production URL to Supabase's allowed redirect list:

```
https://your-domain.vercel.app/api/auth/callback
```

---

## Development Tips

- **Streaming:** The chat API route uses `ReadableStream` to stream LLM tokens to the client in real-time.
- **Agent tracing:** Set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY=...` in `.env.local` to trace agent runs in LangSmith.
- **Adding companies:** To extend beyond the Magnificent 7, just ingest new data into Pinecone/Neo4j with the appropriate `ticker` metadata — no code changes required.
- **Replacing the markdown renderer:** The lightweight renderer in `MessageBubble.tsx` handles common cases. For production, swap it with `react-markdown` + `remark-gfm` for full CommonMark support.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui (canary) |
| Auth | Supabase SSR |
| Agent | LangChain JS + LangGraph |
| LLM | OpenAI GPT-4o |
| Vector DB | Pinecone |
| Graph DB | Neo4j |
| Deployment | Vercel |