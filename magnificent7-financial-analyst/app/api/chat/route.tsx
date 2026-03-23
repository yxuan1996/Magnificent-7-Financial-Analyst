import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/langchain/agent";

export async function POST(request: NextRequest) {
  // ── 1. Auth check ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse request body ─────────────────────────────────────────────────
  const { messages } = await request.json();

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // The last message in the array is the user's latest query
  const userMessage: string = messages[messages.length - 1].content;

  // ── 3. Stream agent response ──────────────────────────────────────────────
  // We use a ReadableStream so the UI sees tokens as they arrive.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // runAgent yields text chunks; we forward each chunk to the client
        for await (const chunk of runAgent(userMessage)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        controller.enqueue(encoder.encode(`\n\n[Error]: ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Tell the browser not to buffer — deliver bytes immediately
      "X-Content-Type-Options": "nosniff",
    },
  });
}