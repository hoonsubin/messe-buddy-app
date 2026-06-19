# AGENTS.md

Agent guidance for this repository. Complements [`README.md`](README.md:1). Read [`SPECS.md`](SPECS.md:1) before making architectural decisions.

---

## Project Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript (strict) + Vite 8 |
| Runtime | Deno 2.8+ (replaces Node/npm entirely) |
| Backend | PocketBase (Go binary, REST + SSE + SQLite) |
| AI Gateway | LiteLLM Proxy (OpenAI-compatible `/chat/completions`) |
| Vector DB | PostgreSQL + pgvector |
| Package Manager | Deno npm resolution (`nodeModulesDir: "auto"`) |

**Prerequisites:** Node.js 24, Deno 2.8+, Docker Desktop, LLM provider API key.

**Non-obvious facts:**
- **No auth system** - identity is UID-based, stored in `localStorage` as [`mb_identity`](src/hooks/useIdentity.ts:4). `role` is client-stored, **not** server-validated.
- **No tests yet** - when adding, use `Deno.test`, co-locate as `*.test.ts`/`.tsx`, fixture via [`mockAdapter`](src/adapters/mock/mockAdapter.ts:367).
- **Only mock adapter exists** - [`src/adapters/pocketbase/`](src/adapters/pocketbase/) implements `pbAdapter`; selected via `VITE_USE_MOCK_PB` in [`AdapterContext.tsx`](src/adapters/AdapterContext.tsx).
- **Long file edits WILL get truncated** - NEVER make file edits that are longer than 500 lines. Always make edits based on logical and manageable chunks.

---

## Commands

All through **Deno** (not npm). Tasks in [`deno.json`](deno.json:2).

```sh
deno install            # Pre-fetch npm dependencies
deno task dev           # Vite dev server + HMR (all interfaces)
deno task build         # Type check + production build → dist/
deno task lint          # ESLint
deno task preview       # Preview production build locally
```

---

## Architecture

### Adapter Pattern
Data access flows through [`AppAdapter`](src/adapters/interface.ts:17). Components never call PocketBase. Swapping adapters is a **one-line change** in [`AdapterContext.tsx`](src/adapters/AdapterContext.tsx:13).

```
Component → Use Case → AppAdapter → MockAdapter (current) / PocketBaseAdapter (future)
```

### Key Design Constraints
All 17 in [`SPECS.md`](SPECS.md:946). Critical subset:

| # | Constraint |
|---|-----------|
| C-03 | No auth - UID in `localStorage` as `mb_identity` |
| C-05 | One `ProgressEvent` per `(playerId, missionId)` - enforced at single upsert point |
| C-07 | QR validation fully offline: HMAC verify → GM confirm → PB write |
| C-08 | Milestone positions are percentage-based (`xPercent`/`yPercent` 0–100) |
| C-11 | Progress never snapshotted - `computeProgress` re-derives at read time |
| C-12 | No TypeScript `enum` - use `const` object + `keyof` union |
| C-13 | No component calls `JSON.parse` on PB fields - parsing inside adapter |
| C-16 | [`qrPayload.ts`](src/utils/qrPayload.ts:1) is single encode/decode point (HMAC-SHA256) |

## UI Development Workflow

Before writing ANY implementation code for a new screen, page, or feature:

1. Use `superdesign` tools to iterate on visual design if needed
2. Only proceed to implementation after the user confirms the wireframe
3. Store approved wireframe artifacts in `./design/` folder
4. Reference the wireframe during implementation for layout/component decisions

### Design Consistency
- Always check `./design/` for prior wireframes before starting adjacent screens
- Maintain a design token vocabulary defined in [`design/design-tokens.md`](design/design-tokens.md)

### Routes

| Path | Component | Role |
|------|-----------|------|
| `/` | [`LandingPage`](src/pages/LandingPage.tsx:1) | Public |
| `/join/:sessionId` | [`LandingPage`](src/pages/LandingPage.tsx:1) | Public (invite prefill) |
| `/session/:sessionId` | [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx:1) | Player |
| `/admin/:sessionId` | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:1) | GameMaker |
| `/admin/:sessionId/scan` | [`QRScannerView`](src/pages/QRScannerView.tsx:1) | GameMaker |
| `/validate/:sessionId` | [`ValidationPage`](src/pages/ValidationPage.tsx:1) | GameMaker |
| `/form/:missionId` | [`FormPage`](src/pages/FormPage.tsx:1) | Player |

---

## Code Style

- **`verbatimModuleSyntax`** - use `import type` for type-only imports. Never mix runtime + type in one statement.
- **No `enum`** - pattern: `export const FOO = { A: "a" } as const; export type Foo = (typeof FOO)[keyof typeof FOO];` ([`src/types/unions.ts`](src/types/unions.ts:4))
- **Icons only** - When using an icon for the UI component, ALWAYS use `react-icons` and NEVER use ASCII symbols or emojis.
- **Interface fields** are `readonly`; arrays `ReadonlyArray<T>`. Mutations via adapter only.
- **`interface`** for object contracts; **`type`** for unions, intersections, aliases.
- **Imports** from Deno import map ([`deno.json`](deno.json:25)), never `package.json`. Internal imports use **`.ts`/`.tsx` extensions**.
- **Barrel exports** in [`src/types/index.ts`](src/types/index.ts:1) - re-exports types + const objects.
- **Formatter:** `deno fmt` (2-space indent, 80-char width, semicolons, double quotes). Only `src/` formatted.
- **Components:** keep <200 lines; extract reusable pieces to `src/components/` or `src/utils/`. One responsibility per file. See [`ConfirmSheet`](src/components/admin/ConfirmSheet.tsx), [`DraftRestoreBanner`](src/components/admin/DraftRestoreBanner.tsx), [`MissionListView`](src/components/admin/MissionListView.tsx) as reference.
- **Visualize** - When possible, use Mermaid diagram or HTML wireframe to express visualized aspects of the content. NEVER use ASCII diagrams.

### React Hooks & Lifecycle (All Modes)

**Async effect cleanup completeness.** Every effect that launches async work must cancel it in cleanup:
- `fetch` with `ReadableStream` body → `AbortController.signal` + `controller.abort()` in cleanup
- `async/await` chains → boolean `cancelled` flag, checked after each `await`
- `setTimeout`/`setInterval` → `clearTimeout`/`clearInterval` in cleanup
- Long-running loops (nested async fetches) → check cancellation flag between each iteration

**Closure freshness vs. callback stability trade-off.** A `useCallback` that reads state/props must either:
- Include them in deps (freshness at cost of recreation), OR
- Use the **Latest Ref Pattern**: `useRef + useEffect` sync to read latest values with a stable callback identity. Use this when callbacks are passed to memoized children or stored across renders.

**Data-fetching resilience.** Every hook that fetches on mount should expose a `refresh` callback (increment a counter state → trigger the effect again via dependency). Without this, transient network failures trap the user in an error state until page reload.

**External store synchronization.** `localStorage` initializers in `useState(reader())` are correct for mount-time, but cross-tab changes require a `window` `"storage"` event listener. Never read `localStorage`/`sessionStorage` during render - use an effect.

**Callback wrapping pattern.** When a hook returns callbacks that re-create on every state change (volatile identity), callers should wrap them inline: `onClick={() => cb()}`. This guarantees the child component always invokes the latest version without requiring the child to re-render on every parent state change.
---

## Testing & Debugging

### UI Smoke Tests (Mandatory after any UI change)
Use Playwright MCP (`playwright` server in [`.cursor/mcp.json`](.cursor/mcp.json:1) - Firefox, iPhone 15 profile) or `browser_snapshot` / `browser_take_screenshot` to verify:
- Component renders without error
- Core interactions (click, input, navigation) work
- No console errors or broken layout
- **Mobile-first viewport** (390×844). Resize to user's viewport if different.
- Test user-facing flow, not just implementation detail
- Save screenshots to `.playwright-mcp/`

**Never force-click.** Obscured/off-screen elements are real UX bugs - fix at CSS/component level.

ALWAYS ensure that the (`./.github/workflows/pr-check.yml`)[./.github/workflows/pr-check.yml] passes.

### Layout Debugging
- Obscured, off-screen, or edge-clipped elements are in-scope defects
- Use `browser_evaluate` to measure positions and CSS before proposing fixes
- Fix root cause, not symptoms

---

## PocketBase Server

Custom Go wrapper at [`server/`](server/).

| Path | Purpose |
|------|---------|
| [`server/go.mod`](server/go.mod:1) | Go module `messe-buddy-pb`, requires Go ≥ 1.25.0 |
| [`server/main.go`](server/main.go:1) | Entry: embeds `pb_migrations`, auto-migrate, `qrSecret` hook |
| [`server/pb_migrations/`](server/pb_migrations/) | Go migration files via `init()` → `m.Register(...)` |

### Creating Migrations
1. New file in `server/pb_migrations/` (e.g. `003_new_feature.go`)
2. `core.NewBaseCollection(name)` for collections
3. `collection.Fields.Add(...)` with typed field structs
4. `app.Save(collection)` per collection (v0.39+ API - single-arg only)
5. Unique indexes: `collection.AddIndex(name, unique, columnsExpr, optWhereExpr)` (not `TextField.Unique`)
6. `setPublicRules(collection)` to clear API rules (C-03: no auth)

**Key PB v0.39.4 API changes from ≤v0.22:**

| Old | New |
|-----|-----|
| `&core.TextField{Unique: true}` | `collection.AddIndex(...)` |
| `app.Save(c1, c2, c3)` | `app.Save(c1); app.Save(c2); app.Save(c3)` |
| `core.UrlField` | `core.URLField` |
| `core.JsonField` | `core.JSONField` |

### Build & Run
```sh
docker compose build app   # Build app service (includes Go compile)
docker compose up app       # Full stack, migrations auto-applied
```

`PB_AUTO_MIGRATE=true` (default in [`docker-compose.yml`](docker-compose.yml:297)). Set to `"false"` after initial deploy.

### Schema
All 9 collections documented in [`docs/pb-schema.md`](docs/pb-schema.md:1).

---

## Environment Variables

See [`.env.example`](.env.example:1). `VITE_PB_URL` and `VITE_LITELLM_URL` are **build-time** - frozen in JS bundle, require rebuild to change.

---

## Non-Obvious Gotchas

- **Mock adapter** simulates GM approval with 4s `setTimeout` ([`mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:79)): `pendingApproval` auto-transitions to `completed` after 4s.
- **Form missions** always `autoApproved` regardless of `validationMethod` (C-06). `ValidationDisplay` never mounts for `type: "form"`.
- **SSE subscription** via `useWatchMission` → `subscribeProgressEvent`: [`QRDisplay`](src/components/player/QRDisplay.tsx) for `qr`, [`ValidationDisplay`](src/components/player/ValidationDisplay.tsx) for `gmApprove` only (C-07, C-20). Everything else fetched once on mount.
- **Template export** embeds `_milestoneOrder`/`_missionOrder` ([`exportTemplate.ts`](src/use-cases/exportTemplate.ts:27)) - FK remapping keys for import ([`importTemplate.ts`](src/use-cases/importTemplate.ts:13)).
- **`useChatStream`** is a Phase 1 stub ([`useChatStream.ts`](src/hooks/useChatStream.ts:20)) - returns empty state.
- **`consume-docs/`** feeds the RAG pipeline - documents chunked, embedded, stored in pgvector.

---

## Research Before Implementation

**Verify external API/SDK/CLI behavior and industry best-practices.** Do not infer without reliable external evidence.

Use `searxng_web_search` before:
- Integrating any external API/SDK/CLI not verified this session
- Choosing library versions, Docker tags, Go module versions
- Writing code against unread interfaces/structs
- Debugging unfamiliar error strings (search verbatim)
- Auditing code smells or framework-specific gotchas (e.g., React 19 hooks and component life-cycles)

Follow up with `web_url_read` at pkg.go.dev, `raw.githubusercontent.com`, or official docs. **Source of truth is live documentation, not LLM training data.**

---

## Reference

- [`SPECS.md`](SPECS.md:1) - authoritative spec
- [`src/adapters/interface.ts`](src/adapters/interface.ts:17) - adapter contract
- [`src/types/unions.ts`](src/types/unions.ts:4) - union types (no enums)
- [`src/types/domain.ts`](src/types/domain.ts:1) - domain types
- [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:367) - mock adapter
- [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts:1) - QR encode/decode
- [`docker-compose.yml`](docker-compose.yml:1) - Docker Compose
- [`docs/pb-schema.md`](docs/pb-schema.md:1) - PocketBase schema
- [`.roo/skills/`](.roo/skills) - Agent Skill files
