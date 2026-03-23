import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

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
    console.log("\n[getKeyPersons] Called with:", { ticker, role });

    const tickerUpper = ticker.toUpperCase();
    const roleFilter  = role
      ? "AND toLower(kp.role) = toLower($role)"
      : "";

    if (role) {
      console.log("[getKeyPersons] Role filter active:", role);
    } else {
      console.log("[getKeyPersons] No role filter — returning all roles.");
    }

    const cypher = `
      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:MENTIONS]->(kp:key_person)
      WHERE true ${roleFilter}
      RETURN DISTINCT
        c.ticker        AS ticker,
        kp.name         AS name,
        kp.role         AS role
      ORDER BY kp.role, kp.name
      LIMIT 50
    `;

    const params: Record<string, unknown> = { ticker: tickerUpper };
    if (role) params.role = role;

    const records = await runQuery(cypher, params);

    const result = formatResults(records);
    console.log(
      `[getKeyPersons] Result: ${records.length} record(s)`,
      records.length === 0
        ? `⚠  No KeyPerson nodes found. Verify (doc)-[:MENTIONS]->(kp:KeyPerson) exists for ticker=${tickerUpper}`
        : "✓"
    );
    return result;
  },
  {
    name: "get_key_persons",
    description:
      "Retrieve key executives and board members mentioned in annual reports for a company. You can optionally filter by role.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      // FIX: .nullish() instead of .optional()
      role: RoleEnum
        .nullish()
        .describe(
          "Optional role filter: CEO, CFO, COO, Chairperson, or BoardMember"
        ),
    }),
  }
);