/**
 * ICP Config — the editable Ideal Customer Profile that drives the Discovery
 * Agent. Segments, target cities, and size bands are stored as data on the
 * company singleton (JSONB), never hardcoded. Editing here reshapes what
 * Discovery hunts for.
 */
import { useMemo, useState } from "react";
import { SERVICE, blankIcpSegment, type IcpConfig, type IcpSegment } from "@/domain";
import { Button, Empty, Panel, SectionHead, SelectField, TextArea, Toggle, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "../PageHeader";
import { OutreachNav } from "./OutreachNav";

function SegmentCard({ seg, patch, remove }: { seg: IcpSegment; patch: (p: Partial<IcpSegment>) => void; remove: () => void }) {
  return (
    <div className={cx("rounded-lg border bg-inset p-3.5", seg.enabled ? "border-line" : "border-line/50 opacity-60")}>
      <div className="mb-2.5 flex items-center gap-2">
        <input
          value={seg.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Segment name…"
          className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1.5 font-body text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <Toggle label="" checked={seg.enabled} onChange={(v) => patch({ enabled: v })} />
        <Button variant="danger" onClick={remove} className="mb-0 px-2 py-1">
          ✕
        </Button>
      </div>
      <SelectField label="Offer" value={seg.servicePath} onChange={(v) => patch({ servicePath: v as IcpSegment["servicePath"] })} options={SERVICE} className="mb-2" />
      <TextArea label="Trigger signals" value={seg.signals} onChange={(v) => patch({ signals: v })} rows={2} placeholder="Anniversary, championship, founding year…" className="mb-2" />
      <TextArea label="What qualifies" value={seg.notes} onChange={(v) => patch({ notes: v })} rows={2} placeholder="Who in this segment is a fit…" />
    </div>
  );
}

/** An editable comma/enter list rendered as removable chips. */
function ChipList({ items, onChange, placeholder }: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return setDraft("");
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="font-mono text-[12px] text-faint">None yet.</span>}
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 rounded-full border border-line2/70 bg-white/[.03] px-2.5 py-1 font-mono text-[12px] text-dim">
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))} className="text-faint hover:text-bad" aria-label={`Remove ${it}`}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-line bg-inset px-2.5 py-2 font-mono text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <Button variant="ghost" onClick={add}>
          + Add
        </Button>
      </div>
    </div>
  );
}

export function OutreachConfig() {
  const company = useStore((s) => s.company);
  const setCompany = useStore((s) => s.setCompany);
  const icp = useMemo<IcpConfig>(() => company.icp, [company.icp]);

  const setIcp = (patch: Partial<IcpConfig>) => setCompany({ icp: { ...icp, ...patch } });
  const patchSegment = (id: string, p: Partial<IcpSegment>) =>
    setIcp({ segments: icp.segments.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const removeSegment = (id: string) => setIcp({ segments: icp.segments.filter((s) => s.id !== id) });
  const addSegment = () => setIcp({ segments: [...icp.segments, blankIcpSegment()] });

  return (
    <div>
      <PageHeader
        title="Outbound Engine"
        kicker="ICP · targeting"
        actions={
          <Button variant="primary" onClick={addSegment}>
            + Segment
          </Button>
        }
      />
      <OutreachNav />

      <Panel className="mb-6 p-4">
        <SectionHead title="Segments" kicker="who you sell to" />
        {icp.segments.length === 0 ? (
          <Empty glyph="◈" action={<Button variant="primary" onClick={addSegment}>Add a segment</Button>}>
            No segments yet. Segments define the buckets Discovery hunts in.
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {icp.segments.map((s) => (
              <SegmentCard key={s.id} seg={s} patch={(p) => patchSegment(s.id, p)} remove={() => removeSegment(s.id)} />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionHead title="Target cities" kicker="where to look" />
          <ChipList items={icp.cities} onChange={(cities) => setIcp({ cities })} placeholder="Add a city…" />
        </Panel>
        <Panel className="p-4">
          <SectionHead title="Size bands" kicker="org headcount" />
          <ChipList items={icp.sizeBands} onChange={(sizeBands) => setIcp({ sizeBands })} placeholder="e.g. 10–50…" />
        </Panel>
      </div>
    </div>
  );
}
