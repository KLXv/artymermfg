// Autonomous UI screenshot harness.
//
// Drives the built app in headless Chromium, loads the demo workspace so every
// screen is populated, suppresses the one-time intro splash, and captures each
// route at desktop + phone widths. One shared browser context keeps the seeded
// localStorage across every shot. No human screenshots required.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:4173";
const OUT = process.env.SHOTS_OUT || "/tmp/shots";
mkdirSync(OUT, { recursive: true });

// Every page worth auditing. Seed IDs come from src/data/seed.ts.
const ROUTES = [
  ["deck", "/"],
  ["pipeline", "/pipeline"],
  ["projects", "/projects"],
  ["project-detail", "/projects/seed_prj1"],
  ["clients", "/clients"],
  ["client-detail", "/clients/seed_acc1"],
  ["suppliers", "/suppliers"],
  ["tasks", "/tasks"],
  ["money", "/money"],
  ["invoices", "/invoices"],
  ["marketing", "/marketing"],
  ["strategy", "/strategy"],
  ["guide", "/guide"],
  ["settings", "/settings"],
];
const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["phone", 390, 844],
];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const context = await browser.newContext({ deviceScaleFactor: 2 });
// Never show the cinematic intro during captures.
await context.addInitScript(() => window.sessionStorage.setItem("artymer:intro", "1"));

const page = await context.newPage();
page.on("dialog", (d) => d.accept()); // auto-confirm the "Load demo data?" prompt

// Seed the workspace once via the real Settings action.
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
const demo = page.getByText(/load demo data/i).first();
if (await demo.count()) {
  await demo.click();
  await page.waitForTimeout(600);
  console.log("demo data loaded");
} else {
  console.log("WARN: demo button not found");
}

for (const [vname, w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h });
  for (const [rname, path] of ROUTES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600); // let entrance animations settle
    await page.screenshot({ path: `${OUT}/${rname}-${vname}.png`, fullPage: vname === "desktop" });
    console.log("shot", `${rname}-${vname}`);
  }
}

await browser.close();
console.log("done");
