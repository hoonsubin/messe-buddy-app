/**
 * Phase 2 PB smoke — template import, milestone resources, multi-device, isolation.
 *
 * Run (after `docker compose build app && docker compose up -d app`):
 *   SMOKE_BASE_URL=http://localhost:8700 deno task smoke-pb-phase2
 */
import { mkdir } from "node:fs/promises";
import type { Page } from "npm:playwright@^1.61.0";
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
import {
  minimalTemplate,
  pbCreate,
  pbList,
} from "./smoke-pb-helpers.ts";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:8700";
const PB = `${BASE}/api`;
const results: SmokeResult[] = [];
const record = createRecorder(results);

const gmCreateAndInvite = async (gmPage: Page): Promise<{
  sessionId: string;
  playerId: string;
  joinUrl: string;
}> => {
  await gmPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await gmPage.waitForSelector('[data-testid="landing-page"]');
  await gmPage.getByRole("button", { name: "Game Maker", exact: true }).click();
  const stamp = Date.now();
  await gmPage.locator("#lp-session-name").fill(`E2E P2 ${stamp}`);
  await gmPage.locator("#lp-gm-name").fill("Phase2 GM");
  await gmPage.getByRole("button", { name: "Create & save profile" }).click();
  await gmPage.waitForURL(/\/gamemaker\//, { timeout: 25000 });
  await dismissRecoveryIfPresent(gmPage);

  const sessionId = gmPage.url().split("/gamemaker/")[1]?.split(/[?#]/)[0] ?? "";
  await gmPage.getByRole("button", { name: "Add player" }).click();
  await gmPage.getByLabel("Player name").fill("Player One");
  await gmPage.getByRole("button", { name: "Create" }).click();
  await gmPage.waitForURL(/\/player\//, { timeout: 20000 });
  const playerId = gmPage.url().split("/player/")[1]?.split(/[?#]/)[0] ?? "";

  await gmPage.getByRole("tab", { name: "Analytics" }).click();
  await gmPage.getByTestId("invite-toggle").click();
  const joinUrl = (await gmPage.locator('[aria-label="Session join URL"]')
    .textContent())?.trim() ?? "";

  return { sessionId, playerId, joinUrl };
};

const playerClaim = async (page: Page, joinUrl: string, name: string) => {
  await page.goto(joinUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#lp-player-name", { timeout: 15000 });
  await page.locator("#lp-player-name").fill(name);
  await page.getByRole("button", { name: "Join & save profile" }).click();
  await dismissRecoveryIfPresent(page);
  await page.waitForURL(/\/session\//, { timeout: 20000 });
  await dismissTutorialIfPresent(page);
};

const main = async () => {
  await mkdir(SMOKE_OUT_DIR, { recursive: true });

  const health = await fetch(`${PB}/health`);
  record("PB health", health.ok);

  const browser = await firefox.launch({ headless: true });
  const device = devices["iPhone 15"];
  const gmContext = await browser.newContext({ ...device });
  const player1Context = await browser.newContext({ ...device });
  const player2Context = await browser.newContext({ ...device });

  const gmPage = await gmContext.newPage();
  const player1 = await player1Context.newPage();
  const player2 = await player2Context.newPage();

  const consoleErrors: string[] = [];
  attachConsoleCollector(gmPage, consoleErrors);
  attachConsoleCollector(player1, consoleErrors);
  attachConsoleCollector(player2, consoleErrors);

  let sessionId = "";
  let playerId = "";
  let joinUrl = "";
  const templateName = `E2E Starter ${Date.now()}`;

  try {
    ({ sessionId, playerId, joinUrl } = await gmCreateAndInvite(gmPage));
    record("GM setup + invite", sessionId.length > 10 && playerId.length > 10);

    const templateCount = (await pbList(BASE, "templates")).length;
    const milestonesAfterInvite = await pbList(
      BASE,
      "milestones",
      `playerId="${playerId}"`,
    );
    record(
      "OD-20 starter template on invite",
      templateCount === 0 || milestonesAfterInvite.length >= 1,
      `templates=${templateCount} milestones=${milestonesAfterInvite.length}`,
    );

    await playerClaim(player1, joinUrl, "Player One");
    record(
      "Player 1 claim",
      player1.url().includes(`/session/${sessionId}`),
    );

    // ── Template import (UI) ───────────────────────────────────────────────
    const tpl = minimalTemplate(templateName);
    await pbCreate(BASE, "templates", { name: templateName, data: tpl });

    await gmPage.goto(
      `${BASE}/gamemaker/${sessionId}/player/${playerId}`,
      { waitUntil: "domcontentloaded" },
    );
    await gmPage.getByRole("tab", { name: "Customize" }).click();
    await gmPage.waitForSelector('[data-testid="template-select"]');
    await gmPage.selectOption('[data-testid="template-select"]', templateName);
    await gmPage.getByText("Template applied").waitFor({ timeout: 20000 });

    let milestones = await pbList(
      BASE,
      "milestones",
      `playerId="${playerId}"`,
    );
    for (let i = 0; i < 8 && milestones.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 500));
      milestones = await pbList(
        BASE,
        "milestones",
        `playerId="${playerId}"`,
      );
    }
    const missions = await pbList(
      BASE,
      "missions",
      `playerId="${playerId}"`,
    );
    record(
      "Template import → player milestones",
      milestones.length >= 1,
      `milestones=${milestones.length}`,
    );
    record(
      "Template import → player missions",
      missions.some((m) => m.title === "Template starter mission"),
      `missions=${missions.length}`,
    );

    // ── Milestone resource attach (UI) ─────────────────────────────────────
    const libTitle = `P2 Handbook ${Date.now()}`;
    await pbCreate(BASE, "library_resources", {
      resourceKey: `p2-handbook-${Date.now()}`,
      title: libTitle,
      type: "link",
      url: "https://example.com/p2",
      tags: [],
    });

    await gmPage.getByTestId("resources-editor").scrollIntoViewIfNeeded();
    await gmPage.getByRole("button", { name: "+ Add resource" }).click();
    await gmPage.waitForSelector('[data-testid="resources-editor-modal"]');
    await gmPage.locator("#res-title").fill(`Attached ${libTitle}`);
    await gmPage.locator("#res-url").fill("https://example.com/attached");
    await gmPage
      .getByTestId("resources-editor-modal")
      .getByRole("button", { name: "Add", exact: true })
      .click();
    await gmPage.getByText("Resource attached").waitFor({ timeout: 15000 });
    await gmPage.waitForSelector('[data-testid="resources-editor-modal"]', {
      state: "hidden",
      timeout: 10000,
    }).catch(() => {});

    const attachments = await pbList(
      BASE,
      "milestone_resources",
      `playerId="${playerId}"`,
    );
    record(
      "Milestone resource attach (PB)",
      attachments.length >= 1,
      `attachments=${attachments.length}`,
    );
    const attachedVisible = await gmPage.getByText(`Attached ${libTitle}`)
      .isVisible({ timeout: 5000 }).catch(() => false);
    record("Milestone resource visible in GM editor", attachedVisible);

    // ── Multi-device same invite ───────────────────────────────────────────
    await player2.goto(joinUrl, { waitUntil: "domcontentloaded" });
    await player2.waitForSelector("#lp-player-name", { timeout: 15000 });
    await player2.locator("#lp-player-name").fill("Player One Device2");
    await player2.getByRole("button", { name: "Join & save profile" }).click();
    await dismissRecoveryIfPresent(player2);
    await player2.waitForURL(/\/session\//, { timeout: 20000 });
    await dismissTutorialIfPresent(player2);

    const uid1 = await player1.evaluate(() => {
      const raw = localStorage.getItem("mb_identity");
      const profiles = raw ? JSON.parse(raw) : [];
      const uid = localStorage.getItem("mb_active_uid");
      const p = profiles.find((x: { uid: string }) => x.uid === uid);
      return p?.uid ?? "";
    });
    const uid2 = await player2.evaluate(() => {
      const raw = localStorage.getItem("mb_identity");
      const profiles = raw ? JSON.parse(raw) : [];
      const uid = localStorage.getItem("mb_active_uid");
      const p = profiles.find((x: { uid: string }) => x.uid === uid);
      return p?.uid ?? "";
    });
    const players = await pbList(BASE, "players", `sessionId="${sessionId}"`);
    const claimed = players.filter((p) => p.claimStatus === "claimed");
    record(
      "Multi-device → single claimed player row",
      claimed.length === 1,
      `claimed=${claimed.length}`,
    );
    record(
      "Multi-device → same uid on both devices",
      uid1.length > 0 && uid1 === uid2,
      `uid=${uid1}`,
    );

    // ── Progress sync ──────────────────────────────────────────────────────
    await player1.reload({ waitUntil: "domcontentloaded" });
    await dismissTutorialIfPresent(player1);
    await player1.getByTestId("mission-item").filter({
      hasText: "Template starter mission",
    }).first().click({ force: true });
    await player1.waitForSelector('[data-testid="mission-detail-popup"]');
    await player1.getByTestId("mission-detail-popup").getByRole("button", {
      name: "Mark Complete",
    }).click();
    await new Promise((r) => setTimeout(r, 1500));

    await player2.reload({ waitUntil: "domcontentloaded" });
    await dismissTutorialIfPresent(player2);
    const p2Events = await pbList(
      BASE,
      "progress_events",
      `playerId="${playerId}"`,
    );
    record(
      "Multi-device progress sync (PB)",
      p2Events.some((e) => e.status === "completed"),
      `events=${p2Events.length}`,
    );

    // ── Second player isolation ────────────────────────────────────────────
    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`, {
      waitUntil: "domcontentloaded",
    });
    await gmPage.getByRole("button", { name: "Add player" }).click();
    await gmPage.getByLabel("Player name").fill("Player Two");
    await gmPage.getByRole("button", { name: "Create" }).click();
    await gmPage.waitForURL(/\/player\//, { timeout: 20000 });
    const player2Id = gmPage.url().split("/player/")[1]?.split(/[?#]/)[0] ?? "";
    await gmPage.getByRole("tab", { name: "Analytics" }).click();
    await gmPage.getByTestId("invite-toggle").click();
    const join2 = (await gmPage.locator('[aria-label="Session join URL"]')
      .textContent())?.trim() ?? "";

    const player2b = await browser.newContext({ ...device });
    const p2page = await player2b.newPage();
    await playerClaim(p2page, join2, "Player Two");
    const p2Missions = await pbList(
      BASE,
      "missions",
      `playerId="${player2Id}"`,
    );
    record(
      "Player 2 starts with no template missions",
      p2Missions.length === 0,
      `missions=${p2Missions.length}`,
    );
    const p1Only = await pbList(
      BASE,
      "missions",
      `playerId="${playerId}"`,
    );
    record(
      "Player 1 missions unchanged after player 2 added",
      p1Only.length >= 1,
      `p1 missions=${p1Only.length}`,
    );
    await player2b.close();

    const bad = consoleErrors.filter((e) => !isBenignConsoleError(e));
    record(
      "No unexpected console errors",
      bad.length === 0,
      bad.slice(0, 2).join("; ") || "clean",
    );
  } finally {
    await gmContext.close();
    await player1Context.close();
    await player2Context.close();
    await browser.close();
  }

  summarizeAndExit(results, "Phase 2 PB E2E");
};

await main();
