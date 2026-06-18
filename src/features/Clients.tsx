/** Clients register — accounts by status, with outreach freshness. */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACCT_STATUS, blankAccount, dAgo, type Account } from "@/domain";
import { Button, Empty, Field, SelectField, Tag } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral" | "bad"> = {
  active: "ok",
  prospect: "warn",
  dormant: "neutral",
  lost: "bad",
};

export function Clients() {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const upsertAccount = useStore((s) => s.upsertAccount);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const projectCount = useMemo(() => {
    const m: Record<string, number> = {};
    Object.values(projects).forEach((p) => (m[p.accountId] = (m[p.accountId] || 0) + 1));
    return m;
  }, [projects]);

  const rows = useMemo(() => {
    let list = Object.values(accounts);
    if (status !== "All") list = list.filter((a) => a.status === status);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(t) || a.contactName.toLowerCase().includes(t));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, q, status]);

  const newClient = () => {
    const a = blankAccount();
    upsertAccount(a);
    navigate(`/clients/${a.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        kicker={`${Object.keys(accounts).length} accounts`}
        actions={
          <Button variant="primary" onClick={newClient}>
            + New client
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Field value={q} onChange={setQ} placeholder="Search…" className="w-56" />
        <SelectField value={status} onChange={setStatus} options={["All", ...ACCT_STATUS]} className="w-40" />
      </div>

      {rows.length === 0 ? (
        <Empty>No clients match.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a: Account) => {
            const ag = dAgo(a.lastContact);
            const stale = ag != null && ag > 30;
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/clients/${a.id}`)}
                className="rounded-md border border-line bg-panel p-4 text-left transition-colors hover:border-line2"
              >
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{a.name || "Unnamed"}</span>
                  <Tag tone={STATUS_TONE[a.status] || "neutral"}>{a.status}</Tag>
                </div>
                <div className="mt-1 truncate text-[11px] text-dim">
                  {a.contactName || "—"}
                  {a.contactRole ? ` · ${a.contactRole}` : ""}
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-faint">
                  <span>
                    {a.servicePath === "Private label" ? "PL" : "Commission"} · {a.market}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{projectCount[a.id] || 0} proj</span>
                    {a.lastContact && <span className={stale ? "text-warn" : "text-faint"}>{ag}d ago</span>}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
