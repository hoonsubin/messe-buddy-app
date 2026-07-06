import type { AppAdapter } from "../adapters/interface.ts";
import { DEFAULT_LIBRARY_RESOURCES } from "../constants/defaultLibraryResources.ts";

/**
 * Ensures the shared library resources declared in `defaultLibraryResources.ts`
 * exist on the given adapter. Idempotent — skips any `resourceKey` that
 * already exists, so running it repeatedly never duplicates resources.
 */
export const seedLibraryResources = async (
  adapter: AppAdapter,
): Promise<void> => {
  const existing = await adapter.listLibraryResources();
  const existingKeys = new Set(existing.map((r) => r.resourceKey));

  for (const resource of DEFAULT_LIBRARY_RESOURCES) {
    if (existingKeys.has(resource.resourceKey)) continue;
    await adapter.createLibraryResource(resource);
  }
};
