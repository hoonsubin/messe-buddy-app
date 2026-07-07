import assert from "node:assert/strict";
import type { AppAdapter } from "../adapters/interface.ts";
import type { Player } from "../types/index.ts";
import { createQueryClient } from "./queryClient.ts";
import { pbEqFilter } from "./realtimeFilters.ts";
import { createSubscriptionBookkeeper } from "./subscriptionBookkeeper.ts";

const makeMockAdapter = (
  onSubscribe?: (
    collection: string,
    filter: string | undefined,
    onEvent: (
      action: "create" | "update" | "delete",
      record: unknown,
    ) => void,
  ) => void,
): AppAdapter => {
  const handlers = new Map<
    string,
    Set<
      (
        action: "create" | "update" | "delete",
        record: unknown,
      ) => void
    >
  >();

  const topicKey = (collection: string, filter?: string) =>
    `${collection}\0${filter ?? ""}`;

  return {
    subscribeCollection(
      collection: string,
      filter: string | undefined,
      onEvent: (
        action: "create" | "update" | "delete",
        record: unknown,
      ) => void,
    ) {
      const key = topicKey(collection, filter);
      let set = handlers.get(key);
      if (!set) {
        set = new Set();
        handlers.set(key, set);
      }
      set.add(onEvent);
      onSubscribe?.(collection, filter, onEvent);
      return () => set?.delete(onEvent);
    },
  } as unknown as AppAdapter;
};

Deno.test("subscriptionBookkeeper ref-counts topics per collection filter", () => {
  const bookkeeper = createSubscriptionBookkeeper();
  const client = createQueryClient();
  let subscribeCalls = 0;

  const adapter = makeMockAdapter(() => {
    subscribeCalls += 1;
  });

  const sessionId = "sess_1";
  const filter = pbEqFilter("sessionId", sessionId);
  const dep = { collection: "players", filter };
  const key = `gmRoster:${sessionId}`;

  const unsubA = bookkeeper.register(adapter, client, key, dep);
  const unsubB = bookkeeper.register(adapter, client, key, dep);

  assert.equal(subscribeCalls, 1);

  unsubA();
  assert.equal(subscribeCalls, 1);

  unsubB();
  assert.equal(subscribeCalls, 1);
});

Deno.test("subscriptionBookkeeper invalidates cache on push without custom handler", async () => {
  const bookkeeper = createSubscriptionBookkeeper();
  const client = createQueryClient();
  let pushHandler: (
    action: "create" | "update" | "delete",
    record: unknown,
  ) => void = () => {};

  const adapter = makeMockAdapter((_collection, _filter, onEvent) => {
    pushHandler = onEvent;
  });

  const key = "templates";
  const dep = { collection: "templates" };
  const unsub = bookkeeper.register(adapter, client, key, dep);

  await client.fetchQuery(key, async () => ["tpl-a"]);
  assert.deepEqual(client.getQueryState<ReadonlyArray<string>>(key).data, [
    "tpl-a",
  ]);

  pushHandler("update", { name: "tpl-b" });

  assert.equal(
    client.getQueryState<ReadonlyArray<string>>(key).isStale,
    true,
  );

  unsub();
});

Deno.test("subscriptionBookkeeper routes gmRoster player events through patch handler", async () => {
  const bookkeeper = createSubscriptionBookkeeper();
  const client = createQueryClient();
  let pushHandler: (
    action: "create" | "update" | "delete",
    record: unknown,
  ) => void = () => {};

  const adapter = makeMockAdapter((_collection, _filter, onEvent) => {
    pushHandler = onEvent;
  });

  const sessionId = "sess_1";
  const player: Player = {
    id: "p1",
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    sessionId,
    inviteToken: "tok",
    claimStatus: "claimed",
    tutorialComplete: false,
    profileComplete: false,
    name: "Alex",
    jobTitle: "Engineer",
    team: "",
    startDate: "2026-01-01",
    location: "",
    timezone: "UTC",
    skillsConfident: [],
    skillsDevelop: [],
    languages: [],
  };

  const rosterKey = `gmRoster:${sessionId}`;
  const filter = pbEqFilter("sessionId", sessionId);

  await client.fetchQuery(rosterKey, async () => ({
    players: [player],
    allProgressEvents: [],
    rows: [{
      playerId: player.id,
      name: player.name,
      jobTitle: player.jobTitle,
      claimStatus: player.claimStatus,
      joined: true,
      progressPercent: 0,
      daysSinceLastActivity: null,
      isStalled: false,
    }],
  }));

  const unsub = bookkeeper.register(adapter, client, rosterKey, {
    collection: "players",
    filter,
  });

  pushHandler("update", { ...player, name: "Alex Updated" });

  assert.equal(
    client.getQueryState<{
      players: ReadonlyArray<Player>;
    }>(rosterKey).data?.players[0]?.name,
    "Alex Updated",
  );

  unsub();
});
