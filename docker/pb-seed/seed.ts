// One-shot PocketBase seed job.
//
// Runs the same idempotent use-cases the browser used to trigger as a side
// effect of loading the PWA (see src/adapters/pocketbase/mod.ts) — but from
// a container that docker-compose actually waits on and retries, instead of
// a client page-load nobody may ever trigger. Safe to run every boot:
// seedLibraryResources skips resourceKeys that already exist, and
// saveTemplate upserts by name (idx_name unique index in
// server/pb_migrations/002_templates.go).
import PocketBase from "pocketbase";
import { createPBAdapter } from "../../src/adapters/pocketbase/pbAdapter.ts";
import { seedLibraryResources } from "../../src/use-cases/seedLibraryResources.ts";
import { seedTemplates } from "../../src/use-cases/seedTemplates.ts";

const PB_URL = Deno.env.get("PB_URL") ?? "http://app/";
const pb = new PocketBase(PB_URL);
const adapter = createPBAdapter(pb);

// depends_on: app: condition: service_healthy (app's /api/health check)
// already covers the common case, but poll a little longer here too — belt
// and suspenders against any remaining gap between "healthy" and "actually
// ready for a write", and it turns a bad first attempt into a clear log line
// instead of a silent no-op like the old browser-side version.
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 2_000;

const waitUntilReady = async (): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await adapter.listLibraryResources();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, READY_POLL_MS));
    }
  }
  throw new Error(
    `pb-seed: PocketBase at ${PB_URL} never became ready to query: ${
      String(lastError)
    }`,
  );
};

await waitUntilReady();
await seedLibraryResources(adapter);
await seedTemplates(adapter);

console.log(
  "pb-seed: library resources + \"Messe München Onboarding\" template seeded (or already present).",
);
