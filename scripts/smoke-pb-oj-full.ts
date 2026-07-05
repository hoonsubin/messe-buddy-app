/**
 * OJ-01 full-stack smoke — PocketBase on :8700 (HTTP).
 *
 * GM: landing → workspace → onboarding wizard → player detail Customize
 * Player: invite link → claim → cockpit
 *
 * Run:
 *   SMOKE_BASE_URL=http://localhost:8700 deno task smoke-pb-oj-full
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
import { parseJoinUrl, pbApi, pbList } from "./smoke-pb-helpers.ts";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:8700";
const PB = pbApi(BASE);
const PLAYER_NAME = `PB Smoke ${Date.now()}`;

const results: SmokeResult[] = [];
const record = createRecorder(results);

const main = async () => {
  await mkdir(SMOKE_OUT_DIR, { recursive: true });

  const health = await fetch(`${PB}/health`);
  record("PB health", health.ok, String(health.status));

  const browser = await firefox.launch({ headless: true });
  const device = devices["iPhone 15"];
  const gmContext = await browser.newContext({ ...device });
  const playerContext = await browser.newContext({ ...device });
  const gmPage = await gmContext.newPage();
  const playerPage = await playerContext.newPage();

  const apiFailures: string[] = [];
  const captureApi = (page: typeof gmPage) => {
    page.on("response", async (res) => {
      const url = res.url();
      if (!url.includes("/api/collections/")) return;
      if (res.status() >= 400) {
        const body = await res.text().catch(() => "");
        apiFailures.push(`${res.status()} ${res.request().method()} ${url} ${body.slice(0, 200)}`);
      }
    });
  };
  captureApi(gmPage);
  captureApi(playerPage);

  const consoleErrors: string[] = [];
  attachConsoleCollector(gmPage, consoleErrors);
  attachConsoleCollector(playerPage, consoleErrors);

  let sessionId = "";
  let playerId = "";
  let joinUrl = "";

  try {
    // ── Landing + GM workspace ─────────────────────────────────────────────
    await gmPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await gmPage.waitForSelector('[data-testid="landing-page"]');
    record(
      "Landing loads (OJ profile list)",
      await gmPage.getByTestId("landing-new-journey-btn").isVisible(),
    );

    await gmPage.getByTestId("landing-new-journey-btn").click();
    await gmPage.waitForSelector('[data-testid="landing-workspace-form"]');
    const stamp = Date.now();
    await gmPage.locator("#lp-session-name").fill(`PB OJ ${stamp}`);
    await gmPage.locator("#lp-gm-name").fill("PB Smoke GM");
    await gmPage.getByRole("button", { name: "Create & save profile" }).click();
    await gmPage.waitForURL(/\/gamemaker\//, { timeout: 25000 });
    await gmPage.waitForSelector('[data-testid="gamemaker-home-page"]');
    await dismissRecoveryIfPresent(gmPage);

    sessionId = gmPage.url().split("/gamemaker/")[1]?.split(/[?#]/)[0] ?? "";
    record("GM workspace created", sessionId.length >= 10, sessionId);

    // ── Onboarding wizard ──────────────────────────────────────────────────
    record(
      "New onboarding journey CTA",
      await gmPage.getByTestId("new-onboarding-journey-btn").isVisible(),
    );
    await gmPage.getByTestId("new-onboarding-journey-btn").click();
    await gmPage.waitForSelector('[data-testid="onboarding-journey-modal"]');
    await gmPage.getByTestId("oj-player-name-input").fill(PLAYER_NAME);
    await gmPage.getByTestId("oj-continue-btn").click();

    await gmPage.waitForSelector('[data-testid="oj-step-buddy"]');
    const buddyOption = gmPage.locator('[data-testid^="oj-buddy-option-"]').first();
    if (await buddyOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buddyOption.click();
    } else {
      await gmPage.getByTestId("oj-buddy-new-name").fill("PB Buddy");
      await gmPage.getByTestId("oj-buddy-new-email").fill("buddy@example.com");
      await gmPage.getByTestId("oj-buddy-new-phone").fill("+4912345678");
      await gmPage.getByTestId("oj-buddy-new-role").fill("Mentor");
    }
    await gmPage.getByTestId("oj-continue-btn").click();

    await gmPage.waitForSelector('[data-testid="oj-step-template"]');
    await gmPage.getByTestId("oj-template-scratch").click();
    await gmPage.getByTestId("oj-create-journey-btn").click();

    await gmPage.waitForURL(/\/player\//, { timeout: 25000 });
    playerId = gmPage.url().split("/player/")[1]?.split(/[?#]/)[0] ?? "";
    record("Wizard → player detail", playerId.length >= 10, gmPage.url());

    const pbPlayer = (await pbList(BASE, "players", `id="${playerId}"`))[0];
    record(
      "PB player row invited",
      pbPlayer?.claimStatus === "invited",
      String(pbPlayer?.claimStatus),
    );

    // ── Invite link (Customize tab — pinned) ───────────────────────────────
    await gmPage.waitForSelector('[data-testid="player-invite-body"]', {
      timeout: 10000,
    });
    await gmPage.waitForFunction(() => {
      const el = document.querySelector('[aria-label="Session join URL"]');
      const token = el?.textContent?.match(/[?&]t=([^&]+)/)?.[1] ?? "";
      return token.length >= 8;
    }, { timeout: 15000 });
    joinUrl = (await gmPage.locator('[aria-label="Session join URL"]').textContent())
      ?.trim() ?? "";
    const parsed = parseJoinUrl(joinUrl);
    record(
      "Invite URL from Customize",
      parsed.sessionId === sessionId && parsed.token.length >= 8,
      joinUrl,
    );
    record(
      "PB inviteToken matches URL",
      pbPlayer?.inviteToken === parsed.token,
      `pb=${pbPlayer?.inviteToken} url=${parsed.token}`,
    );

    await gmPage.screenshot({
      path: join(SMOKE_OUT_DIR, "pb-oj-gm-customize.png"),
      fullPage: true,
    });

    // ── Player claim ───────────────────────────────────────────────────────
    await playerPage.goto(joinUrl, { waitUntil: "domcontentloaded" });
    await playerPage.waitForSelector('[data-testid="join-page"]', {
      timeout: 15000,
    });

    const nameVisible = await playerPage.locator("#lp-player-name").isVisible({
      timeout: 15000,
    }).catch(() => false);
    const verifyError = await playerPage.locator(".form-error").textContent()
      .catch(() => "");
    record(
      "Invite link → name step",
      nameVisible,
      verifyError || playerPage.url(),
    );

    if (!nameVisible) {
      await playerPage.screenshot({
        path: join(SMOKE_OUT_DIR, "pb-oj-join-fail-verify.png"),
        fullPage: true,
      });
      throw new Error(`Invite verify failed: ${verifyError}`);
    }

    await playerPage.locator("#lp-player-name").fill(PLAYER_NAME);
    await playerPage.getByRole("button", { name: "Join & save profile" }).click();

    let joined = false;
    try {
      await playerPage.waitForURL(/\/session\//, { timeout: 20000 });
      joined = playerPage.url().includes(`/session/${sessionId}`);
    } catch {
      const joinError = await playerPage.locator(".form-error").textContent()
        .catch(() => "");
      record("Player join → cockpit", false, joinError || playerPage.url());
      await playerPage.screenshot({
        path: join(SMOKE_OUT_DIR, "pb-oj-join-fail-claim.png"),
        fullPage: true,
      });
      throw new Error(`Join failed: ${joinError}`);
    }

    await dismissRecoveryIfPresent(playerPage);
    await dismissTutorialIfPresent(playerPage);
    record("Player join → cockpit", joined, playerPage.url());

    const claimed = (await pbList(BASE, "players", `id="${playerId}"`))[0];
    record(
      "PB claimStatus claimed",
      claimed?.claimStatus === "claimed",
      String(claimed?.claimStatus),
    );

    // ── Analytics tab after claim ────────────────────────────────────────
    await gmPage.goto(`${BASE}/gamemaker/${sessionId}/player/${playerId}`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Analytics tab hidden before progress",
      await gmPage.getByTestId("player-detail-tab-analytics").count() === 0,
    );

    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`, {
      waitUntil: "domcontentloaded",
    });
    const statusText = await gmPage.getByTestId("gm-player-card").filter({
      hasText: PLAYER_NAME,
    }).locator(".gm-home__status").textContent().catch(() => "");
    record(
      "GM list shows joined status",
      statusText?.includes("Just started") ||
        statusText?.includes("On track") ||
        statusText?.includes("Complete") ||
        false,
      statusText ?? "",
    );

    if (apiFailures.length > 0) {
      record(
        "No PB API 4xx/5xx during flow",
        false,
        apiFailures.slice(0, 3).join(" | "),
      );
    } else {
      record("No PB API 4xx/5xx during flow", true);
    }

    const bad = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      bad.length === 0,
      bad.slice(0, 3).join("; ") || "clean",
    );
  } finally {
    await gmContext.close();
    await playerContext.close();
    await browser.close();
  }

  summarizeAndExit(results, "PB OJ-01 full-stack smoke");
};

await main();
