import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Surfaces
        canvas:    "var(--canvas)",
        surface:   "var(--surface)",
        sunken:    "var(--sunken)",
        // Borders
        "border-s":  "var(--border-s)",
        "border-d":  "var(--border-d)",
        "border-st": "var(--border-st)",
        // Text
        "text-p": "var(--text-p)",
        "text-s": "var(--text-s)",
        "text-t": "var(--text-t)",
        // Verdict palettes
        green:    "var(--green)",
        "green-bg": "var(--green-bg)",
        "green-bd": "var(--green-bd)",
        red:      "var(--red)",
        "red-bg":   "var(--red-bg)",
        "red-bd":   "var(--red-bd)",
        amber:    "var(--amber)",
        "amber-bg": "var(--amber-bg)",
        "amber-bd": "var(--amber-bd)",
        slate:    "var(--slate)",
        "slate-bg": "var(--slate-bg)",
        "slate-bd": "var(--slate-bd)",
      },
      keyframes: {
        pulse: {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0.3" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to:   { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "pulse-slow": "pulse 2s infinite",
        "fade-in":    "fadeIn 0.2s ease",
      },
    },
  },
  plugins: [],
};

export default config;
