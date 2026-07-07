# MesseBuddy — Realtime & Client-Cache Architecture Proposal

Prompted by two bugs found in production investigation (2026-07-07): the player
dashboard has no live-push for new missions/milestones, and a per-player
"applied template" value cached in `localStorage` can silently overwrite the
wrong shared template. Both trace to the same structural gap — there's no
general mechanism connecting "data changed on the server" to "components with
that data open should update," so every read path either (a) gets its own
hand-written subscribe method, or (b) gets none and just goes stale. This
document proposes one mechanism that fixes both bug classes at once, instead
of patching each read path individually.

## Current state (why this doesn't scale)

- `src/adapters/interface.ts` declares exactly three realtime methods:
  `subscribeProgressEvent`, `subscribeSessionPlayers`,
  `subscribeSessionProgressEvents`. Every one of these was hand-written,
  including a bespoke merge function per collection
  (`src/store/gmRosterPatch.ts`) to splice the pushed record into the query
  cache correctly.
- Anything NOT covered by one of those three — missions, milestones,
  templates, library resources, buddy profiles, form schemas — has no push
  path at all. It's a plain fetch-on-mount query
  (`src/store/queryFetchers.ts` + `src/store/queryKeys.ts` +
  `src/store/queryClient.ts`'s `fetchQuery`/`patchQuery`/`invalidateQuery`).
  Adding realtime to any of these today means writing a new adapter method
  *and* a new patch function, every time — exactly the "not scalable" problem.
- Separately, `src/utils/playerDetailStorage.ts` treats `localStorage` as a
  substitute for a server field: `appliedTemplate` is read once at mount
  (`useGmPlayerDetailPage.ts:503`), never reconciled against anything
  authoritative (no such field exists server-side), and is later used to
  decide which shared `templates` record gets overwritten
  (`handleSaveToTemplate`, line 660). `src/utils/draftStorage.ts` shows the
  *correct* pattern right next to it: scoped by `(sessionId, missionId)`,
  written only on edit, cleared on save/discard. The bug isn't "localStorage
  is used" — it's that one specific usage broke the draft-only discipline the
  rest of the app already follows.

## Proposed architecture

### 1. One generic realtime primitive, not one per collection

Replace the three bespoke adapter methods with a single one:

```ts
subscribeCollection(
  collection: string,
  filter: string | undefined,
  onEvent: (action: "create" | "update" | "delete", record: unknown) => void,
): () => void
```

Implemented once, in `pbAdapter.ts`, as a thin wrapper over
`pb.collection(collection).subscribe("*", cb, filter ? { filter } : undefined)`.
PocketBase already multiplexes every subscription over one SSE connection —
this doesn't add connections, it just stops hand-rolling a new method per
collection.

### 2. Live queries: declare the dependency, don't hand-write the patch

Pair each cache key with the collection(s)/filter(s) it depends on, in one
place:

```ts
export const realtimeDeps: Record<string, ReadonlyArray<{ collection: string; filter: string }>> = {
  [queryKeys.gmRoster(sessionId)]: [
    { collection: "players", filter: `sessionId="${sessionId}"` },
    { collection: "progress_events", filter: `sessionId="${sessionId}"` },
  ],
  [queryKeys.journey(sessionId, playerId)]: [
    { collection: "milestones", filter: `playerId="${playerId}"` },
    { collection: "missions", filter: `playerId="${playerId}"` },
  ],
  // ...one entry per cache key, including templates, library resources, etc.
};
```

Add one hook, `useLiveQuery(key, fetcher)`, as a drop-in replacement for
today's plain `useQuery`: it fetches/reads the cache exactly as before, then
looks up `realtimeDeps[key]`, opens (or joins, ref-counted) the matching
`subscribeCollection` topics, and on any event calls the *existing*
`client.invalidateQuery(key)` — already implemented in `queryClient.ts`,
already triggers a refetch. No bespoke merge/patch function required per
collection; `gmRosterPatch.ts`-style manual splicing becomes optional
(kept only where profiling shows plain invalidate+refetch is too chatty).

**Net effect:** adding realtime to a new read path — missions, milestones,
templates, whatever comes next — is a one-line addition to `realtimeDeps`,
not a new adapter method and a new patch function. This is the direct fix
for the player-dashboard mission/milestone gap, generalized so it can't
recur for the next collection either.

### 3. One subscription bookkeeper (avoid duplicate/leaked topics)

The bridge ref-counts subscriptions per `(collection, filter)` topic: if two
components both read `queryKeys.journey(...)` for the same player, they share
one underlying PocketBase subscription, closed only when the last consumer
unmounts. This is shared infrastructure, written once, not a per-feature
concern.

### 4. LocalStorage: drafts only, one utility, enforced by construction

Generalize the already-correct `draftStorage.ts` pattern into the one and
only way anything gets persisted locally:

```ts
draftStore.read(entityType, entityId)
draftStore.write(entityType, entityId, payload)
draftStore.clear(entityType, entityId)
draftStore.sweepStale(maxAgeMs)   // run once at app boot — GC for abandoned drafts
```

Rule: nothing may read from `draftStore` as a substitute for a server value.
It exists solely to resume an in-progress, not-yet-saved edit, and is cleared
the moment that edit is saved or discarded — exactly what mission drafts
already do.

`playerDetailStorage.ts`'s `appliedTemplate` stops being a local-only value.
Since it's used to gate a destructive, cross-session action (overwriting a
shared template), it needs to be real, authoritative, server state:

- Add a small field to the `players` record (or an equivalent join) —
  `appliedTemplateName` — written at the same moment `createOnboardingJourney`
  / `handleUseTemplate` / `handleAddTemplate` already talk to the server.
- Read it through the *same* `useLiveQuery` mechanism as everything else in
  §2. This means it's always current, and if a teammate changes it from a
  different device, every open tab picks that up automatically — solved by
  the identical general mechanism that fixes the missions/milestones gap,
  not a second bespoke fix.

**Litmus test going forward:** if a piece of state has any bearing on a
shared or destructive action, it lives on the server and flows through
`useLiveQuery`. If it's purely "let me resume what I was typing," it goes
through `draftStore` and nothing else. Nothing gets to invent a third
category.

### 5. Surface conflicts instead of silently resolving them either direction

Because `useLiveQuery` and `draftStore` are now both centralized, they can be
crossed cheaply: if a realtime event invalidates a key that has a live draft
open (`draftStore.read(...)` returns non-null), don't silently refetch over
the user's in-progress edit and don't silently keep serving the stale draft
either — surface a lightweight "this changed on the server while you were
editing" affordance. This is a few lines of glue between two pieces of
infrastructure that already know everything they need to know, rather than
bespoke conflict-handling per feature.

## Why this is the structural fix, not two patches

Both reported bugs are instances of the same missing piece: no generic path
from "server data changed" to "the client's view of it updates," and no
consistent rule for what's allowed to live in `localStorage`. Adding a fourth
bespoke `subscribeSessionMissions` method would fix the immediate symptom and
leave the pattern in place for the next collection. Building `useLiveQuery` +
`realtimeDeps` + a single `draftStore` fixes the reported bugs as a side
effect of fixing the mechanism, and the next read path that needs realtime —
or the next piece of state someone's tempted to stuff in `localStorage` —
has an obvious, load-bearing convention to follow instead of a decision to
make from scratch.

## Suggested phasing

1. `subscribeCollection` + `useLiveQuery` + `realtimeDeps`, ported over one
   existing bespoke path first (GM roster) to prove equivalence, then applied
   to missions/milestones (fixes the reported player-side gap) and templates.
2. Retire `subscribeSessionPlayers` / `subscribeSessionProgressEvents` /
   `subscribeProgressEvent` and `gmRosterPatch.ts` once `useLiveQuery` covers
   their cases.
3. `draftStore` extraction from `draftStorage.ts`, migrate mission drafts to
   it (should be close to a rename).
4. Add the `appliedTemplateName` server field, migrate
   `playerDetailStorage.ts` off `localStorage` onto `useLiveQuery`.
5. Conflict-surfacing glue (§5) — lowest priority, smallest piece, depends on
   1–4 being in place.
