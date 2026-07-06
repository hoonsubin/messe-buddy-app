import type { AppAdapter } from "../adapters/interface.ts";

/**
 * Ensures a session shows the given background image — without clobbering
 * a GM's own uploaded background if one is already set. Uploads a real
 * `File` when the browser APIs are available (needed for PocketBase's
 * `bgImageUrl` file field; mock accepts either a `File` or a plain string).
 * Falls back to passing `imageUrl` straight through when `fetch`/`File`
 * aren't available (e.g. non-browser test environments) or the fetch
 * fails — mockAdapter accepts a plain string directly.
 */
export const applyDefaultSessionBackground = async (
  sessionId: string,
  imageUrl: string,
  adapter: AppAdapter,
): Promise<void> => {
  const session = await adapter.getSession(sessionId);
  if (session.bgImageUrl) return; // Already set/customized — don't overwrite.

  if (typeof fetch === "undefined" || typeof File === "undefined") {
    await adapter.updateSession(sessionId, { bgImageUrl: imageUrl });
    return;
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], "map-background.jpg", {
      type: blob.type || "image/jpeg",
    });
    await adapter.updateSession(sessionId, { bgImageUrl: file });
  } catch {
    await adapter.updateSession(sessionId, { bgImageUrl: imageUrl });
  }
};
