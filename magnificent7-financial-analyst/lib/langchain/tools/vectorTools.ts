import { tool } from "@langchain/core/tools";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { getPineconeIndex } from "@/lib/pinecone";
import { z } from "zod";

// ── Shared embedding helper ───────────────────────────────────────────────────

const embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
  azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-3-small", // In Node.js defaults to process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
  maxRetries: 1,
});

/**
 * Embed a query string and search Pinecone with an optional metadata filter.
 * Returns the top-k matching chunks formatted as a string.
 */
async function searchPinecone(
  query: string,
  filter: Record<string, unknown>,
  topK = 5
): Promise<string> {
  const index = getPineconeIndex();

  // Convert the query into an embedding vector
  const vector = await embeddings.embedQuery(query);

  const response = await index.query({
    vector,
    topK,
    filter,
    includeMetadata: true,
  });

  if (!response.matches || response.matches.length === 0) {
    return "No relevant content found.";
  }

  // Format results as readable text
  return response.matches
    .map((match, i) => {
      const meta = match.metadata ?? {};
      const ticker = meta.ticker ?? "Unknown";
      const year = meta.fiscal_year ?? "Unknown";
      // Prefer "text" for paragraphs, "table_markdown" for tables
      const content = meta.text ?? meta.table_markdown ?? "(no content)";
      return `--- Result ${i + 1} [${ticker}, FY${year}, score: ${match.score?.toFixed(3)}] ---\n${content}`;
    })
    .join("\n\n");
}

// ── Tool 1: Search Report Text ────────────────────────────────────────────────

export const searchReportTextTool = tool(
  async ({ query, ticker }) => {
    // Filter for chunks that have a "text" key in metadata (paragraph text)
    const filter: Record<string, unknown> = {
      text: { $exists: true },
    };
    if (ticker) {
      filter.ticker = { $eq: ticker.toUpperCase() };
    }
    return searchPinecone(query, filter);
  },
  {
    name: "search_report_text",
    description:
      "Search the annual report paragraph text for a given query. Use this to find narrative information, management discussion, risk factors, business descriptions, and qualitative analysis from the annual reports. Optionally filter by company ticker.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant text"),
      ticker: z
        .string()
        .optional()
        .describe(
          "Optional company ticker to narrow the search (e.g. AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA)"
        ),
    }),
  }
);

// ── Tool 2: Search Report Tables ─────────────────────────────────────────────

export const searchReportTablesTool = tool(
  async ({ query, ticker }) => {
    // Filter for chunks that have a "table_markdown" key (markdown tables)
    const filter: Record<string, unknown> = {
      table_markdown: { $exists: true },
    };
    if (ticker) {
      filter.ticker = { $eq: ticker.toUpperCase() };
    }
    return searchPinecone(query, filter);
  },
  {
    name: "search_report_tables",
    description:
      "Search the annual report tables for financial data. Use this to find structured tabular data like income statements, balance sheets, cash flow statements, and segment breakdowns in markdown format. Optionally filter by company ticker.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant tables"),
      ticker: z
        .string()
        .optional()
        .describe(
          "Optional company ticker to narrow the search (e.g. AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA)"
        ),
    }),
  }
);
