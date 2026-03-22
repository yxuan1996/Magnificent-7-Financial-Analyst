import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

// Valid category values matching the graph schema
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
    // Build optional filters
    const categoryFilter = category
      ? "AND toLower(kd.category) = toLower($category)"
      : "";

    const yearFilter = fiscal_year
      ? "AND fy.year = $fiscal_year"
      : "";

    const cypher = `
      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
      MATCH (doc)-[:MENTIONS]->(kd:KeyDevelopment)
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

    const records = await runQuery(cypher, {
      ticker: ticker.toUpperCase(),
      ...(category && { category }),
      ...(fiscal_year && { fiscal_year }),
    });

    return formatResults(records);
  },
  {
    name: "get_key_developments",
    description:
      "Retrieve significant corporate events and developments mentioned in annual reports. Categories include M&A, Restructuring, Litigation, ProductLaunch, RegulatoryAction, and GuidanceChange. Optionally filter by category and/or fiscal year.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      category: CategoryEnum.optional().describe(
        "Optional category: M&A, Restructuring, Litigation, ProductLaunch, RegulatoryAction, or GuidanceChange"
      ),
      fiscal_year: z
        .number()
        .int()
        .optional()
        .describe("Optional fiscal year to filter by, e.g. 2023"),
    }),
  }
);