/**
 * Invoices — official fiscal documents. A summary + register, and a master
 * editor with buyer identity, line items (with TVA), live net/VAT/gross totals,
 * issue (assigns the next series number + snapshots the parties), mark-paid, and
 * a branded PDF. Invoices are a synced part of the workspace.
 */
import { useMemo, useState } from "react";
import {
  CCY,
  baseMoney,
  blankInvoice,
  buyerSnapshot,
  fmtCcy,
  invoiceSummary,
  invoiceTotals,
  type Ccy,
  type Invoice,
  type InvoiceLine,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, SelectField, Stat, Tag, TextArea } from "@/ui/kit";
import { useStore } from "@/state/store";
import { docName } from "@/documents/name";
import { PageHeader } from "./PageHeader";

const KINDS = ["Factură", "Proformă", "Chitanță"];
const STATUS_TONE: Record<string, "neutral" | "warn" | "ok"> = { draft: "neutral", issued: "warn", paid: "ok" };

function Editor({ inv, onBack }: { inv: Invoice; onBack: () => void }) {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);
  const patch = useStore((s) => s.patchInvoice);
  const issue = useStore((s) => s.issueInvoice);
  const setPaid = useStore((s) => s.setInvoicePaid);
  const del = useStore((s) => s.deleteInvoice);
  const [pdfBusy, setPdfBusy] = useState(false);

  const t = invoiceTotals(inv);
  const cur = inv.currency as Ccy;
  const fmt = (n: number) => fmtCcy(n, cur);
  const setBuyer = (k: keyof Invoice["buyer"], v: string) => patch(inv.id, { buyer: { ...inv.buyer, [k]: v } });
  const setLine = (i: number, k: keyof InvoiceLine, v: string) =>
    patch(inv.id, { lines: inv.lines.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)) });
  const addLine = () =>
    patch(inv.id, { lines: [...inv.lines, { desc: "", qty: "1", unitPrice: "", vat: company.fiscal.vatRegistered ? company.fiscal.vatRate : "0" }] });
  const removeLine = (i: number) => patch(inv.id, { lines: inv.lines.filter((_, idx) => idx !== i) });

  const pickClient = (id: string) => {
    const a = accounts[id];
    patch(inv.id, { accountId: id, buyer: inv.buyer.name ? inv.buyer : buyerSnapshot(a) });
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const [{ InvoiceDoc }, { downloadPdf }] = await Promise.all([
        import("@/documents/InvoiceDoc"),
        import("@/documents/download"),
      ]);
      await downloadPdf(<InvoiceDoc invoice={inv} company={company} />, docName(`${inv.kind}-${inv.series}${inv.number}`, "invoice"));
    } finally {
      setPdfBusy(false);
    }
  };

  const accountOpts = [{ value: "", label: "— select client —" }, ...Object.values(accounts).map((a) => ({ value: a.id, label: a.name || "Unnamed" }))];
  const projectOpts = [{ value: "", label: "— none —" }, ...Object.values(projects).map((p) => ({ value: p.id, label: p.name || "Untitled" }))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="font-mono text-[12px] uppercase tracking-label text-faint hover:text-dim">← Invoices</button>
        <Tag tone={STATUS_TONE[inv.status]}>{inv.status}</Tag>
        <span className="font-mono text-[13px] text-dim">
          {inv.kind} {inv.series}{inv.number ? `-${inv.number}` : " (draft)"}
        </span>
        <span className="ml-auto flex gap-2">
          {inv.status === "draft" && (
            <Button variant="primary" onClick={() => issue(inv.id)}>Issue</Button>
          )}
          <Button variant="ghost" onClick={() => setPaid(inv.id, inv.status !== "paid")}>
            {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
          </Button>
          <Button variant="ghost" onClick={exportPdf} disabled={pdfBusy}>{pdfBusy ? "Rendering…" : "↓ PDF"}</Button>
          <Button variant="danger" onClick={() => { del(inv.id); onBack(); }}>Delete</Button>
        </span>
      </div>

      <Panel className="p-4">
        <SectionHead title="Document" />
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Type" value={inv.kind} onChange={(v) => patch(inv.id, { kind: v })} options={KINDS} />
          <SelectField label="Currency" value={inv.currency} onChange={(v) => patch(inv.id, { currency: v })} options={CCY} />
          <SelectField label="Linked project" value={inv.projectId} onChange={(v) => patch(inv.id, { projectId: v })} options={projectOpts} />
          <Field label="Issue date" type="date" value={inv.issueDate} onChange={(v) => patch(inv.id, { issueDate: v })} />
          <Field label="Due date" type="date" value={inv.dueDate} onChange={(v) => patch(inv.id, { dueDate: v })} />
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Client / Cumpărător" kicker="appears on the invoice" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Client" value={inv.accountId} onChange={pickClient} options={accountOpts} />
          <Field label="Name" value={inv.buyer.name} onChange={(v) => setBuyer("name", v)} />
          <Field label="CUI / CIF" value={inv.buyer.taxId} onChange={(v) => setBuyer("taxId", v)} />
          <Field label="Reg. Com." value={inv.buyer.regNo} onChange={(v) => setBuyer("regNo", v)} />
          <Field label="Email" value={inv.buyer.email} onChange={(v) => setBuyer("email", v)} />
          <Field label="Address" value={inv.buyer.address} onChange={(v) => setBuyer("address", v)} className="sm:col-span-2" />
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Lines" kicker="description · qty · unit price · TVA" right={<Button variant="ghost" onClick={addLine}>+ Line</Button>} />
        <div className="flex flex-col gap-2">
          {inv.lines.map((l, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={i === 0 ? "Description" : undefined} value={l.desc} onChange={(v) => setLine(i, "desc", v)} className="flex-1" />
              <Field label={i === 0 ? "Qty" : undefined} value={l.qty} onChange={(v) => setLine(i, "qty", v)} className="w-16" />
              <Field label={i === 0 ? "Unit price" : undefined} value={l.unitPrice} onChange={(v) => setLine(i, "unitPrice", v)} className="w-24" />
              {company.fiscal.vatRegistered && (
                <Field label={i === 0 ? "TVA %" : undefined} value={l.vat} onChange={(v) => setLine(i, "vat", v)} className="w-16" />
              )}
              <span className="w-24 pb-2 text-right font-mono text-[13px] text-dim">{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0))}</span>
              <Button variant="danger" onClick={() => removeLine(i)} className="mb-0">✕</Button>
            </div>
          ))}
        </div>
        <div className="mt-4 ml-auto w-60">
          {company.fiscal.vatRegistered && (
            <>
              <Row label="Net" value={fmt(t.net)} />
              <Row label="TVA" value={fmt(t.vat)} />
            </>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-brass/40 pt-2">
            <span className="font-disp text-[15px] text-brass">Total</span>
            <span className="font-disp text-[15px] text-brass">{fmt(t.gross)}</span>
          </div>
        </div>
        <TextArea label="Notes" value={inv.notes} onChange={(v) => patch(inv.id, { notes: v })} rows={2} className="mt-3" />
        {!company.fiscal.vatRegistered && (
          <p className="mt-2 font-mono text-[12px] text-faint">Not VAT-registered — the PDF prints "Neplătitor de TVA". Toggle it in Settings → Fiscal.</p>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 font-mono text-[13px]">
      <span className="text-faint">{label}</span>
      <span className="text-dim">{value}</span>
    </div>
  );
}

export function Invoices() {
  const invoices = useStore((s) => s.invoices);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const upsert = useStore((s) => s.upsertInvoice);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => Object.values(invoices).sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1)), [invoices]);
  const summary = useMemo(() => invoiceSummary(Object.values(invoices)), [invoices]);
  const current = selected ? invoices[selected] : null;

  const create = () => {
    const inv = blankInvoice();
    inv.currency = company.baseCurrency;
    if (company.fiscal.vatRegistered) inv.lines = inv.lines.map((l) => ({ ...l, vat: company.fiscal.vatRate }));
    upsert(inv);
    setSelected(inv.id);
  };

  if (current) return <Editor inv={current} onBack={() => setSelected(null)} />;

  return (
    <div>
      <PageHeader
        title="Invoices"
        kicker="official · fiscal"
        actions={<Button variant="primary" onClick={create}>+ New invoice</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Invoiced" value={baseMoney(summary.invoiced, company)} tone="brass" />
        <Stat label="Outstanding" value={baseMoney(summary.outstanding, company)} tone={summary.outstanding ? "warn" : undefined} sub="issued, unpaid" />
        <Stat label="Paid" value={baseMoney(summary.paid, company)} tone="ok" />
      </div>

      {!company.fiscal.taxId && (
        <Panel className="mb-6 p-4">
          <p className="font-mono text-[13px] text-warn">
            Add your fiscal identity (CUI/CIF, Reg. Com., IBAN) in <span className="text-ink">Settings → Fiscal identity</span> so invoices are complete.
          </p>
        </Panel>
      )}

      <Panel className="p-4">
        <SectionHead title="Register" kicker={`${list.length} document${list.length === 1 ? "" : "s"}`} />
        {list.length === 0 ? (
          <Empty glyph="▦" action={<Button variant="primary" onClick={create}>+ New invoice</Button>}>
            No invoices yet. Issue your first factură — it assigns the next number and freezes both parties.
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {list.map((inv) => {
              const tot = invoiceTotals(inv);
              return (
                <li key={inv.id}>
                  <button onClick={() => setSelected(inv.id)} className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-inset">
                    <Tag tone={STATUS_TONE[inv.status]}>{inv.status}</Tag>
                    <span className="font-mono text-[13px] text-dim">{inv.kind} {inv.series}{inv.number ? `-${inv.number}` : ""}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{inv.buyer.name || accounts[inv.accountId]?.name || "—"}</span>
                    <span className="hidden font-mono text-[12px] text-faint sm:inline">{inv.issueDate}</span>
                    <span className="tnum font-mono text-[13px] text-brass">{fmtCcy(tot.gross, inv.currency as Ccy)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
