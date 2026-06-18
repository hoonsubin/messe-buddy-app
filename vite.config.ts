import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
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

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: { proxy: { "/api": apiProxy } },
  preview: { proxy: { "/api": apiProxy } },
});
