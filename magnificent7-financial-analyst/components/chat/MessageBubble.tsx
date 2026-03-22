"use client";

import { type Message } from "./types";
import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

/**
 * Lightweight markdown renderer.
 * Handles: bold, inline code, code blocks, headers, bullet lists, horizontal rules.
 */
function renderMarkdown(text: string): React.ReactNode {
  // Split on code fences first to protect code blocks from inline processing
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    // ── Code block ──
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");
      return (
        <pre
          key={i}
          className="my-3 rounded-lg bg-surface-tertiary border border-edge
                     p-4 overflow-x-auto text-xs font-mono text-ink-secondary"
        >
          {lang && (
            <div className="text-[10px] text-ink-muted mb-2 uppercase tracking-widest">
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // ── Regular text — process line by line ──
    return (
      <span key={i}>
        {part.split("\n").map((line, j) => {
          if (line.startsWith("### "))
            return <h3 key={j} className="text-sm font-semibold text-ink-primary mt-3 mb-1">{line.slice(4)}</h3>;
          if (line.startsWith("## "))
            return <h2 key={j} className="text-base font-bold text-ink-primary mt-4 mb-1">{line.slice(3)}</h2>;
          if (line.startsWith("# "))
            return <h1 key={j} className="text-lg font-bold text-gold mt-4 mb-2">{line.slice(2)}</h1>;
          if (line.startsWith("- ") || line.startsWith("* "))
            return (
              <div key={j} className="flex gap-2 my-0.5 ml-2">
                <span className="text-gold mt-1 text-xs">▸</span>
                <span>{inlineMarkdown(line.slice(2))}</span>
              </div>
            );
          if (line.startsWith("---"))
            return <hr key={j} className="my-3 border-edge" />;
          if (line.trim() === "")
            return <br key={j} />;
          if (line.startsWith("|"))
            return <div key={j} className="font-mono text-xs text-ink-secondary my-0.5">{line}</div>;
          return <span key={j}>{inlineMarkdown(line)}<br /></span>;
        })}
      </span>
    );
  });
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-ink-primary">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="font-mono text-xs bg-surface-tertiary text-gold px-1.5 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

// ── Typing indicator ────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/10
                      border border-gold/30 flex items-center justify-center">
        <Bot size={13} className="text-gold" />
      </div>
      <div className="flex items-center gap-1.5 bg-surface-card border border-edge
                      rounded-2xl rounded-tl-sm px-4 py-3">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-dot-1" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-dot-2" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-dot-3" />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>

      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
          ${isUser
            ? "bg-surface-tertiary border border-edge"
            : "bg-gold/10 border border-gold/30"
          }`}
      >
        {isUser
          ? <User size={13} className="text-ink-secondary" />
          : <Bot size={13} className="text-gold" />
        }
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] md:max-w-[75%] text-sm leading-relaxed
          ${isUser
            ? "bg-surface-tertiary border border-edge rounded-2xl rounded-tr-sm px-4 py-3 text-ink-primary"
            : "bg-surface-card border border-edge rounded-2xl rounded-tl-sm px-4 py-3 text-ink-secondary"
          }`}
      >
        {isUser
          ? <span>{message.content}</span>
          : <div>{renderMarkdown(message.content)}</div>
        }
      </div>
    </div>
  );
}