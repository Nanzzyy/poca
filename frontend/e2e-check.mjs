import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const API = "http://localhost:8000/api/v1";

const realErrors = [];
const addErr = (src, msg) => realErrors.push({ src, msg: String(msg).slice(0, 400) });

async function newCtx(browser, token) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript((t) => {
    try { if (t) window.localStorage.setItem("auth_token", t); } catch (e) {}
  }, token);
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") addErr(page.url(), "CONSOLE " + m.text()); });
  page.on("pageerror", (e) => addErr(page.url(), "PAGEERROR " + e.message));
  page.on("response", (r) => {
    if (r.url().includes("/api/v1") && r.status() >= 500) addErr(page.url(), "API5xx " + r.status() + " " + r.url().slice(0, 120));
  });
  return { page, context };
}

async function load(browser, token, path) {
  const { page, context } = await newCtx(browser, token);
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 }).catch((e) => addErr(path, "GOTO " + e.message));
  await page.waitForTimeout(1500);
  return { page, context };
}

const ROUTES = [
  "/", "/search", "/search?category=pantai", "/search?q=bali", "/map", "/feed",
  "/chat", "/chat?example=1", "/notifications", "/profile", "/profile/edit", "/trips",
];

(async () => {
  let token = null;
  try {
    const r = await fetch(API + "/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@poca.app", password: "Demo1234!" }),
    });
    token = (await r.json()).access_token;
    console.log("token len", token?.length);
  } catch (e) { console.log("LOGIN FAILED", e.message); }

  const browser = await chromium.launch({ headless: true });

  // ---- RENDER SCAN ----
  const before = realErrors.length;
  for (const r of ROUTES) {
    const { page, context } = await load(browser, token, r);
    const title = await page.title().catch(() => "?");
    const body = (await page.content()).length;
    console.log(`render ${r.padEnd(28)} ok bytes=${body}`);
    await context.close();
  }
  console.log(`\nrender-scan errors: ${realErrors.length - before}`);

  // ---- INTERACTIONS (best-effort; only pageerror/console counts as real bug) ----
  const interact = async (label, path, fn) => {
    const start = realErrors.length;
    const { page, context } = await load(browser, token, path);
    try { await fn(page); }
    catch (e) { console.log(`  step ${label}: MISS (${e.message.split("\n")[0].slice(0, 70)})`); }
    await page.waitForTimeout(600);
    const delta = realErrors.length - start;
    if (delta > 0) console.log(`  ⚠ ${label}: +${delta} real errors`);
    else console.log(`  ✓ ${label}: clean`);
    await context.close();
  };

  await interact("home:like", "/", async (p) => {
    await p.locator('button:has(svg.lucide-heart)').first().click({ timeout: 5000 });
  });
  await interact("home:card→detail", "/", async (p) => {
    await p.locator('[onclick], div').filter({ has: p.locator('svg.lucide-mappin') }).first().click({ timeout: 5000 });
  });
  await interact("home:contoh-plan", "/", async (p) => {
    await p.getByText("Lihat Contoh Plan").click({ timeout: 5000 });
    await p.waitForTimeout(1500);
  });
  await interact("search:filter", "/search", async (p) => {
    await p.locator("select").nth(1).selectOption({ index: 1 });
    await p.waitForTimeout(800);
  });
  await interact("search:semua-reco", "/search", async (p) => {
    await p.getByText("Lihat Semua Rekomendasi").click({ timeout: 5000 });
    await p.waitForTimeout(500);
  });
  await interact("detail:save+gallery", "/", async (p) => {
    await p.locator('a, div').filter({ hasText: /Destinasi Populer/ }).scrollIntoViewIfNeeded({ timeout: 5000 });
  });
  await interact("map:search-type", "/map", async (p) => {
    await p.locator('input[placeholder*="Cari destinasi di peta"]').fill("bali");
    await p.waitForTimeout(1200);
  });
  await interact("feed:post", "/feed", async (p) => {
    await p.locator("textarea").first().fill("E2E test post");
    await p.getByRole("button", { name: "Post" }).first().click({ timeout: 5000 });
    await p.waitForTimeout(1200);
  });
  await interact("profile:save", "/profile/edit", async (p) => {
    await p.locator("textarea").first().fill("bio e2e");
    await p.getByRole("button", { name: "Simpan" }).click({ timeout: 5000 });
    await p.waitForTimeout(1000);
  });

  await browser.close();

  console.log("\n========== REAL ERRORS (console/pageerror/api5xx) ==========");
  if (realErrors.length === 0) { console.log("✅ NONE"); return; }
  const seen = new Map();
  for (const e of realErrors) {
    const k = e.msg.slice(0, 100);
    if (!seen.has(k)) seen.set(k, { ...e, n: 0 });
    seen.get(k).n++;
  }
  for (const [, e] of seen) console.log(`\n[${e.n}x] ${e.src}\n  ${e.msg}`);
  console.log("\nraw:", realErrors.length, "unique:", seen.size);
})();
