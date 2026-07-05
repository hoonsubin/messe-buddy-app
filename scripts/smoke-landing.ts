/**
 * Landing smoke test — Firefox + iPhone 15 (matches Playwright MCP config).
 *
 * Covers the profile-list landing (workspace form, demo profiles) and
 * /join invite claim. Uses the mock adapter — no Docker required.
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

    record(
      "Legacy Employee toggle absent",
      await page.getByRole("button", { name: "Employee", exact: true }).count() ===
        0,
    );
    record(
      "Legacy Game Maker toggle absent",
      await page.getByRole("button", { name: "Game Maker", exact: true }).count() ===
        0,
    );

    // ── New onboarding journey → workspace form ─────────────────────────
    await page.getByTestId("landing-new-journey-btn").click();
    await page.waitForSelector('[data-testid="landing-workspace-form"]', {
      timeout: 5000,
    });
    record(
      "Workspace form opens",
      await page.locator("#lp-session-name").isVisible(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "02-landing-workspace-form.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Close", exact: true }).click();
    record(
      "Workspace form closes",
      !(await page.locator('[data-testid="landing-workspace-form"]').isVisible()),
    );

    // ── Invite URL claim (/join/:sessionId?t=) ────────────────────────────
    await page.goto(`${BASE}/join/sess_mmt2026?t=invite_sofia_mmt2026`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector('[data-testid="join-page"]');
    await page.waitForSelector('[data-testid="join-claim-form"]', {
      timeout: 10000,
    });
    record(
      "Join page shows claim form without landing CTA",
      await page.getByTestId("landing-new-journey-btn").count() === 0,
    );
    record(
      "Invite link advances to name step",
      await page.locator("#lp-player-name").isVisible(),
    );
    const verified = await page.locator(".landing-form-panel__verified")
      .textContent();
    record(
      "Invite verified for session",
      verified?.includes("sess_mmt2026") ?? false,
      verified ?? "",
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "03-join-claim-form.png"),
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
      path: join(SMOKE_OUT_DIR, "04-player-cockpit.png"),
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
    record(
      "GM home has player cards",
      await page.locator('[data-testid="gm-player-card"]').count() >= 2,
    );

    await page.getByTestId("gm-home-tab-library").click();
    await page.waitForSelector('[data-testid="resource-library-tab"]', {
      timeout: 10000,
    });
    const libCards = await page.locator('[data-testid="library-resource-card"]')
      .count();
    record(
      "Resource library tab lists catalog",
      libCards >= 7,
      `cards=${libCards}`,
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "06-gamemaker-library.png"),
      fullPage: true,
    });

    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "05-gamemaker-home.png"),
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
