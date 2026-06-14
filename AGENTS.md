# AGENTS.md

This file provides guidance to AI coding agents when working with this repository. It complements [`README.md`](README.md:1) with agent-specific technical context. The authoritative project specification is [`SPECS.md`](SPECS.md:1) — read it before making architectural decisions.

---

## Project Overview

MesseBuddy is a **mobile-first Progressive Web App (PWA)** that gamifies corporate onboarding. Players navigate an interactive map of office spaces (Milestones), each containing activities (Missions) to complete. A Game Maker admin configures the experience and validates progress.

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript (strict) + Vite 8 |
| Runtime | Deno 2.8+ (replaces Node/npm entirely) |
| Backend | PocketBase (Go binary, REST + SSE + SQLite) |
| AI Gateway | LiteLLM Proxy (OpenAI-compatible `/chat/completions`) |
| Vector DB | PostgreSQL + pgvector extension |
| Package Manager | Deno's native npm import resolution (`nodeModulesDir: "auto"`) |

**Key non-obvious facts:**
- **No auth system** — identity is UID-based, stored in `localStorage` as [`mb_identity`](src/hooks/useIdentity.ts:4). The `role` field is client-stored and **not** server-validated.
- **No tests exist yet** — adding tests is a high-priority future task. When added, use `Deno.test`, co-locate as `*.test.ts`/`.tsx`, and use [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) as test fixtures.
- **The [`pocketbase/` adapter directory](src/adapters/pocketbase/) is empty** — only the mock adapter exists. Implementing a real PocketBase adapter is the next major architectural step.

---

## Commands

All commands run through **Deno** (not npm). Tasks defined in [`deno.json`](deno.json:2).

```sh
deno install                  # Pre-fetch all npm dependencies
deno task dev                 # Start Vite dev server with HMR (all network interfaces)
deno task build               # Type check + production build → dist/
deno task lint                # ESLint
deno task preview             # Preview production build locally
```

**Prerequisites:** Node.js 24, Deno 2.8+, Docker Desktop, an LLM provider API key.

---

## Architecture (Non-Obvious)

### Adapter Pattern
All data access goes through [`AppAdapter`](src/adapters/interface.ts:17). Components and use cases never call PocketBase directly. Swapping implementations is a **one-line change** in the provider ([`AdapterContext.tsx`](src/adapters/AdapterContext.tsx:13)).

```
Component → Use Case → AppAdapter → MockAdapter (currently) / PocketBaseAdapter (future)
```

### Key Design Constraints

| # | Constraint |
|---|-----------|
| C-03 | **No auth system** — identity is UID-based, stored in `localStorage` as `mb_identity`. |
| C-05 | **One ProgressEvent per `(playerId, missionId)`** — enforced at the single upsert point (`upsertProgressEvent`). |
| C-07 | **QR validation is fully offline** — HMAC verify → GM confirm → PB write. |
| C-08 | **Milestone positions are percentage-based** — `xPercent`/`yPercent` range 0–100. |
| C-11 | **Progress is never snapshotted** — `computeProgress` re-derives at read time. Retroactive difficulty changes affect earned XP. |
| C-12 | **No TypeScript `enum`** — use `const` object + `keyof` union. |
| C-13 | **No component calls `JSON.parse`** on a PB record field — parsing happens inside the adapter. |
| C-16 | **`qrPayload.ts` is the single encode/decode point** — HMAC-SHA256 with session secret. |

All 17 constraints in [`SPECS.md`](SPECS.md:946).

### Route Structure

| Path | Component | Access |
|------|-----------|--------|
| `/` | [`LandingPage`](src/pages/LandingPage.tsx:1) | Public |
| `/session/:sessionId` | [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx:1) | Player role |
| `/admin/:sessionId` | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:1) | GameMaker role |
| `/form/:missionId` | [`FormPage`](src/pages/FormPage.tsx:1) | Player |
| `/qr/:missionId` | [`QRScannerView`](src/pages/QRScannerView.tsx:1) | GameMaker |

---

## Code Style (Non-Obvious Only)

- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports. Never mix runtime and type imports in one statement.
- **No `enum`** — use `const` object + `keyof` union. Pattern: `export const FOO = { A: "a" } as const; export type Foo = (typeof FOO)[keyof typeof FOO];` ([`src/types/unions.ts`](src/types/unions.ts:4)).
- **All interface fields are `readonly`**; arrays are `ReadonlyArray<T>`. Mutations go through the adapter only.
- **`interface`** for object contracts; **`type`** for unions, intersections, aliases.
- **Imports** come from Deno's import map in [`deno.json`](deno.json:25) — never from `package.json`. Internal imports use **`.ts`/`.tsx` extensions** (no extension omission).
- **Barrel exports** from [`src/types/index.ts`](src/types/index.ts:1) re-export both types and const objects (so `MISSION_TYPE.TEXT` works in components).
- **Formatter:** `deno fmt` (2-space indent, 80-char width, semicolons, double quotes). Only `src/` is formatted — files outside are excluded.

---

## Non-Obvious Gotchas

- **Mock adapter simulates GM approval with a 4-second `setTimeout`** ([`mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:79)). Events with `status: "pendingApproval"` auto-transition to `completed` after 4s with `validatedBy: "uid_gamemaker_peter"`.
- **Form missions always `autoApproved`** regardless of `validationMethod` (C-06). The `ValidationDisplay` never mounts for `type: "form"`.
- **SSE subscription is only held by `ValidationDisplay`** and only when `validationMethod = 'qr'` (C-07). Everything else is fetched once on mount.
- **Template export embeds `_milestoneOrder` and `_missionOrder`** ([`exportTemplate.ts`](src/use-cases/exportTemplate.ts:27)). These are import-remapping keys for reconstructing FK references after PB IDs are stripped during import ([`importTemplate.ts`](src/use-cases/importTemplate.ts:13)).
- **`useChatStream` is a Phase 1 stub** ([`useChatStream.ts`](src/hooks/useChatStream.ts:20)) — returns empty state. Real AI streaming will be wired in Phase 6.
- **Build-time env vars** (`VITE_PB_URL`, `VITE_LITELLM_URL`) are frozen in the JS bundle at build time. Runtime env changes won't affect them — you must rebuild.
- **`consume-docs/`** feeds the RAG ingestion pipeline. Documents placed there are chunked, embedded, and stored in pgvector.
- Use the PlayWright MCP tool for testing. Always view from the user's perspective. All screenshots must be saved in `.playwright-mcp`

---

## Environment Variables

See [`.env.example`](.env.example:1) for all configurable variables. `VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** variables.

---

## Reference

- **Authoritative spec:** [`SPECS.md`](SPECS.md:1)
- **Adapter contract:** [`src/adapters/interface.ts`](src/adapters/interface.ts:17)
- **Union types (no enums):** [`src/types/unions.ts`](src/types/unions.ts:4)
- **Domain types:** [`src/types/domain.ts`](src/types/domain.ts:1)
- **Mock adapter:** [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:367)
- **QR payload encode/decode:** [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts:1)
- **Docker Compose config:** [`docker-compose.yml`](docker-compose.yml:1)
- **README (human audience):** [`README.md`](README.md:1)
