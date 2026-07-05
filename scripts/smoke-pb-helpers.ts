/** Shared PocketBase smoke helpers for phase-1/phase-2 scripts. */

export interface SmokeResult {
  readonly name: string;
  readonly pass: boolean;
  readonly detail?: string;
}

export const pbApi = (base: string) => `${base}/api`;

export const pbList = async (
  base: string,
  collection: string,
  filter?: string,
): Promise<Record<string, unknown>[]> => {
  const q = filter
    ? `?filter=${encodeURIComponent(filter)}&perPage=200`
    : "?perPage=200";
  const res = await fetch(`${pbApi(base)}/collections/${collection}/records${q}`);
  if (!res.ok) throw new Error(`PB list ${collection}: ${res.status}`);
  const body = await res.json();
  return body.items ?? [];
};

export const pbCreate = async (
  base: string,
  collection: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const res = await fetch(`${pbApi(base)}/collections/${collection}/records`, {
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

export const parseJoinUrl = (url: string): { sessionId: string; token: string } => {
  const u = new URL(url);
  return {
    sessionId: u.pathname.split("/join/")[1] ?? "",
    token: u.searchParams.get("t") ?? "",
  };
};

export const minimalTemplate = (name: string) => ({
  exportType: "template" as const,
  exportedAt: new Date().toISOString(),
  name,
  milestones: [{
    name: "Welcome",
    order: 1,
    xPercent: 50,
    yPercent: 50,
    xpThreshold: 10,
  }],
  missions: [{
    title: "Template starter mission",
    body: "Seeded from E2E template",
    type: "text",
    xpValue: 10,
    order: 1,
    isInCurrentMissions: true,
    validationMethod: "selfApprove",
    tags: [],
    _milestoneOrder: 1,
  }],
  formSchemas: [],
  resourceBindings: [],
});

export const createRecorder = (results: SmokeResult[]) =>
(
  name: string,
  pass: boolean,
  detail = "",
) => {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? `: ${detail}` : ""}`);
};

export const summarizeAndExit = (
  results: SmokeResult[],
  label = "Summary",
): void => {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n--- ${label} ---`);
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.error("Failed:", failed.map((f) => f.name).join(", "));
    Deno.exit(1);
  }
};
