# Magnificent 7 — Financial Analyst

An AI-powered financial analysis chatbot for the Magnificent 7 tech companies, demonstrating **RAG with Hybrid Search** using:

- **Pinecone** — Vector database storing chunked annual report text and tables  
- **Neo4j** — Graph database for financial facts, key persons, and key developments  
- **LangChain (LangGraph)** — ReAct agent with specialised tools for each data source  
- **Supabase SSR** — Authentication (login-only)  
- **Next.js 15** — App Router with streaming API routes  

---

## Web App
[Web App Deployed to Vercel](https://magnificent-7-financial-analyst.vercel.app/chat)

## Screenshots

[Key Developments](Screenshots/key_developments.PNG)

[Key Drivers](Screenshots/key_drivers.PNG)

[Key Persons](Screenshots/key_person.PNG)

[Comparing Metrics Across Companies](Screenshots/Metrics_across_companies.PNG)

[Comparing Metrics Across Years](Screenshots/Metrics_across_years.PNG)


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
│
└── ingestion-and-parsing/         # Data ingestion (outside the Next.js app)
    ├── PDF_Annual_Shareholder_Reports.ipynb
    └── SEC_Edgar.ipynb
    └── key_development.md
    └── key_person.md

```

---

## Data Ingestion

The `ingestion-and-parsing/` folder sits **outside** the Next.js application and contains two Google Colab notebooks that build the knowledge base from scratch. Run these 2 notebooks once, then run the cypher queries in `key_development.md` and `key_person.md` directly in the neo4j database. The Next.js chat UI reads from the populated Pinecone and Neo4j instances. 

### Knowledge Base Overview

| Store | Populated by | Contents |
|-------|-------------|----------|
| **Pinecone** (index: `financial-reports`) | Both notebooks | Text chunks, financial statement tables, and annual report tables — all with `company_ticker` metadata |
| **Neo4j** | Both notebooks | Company, FiscalYear, Document, Metric, Fact, KeyPerson, KeyDevelopment nodes and their relationships |
| **Supabase Storage** | PDF notebook only | Intermediate JSON artefacts (OCR output, tables/facts) for resumability |

---

### Notebook 1 — PDF Annual Shareholder Reports

**File:** `ingestion-and-parsing/PDF_Annual_Shareholder_Reports.ipynb`

Processes the glossy PDF Annual Shareholder Reports (ARS filings) for the Magnificent 7 companies. These reports are rich in narrative prose, visual tables, and management commentary that complement the structured 10-K data.

> **Company coverage notes:**
> - Apple does not publish a separate glossy ARS — their 10-K serves as the annual report (handled by the SEC Edgar notebook).
> - Meta and Tesla ARS filings are excluded (Tesla reports exceed 500 pages and are impractical for page-by-page OCR).
> - Run the cypher queries in key_development.md and key_person.md to populate the knowledge base with Apple, Meta and Tesla data. 

#### Pipeline Architecture

```
[SEC EDGAR ARS Filing]
         |
         v
[Download PDF via EDGAR REST API]
         |
         v
[Convert each page → PNG image]       ← pymupdf
         |
         v
[Mistral Document AI OCR per page]    ← mistral-document-ai-2505 via Azure
         |
         +──────────────────────────────────────────────────────+
         |                                                        |
         v                                                        v
[Combine full-document markdown]              [Async LLM extraction per page]
         |                                    (AsyncAzureOpenAI GPT-5-mini)
         v                                    (semaphore=10, tenacity retry×3)
[Strip HTML table tags]                               |
         |                                            +──────────────────+
         v                                            |                  |
[Chunk by paragraph with overlap]              [Tables]           [Key Persons &
  target: 1200 chars | overlap: 12%          (markdown +          Developments]
         |                                    description)               |
         v                                            |                  v
[Generate embeddings]                                v         [Deduplicate persons]
(text-embedding-3-small)                  [Embed table description]     |
         |                                            |                  v
         v                                            v         [Generate Cypher queries]
PINECONE (metadata_type="text")       PINECONE (metadata_type="table")  |
                                                                         v
                                                                  NEO4J GRAPH
```

#### Step-by-Step Breakdown

**Step 1 — Download PDF reports from SEC EDGAR**

The notebook queries the SEC EDGAR submissions API to find all ARS (Annual Report to Shareholders) filings for each company, then downloads the PDF for the last 3 years:

```python
# EDGAR submissions endpoint
url = f"https://data.sec.gov/submissions/CIK{cik}.json"
# Filter for form type "ARS" or "ARS/A"
filings.filter(form="ARS")
```

**Step 2 — Convert PDF pages to images**

Each page in every PDF is rasterised to a PNG using `pymupdf`:

```python
doc = pymupdf.open(pdf_path)
for page in doc:
    pix = page.get_pixmap()
    pix.save(f"pdf_images/{company}/{year}/{page.number:03}.png")
```

This produces one PNG per page, e.g. `AMZN/2023/001.png`.

**Step 3 — OCR with Mistral Document AI**

Each page image is base64-encoded and sent to the **Mistral Document AI** (model: `mistral-document-ai-2505`) endpoint hosted on Azure. The OCR returns structured markdown including inline images.

Resilience is handled by `tenacity` with exponential backoff (min 2s → max 10s, up to 3 retries):

```python
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def ocr_mistral_image(image_path, endpoint, api_key, model="mistral-document-ai-2505"):
    img_b64 = base64.b64encode(open(image_path, "rb").read()).decode()
    payload = {
        "model": model,
        "document": {"type": "image_url", "image_url": f"data:image/png;base64,{img_b64}"}
    }
    response = requests.post(endpoint, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
    return response.json()
```

The JSON output for each document is saved and uploaded to **Supabase Storage** (bucket: `annual_report_json`) for intermediate storage and resumability.

**Step 4 — Async LLM extraction of tables and entities**

> ⚡ **Key performance innovation:** The notebook uses `AsyncAzureOpenAI` with `asyncio` semaphores to make **up to 10 concurrent requests** to GPT-5-mini, dramatically reducing processing time versus sequential calls. A 100-page document that would take ~50 minutes synchronously completes in ~5–6 minutes asynchronously.

The extraction pipeline:

```python
# Semaphore limits concurrency to 10 simultaneous requests
semaphore = asyncio.Semaphore(10)

# Each page's markdown is sent concurrently
tasks = [process_chunk_with_semaphore(semaphore, chunk, idx)
         for idx, chunk in enumerate(markdown_pages)]

results = await tqdm.gather(*tasks)  # preserves order via index
results = sorted(results, key=lambda x: x["index"])
```

Each GPT-5-mini call extracts the following JSON structure:

```json
{
  "tables": [
    {
      "table_markdown": "| Col1 | Col2 |\n|------|------|\n| ... |",
      "rows": [["col1", "col2"], ["val1", "val2"]],
      "table_description": "Revenue breakdown by segment for FY2023"
    }
  ],
  "key_people": [
    { "name": "Andy Jassy", "role": "CEO" }
  ],
  "key_developments": [
    {
      "title": "AWS Bedrock Launch",
      "description": "Amazon launched AWS Bedrock...",
      "category": "ProductLaunch"
    }
  ]
}
```

**Allowed roles:** `CEO | CFO | COO | Chairperson | BoardMember`

**Allowed development categories:** `M&A | Restructuring | Litigation | ProductLaunch | RegulatoryAction | GuidanceChange`

Tenacity retries (up to 3×) handle rate limit errors (`429`) specifically:

```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=20),
       retry=retry_if_exception_type((RateLimitError, TimeoutError, ValueError)))
async def call_azure_openai(chunk_text, chunk_index):
    ...
```

The extracted JSON is saved and uploaded to Supabase Storage (bucket: `annual_report_tables_facts`).

**Step 5 — Chunking strategy**

Narrative text is chunked by paragraph with a tail-overlap strategy to preserve context across chunk boundaries:

```
chunk_0 → paragraph A
chunk_1 → [tail of A] + paragraph B     ← 12% overlap
chunk_2 → [tail of B] + paragraph C     ← 12% overlap
```

Parameters: `target_chunk_size=1200 chars`, `overlap_ratio=0.12`.

HTML table tags are stripped from the markdown before chunking so tables are not double-counted (they are indexed separately).

**Step 6 — Embeddings and Pinecone insertion**

Text chunks and table descriptions are embedded using `text-embedding-3-small` in batches of 100 with 2.5-second delays between batches for rate limiting.

**Pinecone vector ID format:**
```
{company_ticker}_{fiscal_year}_{document_type}_{metadata_type}_{index}
e.g. AMZN_2023_Annual_Report_text_42
```

**Metadata schema for text chunks:**

| Field | Value | Example |
|-------|-------|---------|
| `company_ticker` | Ticker symbol | `AMZN` |
| `fiscal_year` | Year string | `2023` |
| `document_type` | Source document type | `Annual_Report` |
| `metadata_type` | Chunk type discriminator | `text` |
| `text` | The chunk content | `"Amazon's cloud segment..."` |

**Metadata schema for table chunks:**

| Field | Value | Example |
|-------|-------|---------|
| `company_ticker` | Ticker symbol | `MSFT` |
| `fiscal_year` | Year string | `2023` |
| `document_type` | Source document type | `Annual_Report` |
| `metadata_type` | Chunk type discriminator | `table` |
| `table_markdown` | Full markdown table | `"| Revenue | ..."` |
| `table_description` | Table description (embedded) | `"Revenue by segment FY2023"` |
| `index` | Source page number | `42` |

**Step 7 — Neo4j knowledge graph construction**

The graph is built using Cypher `MERGE` statements (idempotent — safe to re-run):

```cypher
-- Core document structure (created first)
MERGE (c:Company {ticker: $ticker, cik: $cik})
MERGE (fy:FiscalYear {year: $fiscal_year})
MERGE (d:Document {document_id: $document_id})
MERGE (dt:DocumentType {name: $document_type})
MERGE (d)-[:BELONGS_TO]->(c)
MERGE (d)-[:BELONGS_TO]->(fy)
MERGE (d)-[:IS_TYPE]->(dt)

-- Key persons (deduplicated by name using UNWIND)
MERGE (d:Document {document_id: $document_id})
UNWIND $rows AS row
MERGE (n:KeyPerson {name: row.name})
SET n += row
MERGE (d)-[:MENTIONS]->(n)

-- Key developments (deduplicated by title)
MERGE (n:KeyDevelopment {title: row.title})
SET n += row
MERGE (d)-[:MENTIONS]->(n)
```

---

### Notebook 2 — SEC Edgar (10-K Filings)

**File:** `ingestion-and-parsing/SEC_Edgar.ipynb`

Processes the official SEC 10-K annual filings for all 7 companies using the `edgartools` Python library. 10-K filings provide structured XBRL financial data that is more machine-readable than the glossy PDF reports.

**Company coverage:** All 7 — AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA

#### Pipeline Architecture

```
[edgartools Company API]
         |
         +──────────────────────────────────────────────────────+
         |                                                        |
         v                                                        v
[10-K Filing — Text extraction]              [Financial Facts API (3 years)]
  (clean text, tables excluded)               income / balance / cash flow
         |                                                        |
         v                                                        v
[Chunk by paragraph with overlap]                [generate_document_core_graph_cypher()]
  target: 1200 chars | overlap: 12%                              |
         |                                                        v
         v                                              [insert_financial_facts()]
[Generate embeddings]                                            |
  text-embedding-3-small                                         v
         |                                                  NEO4J GRAPH
         v                              (Company → FiscalYear → Document → Fact → Metric)
[PINECONE metadata_type="text"]
         |
[Financial Statements]
  (balance sheet, income statement,
   cash flow, equity, comprehensive)
         |
         v
[Render each statement as markdown]
[Embed statement title as description]
         |
         v
[PINECONE metadata_type="table"]
```

#### Step-by-Step Breakdown

**Step 1 — Extract 10-K filing content with edgartools**

The `edgartools` library provides a high-level Python API over the SEC EDGAR system. The notebook uses it to access four levels of financial data: Company → Filings → Filing → XBRL Statements.

```python
# Filter 10-K filings from 2023 onwards
company = Company(ticker)
filings = company.get_filings()
annual_reports = filings.filter(form="10-K", date="2023-01-01:")
```

For each filing, text and all five financial statements are extracted:

```python
tenk = report.obj()

# Clean narrative text without tables
ai_text = tenk.document.text(clean=True, include_tables=False)

# XBRL financial statements
xbrl       = report.xbrl()
statements = xbrl.statements
balance_sheet      = statements.balance_sheet()
income_statement   = statements.income_statement()
cash_flow          = statements.cashflow_statement()
equity             = statements.statement_of_equity()
comprehensive      = statements.comprehensive_income()
```

**Step 2 — Vectorise report text**

The clean narrative text (tables excluded to avoid duplication) is chunked and embedded using the same strategy as the PDF notebook: `target_chunk_size=1200`, `overlap_ratio=0.12`.

Metadata stored alongside each text vector:

```python
{
    "text":           chunk_content,
    "company_ticker": "AAPL",
    "fiscal_year":    "2024",
    "document_type":  "FORM_10K",
    "metadata_type":  "text"
}
```

**Step 3 — Vectorise financial statement tables**

Each of the five financial statements is rendered to markdown and inserted into Pinecone. The **statement title** (first two lines of the rendered markdown) is used as the embedding input — this ensures semantic search on the statement type rather than on noisy numerical content:

```python
md    = statement.render().to_markdown()
title = "
".join(md.split("

")[:2])   # e.g. "Apple Inc.
Consolidated Statements of Operations"
```

```python
# Metadata for each statement table vector
{
    "table_markdown":    full_markdown_table,
    "table_description": title,              # ← embedded
    "company_ticker":    "AAPL",
    "fiscal_year":       "2024",
    "document_type":     "FORM_10K",
    "metadata_type":     "table"
}
```

**Step 4 — Extract and insert financial facts into Neo4j**

The `edgartools` Company API returns concise, LLM-friendly financial fact objects for the past 3 fiscal years, covering income statement, balance sheet, and cash flow statement:

```python
income_stats  = company.income_statement(periods=3, concise_format=True)
balance_stats = company.balance_sheet(periods=3, concise_format=True)
cash_stats    = company.cashflow_statement(periods=3, concise_format=True)

# to_llm_context() returns period-prefixed key-value pairs, e.g.:
# { "revenuefromcontract_fy_2023": 394328000000, ... }
context = income_stats.to_llm_context(flatten_values=True)
```

The raw XBRL metric names (lowercase compound strings) are converted to readable PascalCase:

```python
def snake_to_pascal(name: str) -> str:
    # "revenuefromcontractwithcustomer" → "RevenueFromContractWithCustomer"
    words = re.findall(r'[a-zA-Z][^A-Z]*', name)
    return "".join(word.capitalize() for word in words)
```

Each fact is inserted as a `Fact` node linked to a `Metric` node and back to the `Document`:

```cypher
MATCH (d:Document {document_id: $document_id})
MERGE (m:Metric {name: $metric_name})
CREATE (f:Fact {value: $value, fiscal_year: $fiscal_year, company_ticker: $company_ticker})
MERGE (d)-[:REPORTS]->(f)
MERGE (f)-[:FOR_METRIC]->(m)
```

The `metricNameIndex` fulltext index on `Metric.name` is then used by the app's financial graph tools to perform fuzzy searches against these metric names.

---

### Ingestion Prerequisites

| Dependency | Used by | Purpose |
|-----------|---------|---------|
| `pymupdf` / `pymupdf4llm` | PDF notebook | PDF → PNG rasterisation |
| `mistralai` | PDF notebook | Mistral Document AI OCR client |
| `openai` | Both | Azure OpenAI embeddings + GPT-4o-mini extraction |
| `tenacity` | Both | Retry with exponential backoff |
| `edgartools` | SEC Edgar notebook | EDGAR API wrapper for 10-K filings |
| `pinecone` | Both | Vector database client |
| `neo4j` | Both | Graph database driver |
| `supabase` | PDF notebook | Intermediate JSON file storage |
| `tqdm` | Both | Progress bars |

### Required Credentials (Google Colab secrets)

| Secret name | Value |
|-------------|-------|
| `azure_openai` | Azure OpenAI API key |
| `azure_openai_endpoint` | Azure OpenAI endpoint URL |
| `pinecone` | Pinecone API key |
| `neo4j_uri` | Neo4j connection URI |
| `neo4j_password` | Neo4j password |
| `supabase_url` | Supabase project URL (PDF notebook) |
| `supabase_secret` | Supabase service role key (PDF notebook) |

### Recommended Execution Order

```
1. Run SEC_Edgar.ipynb first
   └─ Populates Pinecone (FORM_10K text + tables) and Neo4j (all 7 companies)

2. Run PDF_Annual_Shareholder_Reports.ipynb
   └─ Adds Annual_Report text + tables to Pinecone
   └─ Adds KeyPerson and KeyDevelopment nodes to Neo4j
   └─ Uses Supabase Storage as an intermediate checkpoint
```

Running SEC Edgar first ensures the core `Company`, `FiscalYear`, and `Document` nodes exist in Neo4j before the PDF notebook attempts to attach `KeyPerson` and `KeyDevelopment` nodes to them.

---

---

## Next JS Web App

#### Pre-requisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.17+ |
| npm / pnpm / yarn | latest |
| Supabase project | — |
| Pinecone account + index | — |
| Neo4j instance | 5.x |
| OpenAI API key | GPT-5-mini access |

#### Tech Stack

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

### Local Setup

#### 1. Clone the repo

```bash
git clone <your-repo-url>
cd magnificent7-financial-analyst
```

#### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

#### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in **all** values:

#### 4. Configure Supabase Authentication

1. In your Supabase dashboard, go to **Authentication → Providers** and enable **Email**.
2. Disable **Sign-ups** (Settings → Authentication → Disable signups) since this app is login-only.
3. Create user accounts manually via the Supabase dashboard under **Authentication → Users**.
4. Set the **redirect URL** for auth callbacks:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.vercel.app/api/auth/callback`

#### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.


### Development Tips

- **Streaming:** The chat API route uses `ReadableStream` to stream LLM tokens to the client in real-time.
- **Agent tracing:** Set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY=...` in `.env.local` to trace agent runs in LangSmith.
- **Adding companies:** To extend beyond the Magnificent 7, just ingest new data into Pinecone/Neo4j with the appropriate `ticker` metadata — no code changes required.
- **Replacing the markdown renderer:** The lightweight renderer in `MessageBubble.tsx` handles common cases. For production, swap it with `react-markdown` + `remark-gfm` for full CommonMark support.

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

The agent is built with LangGraph's `createReactAgent` and is capped at **5 tool calls per response** (`recursionLimit = 12`). Tools are invoked in strict priority order — Neo4j first, then vector search, then web search as a last resort.

### Tool priority

```
Tier 1 (Neo4j)   →   Tier 2 (Pinecone)   →   Tier 3 (SerpAPI)
   try first            try if Tier 1           only if Tier 1
                        returns no data          and Tier 2 both
                                                 return no data,
                                                 or user asks for
                                                 current/live data
```

### Tool reference

| Priority | Tool name | Source | Description |
|----------|-----------|--------|-------------|
| Tier 1 | `get_financial_metric` | Neo4j | Retrieve a specific metric for one company. Uses **fulltext fuzzy search** on `metricNameIndex` — see below. |
| Tier 1 | `compare_metric_across_years` | Neo4j | Trend of one metric over all available fiscal years for one company. |
| Tier 1 | `compare_metric_across_companies` | Neo4j | Peer comparison of one metric across multiple companies for a given fiscal year. |
| Tier 1 | `get_key_persons` | Neo4j | Executives and board members, optionally filtered by role. |
| Tier 1 | `get_key_developments` | Neo4j | Corporate events, optionally filtered by category and/or fiscal year. |
| Tier 2 | `search_report_text` | Pinecone | Semantic search over narrative paragraph text (MD&A, risk factors, business overview). Metadata key: `company_ticker`. |
| Tier 2 | `search_report_tables` | Pinecone | Semantic search over financial tables stored as Markdown (income statements, balance sheets, cash flow). Metadata key: `company_ticker`. |
| Tier 3 | `web_search` | SerpAPI | Google search for latest news, current prices, recent earnings, or any data not in the knowledge base. Supports `general` and `news` engine modes. |

### FinancialGraphTools — fulltext metric search

All three financial graph tools resolve metric names through Neo4j's fulltext index rather than an exact string match. This handles typos, abbreviations, and natural-language variations.

**Index definition:**

```cypher
CREATE FULLTEXT INDEX metricNameIndex FOR (n:Metric) ON EACH [n.name]
```

**How the Lucene query is built (`buildFtQuery`):**

The helper function converts the user's metric name into a Lucene expression that combines a **wildcard** match (substring) with a **fuzzy** match (edit distance 2):

```typescript
// Single token  →  wildcard OR fuzzy
"revenue"    →  "*revenue* OR revenue~2"

// Multiple tokens  →  each token must appear (AND), each with wildcard+fuzzy
"net income" →  "(*net* OR net~2) AND (*income* OR income~2)"
```

| Technique | Syntax | What it catches |
|-----------|--------|-----------------|
| Wildcard | `*revenue*` | Exact substring — "Total Revenue", "Revenue Growth" |
| Fuzzy (edit distance 2) | `revenue~2` | Typos and abbreviations — "reveneu", "rev" |
| AND (multi-token) | `(*net* OR net~2) AND (*income* OR income~2)` | Both words must appear anywhere in the metric name |

**Two-phase Cypher pattern used in all three tools:**

```cypher
-- Phase 1: fuzzy fulltext lookup — returns best-matching Metric nodes
CALL db.index.fulltext.queryNodes("metricNameIndex", $ftQuery)
YIELD node AS m, score AS metricScore
WITH m, metricScore ORDER BY metricScore DESC LIMIT 5

-- Phase 2: graph traversal using the resolved metric nodes
MATCH (c:Company {ticker: $ticker})
MATCH (doc:Document)-[:BELONGS_TO]->(c)
MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m)
RETURN c.ticker, m.name, metricScore, fact.value, fact.unit
ORDER BY metricScore DESC  -- highest-confidence metric match first
```

`metric_score` is included in every result row so you can see which metric name matched and how confidently.

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
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_INSTANCE_NAME`
- `AZURE_OPENAI_API_DEPLOYMENT_NAME`
- `AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME`
- `AZURE_OPENAI_API_VERSION`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `SERPAPI_API_KEY`

> ⚠️ **Neo4j URI for production:** Use a cloud-hosted Neo4j instance (e.g. Neo4j Aura) with a `neo4j+s://` URI so it's reachable from Vercel's serverless functions.

### 4. Deploy

Click **Deploy**. Vercel will build and deploy your app automatically on every push to `main`.

### 5. Update Supabase callback URL

Add your production URL to Supabase's allowed redirect list:

```
https://your-domain.vercel.app/api/auth/callback
```

---

