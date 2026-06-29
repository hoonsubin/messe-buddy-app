/**
 * PocketBase E2E smoke — Firefox + iPhone 15 against Docker app.
 *
 * GM creates a session via inline Admin form → player joins via Employee form.
 *
 * Run:
 *   SMOKE_BASE_URL=https://localhost deno task smoke-e2e
 *
 * Prerequisites: docker compose up --build (app service healthy on :443)
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, firefox } from "npm:playwright@^1.61.0";
import {
  attachConsoleCollector,
  createRecorder,
  dismissRecoveryIfPresent,
  dismissTutorialIfPresent,
  isBenignConsoleError,
  SMOKE_OUT_DIR,
  summarizeAndExit,
  type SmokeResult,
} from "./smoke-utils.ts";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "https://localhost";

const results: SmokeResult[] = [];
const record = createRecorder(results);

const main = async () => {
  await mkdir(SMOKE_OUT_DIR, { recursive: true });

  const browser = await firefox.launch({ headless: true });
  const device = devices["iPhone 15"];

  const gmContext = await browser.newContext({
    ...device,
    ignoreHTTPSErrors: true,
  });
  const playerContext = await browser.newContext({
    ...device,
    ignoreHTTPSErrors: true,
  });

  const gmPage = await gmContext.newPage();
  const playerPage = await playerContext.newPage();

  const consoleErrors: string[] = [];
  attachConsoleCollector(gmPage, consoleErrors);
  attachConsoleCollector(playerPage, consoleErrors);

  try {
    // ── SMOKE-01: GM creates session ───────────────────────────────────────
    await gmPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await gmPage.waitForSelector('[data-testid="landing-page"]');

    await gmPage.getByRole("button", { name: "Admin", exact: true }).click();
    await gmPage.waitForSelector("#lp-session-name", { timeout: 5000 });
    await gmPage.locator("#lp-session-name").fill("E2E Smoke Test");
    await gmPage.locator("#lp-admin-name").fill("Smoke GM");
    await gmPage.getByRole("button", { name: "Create & save profile" }).click();

    try {
      await gmPage.waitForURL(/\/admin\//, { timeout: 20000 });
    } catch {
      const errText = await gmPage.locator(".form-error").textContent().catch(
        () => "",
      );
      await gmPage.screenshot({
        path: join(SMOKE_OUT_DIR, "e2e-fail-gm-create.png"),
        fullPage: true,
      });
      record(
        "SMOKE-01 GM session create",
        false,
        `no navigation; error=${errText || "none"}; url=${gmPage.url()}`,
      );
      throw new Error("GM session create failed");
    }

    await gmPage.waitForSelector('[data-testid="admin-home-page"]', {
      timeout: 15000,
    });

    const sessionId = gmPage.url().split("/admin/")[1]?.split(/[?#]/)[0] ?? "";
    record(
      "SMOKE-01 GM session create",
      sessionId.length >= 10,
      `sessionId=${sessionId}`,
    );
    await gmPage.screenshot({
      path: join(SMOKE_OUT_DIR, "e2e-01-admin-home.png"),
      fullPage: true,
    });

    // ── SMOKE-01: Player joins (2-step employee form) ──────────────────────
    await playerPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await playerPage.getByRole("button", { name: "Employee", exact: true })
      .click();
    await playerPage.waitForSelector("#lp-session-code", { timeout: 5000 });
    await playerPage.locator("#lp-session-code").fill(sessionId);
    await playerPage.getByRole("button", { name: "Verify session" }).click();
    await playerPage.waitForSelector("#lp-player-name", { timeout: 10000 });
    await playerPage.locator("#lp-player-name").fill("Smoke Player");
    await playerPage.getByRole("button", { name: "Join & save profile" })
      .click();
    await dismissRecoveryIfPresent(playerPage);
    await playerPage.waitForURL(/\/session\//, { timeout: 15000 });
    await playerPage.waitForSelector('[data-testid="player-cockpit-page"]', {
      timeout: 15000,
    });
    await playerPage.waitForSelector('[data-testid="topbar"]', {
      timeout: 15000,
    });
    await dismissTutorialIfPresent(playerPage);

    record(
      "SMOKE-01 Player join",
      playerPage.url().includes(`/session/${sessionId}`),
      playerPage.url(),
    );
    await playerPage.screenshot({
      path: join(SMOKE_OUT_DIR, "e2e-02-player-cockpit.png"),
      fullPage: true,
    });

    // ── Persistence: reload both contexts ──────────────────────────────────
    await gmPage.reload({ waitUntil: "networkidle" });
    await gmPage.waitForSelector('[data-testid="admin-home-page"]', {
      timeout: 15000,
    });
    record(
      "SMOKE-01 GM reload persists",
      gmPage.url().includes(`/admin/${sessionId}`),
    );

    await playerPage.reload({ waitUntil: "networkidle" });
    await playerPage.waitForSelector('[data-testid="topbar"]', {
      timeout: 15000,
    });
    record(
      "SMOKE-01 Player reload persists",
      playerPage.url().includes(`/session/${sessionId}`),
    );

    record(
      "SMOKE-02 Admin home reachable after create",
      await gmPage.locator('[data-testid="admin-home-page"]').isVisible(),
    );

    const bad = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      bad.length === 0,
      bad.join("; ") || "clean",
    );
  } finally {
    await gmContext.close();
    await playerContext.close();
    await browser.close();
  }

  summarizeAndExit(results, "E2E smoke");
};

await main();
