import assert from "node:assert/strict";
import type { AppAdapter } from "../adapters/interface.ts";
import type { LibraryResource, PBRecord } from "../types/index.ts";
import { seedLibraryResources } from "./seedLibraryResources.ts";

const createStubAdapter = () => {
  const resources = new Map<string, LibraryResource>();
  let nextId = 1;

  const adapter = {
    listLibraryResources: async () => [...resources.values()],
    createLibraryResource: async (
      data: Omit<LibraryResource, keyof PBRecord>,
    ) => {
      const record: LibraryResource = {
        id: `lib_gen_${nextId++}`,
        created: "now",
        updated: "now",
        ...data,
      };
      resources.set(record.id, record);
      return record;
    },
  } as unknown as AppAdapter;

  return { adapter, resources };
};

Deno.test("seedLibraryResources creates all 7 declared resources", async () => {
  const { adapter, resources } = createStubAdapter();

  await seedLibraryResources(adapter);

  assert.equal(resources.size, 7);
  const keys = new Set([...resources.values()].map((r) => r.resourceKey));
  assert.deepEqual(
    keys,
    new Set([
      "campus_map",
      "wenet",
      "it_help",
      "welcome_video",
      "absence",
      "org_chart",
      "benefits",
    ]),
  );
});

Deno.test("seedLibraryResources is idempotent", async () => {
  const { adapter, resources } = createStubAdapter();

  await seedLibraryResources(adapter);
  await seedLibraryResources(adapter);

  assert.equal(resources.size, 7);
});

Deno.test("seedLibraryResources skips only resources that already exist", async () => {
  const { adapter, resources } = createStubAdapter();

  // Pre-seed one resourceKey out-of-band (e.g. an existing PB instance).
  await adapter.createLibraryResource({
    resourceKey: "campus_map",
    title: "Pre-existing campus map",
    type: "guide",
    url: "https://example.test/pre-existing",
  });

  await seedLibraryResources(adapter);

  assert.equal(resources.size, 7);
  const campusMap = [...resources.values()].find((r) =>
    r.resourceKey === "campus_map"
  );
  assert.equal(campusMap?.title, "Pre-existing campus map");
});
