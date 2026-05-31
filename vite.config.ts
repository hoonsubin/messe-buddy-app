import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS === "true" && repoName
  ? `/${repoName}/`
  : "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
