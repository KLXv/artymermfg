/**
 * Rouage — the workshop companion.
 *
 * A small brass movement-sprite (a balance-wheel creature) that rests in the
 * bottom-right corner of the cockpit. It bobs quietly, pops a short personal
 * line every few minutes, and speaks on demand when Bence taps it. Subtle by
 * default: one figure, one bubble, no noise.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COMPANION_LINES, companionLine } from "./companion";
import { cx } from "./kit";

/* How often the companion speaks unprompted, and for how long. */
const POP_EVERY_MS = 4 * 60 * 1000; // ~4 minutes
const POP_FOR_MS = 8 * 1000;

/** The mascot glyph — a balance-wheel creature, coloured by `currentColor`. */
function Rouage({ awake }: { awake: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden>
      {/* balance-wheel spokes / gear teeth */}
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          const x1 = 24 + Math.cos(a) * 16;
          const y1 = 24 + Math.sin(a) * 16;
          const x2 = 24 + Math.cos(a) * 20;
          const y2 = 24 + Math.sin(a) * 20;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      {/* outer ring */}
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.6" />
      {/* face plate */}
      <circle cx="24" cy="24" r="12" fill="#11151C" stroke="currentColor" strokeWidth="1" opacity="0.95" />
      {/* eyes */}
      <circle cx="20" cy="22" r="1.7" fill="currentColor" />
      <circle cx="28" cy="22" r="1.7" fill="currentColor" />
      {/* mouth — a content little arc, wider when awake */}
      <path
        d={awake ? "M19 27.5 Q24 31 29 27.5" : "M20 28 Q24 29.5 28 28"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* twin watch hands as a little crest */}
      <line x1="24" y1="24" x2="24" y2="16.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="29" y2="24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function Companion() {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("");
  const seed = useRef(Math.floor(Math.random() * COMPANION_LINES.length));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = (next: boolean) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (next) {
      setLine(companionLine(seed.current));
      seed.current += 1;
    }
    setOpen(next);
  };

  // Unprompted pop every few minutes, then auto-hide.
  useEffect(() => {
    const id = setInterval(() => {
      speak(true);
      hideTimer.current = setTimeout(() => setOpen(false), POP_FOR_MS);
    }, POP_EVERY_MS);
    return () => {
      clearInterval(id);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-4">
      <AnimatePresence>
        {open && line && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto max-w-[230px] rounded-lg border border-brass/30 bg-panel-grad px-3 py-2 shadow-card"
          >
            <p className="font-body text-[13px] leading-snug text-dim">{line}</p>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-label text-faint">Rouage · workshop</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Workshop companion"
        onClick={() => speak(!open)}
        className={cx(
          "pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-panel-grad text-brass shadow-card transition-colors hover:border-brass",
          open && "border-brass shadow-glow-sm",
        )}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <Rouage awake={open} />
      </motion.button>
    </div>
  );
}
