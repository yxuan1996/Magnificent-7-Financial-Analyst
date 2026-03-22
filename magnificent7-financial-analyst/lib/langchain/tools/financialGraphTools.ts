import { tool } from "@langchain/core/tools";
import { runQuery } from "@/lib/neo4j";
import { z } from "zod";

// ── Helper: format query results as a readable string ─────────────────────────

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

// ── Tool 1: get_financial_metric ──────────────────────────────────────────────

export const getFinancialMetricTool = tool(
  async ({ ticker, metric_name, fiscal_year }) => {
    // Build Cypher query – fiscal_year is optional
    const cypher = fiscal_year
      ? `
        MATCH (c:Company {ticker: $ticker})
        MATCH (doc:Document)-[:BELONGS_TO]->(c)
        MATCH (fy:FiscalYear {year: $fiscal_year})
        MATCH (doc)-[:BELONGS_TO]->(fy)
        MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m:Metric)
        WHERE toLower(m.name) CONTAINS toLower($metric_name)
        RETURN c.ticker AS ticker, fy.year AS fiscal_year,
               m.name AS metric, fact.value AS value, fact.unit AS unit
        ORDER BY fy.year DESC
        LIMIT 10
      `
      : `
        MATCH (c:Company {ticker: $ticker})
        MATCH (doc:Document)-[:BELONGS_TO]->(c)
        MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
        MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m:Metric)
        WHERE toLower(m.name) CONTAINS toLower($metric_name)
        RETURN c.ticker AS ticker, fy.year AS fiscal_year,
               m.name AS metric, fact.value AS value, fact.unit AS unit
        ORDER BY fy.year DESC
        LIMIT 10
      `;

    const records = await runQuery(cypher, {
      ticker: ticker.toUpperCase(),
      metric_name,
      ...(fiscal_year && { fiscal_year }),
    });

    return formatResults(records);
  },
  {
    name: "get_financial_metric",
    description:
      "Retrieve a specific financial metric for a company from the graph database. Examples of metric names: revenue, net income, EPS, gross profit, operating income, total assets, free cash flow.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      metric_name: z
        .string()
        .describe(
          "Name of the financial metric to look up, e.g. 'revenue', 'net income', 'EPS'"
        ),
      fiscal_year: z
        .number()
        .int()
        .optional()
        .describe("Optional fiscal year (e.g. 2023). Omit for all years."),
    }),
  }
);

// ── Tool 2: compare_metric_across_years ──────────────────────────────────────

export const compareMetricAcrossYearsTool = tool(
  async ({ ticker, metric_name }) => {
    const cypher = `
      MATCH (c:Company {ticker: $ticker})
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (doc)-[:BELONGS_TO]->(fy:FiscalYear)
      MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m:Metric)
      WHERE toLower(m.name) CONTAINS toLower($metric_name)
      RETURN fy.year AS fiscal_year, m.name AS metric,
             fact.value AS value, fact.unit AS unit
      ORDER BY fy.year ASC
    `;

    const records = await runQuery(cypher, {
      ticker: ticker.toUpperCase(),
      metric_name,
    });

    return formatResults(records);
  },
  {
    name: "compare_metric_across_years",
    description:
      "Show how a single financial metric has changed over all available fiscal years for one company. Useful for trend analysis.",
    schema: z.object({
      ticker: z
        .string()
        .describe("Company ticker symbol, e.g. AAPL, MSFT, NVDA"),
      metric_name: z
        .string()
        .describe("Name of the financial metric, e.g. 'revenue', 'net income'"),
    }),
  }
);

// ── Tool 3: compare_metric_across_companies ───────────────────────────────────

export const compareMetricAcrossCompaniesTool = tool(
  async ({ tickers, metric_name, fiscal_year }) => {
    const cypher = `
      MATCH (c:Company)
      WHERE c.ticker IN $tickers
      MATCH (doc:Document)-[:BELONGS_TO]->(c)
      MATCH (fy:FiscalYear {year: $fiscal_year})
      MATCH (doc)-[:BELONGS_TO]->(fy)
      MATCH (doc)-[:REPORTS]->(fact:Fact)-[:FOR_METRIC]->(m:Metric)
      WHERE toLower(m.name) CONTAINS toLower($metric_name)
      RETURN c.ticker AS ticker, fy.year AS fiscal_year,
             m.name AS metric, fact.value AS value, fact.unit AS unit
      ORDER BY fact.value DESC
    `;

    const records = await runQuery(cypher, {
      tickers: tickers.map((t) => t.toUpperCase()),
      metric_name,
      fiscal_year,
    });

    return formatResults(records);
  },
  {
    name: "compare_metric_across_companies",
    description:
      "Compare a financial metric across multiple Magnificent 7 companies for a specific fiscal year. Useful for peer comparison.",
    schema: z.object({
      tickers: z
        .array(z.string())
        .describe(
          "Array of company tickers to compare, e.g. ['AAPL', 'MSFT', 'GOOGL']"
        ),
      metric_name: z
        .string()
        .describe("Name of the financial metric to compare"),
      fiscal_year: z
        .number()
        .int()
        .describe("Fiscal year for comparison, e.g. 2023"),
    }),
  }
);
