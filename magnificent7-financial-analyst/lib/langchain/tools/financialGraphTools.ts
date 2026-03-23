import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatResults(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "No data found.";
  return records
    .map((r) =>
      Object.entries(r)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(" | ")
    )
    .join("\n");
}

/**
 * Build a Lucene query string for Neo4j fulltext search that combines:
 *   - Wildcard:       *revenue*        (substring match)
 *   - Fuzzy (edit 2): revenue~2        (handles typos / abbreviations)
 *
 * The OR means either match is enough; Neo4j scores them and we ORDER BY score.
 *
 * Example:  buildFtQuery("net income")  →  "*net income* OR net income~2"
 *
 * Note: multi-word wildcard requires the whole phrase to be quoted in Lucene,
 * but Neo4j fulltext accepts unquoted wildcards on individual tokens too.
 * We use the single-token path for robustness. When the input has spaces we
 * split into tokens and combine:
 *   "net income"  →  (*net* OR net~2) AND (*income* OR income~2)
 */
function buildFtQuery(metricName: string): string {
  const tokens = metricName.trim().toLowerCase().split(/\s+/);

  if (tokens.length === 1) {
    const t = tokens[0];
    return `*${t}* OR ${t}~2`;
  }

  // Multi-token: require every token to appear (AND), each with wildcard+fuzzy
  const parts = tokens.map((t) => `(*${t}* OR ${t}~2)`);
  return parts.join(" AND ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 1 — get_financial_metric
// ─────────────────────────────────────────────────────────────────────────────

export const getFinancialMetricTool = tool(
  async ({ ticker, metric_name, fiscal_year }) => {
    console.log("\n[getFinancialMetric] Called with:", { ticker, metric_name, fiscal_year });

    const tickerUpper = ticker.toUpperCase();
    const ftQuery     = buildFtQuery(metric_name);

    console.log("[getFinancialMetric] Fulltext query:", ftQuery);

    // ── Step 1: resolve metric nodes via fulltext index ─────────────────────
    // We find up to 5 best-matching Metric nodes, then use them in the main
    // graph traversal. ORDER BY metricScore DESC ensures the best match wins.
    const baseMatch = fiscal_year != null
      ? `
          MATCH (c:Company {ticker: $ticker})
          MATCH (doc:Document)-[:BELONGS_TO]->(c)
          MATCH (fy:FiscalYear {year: $fiscal_year})
          MATCH (doc)-[:BELONGS_TO]->(fy)
          MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m)
          RETURN c.ticker         AS ticker,
                 fy.year          AS fiscal_year,
                 m.name           AS metric,
                 metricScore      AS metric_score,
                 fact.value       AS value,
                 fact.unit        AS unit
          ORDER BY fy.year DESC, metricScore DESC
          LIMIT 10
        `
      : `
          MATCH (c:Company {ticker: $ticker})
          MATCH (doc:Document)-[:BELONGS_TO]->(c)
          MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
          MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m)
          RETURN c.ticker         AS ticker,
                 fy.year          AS fiscal_year,
                 m.name           AS metric,
                 metricScore      AS metric_score,
                 fact.value       AS value,
                 fact.unit        AS unit
          ORDER BY fy.year DESC, metricScore DESC
          LIMIT 10
        `;

    const cypher = `
      // Phase 1 — fuzzy fulltext lookup against metricNameIndex
      CALL db.index.fulltext.queryNodes("metricNameIndex", $ftQuery)
      YIELD node AS m, score AS metricScore

      // Keep only the top 5 best-matching metric nodes
      WITH m, metricScore
      ORDER BY metricScore DESC
      LIMIT 5

      // Phase 2 — traverse the graph using the resolved metric nodes
      ${baseMatch}
    `;

    const params: Record<string, unknown> = {
      ticker: tickerUpper,
      ftQuery,
      ...(fiscal_year != null && { fiscal_year }),
    };

    console.log("[getFinancialMetric] Params:", params);
    const records = await runQuery(cypher, params);

    const result = formatResults(records);
    console.log(
      `[getFinancialMetric] Result: ${records.length} record(s)`,
      records.length === 0
        ? "⚠  Zero rows. Check: (1) metricNameIndex exists, (2) ticker is correct, (3) ftQuery matches metric names in DB."
        : "✓"
    );
    return result;
  },
  {
    name: "get_financial_metric",
    description:
      "Retrieve a specific financial metric for a company. Uses fulltext fuzzy search on the metricNameIndex so approximate names (e.g. 'rev' for 'revenue', 'net inc' for 'net income') still match. Results are ordered by match score then fiscal year.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      metric_name: z
        .string()
        .describe(
          "Financial metric name — approximate is fine, e.g. 'revenue', 'net income', 'EPS', 'gross profit'"
        ),
      fiscal_year: z
        .number()
        .int()
        .nullish()
        .describe("Optional fiscal year (e.g. 2023). Omit to return all years."),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool 2 — compare_metric_across_years
// ─────────────────────────────────────────────────────────────────────────────

export const compareMetricAcrossYearsTool = tool(
  async ({ ticker, metric_name }) => {
    console.log("\n[compareMetricAcrossYears] Called with:", { ticker, metric_name });

    const ftQuery = buildFtQuery(metric_name);
    console.log("[compareMetricAcrossYears] Fulltext query:", ftQuery);

    const cypher = `
      CALL db.index.fulltext.queryNodes("metricNameIndex", $ftQuery)
      YIELD node AS m, score AS metricScore
      WITH m, metricScore
      ORDER BY metricScore DESC
      LIMIT 5

      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
      MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m)
      RETURN fy.year       AS fiscal_year,
             m.name        AS metric,
             metricScore   AS metric_score,
             fact.value    AS value,
             fact.unit     AS unit
      ORDER BY fy.year ASC, metricScore DESC
    `;

    const records = await runQuery(cypher, {
      ticker: ticker.toUpperCase(),
      ftQuery,
    });

    const result = formatResults(records);
    console.log(
      `[compareMetricAcrossYears] Result: ${records.length} record(s)`,
      records.length === 0 ? "⚠  Check ticker and metric_name." : "✓"
    );
    return result;
  },
  {
    name: "compare_metric_across_years",
    description:
      "Show how a financial metric trended over all available fiscal years for one company. Uses fuzzy fulltext search so approximate metric names work.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      metric_name: z
        .string()
        .describe("Financial metric name, e.g. 'revenue', 'net income'"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool 3 — compare_metric_across_companies
// ─────────────────────────────────────────────────────────────────────────────

export const compareMetricAcrossCompaniesTool = tool(
  async ({ tickers, metric_name, fiscal_year }) => {
    console.log("\n[compareMetricAcrossCompanies] Called with:", {
      tickers,
      metric_name,
      fiscal_year,
    });

    const upperTickers = tickers.map((t) => t.toUpperCase());
    const ftQuery      = buildFtQuery(metric_name);
    console.log("[compareMetricAcrossCompanies] Fulltext query:", ftQuery);

    const cypher = `
      CALL db.index.fulltext.queryNodes("metricNameIndex", $ftQuery)
      YIELD node AS m, score AS metricScore
      WITH m, metricScore
      ORDER BY metricScore DESC
      LIMIT 5

      MATCH (c:Company)
      WHERE c.ticker IN $tickers
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (fy:FiscalYear {year: $fiscal_year})
      MATCH (doc)-[:BELONGS_TO]->(fy)
      MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m)
      RETURN c.ticker       AS ticker,
             fy.year        AS fiscal_year,
             m.name         AS metric,
             metricScore    AS metric_score,
             fact.value     AS value,
             fact.unit      AS unit
      ORDER BY metricScore DESC, fact.value DESC
    `;

    const records = await runQuery(cypher, {
      tickers: upperTickers,
      ftQuery,
      fiscal_year,
    });

    const result = formatResults(records);
    console.log(
      `[compareMetricAcrossCompanies] Result: ${records.length} record(s)`,
      records.length === 0
        ? `⚠  Check: tickers=${upperTickers}, fiscal_year=${fiscal_year}, ftQuery="${ftQuery}"`
        : "✓"
    );
    return result;
  },
  {
    name: "compare_metric_across_companies",
    description:
      "Compare a financial metric across multiple Magnificent 7 companies for a specific fiscal year. Uses fuzzy fulltext search so approximate metric names work.",
    schema: z.object({
      tickers: z
        .array(z.string())
        .describe("Tickers to compare, e.g. ['AAPL', 'MSFT', 'GOOGL']"),
      metric_name: z
        .string()
        .describe("Financial metric name to compare"),
      fiscal_year: z
        .number()
        .int()
        .describe("Fiscal year, e.g. 2023"),
    }),
  }
);