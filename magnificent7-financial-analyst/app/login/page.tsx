import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-gold text-3xl font-bold font-display tracking-tight">
              M7
            </span>
            <span className="text-ink-muted text-lg">|</span>
            <span className="text-ink-secondary text-sm tracking-widest uppercase font-mono">
              Financial Analyst
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-ink-primary">
            Sign in to your account
          </h1>
          <p className="text-ink-secondary text-sm mt-2">
            Powered by RAG Hybrid Search
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-ink-muted text-xs mt-6 tracking-widest font-mono">
          AAPL · MSFT · GOOGL · AMZN · NVDA · META · TSLA
        </p>
      </div>
    </div>
  );
}