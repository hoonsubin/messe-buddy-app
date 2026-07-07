import assert from "node:assert/strict";
import { pbEqFilter } from "./realtimeFilters.ts";
import { resolveRealtimeDeps } from "./realtimeDeps.ts";

Deno.test("resolveRealtimeDeps maps gmRoster to session-scoped topics", () => {
  const sessionId = "sess_abc";
  const deps = resolveRealtimeDeps(`gmRoster:${sessionId}`);
  const expectedFilter = pbEqFilter("sessionId", sessionId);

  assert.equal(deps.length, 2);
  assert.deepEqual(deps[0], {
    collection: "players",
    filter: expectedFilter,
  });
  assert.deepEqual(deps[1], {
    collection: "progress_events",
    filter: expectedFilter,
  });
});

Deno.test("resolveRealtimeDeps returns empty for unknown keys", () => {
  assert.deepEqual(resolveRealtimeDeps("templates"), []);
  assert.deepEqual(resolveRealtimeDeps("journey:s1:p1"), []);
});
