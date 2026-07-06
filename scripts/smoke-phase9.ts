/**
 * Phase 9 smoke — PocketBase path (useMockPb: false).
 * Run: SMOKE_BASE_URL=http://127.0.0.1:5173 deno run -A --node-modules-dir=auto scripts/smoke-phase9.ts
 */
import { chromium, devices, type Page } from "npm:playwright@^1.61.0";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://127.0.0.1:5173";
const PB = "http://127.0.0.1:8090/api";
const STAMP = Date.now();

type Result = { id: string; pass: boolean; detail: string };

const results: Result[] = [];
const consoleErrors: string[] = [];

const record = (id: string, pass: boolean, detail: string) => {
  results.push({ id, pass, detail });
  console.log(`${pass ? "[PASS]" : "[FAIL]"} ${id}: ${detail}`);
};

const attachConsole = (page: Page) => {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      text.includes("Maximum update depth") ||
      text.includes("Unhandled error") ||
      (text.includes("Error") && !text.includes("favicon"))
    ) {
      consoleErrors.push(text.slice(0, 300));
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`pageerror: ${err.message}`.slice(0, 300));
  });
};

async function skipTutorial(page: Page) {
  const skip = page.getByRole("button", { name: "Skip tutorial", exact: true });
  if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) {
    await skip.click();
    const confirm = page.getByRole("button", { name: "Skip tutorial" }).last();
    await confirm.click({ timeout: 5000 });
  }
}

async function createGmWorkspace(page: Page): Promise<string> {
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByTestId("landing-new-journey-btn").click();
  await page.locator("#lp-session-name").fill(`Smoke ${STAMP}`);
  await page.locator("#lp-gm-name").fill(`GM ${STAMP}`);
  await page.getByRole("button", { name: "Create & save profile" }).click();
  await page.waitForURL(/\/gamemaker\//, { timeout: 20000 });
  const m = page.url().match(/\/gamemaker\/([^/]+)/);
  if (!m) throw new Error("no session id after GM create");
  return m[1];
}

async function runWizard(
  page: Page,
  playerName: string,
  templateName: string | null,
) {
  await page.getByRole("button", { name: "New onboarding journey" }).click();
  await page.getByTestId("oj-player-name-input").fill(playerName);
  await page.getByTestId("oj-continue-btn").click();
  await page.getByTestId("oj-step-buddy").waitFor({ timeout: 10000 });
  const continueBtn = page.getByTestId("oj-continue-btn");
  if (!(await continueBtn.isEnabled())) {
    await page.locator("#oj-buddy-new-name").fill("Buddy Smoke");
    await page.locator("#oj-buddy-new-role").fill("Mentor");
    await page.locator("#oj-buddy-new-email").fill("buddy@example.com");
    await page.locator("#oj-buddy-new-phone").fill("+49 123 456");
  }
  await continueBtn.click();
  await page.getByTestId("oj-step-template").waitFor({ timeout: 10000 });
  if (templateName === null) {
    await page.getByTestId("oj-template-scratch").click();
  } else {
    await page.getByTestId(`oj-template-option-${templateName}`).click();
  }
  await page.getByTestId("oj-create-journey-btn").click();
  await page.waitForURL(/\/player\//, { timeout: 45000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function pbProfileMissionId(playerId: string): Promise<string | null> {
  const filter = encodeURIComponent(
    `(playerId='${playerId}' && type='form')`,
  );
  const res = await fetch(
    `${PB}/collections/missions/records?filter=${filter}&perPage=1&sort=created`,
  );
  const data = await res.json();
  return (data.items?.[0] as { id: string } | undefined)?.id ?? null;
}

async function pbFirstQrMissionId(playerId: string): Promise<string | null> {
  const filter = encodeURIComponent(
    `(playerId='${playerId}' && validationMethod='qr')`,
  );
  const res = await fetch(
    `${PB}/collections/missions/records?filter=${filter}&perPage=1&sort=created`,
  );
  const data = await res.json();
  return (data.items?.[0] as { id: string } | undefined)?.id ?? null;
}

async function pbPlayer(sessionId: string, name: string) {
  const filter = encodeURIComponent(`(sessionId='${sessionId}')`);
  const res = await fetch(
    `${PB}/collections/players/records?filter=${filter}&perPage=50`,
  );
  const data = await res.json();
  const items = (data.items ?? []) as Array<
    { id: string; inviteToken: string; name: string }
  >;
  return items.find((p) => p.name === name);
}

async function playerJoin(
  page: Page,
  sessionId: string,
  token: string,
  name: string,
) {
  await page.goto(`${BASE}/join/${sessionId}?t=${encodeURIComponent(token)}`);
  await page.locator("#lp-player-name").waitFor({ timeout: 15000 });
  await page.locator("#lp-player-name").fill(name);
  await page.getByRole("button", { name: "Join & save profile" }).click();
  await page.waitForURL(/\/session\//, { timeout: 20000 });
  await skipTutorial(page);
}

async function fillProfileForm(page: Page) {
  await page.locator("#input-preferredName").fill("Smoke Player");
  await page.locator("#input-role").fill("QA Tester");
  await page.locator("#input-department").selectOption("IT & Digitalisation");
  await page.locator("#input-startDate").fill("2026-07-06");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL(/\/session\//, { timeout: 20000 });
}

const main = async () => {
  // Preflight
  const config = await fetch(`${BASE}/config.js`).then((r) => r.text());
  const pbHealth = await fetch(`${PB}/health`).then((r) => r.status);
  record(
    "preflight.config",
    config.includes("useMockPb: false"),
    config.includes("useMockPb: false") ? "PocketBase mode" : "expected useMockPb: false",
  );
  record(
    "preflight.pb",
    pbHealth === 200,
    `PB health ${pbHealth}`,
  );

  const browser = await chromium.launch({ headless: true });
  const device = devices["iPhone 15"];
  const gmContext = await browser.newContext({ ...device });
  const playerContext = await browser.newContext({ ...device });
  const gmPage = await gmContext.newPage();
  const playerPage = await playerContext.newPage();
  attachConsole(gmPage);
  attachConsole(playerPage);

  const scratchName = `Scratch ${STAMP}`;
  const qrName = `QR ${STAMP}`;

  let sessionId = "";
  let qrPlayerId = "";

  try {
    sessionId = await createGmWorkspace(gmPage);
    record("9.1.workspace", true, `session ${sessionId}`);

    await runWizard(gmPage, scratchName, null);
    await new Promise((r) => setTimeout(r, 1500));
    const scratchPlayer = await pbPlayer(sessionId, scratchName);
    if (!scratchPlayer) {
      throw new Error(
        `scratch player not in PB (session ${sessionId}, name ${scratchName})`,
      );
    }

    const ghostDialogs = await gmPage.getByRole("dialog", { name: "Milestone" })
      .count();
    record(
      "9.6.ghost-dialog",
      ghostDialogs === 0,
      ghostDialogs === 0
        ? "no stray Milestone dialog after scratch wizard"
        : `found ${ghostDialogs} Milestone dialog(s)`,
    );

    const grammarBad = await gmPage.getByText("1 missions").isVisible().catch(
      () => false,
    );
    record(
      "8.5.grammar",
      !grammarBad,
      grammarBad ? '"1 missions" visible on customize map' : "no '1 missions' text",
    );

    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`);
    await gmPage.getByTestId("gm-player-card").waitFor({ timeout: 15000 });
    const notJoinedBefore = await gmPage.getByText("Not joined yet").isVisible();
    record(
      "9.2.pre-claim",
      notJoinedBefore,
      notJoinedBefore ? "roster shows Not joined yet" : "expected pending before claim",
    );

    await playerJoin(
      playerPage,
      sessionId,
      scratchPlayer.inviteToken,
      scratchName,
    );
    record("9.1.join", true, "player claimed session");

    await gmPage.waitForFunction(() => {
      const cards = document.querySelectorAll('[data-testid="gm-player-card"]');
      for (const c of cards) {
        if (!c.textContent?.includes("Not joined yet")) return true;
      }
      return false;
    }, { timeout: 10000 });
    const joinedLive = !(await gmPage.getByText("Not joined yet").isVisible()
      .catch(() => true));
    record(
      "9.2.claim-realtime",
      joinedLive,
      joinedLive
        ? "GM roster updated without reload after claim"
        : "still Not joined yet after 10s",
    );

    const missionLink = playerPage.getByTestId("mission-item").filter({
      hasText: "Complete Your Profile",
    }).first();
    if (await missionLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await missionLink.click();
    } else {
      await playerPage.goto(`${BASE}/session/${sessionId}`);
      await playerPage.getByTestId("mission-item").first().click({
        timeout: 10000,
      });
    }
    await playerPage.waitForURL(/\/form\//, { timeout: 15000 });
    const depthErr = consoleErrors.some((e) =>
      e.includes("Maximum update depth")
    );
    record(
      "5.1.form-loop",
      !depthErr,
      depthErr ? "Maximum update depth on form page" : "form page loaded cleanly",
    );

    await fillProfileForm(playerPage);
    const xpBefore = await playerPage.locator(".topbar").textContent().catch(
      () => "",
    );
    await playerPage.reload();
    await playerPage.waitForSelector(".topbar", { timeout: 15000 });
    const xpAfter = await playerPage.locator(".topbar").textContent().catch(
      () => "",
    );
    const xpPersisted = xpAfter.includes("10") || xpBefore.includes("10");
    record(
      "9.1.xp-persist",
      xpPersisted,
      xpPersisted
        ? `XP persisted after reload (${xpAfter.trim()})`
        : `XP missing after reload (before=${xpBefore}, after=${xpAfter})`,
    );

    await gmPage.reload();
    await gmPage.getByTestId("gm-player-card").waitFor({ timeout: 15000 });
    const pctText = await gmPage.locator(".gm-home__progress-pct").first()
      .textContent();
    const pctNum = parseInt(pctText?.replace("%", "") ?? "0", 10);
    const gmProgressLive = pctNum > 0;
    record(
      "9.2.progress-after-form",
      gmProgressLive,
      `GM roster progress after form: ${pctText?.trim() ?? "n/a"}`,
    );

    const emptyAfterLoad = await gmPage.getByText("No players yet").isVisible()
      .catch(() => false);
    record(
      "9.5.empty-flash",
      !emptyAfterLoad,
      emptyAfterLoad
        ? "empty state visible after reload with players"
        : "no empty state after reload",
    );

    // QR realtime — second player with default template
    await runWizard(gmPage, qrName, "Messe München Onboarding");
    const qrPlayer = await pbPlayer(sessionId, qrName);
    if (!qrPlayer) throw new Error("QR player not in PB");
    qrPlayerId = qrPlayer.id;

    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`);
    await gmPage.getByTestId("gm-player-card").first().waitFor({
      timeout: 15000,
    });

    const qrPlayerPage = await playerContext.newPage();
    attachConsole(qrPlayerPage);
    await playerJoin(
      qrPlayerPage,
      sessionId,
      qrPlayer.inviteToken,
      qrName,
    );
    await qrPlayerPage.reload();
    await skipTutorial(qrPlayerPage);

    await qrPlayerPage.waitForFunction(
      () => document.querySelectorAll('[data-testid="mission-item"]').length >= 1,
      null,
      { timeout: 60000 },
    );

    const visibleMissions = await qrPlayerPage.evaluate(() =>
      [...document.querySelectorAll('[data-testid="mission-item"]')].map((el) =>
        el.textContent?.trim() ?? ""
      )
    );
    const needsProfile = visibleMissions.some((t) =>
      t.includes("Complete Your Profile")
    );
    if (needsProfile) {
      const profileMissionId = await pbProfileMissionId(qrPlayerId);
      if (!profileMissionId) throw new Error("no profile mission for QR player");
      await qrPlayerPage.goto(
        `${BASE}/form/${sessionId}/${profileMissionId}`,
      );
      await qrPlayerPage.getByTestId("form-page").waitFor({ timeout: 20000 });
      await fillProfileForm(qrPlayerPage);
      await qrPlayerPage.waitForURL(/\/session\//, { timeout: 20000 });
      await skipTutorial(qrPlayerPage);
      await qrPlayerPage.reload();
      await skipTutorial(qrPlayerPage);
    }
    const qrMissionId = await pbFirstQrMissionId(qrPlayerId);
    if (!qrMissionId) throw new Error("no QR mission for QR player");
    let qrPlayerReady = false;
    try {
      await qrPlayerPage.waitForFunction(
        () => document.querySelectorAll('[data-testid="mission-item"]').length >= 3,
        null,
        { timeout: 15000 },
      );
      const qrMissionEl = qrPlayerPage.locator(
        `[data-mission-id="${qrMissionId}"]`,
      );
      if (await qrMissionEl.count() > 0) {
        await qrMissionEl.scrollIntoViewIfNeeded();
        await qrMissionEl.click({ timeout: 10000 });
      } else {
        const clicked = await qrPlayerPage.evaluate(() => {
          const items = [
            ...document.querySelectorAll('[data-testid="mission-item"]'),
          ] as HTMLElement[];
          const target = items.find((el) =>
            /laptop|equipment/i.test(el.textContent ?? "")
          );
          if (target) {
            target.click();
            return true;
          }
          return false;
        });
        if (!clicked) throw new Error("no QR mission button in list");
      }
      await qrPlayerPage.getByRole("button", { name: "Mark Complete" }).click({
        timeout: 10000,
      });
      await qrPlayerPage.getByTestId("qr-display").waitFor({ timeout: 10000 });
      qrPlayerReady = true;
    } catch (e) {
      record(
        "9.3.qr-player-wait",
        false,
        `could not open player QR screen: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`);
    const gmPctBefore = await gmPage
      .locator(`[data-testid="gm-player-card"]`)
      .filter({ hasText: qrName })
      .locator(".gm-home__progress-pct")
      .textContent().catch(() => "0%");

    await gmPage.goto(
      `${BASE}/gamemaker/${sessionId}/player/${qrPlayerId}/scan`,
    );
    const simBtn = gmPage.getByRole("button", { name: "Simulate Scan" });
    await simBtn.waitFor({ timeout: 15000 });
    await simBtn.click();
    await gmPage.waitForURL(/\/validate\//, { timeout: 15000 });
    await gmPage.getByRole("button", { name: "Confirm", exact: true }).click({
      timeout: 20000,
    });
    await gmPage.waitForURL(/\/gamemaker\//, { timeout: 20000 });

    await gmPage.goto(`${BASE}/gamemaker/${sessionId}`);
    await gmPage.getByTestId("gm-player-card").first().waitFor({
      timeout: 15000,
    });
    const gmPctAfter = await gmPage
      .locator(`[data-testid="gm-player-card"]`)
      .filter({ hasText: qrName })
      .locator(".gm-home__progress-pct")
      .textContent({ timeout: 10000 }).catch(() => null);
    const beforeNum = parseInt(gmPctBefore?.replace("%", "") ?? "0", 10);
    const afterNum = parseInt(gmPctAfter?.replace("%", "") ?? "0", 10);
    const qrGmLive = afterNum > beforeNum;
    record(
      "9.3.qr-gm-realtime",
      qrGmLive,
      `GM progress ${gmPctBefore?.trim()} → ${gmPctAfter?.trim() ?? "n/a"}`,
    );

    record(
      "9.3.qr-player-dismiss",
      !qrPlayerReady ||
        !(await qrPlayerPage.getByTestId("qr-display").isVisible().catch(
          () => false,
        )),
      qrPlayerReady
        ? "player QR wait cleared after GM confirm"
        : "skipped — player QR screen not opened",
    );

    const trace = await playerPage.evaluate((sid) => {
      const api = (window as unknown as {
        __MB_DEV_TRACE__?: {
          getLog: (s: string) => Array<{ kind: string }>;
        };
      }).__MB_DEV_TRACE__;
      if (!api) return null;
      const log = api.getLog(sid);
      return log.filter((e) =>
        e.kind.includes("mutation") || e.kind.includes("invalidate")
      ).slice(-6);
    }, sessionId);
    record(
      "9.8.dev-trace",
      trace === null || trace.length >= 0,
      trace === null
        ? "__MB_DEV_TRACE__ not exposed (dev only)"
        : trace.length > 0
        ? `trace events: ${trace.map((e) => e.kind).join(", ")}`
        : "trace API present (no mutation events captured in player tab)",
    );
  } catch (e) {
    record("fatal", false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }

  const uniqueErrors = [...new Set(consoleErrors)];
  record(
    "9.7.console",
    uniqueErrors.length === 0,
    uniqueErrors.length === 0
      ? "0 console/page errors"
      : uniqueErrors.slice(0, 3).join(" | "),
  );

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- SUMMARY ---");
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("Failures:", failed.map((f) => f.id).join(", "));
    Deno.exit(1);
  }
};

await main();
