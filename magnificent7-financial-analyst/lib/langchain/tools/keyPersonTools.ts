import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

// Valid role values matching the graph schema
const RoleEnum = z.enum([
  "CEO",
  "CFO",
  "COO",
  "Chairperson",
  "BoardMember",
]);

function formatResults(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "No key persons found.";
  return records
    .map((r) =>
      Object.entries(r)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(" | ")
    )
    .join("\n");
}

export const getKeyPersonsTool = tool(
  async ({ ticker, role }) => {
    // Build optional role filter
    const roleFilter = role ? "AND toLower(kp.role) = toLower($role)" : "";

    const cypher = `
      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:MENTIONS]->(kp:KeyPerson)
      WHERE true ${roleFilter}
      RETURN DISTINCT
        c.ticker        AS ticker,
        kp.name         AS name,
        kp.role         AS role,
        kp.description  AS description
      ORDER BY kp.role, kp.name
      LIMIT 30
    `;

    const records = await runQuery(cypher, {
      ticker: ticker.toUpperCase(),
      ...(role && { role }),
    });

    return formatResults(records);
  },
  {
    name: "get_key_persons",
    description:
      "Retrieve key executives and board members mentioned in annual reports for a company. You can optionally filter by role.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      role: RoleEnum.optional().describe(
        "Optional role filter: CEO, CFO, COO, Chairperson, or BoardMember"
      ),
    }),
  }
);
