import assert from "node:assert/strict";
import { createQueryClient } from "./queryClient.ts";

Deno.test("fetchQuery coalesces concurrent requests for the same key", async () => {
  const client = createQueryClient();
  let calls = 0;

  const fetcher = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return "ok";
  };

  const [a, b] = await Promise.all([
    client.fetchQuery("sessionMeta:s1", fetcher),
    client.fetchQuery("sessionMeta:s1", fetcher),
  ]);

  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(calls, 1);
});

Deno.test("fetchQuery serves cache hit without calling fetcher again", async () => {
  const client = createQueryClient();
  let calls = 0;

  await client.fetchQuery("sessionMeta:s1", async () => {
    calls += 1;
    return { id: "s1" };
  });

  const hit = await client.fetchQuery("sessionMeta:s1", async () => {
    calls += 1;
    return { id: "s1" };
  });

  assert.deepEqual(hit, { id: "s1" });
  assert.equal(calls, 1);
});

Deno.test("invalidateQuery marks stale and triggers refetch on next fetchQuery", async () => {
  const client = createQueryClient();
  let calls = 0;

  await client.fetchQuery("progress:p1", async () => {
    calls += 1;
    return ["e1"];
  });

  client.invalidateQuery("progress:p1");

  const refreshed = await client.fetchQuery("progress:p1", async () => {
    calls += 1;
    return ["e1", "e2"];
  });

  assert.deepEqual(refreshed, ["e1", "e2"]);
  assert.equal(calls, 2);
});

Deno.test("getQueryState distinguishes isInitialLoading vs isRefreshing", async () => {
  const client = createQueryClient();

  let resolve!: (value: string) => void;
  const gate = new Promise<string>((r) => {
    resolve = r;
  });

  const first = client.fetchQuery("player:uid:u1", () => gate);
  assert.equal(
    client.getQueryState<string>("player:uid:u1").isInitialLoading,
    true,
  );
  assert.equal(
    client.getQueryState<string>("player:uid:u1").isRefreshing,
    false,
  );

  resolve("player");
  await first;

  let resolveSecond!: (value: string) => void;
  const gate2 = new Promise<string>((r) => {
    resolveSecond = r;
  });

  client.invalidateQuery("player:uid:u1");
  const second = client.fetchQuery("player:uid:u1", () => gate2);

  assert.equal(
    client.getQueryState<string>("player:uid:u1").isInitialLoading,
    false,
  );
  assert.equal(
    client.getQueryState<string>("player:uid:u1").isRefreshing,
    true,
  );

  resolveSecond("player");
  await second;

  assert.equal(
    client.getQueryState<string>("player:uid:u1").isRefreshing,
    false,
  );
  assert.equal(client.getQueryState<string>("player:uid:u1").data, "player");
});

Deno.test("patchQuery updates cache without a network fetch", async () => {
  const client = createQueryClient();

  await client.fetchQuery("progress:p1", async () => ["a"]);

  client.patchQuery<ReadonlyArray<string>>("progress:p1", (old) => [
    ...(old ?? []),
    "b",
  ]);

  assert.deepEqual(
    client.getQueryState<ReadonlyArray<string>>("progress:p1").data,
    [
      "a",
      "b",
    ],
  );
});

Deno.test("fetchQuery does not retry cached errors until invalidated", async () => {
  const client = createQueryClient();
  let calls = 0;

  await assert.rejects(
    () =>
      client.fetchQuery("sessionMeta:missing", async () => {
        calls += 1;
        throw new Error("404");
      }),
    /404/,
  );

  await assert.rejects(
    () =>
      client.fetchQuery("sessionMeta:missing", async () => {
        calls += 1;
        throw new Error("404");
      }),
    /404/,
  );

  assert.equal(calls, 1);

  client.invalidateQuery("sessionMeta:missing");

  await assert.rejects(
    () =>
      client.fetchQuery("sessionMeta:missing", async () => {
        calls += 1;
        throw new Error("404");
      }),
    /404/,
  );

  assert.equal(calls, 2);
});

Deno.test("journey key is not fetched when caller skips fetchQuery", async () => {
  const client = createQueryClient();
  let calls = 0;

  const playerId = "";
  const key = playerId ? `journey:s1:${playerId}` : null;

  if (key) {
    await client.fetchQuery(key, async () => {
      calls += 1;
      return { milestones: [], missions: [] };
    });
  }

  assert.equal(calls, 0);
});
