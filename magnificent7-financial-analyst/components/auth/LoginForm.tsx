"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.refresh();
      router.push("/chat");
    }
  }

  return (
    <div className="glass-card p-8">
      <form onSubmit={handleLogin} className="space-y-5">

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-ink-secondary uppercase tracking-widest">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface-tertiary border border-edge rounded-lg px-4 py-3
                       text-ink-primary text-sm placeholder:text-ink-muted
                       focus:outline-none focus:border-gold
                       transition-colors duration-200"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-ink-secondary uppercase tracking-widest">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-tertiary border border-edge rounded-lg px-4 py-3 pr-11
                         text-ink-primary text-sm placeholder:text-ink-muted
                         focus:outline-none focus:border-gold
                         transition-colors duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted
                         hover:text-ink-secondary transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20
                        rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2
                     bg-gold text-surface font-semibold text-sm
                     rounded-lg py-3 px-4 mt-2
                     hover:bg-gold-muted active:scale-[0.98]
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign In
            </>
          )}
        </button>
      </form>
    </div>
  );
}