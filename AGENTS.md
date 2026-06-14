# AGENTS.md

This file provides guidance to AI coding agents when working with this repository. It complements [`README.md`](README.md:1) with agent-specific technical context. The authoritative project specification is [`SPECS.md`](SPECS.md:1) — read it before making architectural decisions.

---

## Project Overview

MesseBuddy is a **mobile-first Progressive Web App (PWA)** that gamifies corporate onboarding. New employees (Players) navigate an interactive map of office spaces (Milestones), each containing activities (Missions) to complete. An admin (Game Maker) configures the experience and validates progress.

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript (strict) + Vite 8 |
| Runtime | Deno 2.8+ (replaces Node/npm entirely) |
| Backend | PocketBase (Go binary, REST + SSE + SQLite) |
| AI Gateway | LiteLLM Proxy (OpenAI-compatible `/chat/completions`) |
| Vector DB | PostgreSQL + pgvector extension |
| Hosting | Docker Compose (4 services), GitHub Pages |
| Package Manager | Deno's native npm import resolution (`nodeModulesDir: "auto"`) |

**Key facts:** No auth system (UID-based, stored in `localStorage` as `mb_identity`). No tests yet — adding tests is a high-priority task.

---

## Build / Lint / Run

All commands run through **Deno**. See [`deno.json`](deno.json:2) for task definitions.

```sh
deno install                  # Pre-fetch all npm dependencies
deno task dev                 # Start Vite dev server with HMR (all network interfaces)
deno task build               # Type check + production build → dist/
deno task lint                # ESLint
deno task preview             # Preview production build locally
```

**Prerequisites:** Node.js 24, Deno 2.8+, Docker Desktop, an LLM provider API key.

---

## Project Structure

```
src/
├── adapters/           # AppAdapter interface + implementations (mock/, pocketbase/)
├── components/         # React components (admin/, player/, shared/, form/, qr/, layout/, tutorial/)
├── hooks/              # Custom React hooks
├── pages/              # Top-level route pages
├── styles/             # Design tokens (CSS custom properties)
├── types/              # TypeScript type definitions
├── use-cases/          # Business logic (pure functions)
└── utils/              # QR payload encode/decode
```

---

## Architecture

### Adapter Pattern

All data access goes through the [`AppAdapter`](src/adapters/interface.ts:17) interface. Components and use cases never call PocketBase directly.

```
Component → Use Case → AppAdapter → MockAdapter (currently) / PocketBaseAdapter (future)
```

### Use Cases

Business logic lives in [`src/use-cases/`](src/use-cases/) as **pure functions**. They call the adapter; they do not call components. Key use cases: [`deriveXP`](src/use-cases/deriveXP.ts:1), [`computeProgress`](src/use-cases/computeProgress.ts:1), [`exportTemplate`](src/use-cases/exportTemplate.ts:27), [`importTemplate`](src/use-cases/importTemplate.ts:13). The single write path for all ProgressEvent mutations is [`upsertProgressEvent`](src/adapters/interface.ts:66).

### Key Design Constraints

| # | Constraint |
|---|-----------|
| C-03 | **No auth system** — identity is UID-based, stored in `localStorage` as `mb_identity`. |
| C-05 | **One ProgressEvent per `(playerId, missionId)`** — enforced at the single upsert point. |
| C-07 | **QR validation is fully offline** — HMAC verify → GM confirm → PB write. |
| C-08 | **Milestone positions are percentage-based** — `xPercent`/`yPercent` range 0–100. |
| C-12 | **No TypeScript `enum`** — use `const` object + `keyof` union pattern throughout. |
| C-13 | **No component calls `JSON.parse`** on a PB record field — all parsing happens inside the adapter. |
| C-16 | **`qrPayload.ts` is the single encode/decode point** — HMAC-SHA256 with session secret. |

All 17 constraints are defined in [`SPECS.md`](SPECS.md:946).

### Route Structure

| Path | Component | Access |
|------|-----------|--------|
| `/` | [`LandingPage`](src/pages/LandingPage.tsx:1) | Public |
| `/session/:sessionId` | [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx:1) | Player role |
| `/admin/:sessionId` | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:1) | GameMaker role |
| `/form/:missionId` | [`FormPage`](src/pages/FormPage.tsx:1) | Player |
| `/qr/:missionId` | [`QRScannerView`](src/pages/QRScannerView.tsx:1) | GameMaker |

---

## Code Style

- **No `enum`** — use `const` object + `keyof` union. See [`src/types/unions.ts`](src/types/unions.ts:4).
- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports. Never mix runtime and type imports in one statement.
- **All interface fields are `readonly`**. Collections are `ReadonlyArray<T>`.
- **`interface`** for object contracts; **`type`** for unions, intersections, aliases.
- **Optional fields** typed as `T | undefined`, never assumed present without a guard.
- **Formatter:** `deno fmt` (2-space indent, 80-char width, semicolons, double quotes).
- **Linter:** ESLint via `deno task lint`.
- **Imports:** From Deno's import map in [`deno.json`](deno.json:25) — never from `package.json`. Internal imports use `.ts`/`.tsx` extensions. Barrel exports from [`src/types/index.ts`](src/types/index.ts:1).

---

## Testing

**The test suite has not been written yet.** When adding tests: use Deno's built-in runner (`Deno.test`), co-locate as `*.test.ts`/`.tsx`, and use the existing [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) as test fixtures.

---

## Playwright MCP Browser Validation (Required Workflow)

Before delivering any task that modifies UI behavior, components, routing, styles, or feature logic, the agent **must** validate the work through the browser using the Playwright MCP tool against the running Vite dev server (`deno task dev`).

### Validation Scope

Open the dev server (default `http://localhost:5173`) and inspect:

1. **UI Responsiveness** — verify layouts adapt correctly at mobile (375px), tablet (768px), and desktop (1280px) viewports. Check that percentage-based milestone positions (C-08) render within bounds.
2. **Visual Bugs** — check for overlapping elements, broken CSS, misaligned grids, missing assets, incorrect z-indexing, and inconsistent spacing.
3. **Element Rendering** — confirm components mount and display expected data from the mock adapter. Verify conditional rendering (role gates, loading states, empty states) works correctly.
4. **Feature Usability** — walk through the relevant user flow end-to-end: simulate identity creation, navigate between routes, interact with forms/missions, verify QR display/scanner, and confirm progress updates reflect in the UI.
5. **Console Errors** — check the browser console for React warnings, runtime errors, or failed network requests. Any `console.error` or uncaught exception must be resolved.

### Workflow Steps

1. **Start the dev server** — run `deno task dev` (or confirm it is already running from environment_details).
2. **Navigate** — use Playwright MCP to open `http://localhost:5173` and navigate to the relevant page(s).
3. **Inspect** — capture screenshots at multiple viewport sizes. Use the browser console to check for errors.
4. **Interact** — simulate user interactions (clicks, form input, navigation) to verify the feature behaves as specified in [`SPECS.md`](SPECS.md:1).
5. **Report** — if issues are found, fix them at the source code level and re-run validation. Only mark the task as delivered once the browser confirms correct behavior.

> The browser is the debugging platform. If behavior differs from expectations, use Playwright MCP to inspect the DOM, read computed styles, and verify state — do not rely solely on static code analysis.

---

## Common Tasks

### Adding a new component

1. Create the file in the appropriate subdirectory under [`src/components/`](src/components/).
2. Use the `editable` or `draggable` boolean prop pattern to gate role-specific behavior (see C-09).
3. Import types from [`src/types/index.ts`](src/types/index.ts).
4. **Validate** — run the Playwright MCP workflow above.

### Adding a new data collection to PocketBase

1. Define the interface in [`src/types/domain.ts`](src/types/domain.ts) extending `PBRecord`.
2. Add adapter methods to the [`AppAdapter`](src/adapters/interface.ts:17) interface.
3. Implement in both [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) and (future) PocketBase adapter.
4. Add the collection schema to [`SPECS.md`](SPECS.md:780) (Collection Index table).

### Adding a new use case

1. Create a pure function in [`src/use-cases/`](src/use-cases/).
2. The function receives data through the adapter (via `AdapterContext`), never from a component directly.
3. Add the use case to the table in [`SPECS.md`](SPECS.md:398).
4. Write a unit test using `Deno.test`.

---

## Environment Variables

See [`.env.example`](.env.example:1) for all configurable variables. `VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** variables frozen into the JS bundle — they cannot be changed at runtime.

---

## Docker & Deployment

```sh
cp .env.example .env   # Fill in API keys
docker compose up --build
```

| Service | Port | Purpose |
|---------|------|---------|
| `app` | `:80`, `:8090` | nginx (PWA) + PocketBase (REST/SSE) |
| `litellm` | `:4000` | AI proxy, RAG pipeline |
| `pgvector` | `:5432` | Vector store for RAG |
| `ingest` | — | One-shot document ingestion |

**CI/CD:** Two GitHub Actions workflows — PR checks (fmt, lint, build) on PRs to `main`/`develop`, and Build & Deploy to GitHub Pages on push to `main`.

---

## Reference

- **Authoritative spec:** [`SPECS.md`](SPECS.md:1) — read this before making architectural decisions.
- **Adapter contract:** [`src/adapters/interface.ts`](src/adapters/interface.ts:17)
- **Union types (no enums):** [`src/types/unions.ts`](src/types/unions.ts:4)
- **Domain types:** [`src/types/domain.ts`](src/types/domain.ts:1)
- **Mock adapter:** [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:367)
- **QR payload encode/decode:** [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts:1)
- **Docker Compose config:** [`docker-compose.yml`](docker-compose.yml:1)
- **README (human audience):** [`README.md`](README.md:1)
