"use client";

import { useEffect, useRef } from "react";
import { type Message, SUGGESTED_QUESTIONS } from "./types";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import { Sparkles } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestedQuestion: (question: string) => void;
}

export default function MessageList({
  messages,
  isLoading,
  onSuggestedQuestion,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Welcome */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14
                            rounded-2xl bg-gold/10 border border-gold/20 mb-4">
              <Sparkles size={24} className="text-gold" />
            </div>
            <h2 className="text-xl font-display font-bold text-ink-primary mb-2">
              Magnificent 7 Analyst
            </h2>
            <p className="text-ink-secondary text-sm leading-relaxed max-w-md mx-auto">
              Ask me anything about Apple, Microsoft, Alphabet, Amazon, NVIDIA,
              Meta, or Tesla. I search annual reports and financial data using
              RAG Hybrid Search.
            </p>
          </div>

          {/* Suggested questions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => onSuggestedQuestion(q)}
                className="text-left text-xs text-ink-secondary border border-edge
                           rounded-xl px-4 py-3 hover:border-gold/40
                           hover:text-ink-primary hover:bg-surface-card
                           transition-all duration-200 leading-relaxed"
              >
                <span className="text-gold mr-2">→</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Messages ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}