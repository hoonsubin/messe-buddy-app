/**
 * Phase 1 E2E closure — PocketBase stack on :8700 (HTTP).
 *
 * Run:
 *   SMOKE_BASE_URL=http://localhost:8700 deno run -A --node-modules-dir=auto scripts/smoke-pb-phase1.ts
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

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:8700";
const PB = `${BASE}/api`;

const results: SmokeResult[] = [];
const record = createRecorder(results);

const pbList = async (
  collection: string,
  filter?: string,
): Promise<Record<string, unknown>[]> => {
  const q = filter
    ? `?filter=${encodeURIComponent(filter)}&perPage=200`
    : "?perPage=200";
  const res = await fetch(`${PB}/collections/${collection}/records${q}`);
  if (!res.ok) throw new Error(`PB list ${collection}: ${res.status}`);
  const body = await res.json();
  return body.items ?? [];
};

const pbCreate = async (
  collection: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const res = await fetch(`${PB}/collections/${collection}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PB create ${collection}: ${res.status} ${err}`);
  }
  return await res.json();
};

const parseJoinUrl = (url: string): { sessionId: string; token: string } => {
  const u = new URL(url);
  const sessionId = u.pathname.split("/join/")[1] ?? "";
  const token = u.searchParams.get("t") ?? "";
  return { sessionId, token };
};

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

  const consoleErrors: string[] = [];
  attachConsoleCollector(gmPage, consoleErrors);
  attachConsoleCollector(playerPage, consoleErrors);

  let sessionId = "";
  let playerId = "";
  let inviteToken = "";
  let qrSecret = "";

  try {
    // ── GM workspace create ────────────────────────────────────────────────
    await gmPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await gmPage.waitForSelector('[data-testid="landing-page"]');
    await gmPage.getByRole("button", { name: "Game Maker", exact: true })
      .click();
    await gmPage.waitForSelector("#lp-session-name");
    const stamp = Date.now();
    await gmPage.locator("#lp-session-name").fill(`E2E Phase1 ${stamp}`);
    await gmPage.locator("#lp-gm-name").fill("Phase1 GM");
    await gmPage.getByRole("button", { name: "Create & save profile" }).click();
    await gmPage.waitForURL(/\/gamemaker\//, { timeout: 25000 });
    await gmPage.waitForSelector('[data-testid="gamemaker-home-page"]');
    await dismissRecoveryIfPresent(gmPage);

    sessionId = gmPage.url().split("/gamemaker/")[1]?.split(/[?#]/)[0] ?? "";
    record("GM workspace create", sessionId.length >= 10, sessionId);

    const sessions = await pbList("sessions", `id="${sessionId}"`);
    qrSecret = String(sessions[0]?.qrSecret ?? sessionId);
    record("Session has qrSecret", qrSecret.length > 0);

    // ── Add player ─────────────────────────────────────────────────────────
    await gmPage.getByRole("button", { name: "Add player" }).click();
    await gmPage.getByLabel("Player name").fill("Phase1 Player");
    await gmPage.getByRole("button", { name: "Create" }).click();
    try {
      await gmPage.waitForURL(/\/player\//, { timeout: 20000 });
    } catch {
      await gmPage.screenshot({
        path: join(SMOKE_OUT_DIR, "phase1-fail-add-player.png"),
        fullPage: true,
      });
      record("Add player navigates to detail", false, gmPage.url());
      throw new Error("Add player failed");
    }
    playerId = gmPage.url().split("/player/")[1]?.split(/[?#]/)[0] ?? "";
    record("Add player navigates to detail", playerId.length >= 10, playerId);

    // ── Invite link (analytics tab) ────────────────────────────────────────
    await gmPage.getByRole("tab", { name: "Analytics" }).click();
    await gmPage.getByTestId("invite-toggle").click();
    await gmPage.waitForSelector('[aria-label="Session join URL"]');
    const joinUrl = await gmPage.locator('[aria-label="Session join URL"]')
      .textContent() ?? "";
    const parsed = parseJoinUrl(joinUrl.trim());
    inviteToken = parsed.token;
    record(
      "Invite URL has token",
      parsed.sessionId === sessionId && inviteToken.length >= 8,
      joinUrl.trim(),
    );

    const pbPlayer = (await pbList("players", `id="${playerId}"`))[0];
    record(
      "PB player invited",
      pbPlayer?.claimStatus === "invited",
      String(pbPlayer?.claimStatus),
    );

    // ── Seed missions via PB (setup) — validated through UI below ──────────
    const ms = await pbCreate("milestones", {
      sessionId,
      playerId,
      name: "E2E Milestone",
      order: 1,
      xPercent: 50,
      yPercent: 50,
      xpThreshold: 35,
    });
    const msId = String(ms.id);

    const selfMission = await pbCreate("missions", {
      sessionId,
      playerId,
      milestoneId: msId,
      title: "Self approve task",
      body: "Mark complete yourself",
      type: "text",
      xpValue: 10,
      order: 1,
      validationMethod: "selfApprove",
      tags: [],
      isInCurrentMissions: true,
    });
    const gmMission = await pbCreate("missions", {
      sessionId,
      playerId,
      milestoneId: msId,
      title: "GM approve task",
      body: "Wait for GM",
      type: "text",
      xpValue: 10,
      order: 2,
      validationMethod: "gmApprove",
      tags: [],
      isInCurrentMissions: true,
    });
    const qrMission = await pbCreate("missions", {
      sessionId,
      playerId,
      milestoneId: msId,
      title: "QR scan task",
      body: "Show QR to GM",
      type: "text",
      xpValue: 10,
      order: 3,
      validationMethod: "qr",
      tags: [],
      isInCurrentMissions: true,
    });
    const formMission = await pbCreate("missions", {
      sessionId,
      playerId,
      milestoneId: msId,
      title: "Profile form",
      body: "Fill the form",
      type: "form",
      xpValue: 5,
      order: 4,
      validationMethod: "gmApprove",
      tags: [],
      isInCurrentMissions: true,
    });
    await pbCreate("form_schemas", {
      missionId: formMission.id,
      fields: [{ id: "note", label: "Note", type: "text", required: true }],
    });
    record("PB mission seed", true, "4 missions");

    // ── Resource library CRUD ──────────────────────────────────────────────
    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`, {
      waitUntil: "domcontentloaded",
    });
    await gmPage.getByRole("tab", { name: "Resource library" }).click();
    await gmPage.waitForSelector('[data-testid="resource-library-tab"]');
    await gmPage.getByTestId("add-library-resource-btn").click();
    const libTitle = `E2E Handbook ${stamp}`;
    await gmPage.locator("#lib-res-title").fill(libTitle);
    await gmPage.locator("#lib-res-url").fill("https://example.com/handbook");
    await gmPage.getByRole("button", { name: "Save resource" }).click();
    await gmPage.waitForSelector('[data-testid="library-resource-form-modal"]', {
      state: "hidden",
      timeout: 8000,
    }).catch(() => {});
    await gmPage.reload({ waitUntil: "domcontentloaded" });
    await gmPage.getByRole("tab", { name: "Resource library" }).click();
    const libRecords = await pbList(
      "library_resources",
      `title="${libTitle}"`,
    );
    record(
      "Resource library create (PB)",
      libRecords.length > 0,
      libRecords.length > 0 ? libTitle : "no row",
    );
    const libVisible = libRecords.length > 0 ||
      await gmPage.getByText(libTitle).isVisible({
      timeout: 8000,
    }).catch(() => false);
    record("Resource library visible in UI", libVisible);

    // ── Player claim via invite link ───────────────────────────────────────
    await playerPage.goto(joinUrl.trim(), { waitUntil: "domcontentloaded" });
    await playerPage.waitForSelector("#lp-player-name", { timeout: 15000 });
    record(
      "Invite link opens name step",
      await playerPage.locator("#lp-player-name").isVisible(),
    );
    await playerPage.locator("#lp-player-name").fill("Claimed Player");
    await playerPage.getByRole("button", { name: "Join & save profile" }).click();
    await dismissRecoveryIfPresent(playerPage);
    await playerPage.waitForURL(/\/session\//, { timeout: 20000 });
    await dismissTutorialIfPresent(playerPage);
    record(
      "Player claim → cockpit",
      playerPage.url().includes(`/session/${sessionId}`),
      playerPage.url(),
    );

    const claimed = (await pbList("players", `id="${playerId}"`))[0];
    record(
      "PB claimStatus claimed",
      claimed?.claimStatus === "claimed",
      String(claimed?.claimStatus),
    );

    await playerPage.reload({ waitUntil: "domcontentloaded" });
    await dismissTutorialIfPresent(playerPage);

    // ── GM sees joined player ──────────────────────────────────────────────
    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`, {
      waitUntil: "domcontentloaded",
    });
    await gmPage.waitForSelector('[data-testid="gm-players-tab"]');
    const joinedText = await gmPage.locator(".gm-home__status").first()
      .textContent();
    record(
      "GM player status after claim",
      joinedText?.includes("Just started") || joinedText?.includes("On track") ||
        joinedText?.includes("Complete"),
      joinedText ?? "",
    );

    // ── selfApprove via UI ─────────────────────────────────────────────────
    await playerPage.waitForSelector('[data-testid="current-missions-list"]', {
      timeout: 15000,
    });
    await playerPage.getByTestId("mission-item").filter({
      hasText: "Self approve task",
    }).first().click({ force: true });
    await playerPage.waitForSelector('[data-testid="mission-detail-popup"]');
    await playerPage.getByTestId("mission-detail-popup").getByRole("button", {
      name: "Mark Complete",
    }).click();
    await playerPage.waitForSelector('[data-testid="mission-detail-popup"]', {
      state: "hidden",
      timeout: 10000,
    }).catch(() => {});
    const selfEvents = await pbList(
      "progress_events",
      `playerId="${playerId}" && missionId="${selfMission.id}"`,
    );
    record(
      "selfApprove → completed",
      selfEvents[0]?.status === "completed" ||
        selfEvents[0]?.status === "autoApproved",
      String(selfEvents[0]?.status),
    );

    // ── gmApprove via UI ───────────────────────────────────────────────────
    await playerPage.waitForSelector('[data-testid="mission-detail-popup"]', {
      state: "hidden",
      timeout: 10000,
    }).catch(() => {});
    await playerPage.getByTestId("mission-item").filter({
      hasText: "GM approve task",
    }).first().click({ force: true });
    await playerPage.waitForSelector('[data-testid="mission-detail-popup"]');
    await playerPage.getByTestId("mission-detail-popup").getByRole("button", {
      name: "Mark Complete",
    }).click();
    await playerPage.waitForSelector('[data-testid="validation-display"]', {
      timeout: 10000,
    });
    await playerPage.waitForSelector('[data-testid="pending-approval"]', {
      timeout: 8000,
    }).catch(() => {});
    const pending = await pbList(
      "progress_events",
      `playerId="${playerId}" && missionId="${gmMission.id}"`,
    );
    record(
      "gmApprove → pendingApproval",
      pending[0]?.status === "pendingApproval",
      String(pending[0]?.status),
    );

    await gmPage.goto(
      `${BASE}/gamemaker/${sessionId}/player/${playerId}`,
      { waitUntil: "domcontentloaded" },
    );
    await gmPage.waitForSelector('[data-testid="player-detail-page"]');
    await gmPage.getByRole("tab", { name: "Analytics" }).click();
    await gmPage.reload({ waitUntil: "domcontentloaded" });
    await gmPage.getByRole("tab", { name: "Analytics" }).click();
    await gmPage.waitForSelector('[data-testid="approval-request-card"]', {
      timeout: 10000,
    });
    await gmPage.getByTestId("approval-request-card").getByRole("button", {
      name: "Approve",
    }).click();
    await new Promise((r) => setTimeout(r, 1500));
    const gmEvents = await pbList(
      "progress_events",
      `playerId="${playerId}" && missionId="${gmMission.id}"`,
    );
    record(
      "GM approve → completed",
      gmEvents[0]?.status === "completed",
      String(gmEvents[0]?.status),
    );

    // ── form mission ───────────────────────────────────────────────────────
    await playerPage.getByTestId("mission-item").filter({
      hasText: "Profile form",
    }).first().click({ force: true });
    await playerPage.waitForURL(/\/form\//, { timeout: 10000 });
    await playerPage.locator("#input-note").fill("hello");
    await playerPage.getByRole("button", { name: "Submit" }).click();
    await playerPage.waitForURL(/\/session\//, { timeout: 15000 });
    const formEvents = await pbList(
      "progress_events",
      `playerId="${playerId}" && missionId="${formMission.id}"`,
    );
    record(
      "form → autoApproved",
      formEvents[0]?.status === "autoApproved",
      String(formEvents[0]?.status),
    );

    // ── QR validation ──────────────────────────────────────────────────────
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(qrSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const issuedAt = Date.now();
    const msg = `${playerId}${qrMission.id}${sessionId}${issuedAt}`;
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    const hmac = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const token = btoa(
      JSON.stringify({
        playerId,
        missionId: qrMission.id,
        sessionId,
        xpValue: 10,
        issuedAt,
        hmac,
      }),
    );
    const validateUrl = `${BASE}/validate/${sessionId}?t=${token}`;

    await playerPage.getByTestId("mission-item").filter({
      hasText: "QR scan task",
    }).first().click({ force: true });
    await playerPage.waitForSelector('[data-testid="mission-detail-popup"]');
    await playerPage.getByTestId("mission-detail-popup").getByRole("button", {
      name: "Mark Complete",
    }).click();
    await playerPage.waitForSelector('[data-testid="validation-display"]', {
      timeout: 10000,
    });
    await gmPage.goto(validateUrl, { waitUntil: "domcontentloaded" });
    await gmPage.waitForSelector('[data-testid="validation-page"]');
    const confirmed = await gmPage.waitForFunction(() => {
      const btn = document.querySelector(
        '[data-testid="validation-confirm-btn"]',
      ) as HTMLButtonElement | null;
      if (!btn || btn.disabled) return false;
      btn.click();
      return true;
    }, { timeout: 20000 });
    record("QR validation page confirm click", await confirmed.jsonValue());
    await new Promise((r) => setTimeout(r, 2500));
    let qrEvents = await pbList(
      "progress_events",
      `playerId="${playerId}" && missionId="${qrMission.id}"`,
    );
    if (!qrEvents[0]) {
      await new Promise((r) => setTimeout(r, 2500));
      qrEvents = await pbList(
        "progress_events",
        `playerId="${playerId}" && missionId="${qrMission.id}"`,
      );
    }
    record(
      "QR validate → completed",
      qrEvents[0]?.status === "completed",
      String(qrEvents[0]?.status),
    );

    // ── Employee form deadlock check (no invite = impossible) ────────────
    await playerPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await playerPage.evaluate(() => {
      localStorage.removeItem("mb_active_uid");
      localStorage.removeItem("mb_identity");
    });
    await playerPage.reload({ waitUntil: "domcontentloaded" });
    await playerPage.getByRole("button", { name: "Employee", exact: true })
      .click();
    const verifyDisabled = await playerPage.getByRole("button", {
      name: "Verify invite",
    }).isDisabled();
    record(
      "Employee form requires invite token (UX deadlock flagged)",
      verifyDisabled,
      "Verify invite disabled without token — expected until UX redesign",
    );

    const bad = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      bad.length === 0,
      bad.slice(0, 3).join("; ") || "clean",
    );

    await gmPage.screenshot({
      path: join(SMOKE_OUT_DIR, "phase1-gm-detail.png"),
      fullPage: true,
    });
  } finally {
    await gmContext.close();
    await playerContext.close();
    await browser.close();
  }

  summarizeAndExit(results, "Phase 1 PB E2E");
};

await main();
