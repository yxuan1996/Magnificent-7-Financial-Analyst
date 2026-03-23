import { AzureChatOpenAI } from "@langchain/openai";
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
import { getKeyPersonsTool }      from "./tools/keyPersonTools";
import { getKeyDevelopmentsTool } from "./tools/keyDevelopmentTools";
import { serpApiSearchTool }      from "./tools/serpApiTool";

// ─────────────────────────────────────────────────────────────────────────────
// Recursion / tool-call budget
//
// LangGraph counts every graph-node execution toward its recursion limit.
// For a ReAct agent each round-trip is:
//   agent node (LLM decides to call a tool)  +  tools node (tool executes)
//   = 2 steps per tool call
//
// Budget: 5 tool calls max → 5 × 2 = 10 steps + 1 final agent node = 11.
// We set 12 to give the agent one comfortable step of headroom.
//
// When the limit is hit LangGraph throws a GraphRecursionError. The catch
// block in runAgent converts that into a graceful message so the user always
// gets a response.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_TOOL_CALLS    = 5;
const RECURSION_LIMIT   = MAX_TOOL_CALLS * 2 + 2; // = 12

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite financial analyst specialising in the Magnificent 7 technology companies:
Apple (AAPL), Microsoft (MSFT), Alphabet (GOOGL), Amazon (AMZN), NVIDIA (NVDA), Meta (META), and Tesla (TSLA).

Your knowledge base uses RAG with Hybrid Search, combining:
1. A Neo4j graph database — structured financial facts, key persons, and key developments.
2. A Pinecone vector database — chunked paragraph text and tables from annual reports (10-K filings).
3. SerpAPI web search — for the latest data not available in the knowledge base.

## STRICT TOOL BUDGET — YOU HAVE AT MOST ${MAX_TOOL_CALLS} TOOL CALLS PER RESPONSE

Plan before you act. Choose the minimum number of tools needed. Never call the same tool twice with the same arguments.

## Tool priority — follow this order strictly

### Tier 1 — Neo4j graph tools (try first, most structured and reliable)
| Question type                              | Tool                              |
|--------------------------------------------|-----------------------------------|
| Specific metric for one company/year       | get_financial_metric              |
| Metric trend over time (one company)       | compare_metric_across_years       |
| Compare metric across multiple companies   | compare_metric_across_companies   |
| Who leads a company / board members        | get_key_persons                   |
| Corporate events / M&A / litigation        | get_key_developments              |

### Tier 2 — Vector tools (use if Neo4j returns no data, or for qualitative info)
| Question type                              | Tool                              |
|--------------------------------------------|-----------------------------------|
| Narrative / qualitative analysis           | search_report_text                |
| Financial tables / structured data         | search_report_tables              |

### Tier 3 — Web search (ONLY if Tier 1 and Tier 2 return no data, or the question explicitly asks for latest/current information)
| Question type                              | Tool                              |
|--------------------------------------------|-----------------------------------|
| Latest news, current prices, recent data   | web_search                        |

## Decision rules
1. Start with the most specific Neo4j tool that fits the question.
2. Only escalate to a vector tool if Neo4j returns "No data found."
3. Only call web_search if both Neo4j and vector tools failed, OR the user explicitly asks for current/latest data.
4. If you have used ${MAX_TOOL_CALLS} tools, STOP and synthesise an answer from what you have, even if incomplete. Clearly note any gaps.
5. Never call more than one cross-company comparison tool AND one single-company tool for the same metric — pick the most useful one.

## Output guidelines
- Be concise, precise, and data-driven.
- Always cite sources (company, fiscal year, document, or URL).
- Format numbers clearly (e.g. $394.3B, 2.94T shares).
- When comparing companies, use a markdown table.
- Never fabricate numbers — if no tool finds data, say so explicitly.
- Finish every answer with a brief **Analyst's Take** summarising the key insight.`;

// ─────────────────────────────────────────────────────────────────────────────
// Build the agent
// ─────────────────────────────────────────────────────────────────────────────

function buildAgent() {
  const model = new AzureChatOpenAI({
    streaming: true,
  });

  console.log(
    "[Agent] AzureChatOpenAI initialised —",
    "instance:",   process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    "| deployment:", process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    "| version:",   process.env.AZURE_OPENAI_API_VERSION,
    `| recursionLimit: ${RECURSION_LIMIT} (max ${MAX_TOOL_CALLS} tool calls)`
  );

  // Tools are listed in priority order: Neo4j first, then vector, then web.
  // The order here also influences how the LLM reads the tool list in its
  // context window, reinforcing the priority in the system prompt.
  const tools = [
    // ── Tier 1: Neo4j graph tools ───────────────────────────────────────────
    getFinancialMetricTool,
    compareMetricAcrossYearsTool,
    compareMetricAcrossCompaniesTool,
    getKeyPersonsTool,
    getKeyDevelopmentsTool,
    // ── Tier 2: Vector tools (Pinecone) ─────────────────────────────────────
    searchReportTextTool,
    searchReportTablesTool,
    // ── Tier 3: Web search fallback (SerpAPI) ───────────────────────────────
    serpApiSearchTool,
  ];

  const agent = createReactAgent({
    llm: model,
    tools,
    stateModifier: SYSTEM_PROMPT,
  });

  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// runAgent — streams text chunks to the caller
// ─────────────────────────────────────────────────────────────────────────────

export async function* runAgent(userMessage: string): AsyncGenerator<string> {
  const agent = buildAgent();

  let toolCallCount = 0;

  try {
    const eventStream = agent.streamEvents(
      { messages: [new HumanMessage(userMessage)] },
      {
        version: "v2",
        // This is the hard ceiling enforced by LangGraph.
        // It prevents infinite loops even if the LLM ignores the system prompt.
        recursionLimit: RECURSION_LIMIT,
      }
    );

    for await (const event of eventStream) {
      // Count tool calls for logging
      if (event.event === "on_tool_start") {
        toolCallCount++;
        console.log(
          `[Agent] Tool call ${toolCallCount}/${MAX_TOOL_CALLS}: ${event.name}`,
          "| input:", JSON.stringify(event.data?.input ?? {}).slice(0, 120)
        );
        if (toolCallCount >= MAX_TOOL_CALLS) {
          console.warn(
            `[Agent] ⚠  Reached tool call budget (${MAX_TOOL_CALLS}). ` +
            "Agent will synthesise answer from results collected so far."
          );
        }
      }

      // Stream final LLM response tokens to the client
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

    console.log(`[Agent] Completed — total tool calls used: ${toolCallCount}/${MAX_TOOL_CALLS}`);

  } catch (err) {
    // LangGraph throws GraphRecursionError when recursionLimit is hit.
    // We catch it here so the user always receives a readable response
    // rather than an unhandled 500 error.
    const isRecursionError =
      err instanceof Error &&
      (err.message.includes("Recursion limit") ||
       err.message.includes("GraphRecursionError") ||
       err.name === "GraphRecursionError");

    if (isRecursionError) {
      console.warn(
        `[Agent] GraphRecursionError hit after ${toolCallCount} tool calls. ` +
        "Returning graceful fallback message."
      );
      yield (
        "\n\n---\n" +
        `⚠️ **Note:** This query required more than ${MAX_TOOL_CALLS} tool calls to fully answer. ` +
        "The response above reflects the data retrieved so far. " +
        "For more comprehensive results, try breaking your question into smaller, more specific queries."
      );
    } else {
      // Re-throw unexpected errors — the API route's catch block will handle them
      throw err;
    }
  }
}