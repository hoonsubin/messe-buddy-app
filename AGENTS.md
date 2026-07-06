# AGENTS.md

Agent operational guide for this repository. **Not** a duplicate of product or
design docs — read those first.

| Document | Use when |
| -------- | -------- |
| [`README.md`](README.md) | Stack, quick start, Docker, env vars, model providers |
| [`SPECS.md`](SPECS.md) | Product behavior, routes, constraints (C-*), data model, Decision Log |
| [`plans/production-implementation-plans.md`](plans/production-implementation-plans.md) | Code vs spec gap, ARCH tasks, smoke tests, handoff |
| [`design/design-tokens.md`](design/design-tokens.md) | Colors, spacing, typography, UI verification checklist |
| [`design/component-architecture.md`](design/component-architecture.md) | Layer model, primitives, patterns, CSS layout rules |
| [`docs/pb-schema.md`](docs/pb-schema.md) | PocketBase collections |

Read **SPECS.md** before architectural decisions. Read **design/** before new UI.

---

## Agent rules

- **File edits:** never change more than **500 lines** in one edit — chunk logically.
- **Adapter boundary:** components → use cases/hooks → [`AppAdapter`](src/adapters/interface.ts) — never PocketBase directly. Swap adapter in [`AdapterContext.tsx`](src/adapters/AdapterContext.tsx).
- **ARCH:** locked model in SPECS (D-ARCH-2 … D-NAMING-2); routes use `/gamemaker/` and `player-detail/` naming.

---

## Runtime quirks (not obvious from docs alone)

- **Mock adapter only in daily dev** unless `VITE_USE_MOCK_PB=false` — [`pbAdapter`](src/adapters/pocketbase/) exists but ARCH may lag schema.
- **Mock `gmApprove`** auto-completes after ~4s ([`mockAdapter.ts`](src/adapters/mock/mockAdapter.ts)) — production stays `pendingApproval`.
- **No tests yet** — add with `Deno.test`, co-locate `*.test.ts` / `*.tsx`, fixtures via [`mockAdapter`](src/adapters/mock/mockAdapter.ts).
- **SSE:** `useWatchMission` → `subscribeProgressEvent` on player QR / `gmApprove` paths only (C-07, C-20); most data is fetch-on-mount.
- **Templates:** export embeds `_milestoneOrder` / `_missionOrder` for import FK remap ([`exportTemplate.ts`](src/use-cases/exportTemplate.ts), [`importTemplate.ts`](src/use-cases/importTemplate.ts)).
- **`consume-docs/`** feeds the RAG pipeline (pgvector via LiteLLM).

---

## UI workflow

1. Read [`design/component-architecture.md`](design/component-architecture.md) and [`design/design-tokens.md`](design/design-tokens.md).
2. Check `./design/` for approved wireframes; store new artifacts there.
3. Use `superdesign` when no wireframe exists; get user confirmation before coding.
4. Verify changes per **design-tokens.md §10** (390×844, `.playwright-mcp/` screenshots).

---

## TypeScript & repo conventions

- `verbatimModuleSyntax` — `import type` for type-only imports.
- Imports from [`deno.json`](deno.json) import map; internal paths use **`.ts`/`.tsx` extensions**.
- No `enum` — [`src/types/unions.ts`](src/types/unions.ts) pattern (also C-12 in SPECS).
- Domain fields `readonly`; arrays `ReadonlyArray<T>`; mutations via adapter only.
- `interface` for objects; `type` for unions/aliases. Barrel: [`src/types/index.ts`](src/types/index.ts).
- `deno fmt` on `src/` only. Pages **< 200 lines** — extract to `src/components/` or `src/utils/`.
- Prefer Mermaid or HTML wireframes over ASCII diagrams in agent output.

### React hooks (agent-authored code)

**Effect cleanup** — cancel all async work in cleanup: `AbortController` for fetch;
`cancelled` flag after `await`; `clearTimeout` / `clearInterval`.

**Data-fetching hooks** — expose `refresh` (counter → re-run effect) so transient
errors are recoverable without reload.

**localStorage** — read in effects or mount initializers, not during render; listen
for `storage` for cross-tab sync.

**Stable callbacks** — when children need latest handler without re-render churn,
use Latest Ref Pattern (`useRef` + sync effect) or caller wraps `onClick={() => cb()}`.

---

## Testing & CI

- After UI changes: Playwright MCP ([`.cursor/mcp.json`](.cursor/mcp.json)) or
  cursor-ide-browser; follow design-tokens §10.
- **Never force-click** obscured elements — fix layout/CSS.
- Ensure [`.github/workflows/pr-check.yml`](.github/workflows/pr-check.yml) passes
  (`deno task build`, `deno task lint`).

---

## PocketBase migrations (Go)

Custom server at [`server/`](server/). Schema reference: [`docs/pb-schema.md`](docs/pb-schema.md).

When adding a migration (`server/pb_migrations/`):

1. `core.NewBaseCollection(name)` + `collection.Fields.Add(...)`
2. `app.Save(collection)` — **one collection per call** (PB v0.39+)
3. Unique indexes via `collection.AddIndex(...)`, not `TextField.Unique`
4. `setPublicRules(collection)` for C-03 (no auth)

PB v0.39 API deltas: `URLField` not `UrlField`; `JSONField` not `JsonField`;
batch `app.Save` is sequential single-arg calls.

Docker build/run: see **README.md** Quick Start.

---

## External research

Verify APIs/SDKs against live docs before integrating — do not rely on training data.

Use web search before: new SDK integration, version pins, unread interfaces, unfamiliar
error strings, framework lifecycle gotchas. Follow up with official docs / pkg.go.dev.

---

## Quick links

[`src/components/shared/index.ts`](src/components/shared/index.ts) ·
[`src/styles/tokens.css`](src/styles/tokens.css) ·
[`src/utils/qrPayload.ts`](src/utils/qrPayload.ts) ·
[`src/adapters/interface.ts`](src/adapters/interface.ts) ·
[`docker-compose.yml`](docker-compose.yml)
