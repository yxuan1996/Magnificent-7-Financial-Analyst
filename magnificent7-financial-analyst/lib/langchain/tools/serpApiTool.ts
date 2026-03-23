import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SerpAPI Web Search Tool
//
// Uses the SerpAPI Google Search endpoint via the official REST API.
// No extra npm package needed — we call the JSON endpoint directly with fetch.
//
// Required env var:  SERPAPI_API_KEY
// Get a key at:      https://serpapi.com
// ─────────────────────────────────────────────────────────────────────────────

const SERPAPI_BASE = "https://serpapi.com/search.json";

// Maximum number of organic results to include in the response
const MAX_RESULTS = 5;

interface OrganicResult {
  title?:    string;
  link?:     string;
  snippet?:  string;
  date?:     string;
  source?:   string;
}

interface SerpApiResponse {
  organic_results?: OrganicResult[];
  answer_box?: {
    answer?:  string;
    snippet?: string;
    title?:   string;
  };
  knowledge_graph?: {
    title?:       string;
    description?: string;
  };
  error?: string;
}

/**
 * Format SerpAPI results into a concise, readable string for the LLM.
 * Includes answer_box and knowledge_graph first (highest confidence),
 * then organic results.
 */
function formatSerpResults(data: SerpApiResponse, query: string): string {
  const lines: string[] = [`Search results for: "${query}"\n`];

  // ── Answer box (Google's direct answer) ───────────────────────────────────
  if (data.answer_box) {
    const ab = data.answer_box;
    lines.push("── Direct Answer ──────────────────────────────");
    if (ab.title)   lines.push(`Title:   ${ab.title}`);
    if (ab.answer)  lines.push(`Answer:  ${ab.answer}`);
    if (ab.snippet) lines.push(`Detail:  ${ab.snippet}`);
    lines.push("");
  }

  // ── Knowledge graph ────────────────────────────────────────────────────────
  if (data.knowledge_graph) {
    const kg = data.knowledge_graph;
    lines.push("── Knowledge Graph ────────────────────────────");
    if (kg.title)       lines.push(`Title:       ${kg.title}`);
    if (kg.description) lines.push(`Description: ${kg.description}`);
    lines.push("");
  }

  // ── Organic results ────────────────────────────────────────────────────────
  const organic = data.organic_results ?? [];
  if (organic.length > 0) {
    lines.push("── Organic Results ────────────────────────────");
    organic.slice(0, MAX_RESULTS).forEach((r, i) => {
      lines.push(`\n[${i + 1}] ${r.title ?? "No title"}`);
      if (r.source) lines.push(`    Source:  ${r.source}`);
      if (r.date)   lines.push(`    Date:    ${r.date}`);
      if (r.link)   lines.push(`    URL:     ${r.link}`);
      if (r.snippet) lines.push(`    Snippet: ${r.snippet}`);
    });
  }

  if (lines.length <= 1) {
    return "No results found for this query.";
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definition
// ─────────────────────────────────────────────────────────────────────────────

export const serpApiSearchTool = tool(
  async ({ query, search_type }) => {
    console.log("\n[serpApiSearch] Called with:", { query, search_type });

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      const msg = "[serpApiSearch] ✗ SERPAPI_API_KEY is not set in environment variables.";
      console.error(msg);
      return msg;
    }

    // Build query params
    const params = new URLSearchParams({
      q:        query,
      api_key:  apiKey,
      engine:   "google",
      num:      String(MAX_RESULTS + 2), // fetch a few extra, we trim later
      hl:       "en",
      gl:       "us",
    });

    // For news searches, use Google News engine for fresher results
    if (search_type === "news") {
      params.set("engine", "google_news");
      params.set("q", query);
      console.log("[serpApiSearch] Using Google News engine for fresher results");
    }

    const url = `${SERPAPI_BASE}?${params.toString()}`;
    console.log("[serpApiSearch] Requesting:", `${SERPAPI_BASE}?q=${encodeURIComponent(query)}&engine=${params.get("engine")}&...`);

    try {
      const response = await fetch(url);

      console.log("[serpApiSearch] HTTP status:", response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error("[serpApiSearch] ✗ HTTP error:", response.status, text.slice(0, 200));
        return `Web search failed with HTTP ${response.status}. Please try a different query.`;
      }

      const data: SerpApiResponse = await response.json();

      if (data.error) {
        console.error("[serpApiSearch] ✗ SerpAPI error:", data.error);
        return `SerpAPI returned an error: ${data.error}`;
      }

      const resultCount = data.organic_results?.length ?? 0;
      console.log(
        `[serpApiSearch] ✓ Results received — organic: ${resultCount}`,
        data.answer_box      ? "| answer_box: yes"      : "",
        data.knowledge_graph ? "| knowledge_graph: yes" : ""
      );

      const formatted = formatSerpResults(data, query);
      return formatted;

    } catch (err) {
      console.error("[serpApiSearch] ✗ Fetch error:", err);
      return `Web search encountered an error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "web_search",
    description:
      "Search the web via SerpAPI (Google) for the latest financial data, news, earnings reports, analyst estimates, stock prices, or any current information not available in the annual report knowledge base. Use this when: (1) the user asks about recent events, current prices, or latest quarter results, (2) the knowledge base returns no data, (3) the user wants to verify or supplement historical data with current context.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query. Be specific — include company name or ticker, metric, and year/quarter. " +
          "E.g. 'Apple AAPL revenue Q1 2025', 'NVIDIA earnings forecast 2025', 'Tesla latest annual report'."
        ),
      search_type: z
        .enum(["general", "news"])
        .nullish()
        .describe(
          "Optional search type. Use 'news' for the latest headlines and press releases. " +
          "Defaults to 'general' for standard Google search."
        ),
    }),
  }
);
