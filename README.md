# MesseBuddy

> Gamified corporate onboarding — an interactive map, missions, and XP progression for new employees.

MesseBuddy is a **Progressive Web App** that turns the onboarding journey into an interactive adventure. New employees explore office spaces (Milestones) with activities (Missions), earn XP, and get real-world help from mentors — all without any native app installation.

## Features

- **Interactive Milestone Map** — Navigate office spaces on a visual map with percentage-based node positioning
- **Mission-driven progression** — Complete text, link, and form missions with configurable validation methods
- **XP & Progress tracking** — Earn XP by completing missions; see milestone-level and session-level progress
- **Configurable validation** — Choose from three approval strategies per mission: Game Maker approval, self-approval, or QR code scanning
- **Template system** — Export and import session structures as portable JSON templates
- **AI Chatbot** — Ask questions about onboarding context via an integrated chat panel with RAG (retrieval-augmented generation)
- **Buddy System** — Assign company mentors visible in the player cockpit
- **PWA offline-ready** — Installable on devices; works without a native app store
- **Docker Compose stack** — One command to spin up the full application, AI proxy, and vector database

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (strict) + [Vite 8](https://vite.dev) |
| Runtime | [Deno 2.8+](https://deno.com) (replaces Node.js entirely) |
| Backend | [PocketBase](https://pocketbase.io) (Go binary, REST + SSE + SQLite) |
| AI Gateway | [LiteLLM Proxy](https://litellm.ai) (OpenAI-compatible `/chat/completions`) |
| Vector DB | [PostgreSQL](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) |
| Hosting | Docker Compose (4 services), GitHub Pages |
| Containerization | Multi-stage Dockerfile (Deno build → nginx + PocketBase runtime) |

## Prerequisites

- [Deno 2.8+](https://deno.com) — install via `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`
- [Node.js 24](https://nodejs.org) (`.nvmrc`) — only for some tooling; the app itself runs on Deno
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the full-stack local stack
- An OpenAI API key (or Anthropic) — for the AI chatbot feature

## Quick Start

### Local development (frontend only)

```sh
# Install dependencies (pre-fetches npm packages via Deno)
deno install

# Start Vite dev server with HMR
deno task dev
```

The app runs at `http://localhost:5173` with hot module replacement. The PocketBase backend and LiteLLM proxy need to be running separately for full functionality.

### Full-stack with Docker

```sh
# 1. Clone and enter the project
git clone <repo-url> && cd messe-buddy-app

# 2. Configure environment
cp .env.example .env

# 3. Edit .env — set at least OPENAI_API_KEY

# 4. Build and start all services
docker compose up --build
```

Access points:

| Service | URL |
|---------|-----|
| PWA (app) | `http://localhost` |
| PocketBase admin | `http://localhost:8090/_/` |
| LiteLLM proxy | `http://localhost:4000` |
| pgvector | `localhost:5432` |

## Project Structure

```
messe-buddy-app/
├── src/
│   ├── adapters/           # Data access layer (AppAdapter interface + implementations)
│   │   ├── mock/           # In-memory mock adapter (current implementation)
│   │   └── pocketbase/     # PocketBase adapter (next implementation step)
│   ├── components/
│   │   ├── admin/          # Game Maker cockpit components
│   │   ├── player/         # Player cockpit components
│   │   ├── shared/         # Shared components (MilestoneNode, MissionCard, etc.)
│   │   └── ...             # Form, QR, tutorial, layout components
│   ├── hooks/              # React custom hooks
│   ├── pages/              # Top-level route pages
│   ├── types/              # TypeScript type definitions
│   ├── use-cases/          # Business logic (pure functions)
│   ├── utils/              # Utility functions (QR payload, etc.)
│   └── styles/             # Design tokens (CSS custom properties)
├── docker/                 # Docker config files (nginx, LiteLLM, supervisor)
├── scripts/                # Utility scripts
├── .github/workflows/      # CI/CD pipelines
└── consume-docs/           # Source documents for RAG ingestion
```

## Configuration

### Environment Variables

Copy [`.env.example`](.env.example) to `.env` and configure:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `LITELLM_MASTER_KEY` | Yes | `sk-dev-change-in-production` | Bearer token for LiteLLM |
| `OPENAI_API_KEY` | Yes* | — | LLM provider key |
| `VITE_PB_URL` | No | `http://localhost:8090` | Build-time: PocketBase URL |
| `VITE_LITELLM_URL` | No | `http://localhost:4000` | Build-time: LiteLLM URL |
| `PGVECTOR_DB` | No | `litellm_rag` | pgvector database name |

> **Note:** `VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** variables frozen into the JS bundle. They cannot be changed at runtime. Override them via Docker build args for non-localhost deployments.

### RAG Knowledge Base

Documents in [`consume-docs/`](consume-docs/) are embedded and stored in pgvector for the chatbot to retrieve. After adding or editing documents:

```sh
docker compose run --rm ingest
```

No application code changes required — the LiteLLM proxy handles retrieval at request time.

## Development

### Available Commands

All commands run through Deno, not npm/yarn:

```sh
deno install          # Pre-fetch all npm dependencies
deno task dev         # Start Vite dev server with HMR
deno task build       # Type check + production build → dist/
deno task lint        # Run ESLint
deno task preview     # Preview production build locally
```

### Code Style

- **No TypeScript `enum`** — use `const` object + `keyof` union (C-12)
- **`import type`** for type-only imports (`verbatimModuleSyntax`)
- **Formatter:** `deno fmt` — 2-space indent, 80-char width, semicolons, double quotes
- **All interface fields are `readonly`** — mutations go through the adapter only
- **Immutability:** collections are `ReadonlyArray<T>`

### Key Architecture Decisions

```
Component → Use Case → AppAdapter → MockAdapter / PocketBaseAdapter (future)
```

- **Adapter Pattern** — data access is fully abstracted behind the [`AppAdapter`](src/adapters/interface.ts) interface. Components never call PocketBase directly.
- **Use Cases are pure functions** — business logic in [`src/use-cases/`](src/use-cases/) receives data through the adapter, never from components.
- **Single write path** — all `ProgressEvent` mutations go through `upsertProgressEvent` (one record per `(playerId, missionId)`).
- **No auth system** — identity is UID-based, stored in `localStorage`. The `role` field is client-stored and not server-validated.
- **QR validation is fully offline** — HMAC verify → GM confirm → PocketBase write. No SSE subscription for QR-based validation.

For the complete list of design constraints (C-01 through C-17), see the [specification](SPECS.md).

## Deployment

### CI/CD

Two GitHub Actions workflows run on every push:

1. **PR Checks** — runs on PRs to `main`/`develop`: `deno fmt --check`, `deno task lint`, `deno task build`, `deno run -A scripts/generate-package-json.ts`
2. **Build & Deploy** — runs on push to `main`: same checks + deploys `dist/` to GitHub Pages

### Docker Build

```sh
# Default (localhost)
docker compose build

# Custom domain
docker compose build \
  --build-arg VITE_PB_URL=https://your-domain.com \
  --build-arg VITE_LITELLM_URL=https://your-domain.com:4000

# Start everything
docker compose up
```

> **Important:** LiteLLM is not proxied through nginx. The browser reaches it directly on `:4000`. Ensure your network configuration reflects this.

## Documentation

| Resource | Description |
|----------|-------------|
| [`SPECS.md`](SPECS.md) | Authoritative project specification — data model, constraints, use cases |
| [`AGENTS.md`](AGENTS.md) | Agent-focused guide — commands, code style, common tasks |
| [`docker/litellm.yaml`](docker/litellm.yaml) | LiteLLM configuration — models, providers, RAG settings |
| [`docker/nginx.conf`](docker/nginx.conf) | nginx routing — PWA static files + PocketBase proxy |

## License

[License information TBD]()
