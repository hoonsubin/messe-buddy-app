# Debug Mode — React Lifecycle Bug Checklist

Diagnostic procedure for lifecycle-related bugs. Complements [`AGENTS.md`](../../AGENTS.md).

## 1. Stale Closure Diagnosis

Check in this order when a component shows stale state:

1. **Is the function wrapped in `useCallback` with incomplete deps?** Every variable referenced inside the callback must appear in the dependency array — unless it's a `ref.current` (intentional escape hatch). Use the `react-hooks/exhaustive-deps` lint rule as a debug aid.

2. **Is a volatile callback passed directly to a child component?** If a callback is recreated on every state change (e.g., form input, editor draft) and passed directly as a JSX prop, the child receives a new reference every render. The fix is the **Callback Wrapping Pattern**: `onClick={() => cb()}` instead of `onClick={cb}`. This ensures the child always invokes the latest version.

3. **Is the Latest Ref Pattern used but the ref wasn't synced?** If a ref is used to escape stale closures, verify the sync `useEffect` runs: `useEffect(() => { ref.current = val; })`. Without this, the ref holds the initial value.

## 2. Missing Effect Cleanup Diagnosis

| Symptom | Suspect | Fix |
|---------|---------|-----|
| State updates after component unmount | Fetch.resolve() runs after cleanup | `AbortController.signal` or cancelled flag |
| Phantom API calls continue after navigation | fetch() inside loop without per-iteration cancel check | Check cancelled flag between iterations |
| setTimeout callback fires on unmounted component | Timer created without cleanup | `clearTimeout` in cleanup return |
| Stream keeps reading after component leaves DOM | `Response.body.getReader().read()` in infinite loop | `controller.abort()` in cleanup return |
| Analytics/timeout fires against wrong data | setInterval without cleanup | `clearInterval` in cleanup return |

## 3. Data-Fetching Resilience Checklist

- **Retry missing?** If the hook has no `refresh` callback, transient network failures are unrecoverable until the component remounts. The fix: increment a counter state in `refresh` and include it in the effect's dependency array.
- **Conditional fetch without re-run?** Pattern `if (!id) return; void fetch()` means the effect won't re-run if `id` becomes available between renders (e.g., after an async identity resolution). The effect only re-runs when dep values change, not when a missing dependency becomes available.
- **Long-running loop not cancel-safe?** An effect that iterates over items with per-item async calls must check the cancellation flag between each iteration, not just at the top.

## 4. Memoization Anti-Patterns

- **`React.memo` + unstables props** — wrapping a component with `React.memo` is defeated if it receives objects, arrays, or callbacks that are recreated every render. The shallow compare always fails.
- **`useMemo` on trivial values** — wrapping a constant or simple arithmetic in `useMemo` is slower than computing it at render time. Only memoize non-trivial computations.
- **`eslint-disable react-hooks/exhaustive-deps` without justification** — every suppression must be annotated with the exact reason ("ref is stable", "build-time constant"). New code should avoid suppression entirely.

---

## UI Design Drift Diagnosis

When layout looks wrong or visually inconsistent, check design-system compliance before adding inline fixes.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Wrong font / generic system UI | Skipped `--font-sans` / Geist | Use token; check `reset.css` + font import |
| Colors don't match rest of app | Hardcoded HSL in TSX | Move to `tokens.css`; use `hsl(var(--token))` |
| Button looks different per page | Raw `.btn` vs `<Button>` mix | Standardize on `ui/Button` |
| Spacing feels arbitrary | Inline `gap`/`padding` in px | Use `--space-*` via `core-gap-*` or BEM |
| Modal/sheet styling diverges | New custom overlay classes | Consolidate to `.modal-*` or `.bottom-sheet-*` |
| Touch target too small | Missing `min-height: var(--touch-target)` | Fix in component CSS, not force-click in tests |
| Styles not applying | Rule added to `index.css` | Move to correct `src/styles/components/*.css` file |
| Duplicate/conflicting rules | Edited `legacy.css` when primitive exists | Prefer extracted file (`button.css`, etc.) |

**Reference:** [`design/design-tokens.md`](../../design/design-tokens.md), [`design/component-architecture.md`](../../design/component-architecture.md).
