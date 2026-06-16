/**
 * Landing smoke test — Firefox + iPhone 15 (matches Playwright MCP config).
 * Run: deno run -A --node-modules-dir=auto scripts/smoke-landing.ts
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { devices, firefox } from "npm:playwright@^1.61.0";

const BASE = Deno.env.get("SMOKE_BASE_URL") ?? "http://localhost:5173";
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

const main = async () => {
  await mkdir(OUT, { recursive: true });

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 15"] });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="landing-page"]');
    const title = await page.locator(".landing__title").textContent();
    record("Landing loads", Boolean(title?.includes("Employee Onboarding")));
    await page.screenshot({
      path: join(OUT, "01-landing-role-select.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "New Employee" }).click();
    await page.waitForSelector("#session-code");
    record(
      "Join view opens",
      Boolean((await page.locator(".landing__subtitle").textContent())?.includes(
        "session code",
      )),
    );
    await page.screenshot({
      path: join(OUT, "02-landing-join.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Back" }).click();
    record(
      "Back to role-select",
      await page.getByRole("button", { name: "Admin", exact: true }).isVisible(),
    );

    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await page.waitForSelector("#session-name");
    record(
      "Create view opens",
      Boolean((await page.locator(".landing__subtitle").textContent())?.includes(
        "Create a new",
      )),
    );
    await page.screenshot({
      path: join(OUT, "03-landing-create.png"),
      fullPage: true,
    });

    await page.goto(`${BASE}/join/sess_mmt2026`, { waitUntil: "networkidle" });
    const prefilled = await page.inputValue("#session-code");
    record(
      "Invite link prefills session code",
      prefilled === "sess_mmt2026",
      `value="${prefilled}"`,
    );
    await page.screenshot({
      path: join(OUT, "04-landing-join-prefill.png"),
      fullPage: true,
    });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "As Employee", exact: true }).click();
    await page.waitForURL(/\/session\//, { timeout: 8000 });
    record(
      "Demo employee navigates to cockpit",
      page.url().includes("/session/"),
      page.url(),
    );
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 8000 });
    await page.screenshot({
      path: join(OUT, "05-player-cockpit.png"),
      fullPage: true,
    });

    const benign = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404"),
    );
    record("No console errors", benign.length === 0, benign.join("; ") || "clean");
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.error("Failed:", failed.map((f) => f.name).join(", "));
    Deno.exit(1);
  }
};

await main();
