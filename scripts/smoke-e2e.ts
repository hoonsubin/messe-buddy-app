/**
 * PocketBase E2E smoke — Firefox + iPhone 15 against Docker app.
 * Run: SMOKE_BASE_URL=https://localhost deno run -A --node-modules-dir=auto scripts/smoke-e2e.ts
 *
 * Prerequisites: docker compose up --build (app service healthy on :443)
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, firefox } from "npm:playwright@^1.61.0";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "https://localhost";
const OUT = ".playwright-mcp";

interface Result {
  name: string;
  pass: boolean;
  detail?: string;
}

const results: Result[] = [];

const record = (name: string, pass: boolean, detail = "") => {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? `: ${detail}` : ""}`);
};

const dismissRecoveryIfPresent = async (page: import("npm:playwright@^1.61.0").Page) => {
  const dismiss = page.getByRole("button", {
    name: "I've saved my recovery key",
  });
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
};

const main = async () => {
  await mkdir(OUT, { recursive: true });

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
  for (const page of [gmPage, playerPage]) {
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
  }

  try {
    // ── SMOKE-01: GM creates session ───────────────────────────────────────
    await gmPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await gmPage.waitForSelector('[data-testid="landing-page"]');

    await gmPage.getByRole("button", { name: "Admin", exact: true }).click();
    await gmPage.locator("#lp-session-name").fill("E2E Smoke Test");
    await gmPage.locator("#lp-admin-name").fill("Smoke GM");
    await gmPage.getByRole("button", { name: "Create & save profile" }).click();

    try {
      await gmPage.waitForURL(/\/admin\//, { timeout: 20000 });
    } catch {
      const errText = await gmPage.locator(".form-error, .landing__error")
        .textContent()
        .catch(() => "");
      await gmPage.screenshot({
        path: join(OUT, "e2e-fail-gm-create.png"),
        fullPage: true,
      });
      record(
        "SMOKE-01 GM session create",
        false,
        `no navigation; error=${errText ?? "none"}; url=${gmPage.url()}`,
      );
      throw new Error("GM session create failed");
    }
    await gmPage.waitForSelector('[data-testid="admin-cockpit-page"]', {
      timeout: 15000,
    });

    const sessionId = gmPage.url().split("/admin/")[1]?.split(/[?#]/)[0] ?? "";
    record(
      "SMOKE-01 GM session create",
      sessionId.length >= 10,
      `sessionId=${sessionId}`,
    );
    await gmPage.screenshot({
      path: join(OUT, "e2e-01-gm-cockpit.png"),
      fullPage: true,
    });

    // ── SMOKE-01: Player joins ───────────────────────────────────────────
    await playerPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await playerPage.getByRole("button", { name: "Employee", exact: true })
      .click();
    await playerPage.locator("#lp-session-code").fill(sessionId);
    await playerPage.getByRole("button", { name: "Verify session" }).click();
    await playerPage.locator("#lp-player-name").fill("Smoke Player", {
      timeout: 10000,
    });
    await playerPage.getByRole("button", { name: "Join & save profile" })
      .click();
    await dismissRecoveryIfPresent(playerPage);
    await playerPage.waitForURL(/\/session\//, { timeout: 15000 });
    await playerPage.waitForSelector('[data-testid="topbar"]', {
      timeout: 15000,
    });

    record(
      "SMOKE-01 Player join",
      playerPage.url().includes(`/session/${sessionId}`),
      playerPage.url(),
    );
    await playerPage.screenshot({
      path: join(OUT, "e2e-02-player-cockpit.png"),
      fullPage: true,
    });

    // ── Persistence: reload both contexts ──────────────────────────────────
    await gmPage.reload({ waitUntil: "networkidle" });
    await gmPage.waitForSelector('[data-testid="admin-cockpit-page"]', {
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

    // ── SMOKE-02 lite: API health via session fetch (page loaded = PB ok) ─
    record(
      "SMOKE-02 Session data reachable",
      await gmPage.locator('[data-testid="admin-cockpit-page"]').isVisible(),
    );

    const benign = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("service worker"),
    );
    record("No console errors", benign.length === 0, benign.join("; ") || "clean");
  } finally {
    await gmContext.close();
    await playerContext.close();
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- E2E Summary ---");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.error("Failed:", failed.map((f) => f.name).join(", "));
    Deno.exit(1);
  }
};

await main();
