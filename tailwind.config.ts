import type { Config } from "tailwindcss";

/**
 * Artymer design language — liquid chrome on black.
 * Matches the brand: a polished-metal Σ and the ARTYMER wordmark on true black,
 * with electric-blue light and dimensional, glassy surfaces. Depth, glow and
 * high-contrast type — never flat. See DECISIONS.md.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#090B10",
        panel: "#161B24",
        panel2: "#1C222C",
        inset: "#0C0F15",
        line: "#242B36",
        line2: "#36404E",
        ink: "#EEF2F8",
        dim: "#9DA8B9",
        faint: "#6C7688",
        // accent — kept under the legacy name `brass` so every existing
        // text-brass / border-brass / bg-brass-dim becomes electric chrome-blue.
        brass: { DEFAULT: "#57A9FF", dim: "rgba(87,169,255,.14)", deep: "#2F6BD0" },
        ok: "#3DDC97",
        warn: "#F5B445",
        bad: "#FF6B6B",
        pl: { DEFAULT: "#C3B1F0", line: "#7A66BE" },
      },
      fontFamily: {
        disp: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
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
        "panel-grad": "linear-gradient(180deg, #1B212C 0%, #11151C 100%)",
        "inset-grad": "linear-gradient(180deg, #0E1218 0%, #0A0D12 100%)",
        silver: "linear-gradient(165deg, #FFFFFF 0%, #D6DCE6 38%, #949DAC 70%, #C2CAD6 100%)",
        "accent-grad": "linear-gradient(180deg, rgba(87,169,255,.24) 0%, rgba(87,169,255,.08) 100%)",
        "glow-radial": "radial-gradient(60% 60% at 50% 0%, rgba(87,169,255,.10) 0%, rgba(87,169,255,0) 100%)",
      },
      boxShadow: {
        card: "0 14px 34px -18px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05)",
        glow: "0 0 26px -6px rgba(87,169,255,.55)",
        "glow-sm": "0 0 14px -4px rgba(87,169,255,.5)",
        focus: "0 0 0 3px rgba(87,169,255,.25)",
        inset: "inset 0 1px 2px rgba(0,0,0,.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
