/**
 * Onboarding journey smoke — Phase 3 GM wizard (mock adapter, :5173).
 *
 * Run:
 *   deno task smoke-onboarding-journey
 *   SMOKE_BASE_URL=http://127.0.0.1:5173 deno task smoke-onboarding-journey
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, firefox } from "npm:playwright@^1.61.0";
import {
  attachConsoleCollector,
  createRecorder,
  isBenignConsoleError,
  SMOKE_OUT_DIR,
  summarizeAndExit,
  type SmokeResult,
} from "./smoke-utils.ts";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:5173";
const PLAYER_NAME = `OJ Smoke ${Date.now()}`;

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
    // ── Resume demo GM ────────────────────────────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Resume as Peter Tubak/i }).click();
    await page.waitForURL(/\/gamemaker\/sess_mmt2026/);
    await page.waitForSelector('[data-testid="gamemaker-home-page"]');
    record(
      "Demo GM home loads",
      await page.getByTestId("gm-players-tab").isVisible(),
    );

    record(
      "Legacy Add player CTA absent",
      await page.getByTestId("add-player-btn").count() === 0,
    );
    record(
      "New onboarding journey CTA present",
      await page.getByTestId("new-onboarding-journey-btn").isVisible(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-00-gm-home.png"),
      fullPage: true,
    });

    // ── Wizard step 1 — player name ───────────────────────────────────────
    await page.getByTestId("new-onboarding-journey-btn").click();
    await page.waitForSelector('[data-testid="onboarding-journey-modal"]');
    record(
      "Wizard step 1 visible",
      await page.getByTestId("oj-step-name").isVisible(),
    );
    await page.getByTestId("oj-player-name-input").fill(PLAYER_NAME);
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-01-step-name.png"),
      fullPage: true,
    });
    await page.getByTestId("oj-continue-btn").click();

    // ── Wizard step 2 — buddy ───────────────────────────────────────────────
    await page.waitForSelector('[data-testid="oj-step-buddy"]');
    const marcusOption = page.locator('[data-testid^="oj-buddy-option-"]').first();
    record(
      "Existing buddy options seeded",
      await marcusOption.isVisible(),
    );
    await marcusOption.click();
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-02-step-buddy.png"),
      fullPage: true,
    });
    await page.getByTestId("oj-continue-btn").click();

    // ── Wizard step 3 — template ──────────────────────────────────────────
    await page.waitForSelector('[data-testid="oj-step-template"]');
    await page.getByTestId("oj-template-scratch").click();
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-03-step-template.png"),
      fullPage: true,
    });
    await page.getByTestId("oj-create-journey-btn").click();

    // ── Player detail — Customize tab ─────────────────────────────────────
    await page.waitForURL(/\/gamemaker\/sess_mmt2026\/player\/[^/?]+/);
    const onPlayerDetail = /\/gamemaker\/sess_mmt2026\/player\//.test(
      page.url(),
    );
    record("Redirect to player detail", onPlayerDetail, page.url());

    await page.waitForSelector('[data-testid="player-detail-page"]');
    const customizeTab = page.getByTestId("player-detail-tab-customize");
    record(
      "Customize tab active",
      await customizeTab.getAttribute("aria-selected") === "true",
    );
    record(
      "Analytics tab hidden for invited player",
      await page.getByTestId("player-detail-tab-analytics").count() === 0,
    );
    record(
      "Invite accordion pinned open",
      await page.getByTestId("player-invite-body").isVisible(),
    );
    record(
      "Customize template section visible",
      await page.getByTestId("template-select").isVisible(),
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-04-player-customize.png"),
      fullPage: true,
    });

    // ── GM home — new player pending (SPA nav keeps mock state) ───────────
    await page.locator(".player-detail__header-btn").first().click();
    await page.waitForURL(/\/gamemaker\/sess_mmt2026\/?$/);
    const pendingCard = page.getByTestId("gm-player-card").filter({
      hasText: PLAYER_NAME,
    });
    record(
      "New player listed as pending",
      await pendingCard.first().isVisible(),
      PLAYER_NAME,
    );
    await page.screenshot({
      path: join(SMOKE_OUT_DIR, "oj-05-gm-pending-player.png"),
      fullPage: true,
    });

    const badConsole = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      badConsole.length === 0,
      badConsole.slice(0, 3).join(" | "),
    );
  } finally {
    await browser.close();
  }

  summarizeAndExit(results, "Phase 4 onboarding journey smoke");
};

main().catch((e) => {
  console.error(e);
  Deno.exit(1);
});
