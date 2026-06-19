// Runtime configuration - overwritten by the container entrypoint at startup.
// This default (used by `deno task dev`, GitHub Pages, and any build without the
// container entrypoint) keeps the app in offline mock mode so it requires no
// backend or API key.
window.__MB_CONFIG__ = { useMockChat: true, useMockPb: true };
