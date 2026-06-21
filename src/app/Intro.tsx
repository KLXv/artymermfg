/**
 * The intro — a short, cinematic power-on that reveals the cockpit.
 *
 * Black field → a spotlight blooms → the brand mark resolves under it with a
 * cast shadow, a bezel ring is machined around it, and a sheen sweeps across →
 * the wordmark settles → the whole frame opens into the app. Plays once per
 * session, is skippable (click / Esc / Enter), and respects reduced motion
 * (the caller simply doesn't mount it). Uses the uploaded brand logo, Σ default.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { Sigma } from "@/ui/Sigma";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Intro({ onDone }: { onDone: () => void }) {
  const logo = useStore((s) => s.company.logo);
  const brand = (useStore((s) => s.company.brand) || "Artymer").toUpperCase();
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 680); // let the open-out play
  };

  useEffect(() => {
    const t = window.setTimeout(finish, 2600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#05080A]"
      onClick={finish}
      initial={{ opacity: 1 }}
      animate={leaving ? { opacity: 0, scale: 1.08, filter: "blur(8px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.66, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* spotlight bloom */}
      <motion.div
        className="pointer-events-none absolute h-[82vmin] w-[82vmin] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(47,232,172,.18) 0%, rgba(47,232,172,.05) 32%, rgba(5,8,10,0) 64%)" }}
        initial={{ opacity: 0, scale: 0.45 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: EASE } }}
      />
      {/* vignette to focus the centre */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 46%, transparent 34%, rgba(0,0,0,.72) 100%)" }}
      />

      <div className="relative flex flex-col items-center">
        {/* machined bezel ring */}
        <svg width="208" height="208" viewBox="0 0 208 208" fill="none" aria-hidden className="absolute -top-[18px]">
          <motion.circle
            cx="104"
            cy="104"
            r="96"
            stroke="rgba(47,232,172,.5)"
            strokeWidth="1.4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1, transition: { duration: 1.35, ease: EASE, delay: 0.25 } }}
            style={{ rotate: -90, transformOrigin: "104px 104px" }}
          />
          <motion.circle
            cx="104"
            cy="104"
            r="83"
            stroke="rgba(255,255,255,.06)"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.8, delay: 1.1 } }}
          />
        </svg>

        {/* brand mark + glow + sheen */}
        <motion.div
          className="relative grid h-[172px] w-[172px] place-items-center"
          initial={{ opacity: 0, scale: 0.84, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.95, ease: EASE, delay: 0.35 } }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              className="max-h-[100px] max-w-[128px] object-contain"
              style={{ filter: "drop-shadow(0 0 28px rgba(47,232,172,.55))" }}
            />
          ) : (
            <div style={{ filter: "drop-shadow(0 0 32px rgba(47,232,172,.5))" }}>
              <Sigma size={96} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -inset-y-6 w-1/3 -skew-x-12"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)" }}
              initial={{ x: "-220%" }}
              animate={{ x: "360%", transition: { duration: 1.05, ease: "easeInOut", delay: 1.05 } }}
            />
          </div>
        </motion.div>

        {/* cast shadow */}
        <motion.div
          className="mt-1.5 h-3 w-44 rounded-[50%]"
          style={{ background: "radial-gradient(ellipse, rgba(0,0,0,.8) 0%, transparent 70%)", filter: "blur(6px)" }}
          initial={{ opacity: 0, scaleX: 0.35 }}
          animate={{ opacity: 1, scaleX: 1, transition: { duration: 0.9, delay: 0.5, ease: EASE } }}
        />

        {/* wordmark resolving */}
        <motion.div
          className="mt-7 font-disp text-[15px] font-semibold text-ink"
          initial={{ opacity: 0, letterSpacing: "0.1em", y: 8 }}
          animate={{ opacity: 1, letterSpacing: "0.42em", y: 0, transition: { duration: 0.95, ease: EASE, delay: 0.95 } }}
        >
          {brand}
        </motion.div>
        <motion.div
          className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.34em] text-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8, delay: 1.3 } }}
        >
          Cockpit
        </motion.div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        className="absolute bottom-6 right-6 font-mono text-[11px] uppercase tracking-label text-faint transition-colors hover:text-dim"
      >
        Skip ›
      </button>
    </motion.div>
  );
}
