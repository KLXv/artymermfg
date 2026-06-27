import type { Config } from "tailwindcss";

/**
 * Artymer design language — emerald neon on black.
 * A polished-metal Σ and the ARTYMER wordmark on near-true black, lit by a vivid
 * spring-mint accent, glowing data and dimensional, glassy surfaces. Depth, glow
 * and high-contrast type — never flat. See DECISIONS.md.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#06090C",
        panel: "#0F151C",
        panel2: "#151C25",
        inset: "#090D12",
        line: "#1E2730",
        line2: "#2E3A44",
        ink: "#ECF3F1",
        dim: "#9AA9A6",
        faint: "#67756F",
        // accent — kept under the legacy name `brass` so every existing
        // text-brass / border-brass / bg-brass-dim becomes emerald mint.
        brass: { DEFAULT: "#2FE8AC", dim: "rgba(47,232,172,.14)", deep: "#15B98C" },
        ok: "#3DDC97",
        warn: "#F5B445",
        bad: "#FF6B6B",
        pl: { DEFAULT: "#C3B1F0", line: "#7A66BE" },
      },
      fontFamily: {
        disp: ["'Geist'", "system-ui", "sans-serif"],
        body: ["'Geist'", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
        serif: ["'Newsreader'", "Georgia", "serif"],
      },
      letterSpacing: {
        label: ".09em",
        wide: ".14em",
        brand: ".42em",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "9px",
        md: "12px",
        lg: "16px",
      },
      backgroundImage: {
        "panel-grad": "linear-gradient(180deg, #141C24 0%, #0B1117 100%)",
        "inset-grad": "linear-gradient(180deg, #0E141A 0%, #080C10 100%)",
        silver: "linear-gradient(165deg, #FFFFFF 0%, #D6DCE6 38%, #949DAC 70%, #C2CAD6 100%)",
        "accent-grad": "linear-gradient(180deg, rgba(47,232,172,.22) 0%, rgba(47,232,172,.05) 100%)",
        "glow-radial": "radial-gradient(60% 60% at 50% 0%, rgba(47,232,172,.14) 0%, rgba(47,232,172,0) 100%)",
      },
      boxShadow: {
        card: "0 18px 44px -22px rgba(0,0,0,.92), inset 0 1px 0 rgba(255,255,255,.06)",
        glow: "0 0 30px -6px rgba(47,232,172,.6)",
        "glow-sm": "0 0 16px -4px rgba(47,232,172,.55)",
        focus: "0 0 0 3px rgba(47,232,172,.25)",
        inset: "inset 0 1px 2px rgba(0,0,0,.55)",
        neon: "0 0 0 1px rgba(47,232,172,.18), 0 14px 50px -26px rgba(47,232,172,.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
