import type { Page } from "npm:playwright@^1.61.0";

export interface SmokeResult {
  readonly name: string;
  readonly pass: boolean;
  readonly detail?: string;
}

export const SMOKE_OUT_DIR = ".playwright-mcp";

/** Console noise expected in local mock / no-LiteLLM dev. */
export function isBenignConsoleError(text: string): boolean {
  return (
    text.includes("favicon") ||
    text.includes("404") ||
    text.includes("service worker") ||
    text.includes("localhost:4000/health") ||
    text.includes("CORS request did not succeed")
  );
}

export function createRecorder(results: SmokeResult[]) {
  return (name: string, pass: boolean, detail = "") => {
    results.push({ name, pass, detail });
    const icon = pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${name}${detail ? `: ${detail}` : ""}`);
  };
}

export function summarizeAndExit(
  results: SmokeResult[],
  label = "Summary",
): void {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n--- ${label} ---`);
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.error("Failed:", failed.map((f) => f.name).join(", "));
    Deno.exit(1);
  }
}

export async function dismissRecoveryIfPresent(page: Page): Promise<void> {
  const dismiss = page.getByRole("button", {
    name: "I've saved my recovery key",
  });
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
}

/** Player cockpit tutorial overlay — optional on demo/first visit. */
export async function dismissTutorialIfPresent(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: "Let's start" });
  if (await start.isVisible({ timeout: 2000 }).catch(() => false)) {
    await start.click();
  }
}

export function attachConsoleCollector(page: Page, sink: string[]): void {
  page.on("console", (msg) => {
    if (msg.type() === "error") sink.push(msg.text());
  });
  page.on("pageerror", (err) => sink.push(String(err)));
}
