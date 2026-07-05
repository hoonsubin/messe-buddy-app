/**
 * Landing smoke test — Firefox + iPhone 15 (matches Playwright MCP config).
 *
 * Covers the profile-list landing (inline Employee/Admin forms, demo profiles).
 * Uses the mock adapter — no Docker required.
 *
 * Run:
 *   deno task smoke-landing
 *   SMOKE_BASE_URL=http://localhost:5173 deno task smoke-landing
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, firefox } from "npm:playwright@^1.61.0";
import {
  attachConsoleCollector,
  createRecorder,
  dismissTutorialIfPresent,
  isBenignConsoleError,
  SMOKE_OUT_DIR,
  summarizeAndExit,
  type SmokeResult,
} from "./smoke-utils.ts";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:5173";

const results: SmokeResult[] = [];
const record = createRecorder(results);

const main = async () => {
  await mkdir(SMOKE_OUT_DIR, { recursive: true });

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 15"] });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  attachConsoleCollector(page, consoleErrors);

  try {
    // ── Landing shell ─────────────────────────────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="landing-page"]');
    const brand = await page.locator(".landing__brand-name").textContent();
    record(
      "Landing loads",
      brand?.includes("MesseBuddy") ?? false,
      brand ?? "",
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "01-landing-profiles.png"),
      fullPage: true,
    });

    record(
      "Demo profiles seeded",
      await page.getByRole("button", { name: /Resume as Sofia Chen/i })
        .isVisible(),
    );

    // ── Inline Employee form ──────────────────────────────────────────────
    await page.getByRole("button", { name: "Employee", exact: true }).click();
    await page.waitForSelector("#lp-session-code", { timeout: 5000 });
    record(
      "Employee form opens",
      await page.locator("#lp-session-code").isVisible(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "02-landing-employee-form.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Close", exact: true }).click();
    record(
      "Employee form closes",
      !(await page.locator("#lp-session-code").isVisible()),
    );

    // ── Inline Admin form ─────────────────────────────────────────────────
    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await page.waitForSelector("#lp-session-name", { timeout: 5000 });
    record(
      "Admin form opens",
      await page.locator("#lp-session-name").isVisible(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "03-landing-admin-form.png"),
      fullPage: true,
    });

    // ── Invite URL prefill (/join/:sessionId) ───────────────────────────
    await page.goto(`${BASE}/join/sess_mmt2026`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector('[data-testid="landing-page"]');
    await page.getByRole("button", { name: "Employee", exact: true }).click();
    await page.waitForSelector("#lp-session-code", { timeout: 5000 });
    const prefilled = await page.inputValue("#lp-session-code");
    record(
      "Invite link prefills session code",
      prefilled === "sess_mmt2026",
      `value="${prefilled}"`,
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "04-landing-join-prefill.png"),
      fullPage: true,
    });

    // ── Demo player cockpit ───────────────────────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Resume as Sofia Chen/i }).click();
    await page.waitForURL(/\/session\//, { timeout: 10000 });
    await page.waitForSelector('[data-testid="player-cockpit-page"]', {
      timeout: 10000,
    });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 8000 });
    await dismissTutorialIfPresent(page);
    record(
      "Demo player navigates to cockpit",
      page.url().includes("/session/"),
      page.url(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "05-player-cockpit.png"),
      fullPage: true,
    });

    // ── Demo admin home ───────────────────────────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Resume as Peter Tubak/i }).click();
    await page.waitForURL(/\/gamemaker\//, { timeout: 10000 });
    await page.waitForSelector('[data-testid="gamemaker-home-page"]', {
      timeout: 10000,
    });
    record(
      "Demo Game Maker navigates to player list",
      page.url().includes("/gamemaker/"),
      page.url(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "06-gamemaker-home.png"),
      fullPage: true,
    });

    const bad = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      bad.length === 0,
      bad.join("; ") || "clean",
    );
  } finally {
    await context.close();
    await browser.close();
  }

  summarizeAndExit(results, "Landing smoke");
};

await main();
