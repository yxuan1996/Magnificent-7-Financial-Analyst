/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark palette — prefixed to avoid clashing with Tailwind's
        // built-in utility names (bg, border, text are reserved prefixes).
        surface: {
          DEFAULT: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
          card: "#161616",
        },
        edge: {
          DEFAULT: "#222222",
          subtle: "#1c1c1c",
        },
        gold: {
          DEFAULT: "#c9a84c",
          muted: "#9a7a35",
          light: "#f0d080",
        },
        ink: {
          primary: "#f5f5f5",
          secondary: "#a0a0a0",
          muted: "#555555",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "dot-1": "dot-bounce 1.2s infinite 0s",
        "dot-2": "dot-bounce 1.2s infinite 0.2s",
        "dot-3": "dot-bounce 1.2s infinite 0.4s",
      },
    },
  },
  plugins: [],
};