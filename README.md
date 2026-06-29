# MesseBuddy

> Gamified corporate onboarding — an interactive map, missions, and XP progression for new employees.

MesseBuddy is a **mobile-first Progressive Web App** that turns the onboarding journey into an interactive adventure. New employees explore office spaces (Milestones) with activities (Missions), earn XP, and get real-world help from mentors — all without any native app installation.

[Features](#features) • [Prerequisites](#prerequisites) • [Quick Start](#quick-start) • [Project Structure](#project-structure) • [Configuration](#configuration) • [Development](#development) • [Deployment](#deployment) • [Documentation](#documentation)

---

## Features

- **Interactive Milestone Map** — Navigate office spaces on a visual map with percentage-based node positioning
- **Mission-driven progression** — Complete text, link, and form missions with configurable validation methods (Game Maker approval, self-approval, or QR scanning)
- **XP & Progress tracking** — Earn XP by completing missions; see milestone-level and session-level progress
- **Configurable validation** — Choose from three approval strategies per mission: Game Maker approval, self-approval, or QR code scanning
- **Template system** — Export and import session structures as portable JSON templates to bootstrap new sessions
- **AI Chatbot with RAG** — Ask questions about onboarding context via an integrated chat panel backed by retrieval-augmented generation (pgvector + LiteLLM)
- **Buddy System** — Assign company mentors visible in the player cockpit
- **Pre-boarding Checklist** — Configure preparatory steps that players complete before the onboarding session begins
- **Recovery Keys** — 8-character alphanumeric token for identity restoration when localStorage is cleared
- **PWA offline-ready** — Installable on devices; works without a native app store
- **Docker Compose stack** — One command to spin up the full application, AI proxy, vector database, and Redis cache

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (strict) + [Vite 8](https://vite.dev) |
| Runtime | [Deno 2.8+](https://deno.com) (replaces Node.js entirely) |
| Backend | [PocketBase](https://pocketbase.io) (Go binary, REST + SSE + SQLite) |
| AI Gateway | [LiteLLM Proxy](https://litellm.ai) (OpenAI-compatible `/chat/completions`) |
| Vector DB | [PostgreSQL](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) |
| Hosting | Docker Compose (7 services), GitHub Pages |

> [!NOTE]
> Deno replaces npm/yarn entirely for this project. All dependencies are declared in [`deno.json`](deno.json) and resolved via Deno's npm compatibility layer.

---

## Prerequisites

- [Deno 2.8+](https://deno.com) — install via `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`
- [Node.js 24](https://nodejs.org) (`.nvmrc`) — required only for some tooling; the app itself runs on Deno
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the full-stack local stack
- An LLM provider API key — for the AI chatbot feature (supports OpenAI, Anthropic, Azure OpenAI, and custom proxies)

---

## Quick Start

### Local development (frontend only)

Run the PWA in isolation with the in-memory mock adapter — no backend required.

```sh
# Pre-fetch npm dependencies via Deno
deno install

# Start Vite dev server with HMR on all interfaces
deno task dev
```

The app runs at `http://localhost:5173` with hot module replacement. By default the app uses the mock adapter, so no PocketBase or LiteLLM is needed.

> [!TIP]
> Set `VITE_USE_MOCK_PB=true` in your environment to develop with fully simulated data. The AI assistant always self-detects: live when `/llm/health/readiness` is reachable, the stub chat otherwise — no flag needed.

### Full-stack with Docker

Spin up the complete application stack (PWA + PocketBase + LiteLLM + PostgreSQL + Redis):

```sh
# 1. Clone and enter the project
git clone <repo-url> && cd messe-buddy-app

# 2. Configure environment
cp .env.example .env

# 3. Edit .env — set at least LLM_SERVER_API_KEY and LITELLM_MASTER_KEY

# 4. Build and start all services
docker compose up --build
```

Access points:

| Service | URL |
|---------|-----|
| PWA (app) | `http://localhost` |
| PocketBase admin | `http://localhost:8090/_/` |
| LiteLLM proxy | `http://localhost:4000` |
| LiteLLM admin UI | `http://localhost:4000/admin` |
| LiteLLM pgvector API | `http://localhost:8001` |
| pgvector | `localhost:5432` |

---

## Project Structure

```
messe-buddy-app/
├── src/
│   ├── adapters/           # Data access layer (AppAdapter interface + implementations)
│   │   ├── interface.ts    # Adapter contract
│   │   ├── mock/           # In-memory mock adapter (current default)
│   │   └── pocketbase/     # PocketBase adapter (next implementation step)
│   ├── components/
│   │   ├── admin/          # Game Maker cockpit components
│   │   ├── player/         # Player cockpit components
│   │   ├── shared/         # Shared components (MilestoneNode, MissionCard, etc.)
│   │   └── ...             # QR, form, tutorial components
│   ├── hooks/              # React custom hooks
│   ├── pages/              # Top-level route pages
│   │   └── landing/        # Landing page sub-views (role select, join, create, recover)
│   ├── types/              # TypeScript type definitions (domain, unions, value objects)
│   ├── use-cases/          # Pure business logic functions
│   ├── utils/              # Utility functions (QR payload, templates, etc.)
│   └── styles/             # Design tokens (CSS custom properties)
├── server/                 # Custom PocketBase Go wrapper with embedded migrations
│   ├── main.go             # Entry point
│   └── pb_migrations/      # Auto-migration files
├── docker/                 # Docker config files
│   ├── nginx.conf          # nginx routing template
│   ├── litellm.yaml        # LiteLLM proxy configuration
│   ├── supervisor.conf     # Supervisord config (nginx + PocketBase)
│   └── file-watcher/       # Bootstraps the vector store, then watches consume-docs forever
├── consume-docs/           # Source documents for RAG ingestion
├── design/                 # Wireframes and design tokens
├── scripts/                # Utility scripts (package.json generator, etc.)
└── .github/workflows/      # CI/CD pipelines (PR checks, build & deploy)
```

### Architecture: Adapter Pattern

```
Component → Use Case → AppAdapter → MockAdapter (current) / PocketBaseAdapter (future)
```

Data access is fully abstracted behind the [`AppAdapter`](src/adapters/interface.ts) interface. Components never call PocketBase directly. Swapping adapters is a **one-line change** in [`AdapterContext.tsx`](src/adapters/AdapterContext.tsx).

> [!IMPORTANT]
> The PocketBase adapter at [`src/adapters/pocketbase/`](src/adapters/pocketbase/) is currently a placeholder. Only the mock adapter is implemented. See [`SPECS.md`](SPECS.md) for the full adapter contract.

---

## Configuration

### Environment Variables

Copy [`.env.example`](.env.example) to `.env` and configure. Key variables:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `LLM_SERVER_API_KEY` | Yes | — | LLM API key for embeddings + chat + reranker |
| `LITELLM_MASTER_KEY` | Yes | `sk-change-me-in-prod` | Proxy management + pgvector connector auth |
| `VITE_USE_MOCK_PB` | No | `true` | `"false"` in production — real PocketBase adapter |
| `VITE_LITELLM_URL` | No | `http://localhost:4000` | Build-time: LiteLLM proxy URL |
| `VITE_LITELLM_MODEL` | No | `policy-assistant` | Stable model alias the PWA sends |
| `PB_AUTO_MIGRATE` | No | `true` | `"false"` after initial deploy to prevent re-migration |
| `POSTGRES_PASSWORD` | Yes* | `changeme` | PostgreSQL password (change in production) |
| `EMBEDDING_MODEL` | No | `nomic-embed-text-v2-moe` | RAG embedding model |
| `RERANK_ENABLED` | No | `true` | `"false"` → plain vector-similarity order |

> [!NOTE]
> `VITE_*` variables are **build-time** — they are frozen into the JS bundle and require a rebuild to change. Override via Docker build args for non-localhost deployments.
>
> The `messebuddy-pwa` LiteLLM virtual key is never a build arg: `file-watcher`'s bootstrap step mints it after the image is built and `entrypoint.sh` injects it into the nginx `/llm` proxy at container start, so the browser bundle never sees a key. There is no `VITE_LITELLM_KEY` to set for a `docker compose up` deployment.
>
> `VITE_PB_URL` is hardcoded to `/` in `docker-compose.yml` (same-origin nginx proxy) and is **not** read from `.env`. For a split-host deployment, pass it as an explicit CLI override — see [Docker Build](#docker-build) below.

### RAG Knowledge Base

Documents in [`consume-docs/`](consume-docs/) are chunked, embedded, and stored in pgvector for the chatbot to retrieve. The `file-watcher` service watches that directory continuously — just add, edit, or remove a file and it's picked up automatically (no manual command, no restart needed).

No application code changes required — LiteLLM handles retrieval at request time using the configured embedding and reranker models.

---

## Development

### Available Commands

All commands run through Deno (not npm/yarn). Tasks defined in [`deno.json`](deno.json):

```sh
deno install            # Pre-fetch all npm dependencies
deno task dev           # Start Vite dev server with HMR (all interfaces)
deno task build         # Type check + production build → dist/
deno task lint          # Run ESLint
deno task preview       # Preview production build locally
```

### Routes

| Path | Component | Role |
|------|-----------|------|
| `/` | [`LandingPage`](src/pages/LandingPage.tsx) | Public |
| `/join/:sessionId` | [`LandingPage`](src/pages/LandingPage.tsx) | Public (invite prefill) |
| `/session/:sessionId` | [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx) | Player |
| `/admin/:sessionId` | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx) | Game Maker |
| `/admin/:sessionId/scan` | [`QRScannerView`](src/pages/QRScannerView.tsx) | Game Maker |
| `/validate/:sessionId` | [`ValidationPage`](src/pages/ValidationPage.tsx) | Game Maker |
| `/form/:missionId` | [`FormPage`](src/pages/FormPage.tsx) | Player |

### Code Style

- **No TypeScript `enum`** — use `const` object + `keyof` union pattern (see [`src/types/unions.ts`](src/types/unions.ts))
- **`import type`** for type-only imports (`verbatimModuleSyntax` enabled)
- **Formatter:** `deno fmt` — 2-space indent, 80-char width, semicolons, double quotes
- **All interface fields are `readonly`** — mutations go through the adapter only
- **Collections are `ReadonlyArray<T>`** — no direct mutations
- **Components** should stay under 200 lines; extract reusable pieces to `src/components/` or `src/utils/`
- **Internal imports** use `.ts` / `.tsx` extensions (no extensionless imports)

### Key Design Constraints

| # | Constraint |
|---|-----------|
| C-03 | No auth — UID in `localStorage` as `mb_identity`; role is client-stored, not server-validated |
| C-05 | One `ProgressEvent` per `(playerId, missionId)` — single upsert point |
| C-07 | QR validation fully offline: HMAC verify → GM confirm → PB write |
| C-08 | Milestone positions are percentage-based (`xPercent` / `yPercent`, 0–100) |
| C-11 | Progress never snapshotted — `computeProgress` re-derives at read time |
| C-12 | No TypeScript `enum` |
| C-13 | No component calls `JSON.parse` on PB fields — parsing inside adapter |
| C-16 | [`qrPayload.ts`](src/utils/qrPayload.ts) is the single encode/decode point (HMAC-SHA256) |

For the complete list of 17 design constraints, see the [specification](SPECS.md).

---

## Deployment

### CI/CD

Two GitHub Actions workflows run on every push:

1. **PR Checks** ([`.github/workflows/pr-check.yml`](.github/workflows/pr-check.yml)) — runs on PRs to `main` / `develop`: `deno fmt --check`, `deno task lint`, `deno task build`
2. **Build & Deploy** ([`.github/workflows/build-and-deploy.yml`](.github/workflows/build-and-deploy.yml)) — runs on push to `main`: same checks + deploys `dist/` to GitHub Pages

### Docker Build

```sh
# Default (localhost)
docker compose build

# Custom domain with build args
docker compose build \
  --build-arg VITE_PB_URL=https://your-domain.com \
  --build-arg VITE_LITELLM_URL=https://your-domain.com:4000 \
  --build-arg VITE_USE_MOCK_PB=false

# Start everything
docker compose up
```

> [!IMPORTANT]
> LiteLLM is not proxied through nginx. The browser reaches it directly on `:4000`. Ensure your network configuration reflects this.

### PocketBase Migrations

The server uses Go-based auto-migrations embedded in [`server/pb_migrations/`](server/pb_migrations/). On first run with `PB_AUTO_MIGRATE=true`, all 9 collections are created automatically.

To create a new migration:
1. Add a new file in `server/pb_migrations/` (e.g. `003_new_feature.go`)
2. Use `core.NewBaseCollection(name)` for collections
3. Call `collection.Fields.Add(...)` with typed field structs
4. Call `app.Save(collection)` (single-arg only in PB v0.39+)
5. Set public API rules with `setPublicRules(collection)` (C-03)

---

## Documentation

| Resource | Description |
|----------|-------------|
| [`SPECS.md`](SPECS.md) | Authoritative project specification — data model, constraints, use cases |
| [`AGENTS.md`](AGENTS.md) | Agent-focused guide — commands, code style, architecture details |
| [`docs/pb-schema.md`](docs/pb-schema.md) | PocketBase schema reference — all 9 collections |
| [`design/design-tokens.md`](design/design-tokens.md) | Design tokens — colors, typography, spacing, CSS custom properties |
| [`docker/litellm.yaml`](docker/litellm.yaml) | LiteLLM proxy configuration — models, providers, RAG settings |
| [`docker/nginx.conf`](docker/nginx.conf) | nginx routing — PWA static files + PocketBase proxy |
