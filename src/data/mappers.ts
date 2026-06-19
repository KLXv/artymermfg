/**
 * Row mappers — the flat domain entities ↔ Supabase rows (deferred from
 * Phase 1). The hybrid model: queryable fields are columns; the deep spec,
 * presentation, costs, controls, images and qc are JSONB groups. These are
 * pure transforms (no client), so the round-trip is unit-tested.
 *
 * Date columns are real `date` in Postgres, which rejects "". The domain keeps
 * raw strings, so we null empties on write and restore "" on read.
 */
import {
  blankAccount,
  blankCompany,
  blankProject,
  blankSupplier,
  blankTask,
  rid,
  type Account,
  type Company,
  type Expense,
  type Project,
  type Supplier,
  type Task,
} from "@/domain";

export type Row = Record<string, unknown>;

const pick = <T extends object>(obj: T, keys: readonly (keyof T)[]): Row => {
  const out: Row = {};
  keys.forEach((k) => (out[k as string] = obj[k]));
  return out;
};

const assign = <T extends object>(target: T, group: unknown, keys: readonly (keyof T)[]) => {
  if (!group || typeof group !== "object") return;
  const g = group as Record<string, unknown>;
  keys.forEach((k) => {
    if (k in g && g[k as string] !== undefined) (target as Record<string, unknown>)[k as string] = g[k as string];
  });
};

/* ----------------------------- project ---------------------------------- */

const PROJECT_COLUMNS: Record<string, keyof Project> = {
  account_id: "accountId",
  supplier_id: "supplierId",
  name: "name",
  service_path: "servicePath",
  stage: "stage",
  lost: "lost",
  qty: "qty",
  unit_price: "unitPrice",
  currency: "currency",
  deadline: "deadline",
  deposit_expected: "depositExpected",
  balance_expected: "balanceExpected",
  rev: "rev",
  maker: "maker",
  deposit_paid: "depositPaid",
  deposit_date: "depositDate",
  balance_paid: "balancePaid",
  balance_date: "balanceDate",
};
const PROJECT_DATE_COLS = new Set(["deadline", "deposit_expected", "balance_expected", "deposit_date", "balance_date"]);

const SPEC_FIELDS = [
  "caseRef", "caseMat", "caseDia", "caseDiaT", "l2l", "thick", "lugW", "caseFin", "wr",
  "cal", "calFn", "acc", "accUnit", "handRef", "handLen", "handFin", "lume",
  "crysMat", "crysShape", "ar", "crysDia", "crysDiaT", "crown", "back", "strap",
  "dialMat", "dialDia", "dialDiaT", "dialThk", "dialThkT", "feet",
  "tex", "texDepth", "texDepthT", "gloss", "print", "reg",
  "marker", "markerPos", "markerAtt", "date",
  "engLoc", "engTxt", "engMethod", "engDepth",
  "center", "align", "clear", "bezel", "wrTest", "clean", "lumeStd",
] as const satisfies readonly (keyof Project)[];
const COSTS_FIELDS = ["tooling", "cMovement", "cCase", "cDial", "cHands", "cCrystal", "cStrap", "cAssembly", "cPack", "cShip", "cDuty", "cOther", "feePct"] as const satisfies readonly (keyof Project)[];
const CONTROLS_FIELDS = ["deposit", "lotFail", "rework", "window"] as const satisfies readonly (keyof Project)[];
const PRESENTATION_FIELDS = ["pieceName", "edition", "story", "highlights", "lang"] as const satisfies readonly (keyof Project)[];

export const projectToRow = (p: Project, ownerId: string): Row => {
  const row: Row = { id: p.id, owner_id: ownerId, schema_v: p.schemaV };
  for (const [col, key] of Object.entries(PROJECT_COLUMNS)) {
    const v = p[key];
    row[col] = PROJECT_DATE_COLS.has(col) && v === "" ? null : v;
  }
  row.controls = pick(p, CONTROLS_FIELDS);
  row.spec = pick(p, SPEC_FIELDS);
  row.presentation = { ...pick(p, PRESENTATION_FIELDS), colors: p.colors };
  row.images = p.images;
  row.files = p.files;
  row.costs = pick(p, COSTS_FIELDS);
  row.qc = p.qc;
  return row;
};

export const rowToProject = (row: Row): Project => {
  const p = blankProject();
  p.id = String(row.id);
  if (row.schema_v != null) p.schemaV = Number(row.schema_v);
  for (const [col, key] of Object.entries(PROJECT_COLUMNS)) {
    const v = row[col];
    if (v == null) {
      if (PROJECT_DATE_COLS.has(col)) (p as unknown as Record<string, unknown>)[key] = "";
      // else keep the blank default
    } else {
      (p as unknown as Record<string, unknown>)[key] = v;
    }
  }
  assign(p, row.controls, CONTROLS_FIELDS);
  assign(p, row.spec, SPEC_FIELDS);
  assign(p, row.presentation, PRESENTATION_FIELDS);
  assign(p, row.costs, COSTS_FIELDS);
  const pres = row.presentation as { colors?: Project["colors"] } | undefined;
  if (pres?.colors && Array.isArray(pres.colors) && pres.colors.length) p.colors = pres.colors;
  if (row.images && typeof row.images === "object") p.images = { ...p.images, ...(row.images as object) };
  if (row.files && typeof row.files === "object") p.files = { ...p.files, ...(row.files as object) };
  if (row.qc && typeof row.qc === "object") p.qc = { ...p.qc, ...(row.qc as object) };
  return p;
};

/* ----------------------------- account ----------------------------------- */

const ACCOUNT_COLUMNS: Record<string, keyof Account> = {
  name: "name", type: "type", service_path: "servicePath", status: "status", market: "market",
  contact_name: "contactName", contact_role: "contactRole", email: "email", phone: "phone",
  source: "source", notes: "notes", testimonial: "testimonial",
  last_contact: "lastContact", next_action: "nextAction", next_date: "nextDate",
};
const ACCOUNT_DATE_COLS = new Set(["last_contact", "next_date"]);

export const accountToRow = (a: Account, ownerId: string): Row => {
  const row: Row = { id: a.id, owner_id: ownerId };
  for (const [col, key] of Object.entries(ACCOUNT_COLUMNS)) {
    const v = a[key];
    row[col] = ACCOUNT_DATE_COLS.has(col) && v === "" ? null : v;
  }
  return row;
};

export const rowToAccount = (row: Row): Account => {
  const a = { ...blankAccount(), id: String(row.id) };
  for (const [col, key] of Object.entries(ACCOUNT_COLUMNS)) {
    const v = row[col];
    if (v == null) {
      if (ACCOUNT_DATE_COLS.has(col)) (a as unknown as Record<string, unknown>)[key] = "";
    } else {
      (a as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return a;
};

/* ----------------------------- supplier ---------------------------------- */

const SUPPLIER_COLUMNS: Record<string, keyof Supplier> = {
  name: "name", status: "status", platform: "platform", lead_time: "leadTime",
  moq: "moq", contact: "contact", golden_samples: "goldenSamples", notes: "notes",
};

export const supplierToRow = (s: Supplier, ownerId: string): Row => {
  const row: Row = { id: s.id, owner_id: ownerId };
  for (const [col, key] of Object.entries(SUPPLIER_COLUMNS)) row[col] = s[key];
  return row;
};

export const rowToSupplier = (row: Row): Supplier => {
  const s = { ...blankSupplier(), id: String(row.id) };
  for (const [col, key] of Object.entries(SUPPLIER_COLUMNS)) {
    if (row[col] != null) (s as unknown as Record<string, unknown>)[key] = row[col];
  }
  return s;
};

/* ------------------------------- task ------------------------------------ */

export const taskToRow = (t: Task, ownerId: string): Row => ({
  id: t.id,
  owner_id: ownerId,
  title: t.title,
  due: t.due === "" ? null : t.due,
  done: t.done,
  link_type: t.linkType,
  link_id: t.linkId,
  source: t.source,
});

export const rowToTask = (row: Row): Task => ({
  ...blankTask(),
  id: String(row.id),
  title: (row.title as string) ?? "",
  due: (row.due as string) ?? "",
  done: Boolean(row.done),
  linkType: (row.link_type as string) ?? "",
  linkId: (row.link_id as string) ?? "",
  source: (row.source as string) ?? "manual",
});

/* ----------------------------- expense ----------------------------------- */
// Domain expenses are an unkeyed array; rows need an id, so we mint one on write
// and drop it on read.

export const expensesToRows = (expenses: Expense[], ownerId: string): Row[] =>
  expenses.map((e) => ({ id: rid("e"), owner_id: ownerId, label: e.label, amount: e.amount }));

export const rowToExpense = (row: Row): Expense => ({
  label: (row.label as string) ?? "",
  amount: (row.amount as string) ?? "",
});

/* ----------------------------- company ----------------------------------- */

export const companyToRow = (c: Company, ownerId: string): Row => ({
  id: "company",
  owner_id: ownerId,
  brand: c.brand,
  fx: c.fx,
  deposit: c.deposit,
  lot_fail: c.lotFail,
  rework: c.rework,
  window: c.window,
  buffer_weeks: c.bufferWeeks,
  weekly_outreach: c.weeklyOutreach,
  monthly_revenue: c.monthlyRevenue,
  migrated: c.migrated,
});

export const rowToCompany = (row: Row): Company => ({
  ...blankCompany(),
  brand: (row.brand as string) ?? "Artymer",
  fx: (row.fx as Company["fx"]) ?? blankCompany().fx,
  deposit: (row.deposit as string) ?? "",
  lotFail: (row.lot_fail as string) ?? "",
  rework: (row.rework as string) ?? "",
  window: (row.window as string) ?? "",
  bufferWeeks: (row.buffer_weeks as string) ?? "",
  weeklyOutreach: (row.weekly_outreach as string) ?? "",
  monthlyRevenue: (row.monthly_revenue as string) ?? "",
  migrated: Boolean(row.migrated),
});
