import { AzureChatOpenAI } from '@langchain/openai'
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

// ── Import all tools ──────────────────────────────────────────────────────────
import {
  searchReportTextTool,
  searchReportTablesTool,
} from "./tools/vectorTools";
import {
  getFinancialMetricTool,
  compareMetricAcrossYearsTool,
  compareMetricAcrossCompaniesTool,
} from "./tools/financialGraphTools";
import { getKeyPersonsTool } from "./tools/keyPersonTools";
import { getKeyDevelopmentsTool } from "./tools/keyDevelopmentTools";

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite financial analyst specialising in the Magnificent 7 technology companies:
Apple (AAPL), Microsoft (MSFT), Alphabet (GOOGL), Amazon (AMZN), NVIDIA (NVDA), Meta (META), and Tesla (TSLA).

Your knowledge base uses RAG with Hybrid Search, combining:
1. A Pinecone vector database – stores chunked paragraph text and tables from annual reports (10-K filings).
2. A Neo4j graph database – stores structured financial facts, key developments, and key persons.

## How to answer questions

Always reason step-by-step before picking a tool. Choose the right tool for each type of question:

| Question type                          | Tool to use                          |
|----------------------------------------|--------------------------------------|
| Narrative / qualitative info           | search_report_text                   |
| Financial tables / structured data     | search_report_tables                 |
| Specific metric for one company/year   | get_financial_metric                 |
| Trend for one metric over many years   | compare_metric_across_years          |
| Compare metric across companies        | compare_metric_across_companies      |
| Who leads a company                    | get_key_persons                      |
| Corporate events / strategy            | get_key_developments                 |

## Output guidelines
- Be concise, precise, and data-driven.
- Always cite sources (company, fiscal year, document) when presenting facts.
- Format numbers clearly (e.g. $394.3B, 2.94T shares).
- When comparing companies, use a markdown table if it helps clarity.
- If you cannot find data with the tools, say so clearly — never fabricate numbers.
- Finish every answer with a brief **Analyst's Take** section summarising the key insight.`;

// ── Build the agent (called once per request) ─────────────────────────────────

function buildAgent() {
  const model = new AzureChatOpenAI({
        model: "gpt-5-mini",
        maxTokens: undefined,
        maxRetries: 2,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
        azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
    })

  const tools = [
    // Vector retrieval
    searchReportTextTool,
    searchReportTablesTool,
    // Financial graph
    getFinancialMetricTool,
    compareMetricAcrossYearsTool,
    compareMetricAcrossCompaniesTool,
    // Key persons
    getKeyPersonsTool,
    // Key developments
    getKeyDevelopmentsTool,
  ];

  // createReactAgent is the new LangGraph prebuilt syntax
  const agent = createReactAgent({
    llm: model,
    tools,
    stateModifier: SYSTEM_PROMPT,
  });

  return agent;
}

// ── runAgent: async generator that streams text chunks ────────────────────────

export async function* runAgent(userMessage: string): AsyncGenerator<string> {
  const agent = buildAgent();

  const eventStream = agent.streamEvents(
    { messages: [new HumanMessage(userMessage)] },
    { version: "v2" }
  );

  for await (const event of eventStream) {
    // Stream text tokens from the final LLM response
    if (
      event.event === "on_chat_model_stream" &&
      event.data?.chunk?.content
    ) {
      const content = event.data.chunk.content;
      if (typeof content === "string" && content.length > 0) {
        yield content;
      }
    }
  }
}