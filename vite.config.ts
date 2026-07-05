import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
// Project Pages use /{repo}/ on *.github.io; a custom domain (public/CNAME) is served from /.
const hasCustomDomain = existsSync(
  join(import.meta.dirname!, "public/CNAME"),
);
const base = process.env.GITHUB_ACTIONS === "true" && repoName &&
    !hasCustomDomain
  ? `/${repoName}/`
  : "/";

const apiProxy = {
  target: "http://127.0.0.1:8090",
  changeOrigin: true,
} as const;

// Mirrors docker/nginx.conf's same-origin /llm proxy for the plain Vite dev
// server. Without this, useAssistantAvailability's readiness poll hits
// LLM_BASE_URL's http://localhost:4000 fallback directly, cross-origin, and
// logs a CORS error on every player-cockpit page load even though the
// failure is already handled gracefully in the UI. Proxying same-origin
// turns that into an ordinary (silently caught) fetch failure when no
// LiteLLM instance is running locally, matching prod topology instead of
// diverging from it.
const llmProxy = {
  target: "http://127.0.0.1:4000",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/llm/, ""),
} as const;

// `public/config.js` is a static, committed file hardcoding
// `{ useMockPb: true }` — the safe default for `deno task dev` / GitHub Pages.
// In production it's overwritten at container boot by docker/entrypoint.sh.
// Nothing overwrites it for the plain Vite dev server, so `resolveUseMockPb()`
// (which checks `window.__MB_CONFIG__` before `import.meta.env.VITE_USE_MOCK_PB`)
// always saw the mock adapter regardless of env vars — silently. This plugin
// mirrors entrypoint.sh's behavior for `deno task dev:full`: when
// VITE_USE_MOCK_PB=false is set, intercept /config.js before Vite's static
// middleware serves the committed file.
const devLiveConfigPlugin = (): Plugin => ({
  name: "messebuddy-dev-live-config",
  configureServer(server) {
    if (process.env.VITE_USE_MOCK_PB !== "false") return;
    server.middlewares.use((req, res, next) => {
      if (req.url !== "/config.js") return next();
      res.setHeader("Content-Type", "application/javascript");
      res.end(
        "window.__MB_CONFIG__ = { useMockChat: true, useMockPb: false };",
      );
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), devLiveConfigPlugin()],
  server: { proxy: { "/api": apiProxy, "/llm": llmProxy } },
  preview: { proxy: { "/api": apiProxy, "/llm": llmProxy } },
});
