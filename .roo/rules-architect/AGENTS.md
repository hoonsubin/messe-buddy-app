# Architect Mode Rules (Non-Obvious Only)

- **All architectural constraints are in [`SPECS.md`](SPECS.md#design-constraints--invariants)** (C-01 through C-17). These are locked decisions - do not re-open without a Decision Log entry.
- **The [`pocketbase/` adapter directory](src/adapters/pocketbase) is empty** - implementing a real PocketBase adapter that satisfies [`AppAdapter`](src/adapters/interface.ts:17) is the next major architectural step.
- **The adapter is the single swap point** ([`AdapterContext.tsx`](src/adapters/AdapterContext.tsx:13)). Changing from mock to real PB is a one-line change in the provider. All components and use cases consume `AppAdapter` through [`useAdapter()`](src/adapters/useAdapter.ts:5).
- **Adapter boundary types** must exist only in the adapter module (C-13). [`FormSchemaRaw`](src/types/domain.ts:107) and [`ProgressEventRaw`](src/types/domain.ts:112) have JSON-stringified fields. The real PB adapter must parse these into typed interfaces before returning; no component may call `JSON.parse` on a PB record field.
- **XP Derivation** ([`deriveXP.ts`](src/use-cases/deriveXP.ts:22)) is algorithmically locked: difficulty weights are linear 1:1, rounding remainder goes to highest-difficulty missions first (then `order` as tiebreaker), `xpThreshold` is always 100 per Milestone (C-04).
- **Template import** uses `_milestoneOrder` and `_missionOrder` to reconstruct FK relationships ([`importTemplate.ts`](src/use-cases/importTemplate.ts:23)). Import order is: Session → Milestones (by `order`) → Missions (remap `milestoneId`) → FormSchemas (remap `missionId`) → Resources. Any change to export must update import symmetrically.
- **Form missions always `autoApproved`** regardless of `validationMethod` (C-06). The `ValidationDisplay` never mounts for `type: "form"`.
- **Progress is never snapshotted** - `computeProgress` re-derives at read time (C-11). Retroactive difficulty changes affect earned XP (OD-02 resolution).
- **SSE subscription is only held by `ValidationDisplay`** and only when `validationMethod = 'qr'` (C-07). Everything else is fetched once on mount.
- **No auth system is planned for the prototype** (C-03). If adding auth later, the `role` field must be server-validated on every mutation.

---

## React Lifecycle Design Principles

Design-level rules for hooks, effects, and component boundaries. These are framework-agnostic principles applicable to any React project.

### Data-Fetching Hook Contract

Every hook that fetches data must expose:
- Loading state (covers both initial and subsequent fetches)
- Error state (typed, nullable, cleared between fetches)
- Data state (nullable until first successful fetch)
- Retry/refresh callback

Omitting the retry callback means transient network failures are unrecoverable until remount — an architectural defect.

### Component ↔ Hook Boundary

- **Components consume data via hooks; they never own `useEffect` + fetch.** Fetching logic belongs in a hook file under `src/hooks/`. A component orchestrates UI; a hook orchestrates data.
- **Callbacks with volatile dependencies must not be passed directly as JSX props.** If a hook returns a callback that re-creates on every state change, the consumer must wrap it inline: `onClick={() => cb()}`. This prevents memoized children from holding stale references and avoids unnecessary re-renders. This is the **Callback Wrapping Pattern**.
- **Derivation over synchronization.** Prefer `useMemo` over `useEffect` + `setState` for values computable from existing state/props. Reserve `useEffect` + `setState` for external system synchronization (`localStorage`, browser APIs, subscriptions).

### Effect Lifecycle Tiers

Every `useEffect` falls into one of four tiers with distinct cleanup requirements:

| Tier | Nature | Cleanup Required |
|------|--------|-----------------|
| 1 | One-shot synchronous toggle | None |
| 2 | Async fire-and-cancel (fetch, Promise chains) | Boolean cancelled flag or AbortController |
| 3 | Subscription wire-and-unwire (EventEmitter, SSE, WebSocket) | Explicit unsubscribe/removeListener |
| 4 | Stream start-and-stop (ReadableStream, SSE text stream) | AbortController + reader.release() |

Tiers 2-4 **must** have cleanup. Tier 2 and 4 are most commonly violated (missing cancelled flag, AbortController not wired into cleanup return).

### Dependency Array Hygiene

- **Primitive dependencies over object references.** Hooks should accept primitive IDs (`sessionId: string`) rather than object references (`session: Session`) for values used as effect deps. Object references cause the effect to re-run on parent re-render even when identity hasn't semantically changed.
- **`eslint-disable react-hooks/exhaustive-deps` is a design smell.** Every suppression must be annotated with the exact justification. Valid: "ref is stable, not a reactive value". Invalid: suppression without any rationale.
- **Module-scope build-time constants** (from `import.meta.env`, `Deno.env.get`, Vite defines) are not reactive — they must not appear in dependency arrays.

### React Compiler (If Enabled)

The React 19 compiler auto-memoizes components and hooks, reducing manual `useCallback`/`useMemo` overhead. It does **not**:
- Fix stale closures (it only memoizes what was written)
- Inject AbortController cleanup or cancellation flags
- Fix missing effect cleanup

All architectural rules remain in effect regardless of compiler status. The compiler is a performance optimization, not a correctness tool.

---

## UI Component Architecture

Locked design decisions for the MesseBuddy design system. Full detail: [`design/component-architecture.md`](../../design/component-architecture.md).

### Layer model (do not skip)

```
tokens.css → ui/ primitives → patterns/ → domain/ → pages/
```

- **Pages** compose; they do not define new button styles, card surfaces, or overlay chrome.
- **Domain** (`admin/`, `player/`, etc.) holds feature UI built from primitives + patterns.
- **Patterns** (`patterns/`) are cross-route: `Toast`, future `Modal`, `BottomSheet`, `AppTopBar`.
- **Primitives** (`ui/`) are the only place new interactive styling enters via React — thin wrappers over BEM.

### CSS ownership

| What | Where |
|------|-------|
| Design tokens | `src/styles/tokens.css` |
| Primitive BEM (`.btn`, `.card`, `.form-input`) | `src/styles/components/{button,card,form,...}.css` |
| Page composers | `src/pages/*Page.tsx` — wire hooks; extract views to `pages/<route>/` when > ~200 lines |
| Import order | `src/index.css` (manifest only — no new rules) |

### Adding new shared UI

1. Used on ≥ 2 pages → `ui/` primitive or `patterns/` component first
2. New color/spacing → extend `tokens.css` + document in `design-tokens.md`
3. New overlay → extend existing modal/sheet system; no parallel backdrop implementations
4. Semantic role/mission colors → use `--color-role-*` / `--color-mission-*` tokens with `data-*` selectors

### Page size budget

Page files target **< 200 lines**. Extract views to `src/pages/<route>/` subcomponents when a page grows (see `LandingPage` migration plan in component-architecture.md).
