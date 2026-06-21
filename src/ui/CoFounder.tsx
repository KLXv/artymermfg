/**
 * The voice co-founder — a talk-to-me business partner in the corner.
 *
 * Free by default: it listens with the browser's Web Speech API and speaks with
 * the built-in synthesizer (no key, no cost). The data-aware brain
 * (domain/cofounder) answers from the live workspace. Open-ended questions try
 * the AI brain (the proxy) and fall back gracefully when no key is configured —
 * so it gets smarter the day an API key is added, at no cost until then.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { coFounderAnswer, coFounderBriefing, coFounderSystem } from "@/domain";
import { generate } from "@/data/ai";
import { useDashboard } from "@/state/useDashboard";
import { OPERATOR } from "./companion";
import { rankEnglishVoices, splitSentences, voiceLabel } from "./voice";
import { cx } from "./kit";

const VOICE_KEY = "artymer:cofounder-voice";

/* Web Speech API isn't in the TS DOM lib — accessed defensively. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const SRClass: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
const canListen = !!SRClass;
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

const UNKNOWN =
  "I can't free-think on that one yet — add an AI key in Settings and I'll go deeper. For now, ask me what to focus on, or about money, leads, tasks or deadlines.";

const CHIPS = ["What should I do?", "How's the money?", "My leads", "Deadlines"];

function MicGlyph({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" fill={on ? "currentColor" : "none"} />
      <path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 17v4M9 21h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CoFounder() {
  const d = useDashboard();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [youSaid, setYouSaid] = useState("");
  const [reply, setReply] = useState("");
  const [typed, setTyped] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>(() => localStorage.getItem(VOICE_KEY) || "");
  const recRef = useRef<any>(null);
  const greeted = useRef(false);
  const keepAlive = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the platform's voices (async on most browsers) and rank the best one.
  useEffect(() => {
    if (!canSpeak) return;
    const refresh = () => {
      const ranked = rankEnglishVoices(window.speechSynthesis.getVoices());
      setVoices(ranked);
      setVoiceURI((cur) => cur || ranked[0]?.voiceURI || "");
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const all = window.speechSynthesis.getVoices();
    return all.find((v) => v.voiceURI === voiceURI) || rankEnglishVoices(all)[0];
  };

  const speak = (text: string) => {
    if (!canSpeak || muted || !text) return;
    try {
      window.speechSynthesis.cancel();
      const voice = pickVoice();
      // Sentence-by-sentence: natural cadence, and avoids Chrome's ~15s cut-off.
      splitSentences(text).forEach((sentence) => {
        const u = new SpeechSynthesisUtterance(sentence);
        if (voice) u.voice = voice;
        u.rate = 0.97; // a touch measured — reads as considered, not rushed
        u.pitch = 1.0;
        u.volume = 1;
        window.speechSynthesis.speak(u);
      });
      // Keep the queue from stalling (a long-standing Chrome bug).
      if (keepAlive.current) clearInterval(keepAlive.current);
      keepAlive.current = setInterval(() => {
        if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
        else if (keepAlive.current) {
          clearInterval(keepAlive.current);
          keepAlive.current = null;
        }
      }, 6000);
    } catch {
      /* tts blocked */
    }
  };
  const stopSpeak = () => {
    try {
      if (canSpeak) window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
    if (keepAlive.current) {
      clearInterval(keepAlive.current);
      keepAlive.current = null;
    }
  };

  const changeVoice = (uri: string) => {
    setVoiceURI(uri);
    localStorage.setItem(VOICE_KEY, uri);
    // Let the operator hear the pick immediately.
    const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === uri);
    if (v && !muted) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Right then — ready when you are.");
      u.voice = v;
      u.rate = 0.97;
      window.speechSynthesis.speak(u);
    }
  };

  const respond = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setTyped("");
    setYouSaid(query);
    setReply("");
    setThinking(true);
    try {
      const local = coFounderAnswer(query, d, OPERATOR);
      if (local.handled) {
        setReply(local.text);
        speak(local.text);
        return;
      }
      // Open-ended → try the AI upgrade; fall back if no key/proxy.
      try {
        const text = await generate(coFounderSystem(d, OPERATOR), [{ role: "user", content: query }], 300);
        const out = text || UNKNOWN;
        setReply(out);
        speak(out);
      } catch {
        setReply(UNKNOWN);
        speak(UNKNOWN);
      }
    } finally {
      setThinking(false);
    }
  };

  const startListen = () => {
    if (!canListen) return;
    stopSpeak();
    try {
      const rec = new SRClass();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const t = e.results?.[0]?.[0]?.transcript || "";
        setListening(false);
        respond(t);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };
  const stopListen = () => {
    try {
      recRef.current?.stop?.();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const openPanel = () => {
    setOpen(true);
    if (!greeted.current) {
      greeted.current = true;
      const b = coFounderBriefing(d, OPERATOR);
      setReply(b);
      speak(b);
    }
  };
  const closePanel = () => {
    setOpen(false);
    stopListen();
    stopSpeak();
  };

  // Warm the voice list + clean up on unmount.
  useEffect(() => {
    if (canSpeak) window.speechSynthesis.getVoices();
    return () => {
      stopListen();
      stopSpeak();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-[4.75rem] z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-[300px] max-w-[80vw] rounded-xl border border-brass/30 bg-panel-grad shadow-card"
          >
            {/* header */}
            <div className="flex items-center gap-2 border-b border-line/80 px-3 py-2.5">
              <span className="font-disp text-[14px] font-semibold text-ink">Co-founder</span>
              {canSpeak && voices.length > 0 && (
                <select
                  value={voiceURI}
                  onChange={(e) => changeVoice(e.target.value)}
                  aria-label="Voice"
                  className="max-w-[120px] rounded border border-line bg-inset px-1.5 py-0.5 font-mono text-[11px] text-dim focus:border-brass focus:outline-none [color-scheme:dark]"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-panel">
                      {voiceLabel(v)}
                    </option>
                  ))}
                </select>
              )}
              <span className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => {
                    setMuted((m) => !m);
                    if (!muted) stopSpeak();
                  }}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className={cx("rounded px-1.5 py-0.5 font-mono text-[12px]", muted ? "text-faint" : "text-brass")}
                >
                  {muted ? "🔇" : "🔊"}
                </button>
                <button onClick={closePanel} aria-label="Close" className="rounded px-1.5 py-0.5 font-mono text-[13px] text-faint hover:text-ink">
                  ✕
                </button>
              </span>
            </div>

            {/* conversation */}
            <div className="max-h-[230px] overflow-y-auto px-3 py-3">
              {youSaid && <p className="mb-1.5 text-right font-mono text-[12px] text-faint">"{youSaid}"</p>}
              <p className="text-[13px] leading-relaxed text-dim">
                {thinking ? "…thinking" : reply || "Tap the mic and talk to me, or pick a question below."}
              </p>
            </div>

            {/* quick chips */}
            <div className="flex flex-wrap gap-1 px-3 pb-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => respond(c)}
                  className="rounded-full border border-line bg-white/[.02] px-2 py-0.5 font-mono text-[11px] text-dim hover:border-brass/50 hover:text-ink"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* input row */}
            <div className="flex items-center gap-1.5 border-t border-line/80 p-2">
              {canListen && (
                <button
                  onClick={listening ? stopListen : startListen}
                  aria-label={listening ? "Stop listening" : "Talk"}
                  className={cx(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors",
                    listening ? "border-brass bg-brass-dim text-brass shadow-glow-sm" : "border-line text-dim hover:border-brass hover:text-brass",
                  )}
                >
                  <MicGlyph on={listening} />
                </button>
              )}
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && respond(typed)}
                placeholder={listening ? "Listening…" : "Ask your co-founder…"}
                className="min-w-0 flex-1 rounded-md border border-line bg-inset px-2.5 py-1.5 font-body text-[13px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
              />
              <button
                onClick={() => respond(typed)}
                disabled={!typed.trim()}
                className="shrink-0 rounded-md border border-brass/50 bg-accent-grad px-2.5 py-1.5 font-mono text-[12px] text-[#CFF8EC] disabled:opacity-40"
              >
                Ask
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Voice co-founder"
        onClick={() => (open ? closePanel() : openPanel())}
        className={cx(
          "pointer-events-auto grid h-12 w-12 place-items-center rounded-full border bg-panel-grad shadow-card transition-colors",
          listening ? "border-brass text-brass shadow-glow-sm" : "border-line text-dim hover:border-brass hover:text-brass",
          open && "border-brass",
        )}
        animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={listening ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        whileTap={{ scale: 0.94 }}
      >
        <MicGlyph on={listening} />
      </motion.button>
    </div>
  );
}
