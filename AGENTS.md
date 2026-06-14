# AGENTS.md

This file provides guidance to AI coding agents when working with this repository. It complements [`README.md`](README.md:1) with agent-specific technical context. The authoritative project specification is [`SPECS.md`](SPECS.md:1) — read it before making architectural decisions.

---

## Project Overview

MesseBuddy is a **mobile-first Progressive Web App (PWA)** that gamifies corporate onboarding. New employees (Players) navigate an interactive map of office spaces (Milestones), each containing activities (Missions) to complete. An admin (Game Maker) configures the experience and validates progress.

- **Purpose:** Gamified corporate onboarding with non-linear, autonomy-preserving progression
- **Target users:** New employees (Players) and HR/IT admins (Game Makers)
- **No auth system:** Identity is UID-based, stored in `localStorage` (C-03)
- **No tests yet:** The test suite has not been written. Adding tests is a high-priority task.

### Key Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript (strict) + Vite 8 |
| Runtime | Deno 2.8+ (replaces Node/npm entirely) |
| Backend | PocketBase (Go binary, REST + SSE + SQLite) |
| AI Gateway | LiteLLM Proxy (OpenAI-compatible `/chat/completions`) |
| Vector DB | PostgreSQL + pgvector extension |
| Hosting | Docker Compose (4 services), GitHub Pages |
| Package Manager | Deno's native npm import resolution (`nodeModulesDir: "auto"`) |

---

## Build / Lint / Run

All commands run through **Deno**, not npm/yarn. See [`deno.json`](deno.json:2) for task definitions.

### Quick Start (Local Dev)

```sh
# Installation — pre-fetch all npm dependencies from deno.json
deno install

# Start Vite dev server with HMR on all network interfaces
deno task dev

# Type check (tsc) + production build → dist/
deno task build

# Lint the project with ESLint
deno task lint

# Preview the production build locally
deno task preview
```

### Prerequisites

- **Node.js 24** (see [`.nvmrc`](.nvmrc:1)) — only needed for some tooling; the project itself runs on Deno
- **Deno 2.8+** — install via `curl -fsSL https://deno.land/install.sh | sh` or `brew install deno`
- **Docker Desktop** — for full-stack local dev with PocketBase, LiteLLM, and pgvector
- **OpenAI API key** (or another provider) — for the AI chatbot feature

### Local Docker Stack

```sh
# Copy and configure environment
cp .env.example .env
# Edit .env to add your OPENAI_API_KEY

# Build and start all services
docker compose up --build

# Access points:
#   PWA (app)        → http://localhost
#   PocketBase admin → http://localhost:8090/_/
#   LiteLLM proxy    → http://localhost:4000
#   pgvector         → localhost:5432
```

For a non-localhost deployment, pass build args:

```sh
docker compose build \
  --build-arg VITE_PB_URL=https://your-domain.com \
  --build-arg VITE_LITELLM_URL=https://your-domain.com:4000
```

---

## Project Structure

```
messe-buddy-app/
├── src/
│   ├── adapters/           # Data access layer (AppAdapter interface + implementations)
│   │   ├── mock/           # In-memory mock adapter (currently the only implementation)
│   │   └── pocketbase/     # PocketBase adapter (empty — next implementation step)
│   ├── components/
│   │   ├── admin/          # Game Maker cockpit components
│   │   ├── form/           # Form mission components
│   │   ├── layout/         # Layout/route guard components
│   │   ├── player/         # Player cockpit components
│   │   ├── qr/             # QR scanning components
│   │   ├── shared/         # Shared components (MilestoneNode, MissionCard, etc.)
│   │   └── tutorial/       # Tutorial overlay components
│   ├── hooks/              # React custom hooks
│   ├── pages/              # Top-level route pages
│   ├── styles/             # Design tokens (CSS custom properties)
│   ├── types/              # TypeScript type definitions
│   ├── use-cases/          # Business logic (pure functions)
│   └── utils/              # Utility functions (QR payload encode/decode)
├── docker/                 # Docker config files
├── scripts/                # Utility scripts (generate-package-json.ts)
├── .github/workflows/      # CI/CD pipelines
└── consume-docs/           # Source documents for RAG ingestion
```

---

## Architecture (Non-Obvious)

### Adapter Pattern

All data access goes through the [`AppAdapter`](src/adapters/interface.ts:17) interface. Components and use cases never call PocketBase directly.

```
Component → Use Case → AppAdapter → MockAdapter (currently) / PocketBaseAdapter (future)
```

- [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) — in-memory Maps, no persistence
- [`src/adapters/pocketbase/`](src/adapters/pocketbase) — empty directory; implementing this is the next step for real persistence
- The [`AppAdapter`](src/adapters/interface.ts:17) interface defines the full contract. Both adapter implementations must satisfy it.

### Use Cases

Business logic lives in [`src/use-cases/`](src/use-cases/). Use cases are **pure functions**. They call the adapter; they do not call components. See [`SPECS.md`](SPECS.md:397) for the complete use case table.

- [`deriveXP`](src/use-cases/deriveXP.ts:1) — pure function, computes XP values from mission difficulties
- [`computeProgress`](src/use-cases/computeProgress.ts:1) — pure function, derives PlayerProgress from ProgressEvents
- [`upsertProgressEvent`](src/adapters/interface.ts:66) — **single write path** for all ProgressEvent mutations (C-05, C-14)
- [`exportTemplate`](src/use-cases/exportTemplate.ts:27) — strips PB IDs, adds remapping keys
- [`importTemplate`](src/use-cases/importTemplate.ts:13) — creates fresh records from template JSON

### Key Design Constraints

| # | Constraint |
|---|-----------|
| C-03 | **No auth system** — identity is UID-based, stored in `localStorage` as `mb_identity`. `role` field is client-stored and not server-validated. |
| C-05 | **One ProgressEvent per `(playerId, missionId)`** — enforced at the single upsert point. |
| C-07 | **QR validation is fully offline** — no SSE subscription for `qr` method; HMAC verify → GM confirm → PB write. |
| C-08 | **Milestone positions are percentage-based** — `xPercent`/`yPercent` range 0–100, never pixels. |
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

See [`src/App.tsx`](src/App.tsx:11) for the router configuration.

---

## Code Style (Non-Obvious Rules)

### TypeScript

- **No `enum`** — use `const` object + `keyof` union. See [`src/types/unions.ts`](src/types/unions.ts:4) for all union types.
- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports. Never mix runtime and type imports in one statement.
- **`strict: true`** throughout — `arr[i]` is `T | undefined`.
- **All interface fields are `readonly`** — mutations go through the adapter, never by direct property assignment.
- **Collections are `ReadonlyArray<T>`** — use spread/create for modifications.
- **`interface`** for object contracts; **`type`** for unions, intersections, and aliases.
- **Optional fields** typed as `T | undefined`, never assumed present without a guard.

### Formatting

- Formatter: **`deno fmt`** — config in [`deno.json`](deno.json:15)
- 2-space indent, 80-char line width, semicolons required, double quotes
- Only formats files in `src/`
- Excludes: `src/testdata/`, `src/generated/**/*.ts`, `src/**/*.css`

### Linting

- ESLint via **`deno task lint`** — config in [`eslint.config.js`](eslint.config.js:1)
- Runs `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` + `react-refresh` rules
- Ignores `dist/`

### Import/Export Patterns

- All imports reference npm packages from Deno's import map in [`deno.json`](deno.json:25) — never from a `package.json`
- Internal imports use relative paths with `.ts` or `.tsx` extensions (Deno convention)
- Barrel exports from [`src/types/index.ts`](src/types/index.ts:1)

---

## Testing

**The test suite has not been written yet.** The project currently has no test files. This is a gap that needs to be addressed.

### Testing Expectations

When adding tests:

- **Framework:** Use Deno's built-in test runner (`Deno.test`) — no Jest/Vitest dependency needed
- **Location:** Co-locate tests next to source files as `*.test.ts` or `*.test.tsx`
- **Coverage target:** Aim for coverage of all use cases (pure functions, easy to test) and adapter boundary types
- **Mock adapter:** The existing [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) can serve as test fixtures
- **Run tests:** `deno test` (or configure a dedicated task in `deno.json`)

---

## Docker & Deployment

### Service Architecture (`docker compose up --build`)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `app` | Built from [`Dockerfile`](Dockerfile:1) | `:80`, `:8090` | nginx (PWA) + PocketBase (REST/SSE) |
| `litellm` | `ghcr.io/berriai/litellm:main-stable` | `:4000` | AI proxy, RAG pipeline |
| `pgvector` | `pgvector/pgvector:pg16` | `:5432` | Vector store for RAG |
| `ingest` | Built from [`docker/Dockerfile.ingest`](docker/Dockerfile.ingest:1) | — | One-shot document ingestion |

### Build Pipeline (Multi-stage Dockerfile)

```
Stage 1 — builder (denoland/deno:2.8.1)
  deno install                    # pre-fetch all npm imports
  deno task build                 # tsc + vite build → dist/
  VITE_PB_URL and VITE_LITELLM_URL baked into JS bundle

Stage 2 — runtime (debian:bookworm-slim)
  nginx          serves dist/ on :80; proxies /api/ and /_/ to PocketBase
  PocketBase     serves REST + SSE on :8090; data in /pb_data
  supervisord    manages both processes
```

### Build-Time Variables

`VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** variables frozen into the JS bundle. They cannot be changed at runtime. Pass them as Docker build args for non-localhost deployments.

### CI/CD

Two GitHub Actions workflows:

1. **PR Checks** ([`.github/workflows/pr-check.yml`](.github/workflows/pr-check.yml:1)) — runs on PRs to `main`/`develop`:
   - `deno fmt --check`
   - `deno task lint`
   - `deno task build`
   - `deno run -A scripts/generate-package-json.ts`

2. **Build & Deploy** ([`.github/workflows/build-and-deploy.yml`](.github/workflows/build-and-deploy.yml:1)) — runs on push to `main`:
   - Same checks as PR workflow
   - Deploys `dist/` to GitHub Pages

### Key Deployment Gotchas

- **LiteLLM is not proxied through nginx** — the browser reaches it directly on `:4000`. `VITE_LITELLM_URL=http://localhost:4000` is baked into the bundle.
- **PocketBase data** survives restarts via the `pb_data` Docker named volume.
- **pgvector data** survives restarts via the `pgvector_data` Docker named volume.
- **To re-ingest documents** into the RAG knowledge base: `docker compose run --rm ingest`
- **`.env.example`** must be copied to `.env` with real API keys before `docker compose up`.

---

## Environment Variables

See [`.env.example`](.env.example:1) for all configurable variables:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `LITELLM_MASTER_KEY` | Yes | `sk-dev-change-in-production` | Bearer token for LiteLLM |
| `OPENAI_API_KEY` | Yes* | — | LLM provider key (or `ANTHROPIC_API_KEY`) |
| `VITE_PB_URL` | No | `http://localhost:8090` | Build-time: PocketBase URL |
| `VITE_LITELLM_URL` | No | `http://localhost:4000` | Build-time: LiteLLM URL |
| `PGVECTOR_DB` | No | `litellm_rag` | pgvector database name |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model for RAG |
| `RAG_TOP_K` | No | `5` | Number of chunks to retrieve |
| `RAG_MIN_SIMILARITY` | No | `0.70` | Cosine similarity threshold |

\* At least one LLM provider API key is required for the chatbot feature.

---

## Pull Request Guidelines

- **Title format:** `[component] Brief description` (e.g., `[adapter] Add PocketBase implementation`)
- **Branch from:** `develop` — PRs target `develop`; `main` receives merges from `develop` only
- **Required checks before merge:**
  - `deno fmt --check`
  - `deno task lint`
  - `deno task build`
  - `deno run -A scripts/generate-package-json.ts`
- **Commit messages:** Conventional commits preferred (`feat:`, `fix:`, `refactor:`, etc.)
- **Code review:** At least one other team member should review before merging

---

## Common Tasks

### Adding a new component

1. Create the file in the appropriate subdirectory under [`src/components/`](src/components/)
2. If the component is shared between Player and Admin cockpits, place it in [`src/components/shared/`](src/components/shared/)
3. Use the `editable` or `draggable` boolean prop pattern to gate role-specific behavior (see C-09)
4. Import types from [`src/types/index.ts`](src/types/index.ts)

### Adding a new data collection to PocketBase

1. Define the interface in [`src/types/domain.ts`](src/types/domain.ts) extending `PBRecord`
2. Add adapter methods to the [`AppAdapter`](src/adapters/interface.ts:17) interface
3. Implement the methods in both [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367) and (future) PocketBase adapter
4. Add the collection schema to [`SPECS.md`](SPECS.md:780) (Collection Index table)

### Adding a new use case

1. Create a pure function in [`src/use-cases/`](src/use-cases/)
2. The function receives data through the adapter (via `AdapterContext`), never from a component directly
3. Add the use case to the table in [`SPECS.md`](SPECS.md:398)
4. Write a unit test using `Deno.test`

### Updating the knowledge base (RAG)

1. Add or edit documents in [`consume-docs/`](consume-docs/)
2. Re-run ingestion: `docker compose run --rm ingest`
3. No PWA code changes required — the LiteLLM proxy handles RAG at request time

---

## Debugging & Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `deno task build` fails | TypeScript errors | Run `deno task dev` first to check for type errors incrementally |
| Docker services won't start | Missing `.env` file | Copy `.env.example` to `.env` and fill in required values |
| LiteLLM health check failing | Invalid API key or network | Verify `OPENAI_API_KEY` in `.env`; check `docker compose logs litellm` |
| PWA can't reach PocketBase | Wrong `VITE_PB_URL` | Rebuild with correct build arg: `docker compose build --build-arg VITE_PB_URL=...` |
| QR validation not working | HMAC mismatch | Both QR display and scanner use [`qrPayload.ts`](src/utils/qrPayload.ts:1) — verify session secret is consistent |
| Chatbot returns empty/unhelpful | No documents ingested | Run `docker compose run --rm ingest` after adding files to `consume-docs/` |
| LocalStorage identity lost | Cache cleared or new device | Use the "Recover my progress" flow with the recovery key |
| Form missions not auto-approving | `validationMethod` conflict | Form missions always auto-approve (C-06) — the `validationMethod` field is ignored for `form` type |

---

## Reference

- **Authoritative spec:** [`SPECS.md`](SPECS.md:1) — read this before making architectural decisions. All constraints (C-01 through C-17) and the full TypeScript data model are defined there.
- **Adapter contract:** [`src/adapters/interface.ts`](src/adapters/interface.ts:17)
- **Union types (no enums):** [`src/types/unions.ts`](src/types/unions.ts:4)
- **Domain types:** [`src/types/domain.ts`](src/types/domain.ts:1)
- **Mock adapter (single implementation):** [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:367)
- **QR payload encode/decode:** [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts:1)
- **Docker Compose config:** [`docker-compose.yml`](docker-compose.yml:1)
- **README (human audience):** [`README.md`](README.md:1)
