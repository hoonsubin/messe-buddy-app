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
});

Deno.test("resolveRealtimeDeps maps journey to player-scoped milestones and missions", () => {
  const playerId = "player_sofia";
  const deps = resolveRealtimeDeps(`journey:sess_mmt2026:${playerId}`);
  const expectedFilter = pbEqFilter("playerId", playerId);

  assert.equal(deps.length, 2);
  assert.deepEqual(deps[0], {
    collection: "milestones",
    filter: expectedFilter,
  });
  assert.deepEqual(deps[1], {
    collection: "missions",
    filter: expectedFilter,
  });
});

Deno.test("resolveRealtimeDeps maps progress to player-scoped progress_events", () => {
  const playerId = "player_sofia";
  const deps = resolveRealtimeDeps(`progress:${playerId}`);

  assert.deepEqual(deps, [{
    collection: "progress_events",
    filter: pbEqFilter("playerId", playerId),
  }]);
});
