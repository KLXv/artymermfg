/**
 * The app shell — the instrument frame.
 *
 * A fixed brass-on-graphite rail (collapsing to a top bar on mobile) carrying
 * the Σ mark and the cockpit's sections. The Deck link wears a live count of
 * the action queue, so the most-pressing work is visible from anywhere.
 */
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Sigma } from "@/ui/Sigma";
import { cx } from "@/ui/kit";
import { useDashboard } from "@/state/useDashboard";
import { useAuth, signOut } from "@/state/useAuth";
import { useSyncStore } from "@/state/sync";
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
    return <div className="px-2 font-mono text-[8px] uppercase tracking-wide text-faint">local only · no cloud</div>;
  }
  return (
    <div className="flex flex-col gap-1.5 px-2">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide">
        <span className={cx("h-1.5 w-1.5 rounded-full", status === "error" ? "bg-bad" : status === "synced" ? "bg-ok" : "bg-brass")} />
        <span className={SYNC_TONE[status]}>{SYNC_LABEL[status]}</span>
      </div>
      {user && (
        <button onClick={signOut} className="text-left font-mono text-[9px] uppercase tracking-wide text-faint hover:text-dim">
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
  { to: "/assistant", label: "Assistant", glyph: "✺" },
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
              "group flex items-center gap-2.5 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-label transition-all",
              isActive
                ? "bg-accent-grad text-brass shadow-[inset_2px_0_0_#57A9FF]"
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
                <span className="ml-auto rounded-[20px] border border-brass/40 px-1.5 font-mono text-[9px] text-brass">
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

export function Shell() {
  const { alerts } = useDashboard();
  const loc = useLocation();
  // Close any future mobile drawer on route change is implicit (links re-render).
  void loc;

  return (
    <div className="min-h-screen bg-ground text-ink">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-gradient-to-b from-[#0E121A] to-[#0A0D12] px-3 py-5 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Sigma size={26} />
          <div>
            <div className="font-disp text-[14px] font-semibold tracking-brand text-ink">ARTYMER</div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-faint">Cockpit</div>
          </div>
        </div>
        <NavLinks alerts={alerts} />
        <div className="mt-auto pt-4">
          <SyncFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur lg:hidden">
        <Sigma size={20} />
        <span className="font-disp text-[11px] font-semibold tracking-brand">ARTYMER</span>
        {alerts > 0 && (
          <span className="ml-auto rounded-[20px] border border-brass/40 px-1.5 font-mono text-[9px] text-brass">
            {alerts} due
          </span>
        )}
      </header>

      {/* Mobile nav strip */}
      <div className="sticky top-[49px] z-10 overflow-x-auto border-b border-line bg-panel/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="flex gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cx(
                  "whitespace-nowrap rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-label",
                  isActive ? "bg-brass-dim text-brass" : "text-dim",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="lg:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
