# Code Mode — React Lifecycle Implementation Rules

Complements the cross-cutting lifecycle principles in [`AGENTS.md`](../../AGENTS.md). These are implementation-time rules specific to coding.

## Data-Fetching useEffect Checklist

Every `useEffect` that performs async data fetching must satisfy all four:
1. **Cancellation mechanism** — `AbortController` + `signal` for `fetch`-based operations; boolean `cancelled` flag for `async/await` chains
2. **Cleanup function** — `controller.abort()` or `cancelled = true` in the effect's cleanup return
3. **Retry capability** — expose a `refresh` callback by incrementing a counter state that's included in the dependency array
4. **Error state** — catch block sets an `error` state, not just console.error

## useState Rules

- **Derive, don't sync.** If a value is computable from existing state or props, compute it at render time (or use `useMemo`). Only use `useEffect` + `setState` when synchronizing with an external system (`localStorage`, `sessionStorage`, DOM APIs, subscriptions).
- **Functional updaters for dependent state.** When new state depends on its previous value, use `setState(prev => f(prev))`. Never read state from a ref or closure variable inside `setState`.
- **Stable keys for identity comparison.** When seeding state from a prop that is an object or array, compare by a stable key (e.g., `.id`) not by reference identity. Object identity checks break if the parent recreates the reference on every render.

## useCallback / useMemo Rules

- **Volatile callbacks must not be passed directly to children.** If a `useCallback` depends on a frequently-changing value (form input, draft array, order map), callers must wrap it inline: `onClick={() => cb()}`. The child always invokes the latest version; the child does not re-render on every parent state change. This is the **Callback Wrapping Pattern**.
- **Stable callback identity + fresh value.** When a callback must keep a stable reference (for memoized children, event subscriptions, debounced functions) yet read the latest state/props, use the **Latest Ref Pattern**:
  ```typescript
  const valRef = useRef(val);
  useEffect(() => { valRef.current = val; });
  const stableCb = useCallback(() => doSomething(valRef.current), []);
  ```
- **No trivial memoization.** `useMemo(() => x, [x])` adds overhead without benefit. Only memoize non-trivial computations.

## Long-Running Async Loop Safety

When an effect iterates over many items with async operations:
- Check the cancellation flag between every iteration, not just after the loop completes
- Use `Promise.allSettled` over `Promise.all` to isolate individual failures
- An item-level failure should not abort the entire operation

## Hook Organization

- One hook file = one data concern. A hook exceeding 6 state variables or ~150 lines should be split into sub-hooks, or imperative logic extracted to a use-case module.
- Test files are co-located as `*.test.ts`/`.tsx` in the same directory.

---

## Component Implementation Policy

- **Keep components lean.** If a single component file exceeds ~200 lines, extract reusable pieces (types, UI sub-components, hooks) into separate files. A component file should express orchestration logic, not inline hundreds of lines of markup.
- **Prefer extraction over nesting.** When a component has clearly separable concerns — e.g., list view vs. editor view, drag-to-dismiss logic, draft persistence — extract them into dedicated modules under [`src/components/`](src/components/) or [`src/utils/`](src/utils/) as appropriate.
- **Small components are preferred.** Each file should have one clear responsibility. Reference canonical patterns like [`ConfirmSheet`](src/components/admin/ConfirmSheet.tsx) (uses `Button` from `ui/`), [`DraftRestoreBanner`](src/components/admin/DraftRestoreBanner.tsx), and [`MissionListView`](src/components/admin/MissionListView.tsx) (extracted from [`MissionBottomSheet`](src/components/admin/MissionBottomSheet.tsx)).

---

## UI Implementation Rules

Complements the design system in [`design/component-architecture.md`](../../design/component-architecture.md) and [`design/design-tokens.md`](../../design/design-tokens.md).

### Before writing UI code

1. Check [`design/design-tokens.md`](../../design/design-tokens.md) component catalog — reuse before creating
2. Import primitives from [`src/components/ui/index.ts`](../../src/components/ui/index.ts)
3. Add CSS to the matching file under [`src/styles/components/`](../../src/styles/components/) — **never** add rules to [`src/index.css`](../../src/index.css) (import manifest only)

### Required patterns

| Need | Use | Do not |
|------|-----|--------|
| Button / CTA | `<Button variant="primary">` | Raw `.btn`, inline button styles |
| Text input | `<Input hasError={…}>` | Raw `.form-input`, inline borders |
| Icon action | `<IconButton variant="onPrimary">` | Inline `background: none; border: none` |
| Avatar | `<Avatar initials={…}>` | Custom circle divs with inline sizing |
| Card surface | `<Card>` | Inline `background`, `borderRadius`, `padding` |
| Layout gap/flex | `core-flex-row`, `core-gap-3` | Inline `display: flex; gap: 8px` |
| Conditional classes | `cn("btn", isActive && "btn--active")` | Template string concatenation |

### Forbidden in new UI code

- Hardcoded `hsl(...)`, `#hex`, or `rgb(...)` in TSX — add token to [`tokens.css`](../../src/styles/tokens.css)
- `style={{}}` for colors, spacing, typography, borders, shadows
- New BEM overlay blocks — use `.modal-*` or `.bottom-sheet-*` until `Modal`/`BottomSheet` patterns land
- ASCII symbols or emojis as UI icons — use `react-icons`

### Allowed `style={{}}` exceptions

Dynamic geometry only: map node `%` positions, chart bar heights, camera/video viewport dimensions, drag transforms driven by pointer events.

---

## Mandatory Smoke Testing After UI Changes

- **Any change to a UI component must be validated with Playwright** before marking the task complete. Use `browser_run_code_unsafe` or `browser_snapshot` to verify that:
  - The component renders without error
  - Core user interactions (click, input, navigation) work
  - No broken layout, missing elements, or console errors
- **Test from a mobile-first viewport** (390×844). Resize to the user's actual viewport if different.
- **Always test the user-facing flow**, not just the implementation detail. For example, verify that a bottom sheet opens, shows content, and closes.
- **Save screenshots to `.playwright-mcp/`** for visual reference.
- **Do not force-click elements** to bypass layout issues. If an element is obscured or outside the viewport, investigate and fix the root cause — this is a legitimate UX bug, not a testing convenience.
