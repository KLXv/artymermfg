/** Suppliers — the OEM bench. Inline-editable; status drives readiness. */
import { SUPP_STATUS, blankSupplier, type Supplier } from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, SelectField, TextArea, Tag } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const TONE: Record<string, "ok" | "brass" | "warn" | "neutral"> = {
  Primary: "ok",
  Backup: "brass",
  Warming: "warn",
  Retired: "neutral",
};

function Card({ s }: { s: Supplier }) {
  const patch = useStore((st) => st.patchSupplier);
  const del = useStore((st) => st.deleteSupplier);
  const f = (k: keyof Supplier) => ({ value: (s[k] as string) ?? "", onChange: (v: string) => patch(s.id, { [k]: v } as Partial<Supplier>) });

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
        <Field label="Lead time" {...f("leadTime")} />
        <Field label="MOQ" {...f("moq")} />
        <Field label="Contact" {...f("contact")} />
        <Field label="Golden samples held" {...f("goldenSamples")} className="sm:col-span-2 lg:col-span-3" />
      </div>
      <TextArea label="Notes" {...f("notes")} rows={2} className="mt-3" />
    </Panel>
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
        <div className="flex flex-col gap-4">
          {list.map((s) => (
            <Card key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
