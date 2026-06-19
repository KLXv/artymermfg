/**
 * Demo seed — one complete workspace snapshot for first-run orientation.
 * IDs are stable so loading the seed twice is idempotent (import merges by id).
 */
import type { Account, Project, Supplier, Task } from "@/domain";
import { blankCompany } from "@/domain";
import type { Backup } from "@/domain/migrate";

const SUP = "seed_sup1";
const ACC = "seed_acc1";
const PRJ = "seed_prj1";

const supplier: Supplier = {
  id: SUP,
  name: "Tianjin Shengda Watch Parts",
  status: "Primary",
  platform: "Direct",
  leadTime: "90",
  moq: "30",
  contact: "David Chen · david@shengda-watch.com",
  goldenSamples: "2",
  notes: "Reliable brass-case supplier. Good surface finish on brushed lugs. Lead time extends 90–120 days in Q3–Q4.",
};

const account: Account = {
  id: ACC,
  name: "Hartmann & Sohn GmbH",
  type: "Company",
  servicePath: "Commission",
  status: "active",
  market: "EU",
  contactName: "Felix Hartmann",
  contactRole: "CEO",
  email: "f.hartmann@hartmann-uhren.de",
  phone: "+49 89 4521 1830",
  source: "Trade show · Baselworld 2024",
  notes: "Second-generation family business in Munich. 50th-anniversary signature piece.",
  testimonial: "",
  lastContact: "2026-05-28",
  nextAction: "Send updated sample-approval form",
  nextDate: "2026-07-10",
};

const project: Project = {
  id: PRJ,
  schemaV: 2,
  accountId: ACC,
  name: "The Navigant",
  servicePath: "Commission",
  stage: "First-off",
  lost: false,
  supplierId: SUP,

  qty: "50",
  unitPrice: "210",
  currency: "EUR",
  deadline: "2026-09-15",
  depositExpected: "2026-04-01",
  balanceExpected: "2026-08-20",
  rev: "2.1",
  maker: "Artymer",

  deposit: "30",
  lotFail: "5",
  rework: "2",
  window: "7",

  caseRef: "STC-4012",
  caseMat: "316L",
  caseDia: "40.0",
  caseDiaT: "0.10",
  l2l: "48.5",
  thick: "11.8",
  lugW: "20",
  caseFin: "Brushed flanks, polished bezel",
  wr: "5 ATM",

  cal: "NH35A",
  calFn: "3-hand + date",
  acc: "±10",
  accUnit: "day",
  handRef: "H-201",
  handLen: "Hour 9.0 / minute 11.5 mm",
  handFin: "Polished, rhodium-plated",
  lume: "BGW9",

  crysMat: "Sapphire",
  crysShape: "Flat",
  ar: "Inner + outer",
  crysDia: "34.5",
  crysDiaT: "0.10",
  crown: "Screw-down, signed",
  back: "Solid, laser-engraved",
  strap: "Black calf leather, 20/18 mm",

  dialMat: "Brass",
  dialDia: "34.0",
  dialDiaT: "0.10",
  dialThk: "0.40",
  dialThkT: "0.05",
  feet: "6 × 0.8 mm",

  tex: "Sunburst",
  texDepth: "",
  texDepthT: "0.02",
  gloss: "Semi-gloss lacquer",
  print: "Screen print",
  reg: "0.10",

  marker: "Applied / appliqué",
  markerPos: "0.15",
  markerAtt: "Pressed",
  date: "none",

  colors: [{ name: "Midnight Navy", ref: "PMS 289 C" }],

  engLoc: "Caseback",
  engTxt: "Hartmann & Sohn · No. [XX]/50",
  engMethod: "Laser",
  engDepth: "0.08",

  center: "0.10",
  align: "0.25",
  clear: "0.10",
  bezel: "0.10",
  wrTest: "5 ATM static, 30 s hold, no ingress",
  clean: "no particle ≥ 0.05 mm under crystal at 10×",
  lumeStd: "even coat, no pooling under 10×",

  pieceName: "The Navigant",
  edition: "First Edition · 50 pieces",
  story:
    "Commissioned by Hartmann & Sohn as the anchor piece for their 50th-anniversary catalogue. A tool-watch silhouette with a sunburst navy dial and broad-arrow hands — direct, purposeful, unadorned.",
  highlights:
    "Sapphire crystal with dual AR · NH35A · 50-piece limited run · laser-engraved serial caseback",
  lang: "EN",

  images: { hero: "", dial: "", caseImg: "", back: "", clientLogo: "", movementImg: "" },
  files: { movementSpec: "", engravingVector: "" },

  tooling: "1200",
  cMovement: "28",
  cCase: "38",
  cDial: "14",
  cHands: "8",
  cCrystal: "6",
  cStrap: "7",
  cAssembly: "12",
  cPack: "4",
  cShip: "3",
  cDuty: "8",
  cOther: "2",
  feePct: "2.5",

  depositPaid: true,
  depositDate: "2026-04-03",
  balancePaid: false,
  balanceDate: "",
  qc: { received: false, results: {}, signed: false, signedDate: "", disabled: [] },
};

const tasks: Task[] = [
  {
    id: "seed_t1",
    title: "Send production brief to Shengda",
    due: "2026-03-20",
    done: true,
    linkType: "project",
    linkId: PRJ,
    source: "manual",
  },
  {
    id: "seed_t2",
    title: "Review first-off sample photos from supplier",
    due: "2026-07-05",
    done: false,
    linkType: "project",
    linkId: PRJ,
    source: "manual",
  },
  {
    id: "seed_t3",
    title: "Confirm engraving text with Felix Hartmann",
    due: "2026-07-12",
    done: false,
    linkType: "project",
    linkId: PRJ,
    source: "manual",
  },
];

export const SEED_BACKUP: Backup = {
  artymer: "cockpit-backup",
  schema: 3,
  exported: "2026-06-19",
  accounts: { [ACC]: account },
  projects: { [PRJ]: project },
  suppliers: { [SUP]: supplier },
  tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
  expenses: [],
  company: { ...blankCompany(), migrated: true },
};
