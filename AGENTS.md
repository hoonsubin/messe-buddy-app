# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build / Lint / Run

All commands run through **Deno**, not npm/yarn. See [`deno.json`](deno.json:2).
- `deno task dev` — Vite dev server with `--host`
- `deno task build` — runs `tsc -b` then `vite build`
- `deno task lint` — runs ESLint on the project
- Node version: see [`.nvmrc`](.nvmrc:1) (Node 24). Deno auto-manages npm deps via `nodeModulesDir: "auto"`.

## Code Style (Non-Obvious Rules)

- **No TypeScript `enum`** — Always use `const` object + `keyof` union (C-12). See [`src/types/unions.ts`](src/types/unions.ts:4).
- **`verbatimModuleSyntax`** is on — use `import type` for type-only imports, never mix runtime and type imports in one statement.
- **`deno fmt`** is the formatter. Config in [`deno.json`](deno.json:15): 2-space indent, 80-char line width, semicolons required, double quotes. Only formats `src/`.
- **All interface fields are `readonly`**; collections are `ReadonlyArray<T>`. Mutations go through the adapter, never by direct property assignment.
- **`interface`** for object contracts; **`type`** for unions, intersections, aliases.

## Architecture (Non-Obvious)

- **Adapter Pattern**: All data access goes through [`AppAdapter`](src/adapters/interface.ts:17). Currently only [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) exists (in-memory Maps). The [`pocketbase/`](src/adapters/pocketbase) adapter directory is empty — implementing it is the next step for real persistence.
- **Use cases are pure functions**: Business logic lives in [`src/use-cases/`](src/use-cases/exportTemplate.ts:1). Components call use cases; use cases call the adapter. Components never call the adapter directly.
- **`upsertProgressEvent` is the single write path** for all ProgressEvent mutations (C-05, C-14). No component may PATCH/POST to `progress_events` directly.
- **Adapter boundary types** ([`src/types/domain.ts`](src/types/domain.ts:105)): `FormSchemaRaw` and `ProgressEventRaw` have JSON-stringified fields (`fields`, `formResponse`). The adapter parses these into typed interfaces. No component ever calls `JSON.parse` on a PB record field (C-13).
- **Template export embeds remapping keys**: [`exportTemplate`](src/use-cases/exportTemplate.ts:27) adds `_milestoneOrder` and `_missionOrder` to strip PB IDs while preserving FK relationships for [`importTemplate`](src/use-cases/importTemplate.ts:13).
- **QR payloads**: [`qrPayload.ts`](src/utils/qrPayload.ts:1) is the single encode/decode point (C-16). Uses HMAC-SHA256 with a session secret. No component touches QR strings directly.
- **No auth system** (C-03): Identity is UID-based, stored in `localStorage.getItem('mb_identity')`. The `role` field is client-stored and not server-validated.

## Docker / Deployment Gotchas

- `VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** variables frozen into the JS bundle. Change them via `docker compose build --build-arg`, not environment variables at runtime.
- LiteLLM is reached directly by the browser on `:4000`, not proxied through nginx.

## Reference

- **Authoritative spec**: [`SPECS.md`](SPECS.md:1) — read this before making architectural decisions. All constraints (C-01 through C-17) are defined there.
