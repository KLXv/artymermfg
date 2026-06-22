/**
 * Entity model — the single source of truth.
 *
 * These types are a faithful port of the entity factories in the original
 * ArtymerCockpit.jsx. The domain layer operates on this flat shape (the
 * document generators index directly into `Project.caseRef`, `Project.qty`,
 * etc.), exactly as the original did. The relational/JSONB split for Supabase
 * lives in the data/repo mapping layer, not here — so this logic stays a
 * behaviour-preserving port.
 *
 * Most fields are strings: the cockpit stores raw input values and coerces
 * with `num()` at the point of calculation, never on entry. That is
 * deliberate and preserved.
 */

export type ServicePath = "Commission" | "Private label";
export type AccountStatus = "prospect" | "active" | "dormant" | "lost";
export type Market = "RO" | "HU" | "EU" | "Other";
export type Lang = "EN" | "HU" | "RO";
export type SupplierStatus = "Primary" | "Backup" | "Warming" | "Retired";

/** Legal identity used on invoices (Romanian fiscal fields). */
export interface FiscalIdentity {
  legalName: string; // registered entity name
  taxId: string; // CUI / CIF
  regNo: string; // Reg. Com. (trade registry no.)
  address: string; // registered address (multi-line)
  iban: string;
  bank: string;
  vatRegistered: boolean; // plătitor de TVA
  vatRate: string; // default TVA %, e.g. "19"
  series: string; // invoice series, e.g. "ART"
}

/** One line on an invoice. */
export interface InvoiceLine {
  desc: string;
  qty: string;
  unitPrice: string;
  vat: string; // VAT rate %, per line
}

/** A frozen copy of a party's details at the moment of issue. */
export interface PartySnapshot {
  name: string;
  taxId: string;
  regNo: string;
  address: string;
  email: string;
}

export interface Invoice {
  id: string;
  kind: string; // "Factură" | "Proformă" | "Chitanță"
  series: string;
  number: string; // assigned on issue (e.g. "0007"); blank while draft
  status: string; // "draft" | "issued" | "paid"
  accountId: string;
  projectId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate: string;
  lines: InvoiceLine[];
  notes: string;
  buyer: PartySnapshot; // snapshot at issue
  seller: PartySnapshot; // snapshot at issue
}

export interface Company {
  id: "company";
  migrated: boolean;
  brand: string;
  logo: string; // brand logo URL (shown on the factory-doc letterhead)
  letterhead: string; // free-text contact block under the brand name on docs
  baseCurrency: string; // the home currency every figure is kept + shown in (e.g. RON)
  fiscal: FiscalIdentity; // legal identity for invoices
  fx: { RON: number; USD: number } & Record<string, number>;
  deposit: string;
  lotFail: string;
  rework: string;
  window: string;
  bufferWeeks: string;
  weeklyOutreach: string;
  monthlyRevenue: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  servicePath: ServicePath;
  status: AccountStatus;
  market: Market;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
  testimonial: string;
  lastContact: string;
  nextAction: string;
  nextDate: string;
}

export interface Supplier {
  id: string;
  name: string;
  status: SupplierStatus;
  platform: string;
  leadTime: string;
  moq: string;
  contact: string;
  goldenSamples: string;
  notes: string;
  // ranking attributes (1–5; price 5 = most competitive)
  quality: string;
  communication: string;
  price: string;
  capabilities: string; // comma-separated tags: dials, cases, engraving…
}

export interface Task {
  id: string;
  title: string;
  due: string;
  done: boolean;
  linkType: string;
  linkId: string;
  source: string;
}

export interface Expense {
  label: string;
  amount: string;
}

/** A marketing content / campaign item on the calendar. */
export interface ContentItem {
  id: string;
  title: string;
  channel: string; // Instagram, TikTok, Email, Outreach, Website, Press, Other
  status: string; // idea | drafting | scheduled | posted
  date: string; // scheduled / posted date (YYYY-MM-DD)
  link: string; // URL to the post or asset
  notes: string;
  projectId: string; // optional: the piece this features
}

export interface DialColor {
  name: string;
  ref: string;
}

export interface ProjectImages {
  hero: string;
  dial: string;
  caseImg: string;
  back: string;
  clientLogo: string;
  movementImg: string;
}

export interface ProjectFiles {
  movementSpec: string;
  engravingVector: string;
}

export interface QcUnitResult {
  [checkId: string]: "pass" | "fail" | "";
}

/** First-off / golden-sample approval — the gate before full production. */
export interface SampleApproval {
  decision: "" | "approved" | "revise";
  date: string;
  reviewer: string;
  notes: string;
  media: string; // link to the QC video / photos the factory sent
}

export interface ProjectQc {
  received: boolean;
  results: Record<string | number, QcUnitResult>;
  signed: boolean;
  signedDate: string;
  /** Check ids switched off for this project (excluded from the verdict). */
  disabled?: string[];
  /** First-off sample sign-off, reviewed from the factory's media. */
  sample?: SampleApproval;
}

export interface Project {
  id: string;
  schemaV: number;
  accountId: string;
  name: string;
  servicePath: ServicePath | "";
  stage: string;
  lost: boolean;
  supplierId: string;

  qty: string;
  unitPrice: string;
  currency: string;
  deadline: string;
  depositExpected: string;
  balanceExpected: string;
  rev: string;
  maker: string;

  // commercial overrides (blank = inherit from Company)
  deposit: string;
  lotFail: string;
  rework: string;
  window: string;

  // selected build — case
  caseRef: string;
  caseMat: string;
  caseDia: string;
  caseDiaT: string;
  l2l: string;
  thick: string;
  lugW: string;
  caseFin: string;
  wr: string;
  caseNote: string; // free-text notes for the factory (case)

  // movement
  cal: string;
  calFn: string;
  acc: string;
  accUnit: string; // "day" | "month" — the accuracy window
  handRef: string;
  handLen: string;
  handFin: string;
  lume: string;
  movementNote: string; // free-text notes (movement / hands)

  // crystal
  crysMat: string;
  crysShape: string;
  ar: string;
  crysDia: string;
  crysDiaT: string;
  crown: string;
  back: string;
  strap: string;
  crystalNote: string; // free-text notes (crystal & exterior)

  // dial
  dialMat: string;
  dialDia: string;
  dialDiaT: string;
  dialThk: string;
  dialThkT: string;
  feet: string;

  // texture / print
  tex: string;
  texDepth: string;
  texDepthT: string;
  gloss: string;
  print: string;
  reg: string;

  // markers / date
  marker: string;
  markerPos: string;
  markerAtt: string;
  date: string;
  dialGrad: string; // "Solid" | "Fumé" | "Gradient" — how the dial colours render
  dialNote: string; // free-text notes (dial)

  colors: DialColor[];

  // engraving
  engLoc: string;
  engTxt: string;
  engMethod: string;
  engDepth: string;
  engNote: string; // free-text notes (engraving)

  // finished-watch tolerances
  center: string;
  align: string;
  clear: string;
  bezel: string;
  wrTest: string;
  clean: string;
  lumeStd: string;

  // presentation (dossier + certificate)
  pieceName: string;
  edition: string;
  story: string;
  highlights: string;
  lang: Lang;
  images: ProjectImages;
  files: ProjectFiles;

  // costs (per-unit material lines + one-off tooling + channel fee %)
  tooling: string;
  cMovement: string;
  cCase: string;
  cDial: string;
  cHands: string;
  cCrystal: string;
  cStrap: string;
  cAssembly: string;
  cPack: string;
  cShip: string;
  cDuty: string;
  cOther: string;
  feePct: string; // payment-channel fee %, applied to the sale price

  // payment + qc
  depositPaid: boolean;
  depositDate: string;
  balancePaid: boolean;
  balanceDate: string;
  qc: ProjectQc;
}

/** Convenience bundle of the full workspace state for derivation functions. */
export interface CockpitState {
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  suppliers: Record<string, Supplier>;
  tasks: Record<string, Task>;
  expenses: Expense[];
  company: Company;
}
