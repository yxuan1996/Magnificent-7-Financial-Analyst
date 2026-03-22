"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, BarChart2, Loader2 } from "lucide-react";
import { MAGNIFICENT_7 } from "./types";

interface ChatHeaderProps {
  userEmail: string;
}

export default function ChatHeader({ userEmail }: ChatHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="flex-shrink-0 border-b border-edge bg-surface-secondary">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">

        {/* ── Left: Logo ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <BarChart2 size={18} className="text-gold" />
            <span className="font-display font-bold text-ink-primary text-sm md:text-base tracking-tight">
              M7{" "}
              <span className="text-gold">Financial</span>
            </span>
          </div>

          {/* Ticker chips – hidden on small screens */}
          <div className="hidden lg:flex items-center gap-1 ml-2">
            {MAGNIFICENT_7.map(({ ticker }) => (
              <span
                key={ticker}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded
                           bg-surface-tertiary text-ink-muted border border-edge-subtle"
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: User info + sign out ── */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-ink-muted font-mono truncate max-w-[160px]">
            {userEmail}
          </span>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-xs text-ink-secondary
                       hover:text-ink-primary border border-edge rounded-lg
                       px-3 py-1.5 transition-colors hover:border-edge
                       disabled:opacity-50"
            title="Sign out"
          >
            {signingOut ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <LogOut size={13} />
            )}
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}