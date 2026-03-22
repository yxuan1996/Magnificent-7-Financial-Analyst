"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex-shrink-0 border-t border-edge bg-surface-secondary px-4 md:px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div
          className="flex items-end gap-3 bg-surface-tertiary border border-edge
                     rounded-2xl px-4 py-3 focus-within:border-gold/50
                     transition-colors duration-200"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask about financials, key persons, developments…"
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-ink-primary text-sm
                       placeholder:text-ink-muted resize-none
                       focus:outline-none leading-relaxed
                       disabled:opacity-50"
            style={{ minHeight: "24px", maxHeight: "160px" }}
          />

          <button
            onClick={handleSend}
            disabled={isLoading || !value.trim()}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                       rounded-xl bg-gold text-surface
                       hover:bg-gold-muted active:scale-95
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200"
            aria-label="Send message"
          >
            {isLoading
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>

        <p className="text-center text-[10px] text-ink-muted mt-2 font-mono">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}