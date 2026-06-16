# Ask Mode — React Lifecycle Analysis Reference

When analyzing or explaining React lifecycle behavior, use these framework-level heuristics. Complements [`AGENTS.md`](../../AGENTS.md).

## Effect Lifecycle Tiers

Every `useEffect` falls into one of four tiers, each with its own cleanup requirement:

| Tier | Pattern | Cleanup Required | Failure Symptom |
|------|---------|-----------------|-----------------|
| 1 | One-shot toggle (set state from sync API) | None | — |
| 2 | Fire-and-cancel async (fetch, Promise chain) | Boolean `cancelled` flag or `AbortController` | State update on unmounted component |
| 3 | Wire-and-unwire subscription (EventEmitter, WebSocket, SSE) | `unsubscribe()` / `removeListener()` | Double subscription, memory leak |
| 4 | Start-and-stop stream (`ReadableStream`, generator) | `controller.abort()` + reader cleanup | Stream continues after unmount |

Most bugs in this project fall into Tier 2 (missing cancellation) or Tier 4 (missing abort).

## Stale Closure Decision Tree

When someone asks "why is this component showing old data":

```
Is the value passed via props?
  ├── Yes → Is the parent passing a new reference every render?
  │         ├── Yes → Memoize at parent or use stable ref pattern
  │         └── No  → Check child component for stale closure
  └── No (value comes from hook) →
        Is the value read inside a useCallback?
          ├── Yes → Is it in the dependency array?
          │         ├── Yes → Callback correctly fresh. Check consumer.
          │         └── No  →
          │               Is the value from a ref.current?
          │                 ├── Yes → Ref sync verified?
          │                 └── No  → 🔴 Missing dep. Add it or use ref.
          └── No → Check if closure captures render-time value
```

## `eslint-disable react-hooks/exhaustive-deps` Legitimacy Check

When evaluating existing code with suppressed deps warnings:

| Justification | Valid? | Alternative |
|---------------|--------|-------------|
| "ref is stable, not a reactive value" | ✅ Valid | None needed |
| "build-time constant, never changes at runtime" | ✅ Valid | None needed |
| "intentional, callback must not re-create" | ⚠️ Conditional | Use Latest Ref Pattern instead |
| "will fix later" | ❌ Invalid | Remove suppression or fix immediately |
| No comment at all | ❌ Invalid | Add justification or fix deps |

## Data-Fetching Checklist for New Code

When reviewing a new hook:
1. Does it expose `refresh` / `invalidate` / `retry`? → If not, transient errors are unrecoverable.
2. Does the effect have a cleanup that matches the tier? → Every tier except 1 needs cleanup.
3. Are long-running loops cancel-safe? → Cancellation must be checked between each iteration, not just before/after.
4. Is the fetch handler wrapped in try/catch? → Uncaught promise rejections crash the application.
5. Does it read `localStorage`/`sessionStorage` during render? → Must read in an effect or ref to stay pure.
