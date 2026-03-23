import { tool } from "@langchain/core/tools";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { getPineconeIndex } from "@/lib/pinecone";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared embedding model
//
// AzureOpenAIEmbeddings reads from env automatically:
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_API_INSTANCE_NAME
//   AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
//   AZURE_OPENAI_API_VERSION
// ─────────────────────────────────────────────────────────────────────────────

const embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

console.log(
  "[VectorTools] AzureOpenAIEmbeddings initialised —",
  "instance:", process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  "| embeddings deployment:", process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
);

// ─────────────────────────────────────────────────────────────────────────────
// Pinecone metadata key — the field that stores the company ticker
//
// NOTE: your index uses "company_ticker" (not "ticker").
//       All filter references below use this constant so a single change here
//       updates every tool if the key name ever changes.
// ─────────────────────────────────────────────────────────────────────────────

const TICKER_KEY = "company_ticker";

// ─────────────────────────────────────────────────────────────────────────────
// Core search function
// ─────────────────────────────────────────────────────────────────────────────

async function searchPinecone(
  query: string,
  filter: Record<string, unknown>,
  topK = 5
): Promise<string> {
  console.log("\n[VectorTool] ─── searchPinecone ────────────────────");
  console.log("[VectorTool] Query  :", query);
  console.log("[VectorTool] Filter :", JSON.stringify(filter));
  console.log("[VectorTool] TopK   :", topK);

  // Step 1 — embed the query
  console.log("[VectorTool] Step 1: Generating embedding via Azure OpenAI…");
  const vector = await embeddings.embedQuery(query);
  console.log(
    `[VectorTool] ✓ Embedding generated — dimensions: ${vector.length}, ` +
    `first 5 values: [${vector.slice(0, 5).map((v) => v.toFixed(4)).join(", ")}]`
  );

  // Step 2 — query Pinecone
  console.log("[VectorTool] Step 2: Querying Pinecone index…");
  const index    = getPineconeIndex();
  const response = await index.query({
    vector,
    topK,
    filter,
    includeMetadata: true,
  });

  console.log(
    `[VectorTool] ✓ Pinecone responded — matches: ${response.matches?.length ?? 0}`
  );

  if (!response.matches || response.matches.length === 0) {
    console.warn(
      "[VectorTool] ⚠  No matches returned.\n" +
      `  Ticker metadata key used: "${TICKER_KEY}"\n` +
      "  Possible causes:\n" +
      `  1. Metadata key mismatch — verify vectors have "${TICKER_KEY}" in their metadata.\n` +
      "  2. Filter key mismatch — e.g. 'text' vs 'chunk_type'.\n" +
      "  3. Index is empty or wrong namespace.\n" +
      "  4. Azure embedding dimension doesn't match index dimension."
    );
    return "No relevant content found.";
  }

  // Step 3 — log each match for debugging
  console.log("[VectorTool] Step 3: Match details:");
  response.matches.forEach((match, i) => {
    const meta = match.metadata ?? {};
    console.log(
      `  [${i + 1}] id=${match.id} score=${match.score?.toFixed(4)} ` +
      `${TICKER_KEY}=${meta[TICKER_KEY] ?? "?"} ` +
      `fiscal_year=${meta.fiscal_year ?? "?"} ` +
      `has_text=${!!meta.text} ` +
      `has_table_markdown=${!!meta.table_markdown} ` +
      `metadata_keys=[${Object.keys(meta).join(", ")}]`
    );
  });

  // Step 4 — format results
  return response.matches
    .map((match, i) => {
      const meta    = match.metadata ?? {};
      const ticker  = meta[TICKER_KEY] ?? "Unknown";
      const year    = meta.fiscal_year  ?? "Unknown";
      const content = meta.text ?? meta.table_markdown ?? "(no content)";
      return (
        `--- Result ${i + 1} [${ticker}, FY${year}, score: ${match.score?.toFixed(3)}] ---\n` +
        content
      );
    })
    .join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 1 — Search Report Text
// ─────────────────────────────────────────────────────────────────────────────

export const searchReportTextTool = tool(
  async ({ query, ticker }) => {
    console.log("\n[searchReportText] Called with:", { query, ticker });

    // Paragraph chunks are identified by the presence of the "text" metadata key
    const filter: Record<string, unknown> = {
      text: { $exists: true },
    };

    if (ticker) {
      // Use company_ticker — the actual key in your Pinecone metadata
      filter[TICKER_KEY] = { $eq: ticker.toUpperCase() };
      console.log(`[searchReportText] Ticker filter: { ${TICKER_KEY}: { $eq: "${ticker.toUpperCase()}" } }`);
    }

    const result = await searchPinecone(query, filter);
    console.log(
      "[searchReportText] Returning",
      result === "No relevant content found." ? "NO RESULTS" : "results ✓"
    );
    return result;
  },
  {
    name: "search_report_text",
    description:
      "Search annual report paragraph text (narrative sections: MD&A, risk factors, business overview). " +
      "Use for qualitative information. Optionally filter by company ticker.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant text"),
      ticker: z
        .string()
        .nullish()
        .describe(
          "Optional company ticker to narrow the search (e.g. AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA)"
        ),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool 2 — Search Report Tables
// ─────────────────────────────────────────────────────────────────────────────

export const searchReportTablesTool = tool(
  async ({ query, ticker }) => {
    console.log("\n[searchReportTables] Called with:", { query, ticker });

    // Table chunks are identified by the presence of the "table_markdown" metadata key
    const filter: Record<string, unknown> = {
      table_markdown: { $exists: true },
    };

    if (ticker) {
      filter[TICKER_KEY] = { $eq: ticker.toUpperCase() };
      console.log(`[searchReportTables] Ticker filter: { ${TICKER_KEY}: { $eq: "${ticker.toUpperCase()}" } }`);
    }

    const result = await searchPinecone(query, filter);
    console.log(
      "[searchReportTables] Returning",
      result === "No relevant content found." ? "NO RESULTS" : "results ✓"
    );
    return result;
  },
  {
    name: "search_report_tables",
    description:
      "Search annual report tables (income statements, balance sheets, cash flow statements, segment data) " +
      "stored as markdown. Use for structured financial data. Optionally filter by company ticker.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant tables"),
      ticker: z
        .string()
        .nullish()
        .describe(
          "Optional company ticker to narrow the search (e.g. AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA)"
        ),
    }),
  }
);