import { NavLink } from "react-router-dom";
import { cx } from "@/ui/kit";

const TABS = [
  { to: "/outreach", label: "Dashboard", end: true },
  { to: "/outreach/discovery", label: "Discovery", end: false },
  { to: "/outreach/prospects", label: "Prospects", end: false },
  { to: "/outreach/config", label: "ICP Config", end: false },
];

/** Shared sub-navigation across the Outbound Engine screens. */
export function OutreachNav() {
  return (
    <div className="mb-6 flex flex-wrap gap-1.5 border-b border-line/70 pb-3">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cx(
              "rounded-md border px-3 py-1.5 font-mono text-[12px] uppercase tracking-label transition-colors",
              isActive
                ? "border-brass/50 bg-brass-dim text-brass"
                : "border-line text-faint hover:border-line2 hover:text-ink",
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
