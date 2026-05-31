/**
 * Generate package.json from deno.json imports
 *
 * This script reads the imports from deno.json and generates a package.json
 * compatible with Node.js ecosystems (npm, hosting platforms, etc).
 *
 * Run: deno run -A scripts/generate-package-json.ts
 *
 * Output: package.json at project root
 */

// Deno.readTextFileSync is a built-in Deno API — no import needed

interface DenoConfig {
  imports?: Record<string, string>;
}

interface PackageJson {
  name: string;
  private: boolean;
  version: string;
  type: "module";
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// Read deno.json
const denoJsonPath = new URL("../deno.json", import.meta.url).pathname;
const denoJsonContent = Deno.readTextFileSync(denoJsonPath);
const denoConfig: DenoConfig = JSON.parse(denoJsonContent);

if (!denoConfig.imports) {
  throw new Error("No imports found in deno.json");
}

// Separate runtime vs dev dependencies
// Convention: core deps without @types are runtime, everything else is dev
const runtimePackages = ["react", "react-dom"];
const dependencies: Record<string, string> = {};
const devDependencies: Record<string, string> = {};

for (const [key, value] of Object.entries(denoConfig.imports)) {
  // Extract version from npm:package@version format
  const npmMatch = value.match(/^npm:(.+)@(.+)$/);
  if (!npmMatch) {
    console.warn(`Skipping malformed import: ${key}=${value}`);
    continue;
  }

  const [, pkgName, version] = npmMatch;
  const target = runtimePackages.includes(key) ? dependencies : devDependencies;
  // Normalize: strip leading ^ or ~, then add ^ for semver compatibility
  const sanitized = version.replace(/^[\^~]/, "");
  target[pkgName] = `^${sanitized}`;
}

// Generate package.json
const packageJson: PackageJson = {
  name: "messe-buddy-app",
  private: true,
  version: "0.0.0",
  type: "module",
  dependencies,
  devDependencies,
};

// Write package.json
const packageJsonPath = new URL("../package.json", import.meta.url).pathname;
Deno.writeTextFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + "\n",
);

console.log(
  `✓ Generated package.json with ${
    Object.keys(dependencies).length
  } runtime deps and ${Object.keys(devDependencies).length} dev deps`,
);
