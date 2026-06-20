/** Suppliers — the OEM bench. Inline-editable; ratings drive the ranking. */
import { useState } from "react";
import {
  CAPABILITY_SUGGESTIONS,
  SUPP_STATUS,
  blankSupplier,
  rankSuppliers,
  supplierCaps,
  type Supplier,
  type SupplierScore,
} from "@/domain";
import { Button, Empty, Field, Label, Panel, SectionHead, SelectField, TextArea, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const TONE: Record<string, "ok" | "brass" | "warn" | "neutral"> = {
  Primary: "ok",
  Backup: "brass",
  Warming: "warn",
  Retired: "neutral",
};

/** A 1–5 star rating; click the active star again to clear. */
function Stars({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = parseInt(value) || 0;
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${label}: ${i}`}
            onClick={() => onChange(String(i === n ? 0 : i))}
            className={cx("text-[18px] leading-none transition-colors", i <= n ? "text-brass" : "text-faint hover:text-dim")}
          >
            {i <= n ? "★" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ s }: { s: Supplier }) {
  const patch = useStore((st) => st.patchSupplier);
  const del = useStore((st) => st.deleteSupplier);
  const f = (k: keyof Supplier) => ({ value: (s[k] as string) ?? "", onChange: (v: string) => patch(s.id, { [k]: v } as Partial<Supplier>) });
  const set = (k: keyof Supplier, v: string) => patch(s.id, { [k]: v } as Partial<Supplier>);

  return (
    <Panel className="p-4">
      <SectionHead
        title={s.name || "Unnamed supplier"}
        right={
          <span className="flex items-center gap-2">
            <Tag tone={TONE[s.status] || "neutral"}>{s.status}</Tag>
            <Button variant="danger" onClick={() => del(s.id)}>
              ✕
            </Button>
          </span>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" {...f("name")} />
        <SelectField label="Status" {...f("status")} options={SUPP_STATUS} />
        <Field label="Platform" {...f("platform")} />
        <Field label="Lead time (days)" {...f("leadTime")} />
        <Field label="MOQ" {...f("moq")} />
        <Field label="Contact" {...f("contact")} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stars label="Quality" value={s.quality} onChange={(v) => set("quality", v)} />
        <Stars label="Communication" value={s.communication} onChange={(v) => set("communication", v)} />
        <Stars label="Price / value" value={s.price} onChange={(v) => set("price", v)} />
      </div>

      <Field
        label="Capabilities (comma-separated: dials, cases, engraving…)"
        {...f("capabilities")}
        className="mt-3"
      />
      <Field label="Golden samples held" {...f("goldenSamples")} className="mt-3" />
      <TextArea label="Notes" {...f("notes")} rows={2} className="mt-3" />
    </Panel>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <span className="relative inline-block h-1.5 w-full overflow-hidden rounded-full bg-inset">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brass/60 to-brass"
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </span>
  );
}

function BestCard({ label, supplier }: { label: string; supplier?: Supplier }) {
  return (
    <div className="rounded-lg border border-line bg-inset p-3">
      <div className="font-mono text-[11px] uppercase tracking-label text-brass">{label}</div>
      <div className="mt-1 truncate text-[14px] text-ink">{supplier?.name || "—"}</div>
    </div>
  );
}

function Ranking({ list }: { list: Supplier[] }) {
  const [cap, setCap] = useState("");
  const { ranked, bests } = rankSuppliers(list, cap);

  return (
    <Panel className="mb-5 p-4">
      <SectionHead title="Ranking" kicker="best for what · from your ratings" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <BestCard label="Best overall" supplier={bests.overall} />
        <BestCard label="Best quality" supplier={bests.quality} />
        <BestCard label="Fastest" supplier={bests.fast} />
        <BestCard label="Best value" supplier={bests.value} />
        <BestCard label="Lowest MOQ" supplier={bests.lowMoq} />
      </div>

      <div className="mt-4">
        <Label>Filter by capability</Label>
        <input
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          placeholder="e.g. dials, engraving, sapphire…"
          className="w-full rounded-md border border-line bg-inset px-2.5 py-2 font-body text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none sm:w-80"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CAPABILITY_SUGGESTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCap(cap.toLowerCase() === c.toLowerCase() ? "" : c)}
              className={cx(
                "rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                cap.toLowerCase() === c.toLowerCase()
                  ? "border-brass bg-brass-dim text-brass"
                  : "border-line text-dim hover:border-line2 hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 font-mono text-[13px] text-faint">No suppliers match that capability.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {ranked.map((r, i) => (
            <RankRow key={r.supplier.id} rank={i + 1} r={r} />
          ))}
        </ul>
      )}
      <p className="mt-3 font-mono text-[11px] text-faint">
        Score blends quality, value, speed (lead time), communication and MOQ fit. Speed + MOQ are judged against the
        others on the bench.
      </p>
    </Panel>
  );
}

function RankRow({ rank, r }: { rank: number; r: SupplierScore }) {
  const s = r.supplier;
  const caps = supplierCaps(s);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-5 text-center font-mono text-[13px] text-faint">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] text-ink">{s.name || "Unnamed"}</span>
          <Tag tone={TONE[s.status] || "neutral"}>{s.status}</Tag>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <ScoreBar value={r.score} />
          <span className="font-mono text-[12px] text-dim">{r.score}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-faint">
          <span>Q {r.quality}</span>
          <span>Value {r.value}</span>
          <span>Speed {r.speed}</span>
          <span>Comm {r.comm}</span>
          <span>MOQ {r.moqFit}</span>
          {caps.length > 0 && <span className="text-dim">· {caps.join(", ")}</span>}
        </div>
      </div>
    </li>
  );
}

export function Suppliers() {
  const suppliers = useStore((s) => s.suppliers);
  const upsert = useStore((s) => s.upsertSupplier);
  const list = Object.values(suppliers);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        kicker={`${list.length} on the bench`}
        actions={
          <Button variant="primary" onClick={() => upsert(blankSupplier())}>
            + New supplier
          </Button>
        }
      />
      {list.length === 0 ? (
        <Empty>No suppliers yet. Add your OEM partners and warming backups.</Empty>
      ) : (
        <>
          {list.length > 1 && <Ranking list={list} />}
          <div className="flex flex-col gap-4">
            {list.map((s) => (
              <Card key={s.id} s={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
