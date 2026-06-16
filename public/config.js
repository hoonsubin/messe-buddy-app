// Runtime configuration — overwritten by the container entrypoint at startup.
// This default (used by `deno task dev` and any build without the container
// entrypoint) keeps the app on the offline mock so it runs with no key.
window.__MB_CONFIG__ = { useMockChat: true };
