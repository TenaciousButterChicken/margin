import type { Config } from "tailwindcss";

// Tailwind config reads from tokens.css CSS variables so the design package
// remains the single source of truth. Per design brief §6 the only token
// shifts between registers are radii (handled by [data-register="lab"]).

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "neutral-0":   "var(--neutral-0)",
        "neutral-50":  "var(--neutral-50)",
        "neutral-100": "var(--neutral-100)",
        "neutral-200": "var(--neutral-200)",
        "neutral-300": "var(--neutral-300)",
        "neutral-400": "var(--neutral-400)",
        "neutral-500": "var(--neutral-500)",
        "neutral-700": "var(--neutral-700)",
        "neutral-900": "var(--neutral-900)",
        accent:        "var(--accent)",
        "accent-hover":  "var(--accent-hover)",
        "accent-subtle": "var(--accent-subtle)",
        "accent-on":     "var(--accent-on)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger:  "var(--danger)",
        // Lab-only — never reference these from components/public/**
        "lab-cyan": "var(--lab-cyan)",
        "lab-warm": "var(--lab-warm)",
        "lab-teal": "var(--lab-teal)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      spacing: {
        "s-1": "4px",  "s-2": "8px",  "s-3": "12px", "s-4": "16px",
        "s-5": "20px", "s-6": "24px", "s-7": "32px", "s-8": "40px",
        "s-9": "48px", "s-10":"64px", "s-11":"80px", "s-12":"96px", "s-13":"128px",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      boxShadow: {
        card:  "var(--shadow-card)",
        modal: "var(--shadow-modal)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        micro: "120ms",
        trans: "200ms",
        big:   "280ms",
      },
    },
  },
  plugins: [],
};
export default config;
