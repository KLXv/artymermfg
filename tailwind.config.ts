import type { Config } from "tailwindcss";

/**
 * Artymer design language — brass on graphite.
 * Tailwind is the utility engine; these tokens are the custom layer that keeps
 * the app from reading like a stock template. Every value here is a decision,
 * not a default. See DECISIONS.md.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#15171C",
        panel: "#1B1E25",
        panel2: "#20242D",
        inset: "#101216",
        line: "#2B3039",
        line2: "#3A4150",
        ink: "#E8E8E8",
        dim: "#9AA0AC",
        faint: "#5E6470",
        brass: { DEFAULT: "#C9A24B", dim: "rgba(201,162,75,.12)" },
        ok: "#6FB98F",
        warn: "#D08A45",
        bad: "#C25B52",
        pl: { DEFAULT: "#B9A6E0", line: "#6E5DA8" },
      },
      fontFamily: {
        // Pinned identity. Display + body + the data/mono voice used for every
        // measured value. Serif is reserved for the client-facing documents.
        disp: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        serif: ["'Newsreader'", "Georgia", "serif"],
      },
      letterSpacing: {
        label: ".09em",
        wide: ".14em",
        brand: ".26em",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "5px",
        md: "6px",
      },
      boxShadow: {
        focus: "0 0 0 1px rgba(201,162,75,.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
