import assert from "node:assert/strict";
import type { AppAdapter } from "../adapters/interface.ts";
import type { Session } from "../types/index.ts";
import { applyDefaultSessionBackground } from "./applyDefaultSessionBackground.ts";

// No network access in this test run, so fetch() always fails and the
// use-case falls back to passing the URL straight through — that fallback
// is exactly the branch that exercises the guard logic we care about here
// (skip vs. set), independent of real image bytes.
const FAKE_IMAGE_URL = "https://example.invalid/map-background.jpg";

const createStubAdapter = (initial: Session) => {
  let session = initial;
  const adapter = {
    getSession: async (sessionId: string) => {
      if (sessionId !== session.id) throw new Error("not found");
      return session;
    },
    updateSession: async (
      _sessionId: string,
      patch: Partial<Session> & { readonly bgImageUrl?: string | File },
    ) => {
      session = {
        ...session,
        ...patch,
        bgImageUrl: typeof patch.bgImageUrl === "string"
          ? patch.bgImageUrl
          : session.bgImageUrl,
      };
      return session;
    },
  } as unknown as AppAdapter;

  return { adapter, getSession: () => session };
};

const baseSession: Session = {
  id: "sess_test",
  created: "now",
  updated: "now",
  name: "Test Session",
  bgImageUrl: "",
  mapNodeScale: 0.33,
  gameMakerId: "uid_gm",
  gmRecoveryKey: "TEST1234",
  preBoardingChecks: [],
};

Deno.test("applyDefaultSessionBackground sets the background when unset", async () => {
  const { adapter, getSession } = createStubAdapter(baseSession);

  await applyDefaultSessionBackground("sess_test", FAKE_IMAGE_URL, adapter);

  assert.equal(getSession().bgImageUrl, FAKE_IMAGE_URL);
});

Deno.test("applyDefaultSessionBackground does not overwrite an existing background", async () => {
  const { adapter, getSession } = createStubAdapter({
    ...baseSession,
    bgImageUrl: "https://example.invalid/gm-uploaded.jpg",
  });

  await applyDefaultSessionBackground("sess_test", FAKE_IMAGE_URL, adapter);

  assert.equal(getSession().bgImageUrl, "https://example.invalid/gm-uploaded.jpg");
});
