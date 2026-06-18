import type { ReactNode } from "react";

export function PageHeader({ title, kicker, actions }: { title: string; kicker?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div>
        {kicker && <div className="font-mono text-[9px] uppercase tracking-wide text-faint">{kicker}</div>}
        <h1 className="font-disp text-2xl font-semibold leading-tight">{title}</h1>
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
