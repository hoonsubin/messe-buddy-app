import PocketBase from "pocketbase";
import { createPBAdapter } from "./pbAdapter.ts";
import { seedLibraryResources } from "../../use-cases/seedLibraryResources.ts";
import { seedTemplates } from "../../use-cases/seedTemplates.ts";

const PB_URL = (() => {
  if (typeof window !== "undefined" && window.__MB_CONFIG__?.pbUrl) {
    return window.__MB_CONFIG__.pbUrl;
  }
  return import.meta.env.VITE_PB_URL ?? "/";
})();

export const pb = new PocketBase(PB_URL);

pb.autoCancellation(false);

export const pbAdapter = createPBAdapter(pb);

// Best-effort: registers the shared library resources and the bundled
// "Messe München Onboarding" template on a real PocketBase instance so
// they're selectable/resolvable the same way mockAdapter's demo instance
// already is. Idempotent — safe to run on every boot. Deliberately does
// NOT seed a demo session/players here (that would fabricate data on a
// real cohort's backend); see seedDemoInstance.ts for that, which is only
// ever called against mockAdapter.
//
// This module is imported unconditionally regardless of which adapter mode
// is active (see AdapterContextValue.ts), so failures (e.g. mock-only dev
// with no PocketBase server running) are swallowed rather than thrown.
void (async () => {
  try {
    await seedLibraryResources(pbAdapter);
    await seedTemplates(pbAdapter);
  } catch {
    // No reachable PocketBase instance — ignore.
  }
})();
