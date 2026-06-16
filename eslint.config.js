import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Demoted to warn: legitimate external-system sync patterns (sessionStorage,
      // localStorage, DOM scroll) require setState in effects. See React 19 docs:
      // https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect
      "react-hooks/set-state-in-effect": "warn",
      // Demoted to warn: React 19 Compiler handles memoization automatically.
      // Manual useCallback/useMemo can conflict with compiler optimizations.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);
