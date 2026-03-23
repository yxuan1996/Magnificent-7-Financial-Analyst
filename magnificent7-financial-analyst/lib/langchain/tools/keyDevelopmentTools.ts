import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

const CategoryEnum = z.enum([
  "M&A",
  "Restructuring",
  "Litigation",
  "ProductLaunch",
  "RegulatoryAction",
  "GuidanceChange",
]);

function formatResults(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "No key developments found.";
  return records
    .map((r) =>
      Object.entries(r)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(" | ")
    )
    .join("\n");
}

export const getKeyDevelopmentsTool = tool(
  async ({ ticker, category, fiscal_year }) => {
    console.log("\n[getKeyDevelopments] Called with:", {
      ticker,
      category,
      fiscal_year,
    });

    const tickerUpper    = ticker.toUpperCase();
    const categoryFilter = category
      ? "AND toLower(kd.category) = toLower($category)"
      : "";
    const yearFilter     = fiscal_year != null
      ? "AND fy.year = $fiscal_year"
      : "";

    if (category)    console.log("[getKeyDevelopments] Category filter:", category);
    if (fiscal_year) console.log("[getKeyDevelopments] Year filter:", fiscal_year);
    if (!category && !fiscal_year)
      console.log("[getKeyDevelopments] No filters — returning all developments for ticker.");

    const cypher = `
      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
      MATCH (doc)-[:MENTIONS]->(kd:key_development)
      WHERE true ${categoryFilter} ${yearFilter}
      RETURN DISTINCT
        c.ticker          AS ticker,
        fy.year           AS fiscal_year,
        kd.category       AS category,
        kd.title          AS title,
        kd.description    AS description
      ORDER BY fy.year DESC, kd.category
      LIMIT 30
    `;

    const params: Record<string, unknown> = { ticker: tickerUpper };
    if (category)             params.category    = category;
    if (fiscal_year != null)  params.fiscal_year = fiscal_year;

    const records = await runQuery(cypher, params);

    const result = formatResults(records);
    console.log(
      `[getKeyDevelopments] Result: ${records.length} record(s)`,
      records.length === 0
        ? `⚠  No KeyDevelopment nodes found. Verify (doc)-[:MENTIONS]->(kd:KeyDevelopment) for ticker=${tickerUpper}`
        : "✓"
    );
    return result;
  },
  {
    name: "get_key_developments",
    description:
      "Retrieve significant corporate events and developments mentioned in annual reports. Categories include M&A, Restructuring, Litigation, ProductLaunch, RegulatoryAction, and GuidanceChange. Optionally filter by category and/or fiscal year.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      // FIX: .nullish() instead of .optional()
      category: CategoryEnum
        .nullish()
        .describe(
          "Optional category: M&A, Restructuring, Litigation, ProductLaunch, RegulatoryAction, or GuidanceChange"
        ),
      fiscal_year: z
        .number()
        .int()
        .nullish()  // FIX: .nullish() instead of .optional()
        .describe("Optional fiscal year to filter by, e.g. 2023"),
    }),
  }
);