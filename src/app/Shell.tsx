/**
 * The app shell — the instrument frame.
 *
 * A fixed brass-on-graphite rail (collapsing to a top bar on mobile) carrying
 * the Σ mark and the cockpit's sections. The Deck link wears a live count of
 * the action queue, so the most-pressing work is visible from anywhere.
 */
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BRAND_MARK } from "@/ui/brand";
import { cx } from "@/ui/kit";
import { CommandPalette } from "./CommandPalette";
import { Companion } from "@/ui/Companion";
import { CoFounder } from "@/ui/CoFounder";
import { useDashboard } from "@/state/useDashboard";
import { useAuth, signOut } from "@/state/useAuth";
import { useSyncStore } from "@/state/sync";
import { useSharesStore } from "@/state/useSharesStore";
import { useStore } from "@/state/store";
import { isSupabaseConfigured } from "@/data/supabase";

const SYNC_LABEL: Record<string, string> = {
  idle: "local only",
  loading: "loading…",
  saving: "saving…",
  synced: "synced",
  error: "sync error",
};
const SYNC_TONE: Record<string, string> = {
  idle: "text-faint",
  loading: "text-dim",
  saving: "text-brass",
  synced: "text-ok",
  error: "text-bad",
};

function SyncFooter() {
  const { user } = useAuth();
  const status = useSyncStore((s) => s.status);
  if (!isSupabaseConfigured()) {
    return <div className="px-2 font-mono text-[10px] uppercase tracking-wide text-faint">local only · no cloud</div>;
  }
  return (
    <div className="flex flex-col gap-1.5 px-2">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
        <span className={cx("h-1.5 w-1.5 rounded-full", status === "error" ? "bg-bad" : status === "synced" ? "bg-ok" : "bg-brass")} />
        <span className={SYNC_TONE[status]}>{SYNC_LABEL[status]}</span>
      </div>
      {user && (
        <button onClick={signOut} className="text-left font-mono text-[11px] uppercase tracking-wide text-faint hover:text-dim">
          Sign out
        </button>
      )}
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  glyph: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Deck", glyph: "◎" },
  { to: "/pipeline", label: "Pipeline", glyph: "⇶" },
  { to: "/projects", label: "Projects", glyph: "❖" },
  { to: "/clients", label: "Clients", glyph: "✦" },
  { to: "/suppliers", label: "Suppliers", glyph: "⛭" },
  { to: "/tasks", label: "Tasks", glyph: "✓" },
  { to: "/money", label: "Money", glyph: "€" },
  { to: "/invoices", label: "Invoices", glyph: "▦" },
  { to: "/marketing", label: "Marketing", glyph: "◈" },
  { to: "/strategy", label: "Strategy", glyph: "✧" },
  { to: "/assistant", label: "Assistant", glyph: "✺" },
  { to: "/guide", label: "Manual", glyph: "▤" },
  { to: "/settings", label: "Settings", glyph: "⚙" },
];

function NavLinks({ alerts, onNavigate }: { alerts: number; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              "group flex items-center gap-2.5 rounded-md px-3 py-2 font-mono text-[13px] uppercase tracking-label transition-all",
              isActive
                ? "bg-accent-grad text-brass shadow-[inset_2px_0_0_#2FE8AC]"
                : "text-dim hover:bg-white/[.04] hover:text-ink",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cx(
                  "inline-block w-4 text-center text-sm",
                  isActive ? "text-brass" : "text-faint group-hover:text-dim",
                )}
                aria-hidden
              >
                {item.glyph}
              </span>
              <span>{item.label}</span>
              {item.to === "/" && alerts > 0 && (
                <span className="ml-auto rounded-[20px] border border-brass/40 px-1.5 font-mono text-[11px] text-brass">
                  {alerts}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** The handful of destinations that earn a permanent thumb-reachable tab. */
const PRIMARY = ["/", "/pipeline", "/projects", "/money"];

/** Mobile bottom tab bar — primary tabs plus a "More" opener. */
function MobileTabBar({ alerts, onMore }: { alerts: number; onMore: () => void }) {
  const primaries = PRIMARY.map((to) => NAV.find((n) => n.to === to)).filter(Boolean) as NavItem[];
  const tab = (active: boolean) =>
    cx(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-label transition-colors",
      active ? "text-brass" : "text-faint",
    );
  return (
    <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-panel/95 backdrop-blur lg:hidden">
      {primaries.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => tab(isActive)}>
          {({ isActive }) => (
            <>
              <span className="relative text-[17px]" aria-hidden>
                {item.glyph}
                {item.to === "/" && alerts > 0 && (
                  <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-brass" />
                )}
              </span>
              <span className={isActive ? "text-brass" : "text-faint"}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button onClick={onMore} className={tab(false)} aria-label="More sections">
        <span className="text-[17px]" aria-hidden>
          ⋯
        </span>
        <span>More</span>
      </button>
    </nav>
  );
}

/** Slide-up sheet holding the secondary destinations and sign-out. */
function MoreSheet({ open, onClose, signedIn }: { open: boolean; onClose: () => void; signedIn: boolean }) {
  const rest = NAV.filter((n) => !PRIMARY.includes(n.to));
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="mobile-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-panel-grad p-4"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line2" />
            <div className="grid grid-cols-3 gap-2">
              {rest.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx(
                      "flex flex-col items-center gap-1.5 rounded-xl border bg-inset py-3.5 font-mono text-[11px] uppercase tracking-label transition-colors",
                      isActive ? "border-brass/40 text-brass" : "border-line text-dim hover:text-ink",
                    )
                  }
                >
                  <span className="text-[19px]" aria-hidden>
                    {item.glyph}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            {signedIn && (
              <button
                onClick={() => {
                  onClose();
                  signOut();
                }}
                className="mt-3 w-full rounded-xl border border-line py-3 font-mono text-[12px] uppercase tracking-label text-faint transition-colors hover:border-bad hover:text-bad"
              >
                Sign out
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Shell() {
  const { alerts } = useDashboard();
  const [moreOpen, setMoreOpen] = useState(false);
  const loc = useLocation();
  const { user } = useAuth();
  const loadShares = useSharesStore((s) => s.load);
  const logo = useStore((s) => s.company.logo);

  // Pull the owner's published shares so client responses reach the queue.
  useEffect(() => {
    if (user) loadShares();
  }, [user, loadShares, loc.pathname]);

  // Close the mobile "More" sheet whenever the route changes.
  useEffect(() => setMoreOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen bg-ground text-ink">
      {/* Ambient field — drifting aurora and fine grain. */}
      <div className="ambient" aria-hidden>
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="ambient-noise" />
      </div>
      <CommandPalette />
      <Companion />
      <CoFounder />
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-gradient-to-b from-[#0C1014] to-[#07090C] px-3 py-5 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src={logo || BRAND_MARK} alt="" className="h-8 w-8 object-contain" />
          <div>
            <div className="font-disp text-[14px] font-semibold tracking-brand text-ink">ARTYMER</div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-faint">Cockpit</div>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event("artymer:command"))}
          className="mb-3 flex items-center gap-2.5 rounded-md border border-line bg-white/[.02] px-3 py-2 font-mono text-[12px] text-faint transition-colors hover:border-line2 hover:text-dim"
        >
          <span className="text-sm">⌘</span>
          <span>Search & commands</span>
          <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px]">⌘K</span>
        </button>
        <NavLinks alerts={alerts} />
        <div className="mt-auto pt-4">
          <SyncFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur lg:hidden">
        <img src={logo || BRAND_MARK} alt="" className="h-6 w-6 object-contain" />
        <span className="font-disp text-[13px] font-semibold tracking-brand">ARTYMER</span>
        <button
          onClick={() => window.dispatchEvent(new Event("artymer:command"))}
          aria-label="Search & commands"
          className="ml-auto rounded-md border border-line px-2.5 py-1 font-mono text-[13px] text-dim"
        >
          ⌘K
        </button>
        {alerts > 0 && (
          <span className="rounded-[20px] border border-brass/40 px-1.5 font-mono text-[11px] text-brass">
            {alerts} due
          </span>
        )}
      </header>

      {/* Mobile bottom navigation */}
      <MobileTabBar alerts={alerts} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} signedIn={!!user} />

      <main className="relative z-10 lg:pl-56">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="page-enter mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28 lg:pb-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
