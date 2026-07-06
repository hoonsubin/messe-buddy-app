# Data Source-of-Truth Consolidation

**Status:** Planning — not started
**Last updated:** 2026-07-06

Companion to [`production-implementation-plans.md`](production-implementation-plans.md).
Scope: templates, shared library resources, and the demo instance currently
have multiple independent declarations instead of one. This doc tracks
collapsing them to a single declared source per concept, materialized through
real adapter calls that both `mockAdapter` and `pbAdapter` share.

---

## Problem summary

Three concepts each have (or had) more than one hand-authored copy:

1. **Onboarding template** — `defaultOnboardingTemplate.ts` (canonical) vs.
   `mockData.ts`'s `MOCK_MILESTONES`/`MOCK_MISSIONS`/`MOCK_FORM_SCHEMAS`
   (independently duplicated, same 33 missions, no shared source).
2. **Shared library resources** — only declared in `mockData.ts`
   (`MOCK_LIBRARY_RESOURCES`); no equivalent exists for PocketBase, so the
   template's resource bindings silently no-op on a fresh PB instance.
3. **Demo instance** ("Sofia Chen" / "Peter Tubak") — `mockData.ts` builds
   `MOCK_SESSION`/`MOCK_PLAYERS`/`MOCK_BUDDY_PROFILES`/`MOCK_PROGRESS_EVENTS`/
   `MOCK_PRE_BOARDING_CHECKS` as raw pre-formed records spliced directly into
   `mockAdapter`'s in-memory `Map`s — bypassing `createSession`,
   `invitePlayer`, `updateSession`, `upsertBuddyProfile` entirely. Separately,
   `useLandingFlow.ts` hardcodes its own copy of the same demo identities
   (`DEMO_PROFILES`, referencing `uid_sofia_002` / `sess_mmt2026` directly) so
   the profile picker always shows them — a second, independent declaration
   of the same ids that will silently break if the first one changes.

Also dead, to remove outright (unused, no functional role):
`TemplateLibrary.tsx` (`PLACEHOLDER_TEMPLATES`), `TemplateSummary` type,
`toTemplateSummaries`, and `mockAdapter.ts`'s modulo-filtered synthetic
templates (`Engineering Onboarding` / `Sales Bootcamp` / `Executive Welcome`).

## Target shape

```mermaid
flowchart TB
  subgraph declared["Declared source (one authoring surface each)"]
    T[defaultOnboardingTemplate.ts]
    L[defaultLibraryResources.ts — new]
    D[demoInstance.ts — new<br/>session/uid constants + persona overrides]
  end

  subgraph logic["Shared bootstrap logic (backend-agnostic)"]
    IT[importTemplate.ts]
    SL[seedLibraryResources — new]
    SD[seedDemoInstance(adapter) — new<br/>createSession → invitePlayer → importTemplate → overrides]
  end

  T --> IT
  L --> SL
  D --> SD
  IT --> SD

  IT --> AA[AppAdapter interface]
  SL --> AA
  SD --> AA

  AA --> MOCK[mockAdapter.ts<br/>in-memory, feeds client for demo]
  AA --> PB[pbAdapter.ts<br/>real PocketBase records]

  MOCK --> ULF[useLandingFlow.ts<br/>imports ids from demoInstance.ts]
```

Every value the app shows — real or demo — should trace back to one of the
three declared files, applied through real `AppAdapter` calls. Nothing
declares its own copy of dynamic/domain data downstream of that.

---

## Tasks

Work top-down; each task unblocks the next.

### 1. Add stable-id override to `createSession` / `invitePlayer`
- **Why first:** the demo bootstrap needs to pin `Session.id` and `Player.id`
  to fixed values so they survive dev-server reloads and so
  `useLandingFlow.ts` can reference them by constant. `Player.uid` / GM `uid`
  already need no change — they're client-generated and already decoupled
  from any record id.
- **Files:** `adapters/interface.ts`, `adapters/mock/mockAdapter.ts`,
  `adapters/pocketbase/pbAdapter.ts`.
- **Pattern to follow:** `createMilestone`/`createMission` already accept
  `data.id?: string`. Extend `createSession(name, gameMakerUid, gmRecoveryKey, id?)`
  and `invitePlayer(sessionId, data, id?)` the same way.
- **Acceptance:** calling with an explicit id produces a record with that id
  in both adapters; calling without one still generates a random id as today.

### 2. Declare `defaultLibraryResources.ts`
- **Files:** new `src/constants/defaultLibraryResources.ts`.
- **Content:** the 7 resources `defaultOnboardingTemplate.ts` already
  references by `resourceKey` (`campus_map`, `wenet`, `it_help`,
  `welcome_video`, `absence`, `org_chart`, `benefits`), lifted from
  `MOCK_LIBRARY_RESOURCES` — same shape, no ids/timestamps (those come from
  `createLibraryResource`).
- **Acceptance:** `tsc` clean; no consumer changes yet.

### 3. `seedLibraryResources(adapter)` use-case
- **Files:** new `src/use-cases/seedLibraryResources.ts`.
- **Behavior:** idempotent — skip any `resourceKey` that already exists
  (checked via `adapter.listLibraryResources()`), create the rest via
  `adapter.createLibraryResource`.
- **Acceptance:** running it twice against the same adapter produces exactly
  7 resources, not 14.

### 4. Declare `demoInstance.ts`
- **Files:** new `src/constants/demoInstance.ts`.
- **Content:** session id (`sess_mmt2026`), GM identity (uid, recovery key,
  name — "Peter Tubak"), one or more player personas with **explicit
  override state** — which missions are pre-completed, checklist items and
  their checked state, assigned buddy. Move `useLandingFlow.ts`'s
  `DEMO_PROFILES` values here as the single source.
- **Open decision (flag, don't guess):** decide what each persona's override
  state should actually represent. Today "Sofia" has zero completed missions
  despite the "already a first week in" framing in code comments — confirm
  intended narrative before encoding it (e.g., a handful of Milestone-1
  missions done, matching the profile/CEO-video/laptop-collection flow).
  Decide whether `player_alex` (currently just an unclaimed invite) stays as
  a second persona or gets dropped.
- **Acceptance:** no adapter/component changes yet; this is pure data.

### 5. `seedDemoInstance(adapter)` bootstrap use-case
- **Files:** new `src/use-cases/seedDemoInstance.ts`.
- **Behavior:** idempotent (skip if the session id already exists). Calls, in
  order: `createSession(..., stableId)` → `seedLibraryResources` →
  per persona: `invitePlayer(..., stableId)` → mark claimed with the
  persona's fixed `uid` (via `updatePlayer`, already a plain patchable
  field) → `createOnboardingJourney`/`importTemplate` with
  `DEFAULT_ONBOARDING_TEMPLATE` → apply override state (progress events,
  `updateSession` for `preBoardingChecks`, `upsertBuddyProfile`).
- **Acceptance:** running against a fresh `mockAdapter` instance reproduces
  today's demo-visible state (same session, same players, same progress)
  purely through adapter calls — no direct `Map.set`.

### 6. Rewire `mockAdapter.ts` init
- **Files:** `adapters/mock/mockAdapter.ts`, `adapters/mock/mockData.ts`.
- **Behavior:** module init calls `seedDemoInstance(thisAdapter)` instead of
  looping over `MOCK_*` constants. Delete `MOCK_MILESTONES`,
  `MOCK_MISSIONS`, `MOCK_FORM_SCHEMAS`, `MOCK_LIBRARY_RESOURCES`,
  `MOCK_MILESTONE_RESOURCES`, `MOCK_SESSION`, `MOCK_PLAYERS`,
  `MOCK_BUDDY_PROFILES`, `MOCK_PROGRESS_EVENTS`, `MOCK_PRE_BOARDING_CHECKS`,
  and the `seedTpl()` synthetic-template loop (and its 3 fake templates).
- **Acceptance:** `deno task dev` demo flow looks the same to a user as
  before (same players, same map state); `mockData.ts` either shrinks to
  nothing or is deleted outright.

### 7. Point `useLandingFlow.ts` at `demoInstance.ts`
- **Files:** `hooks/useLandingFlow.ts`.
- **Behavior:** replace the local `DEMO_PROFILES` declaration with an import
  from `constants/demoInstance.ts`.
- **Acceptance:** profile picker behavior unchanged; no local id literals
  remain in the hook.

### 8. Delete dead code
- **Files:** `components/shared/TemplateLibrary.tsx`, `utils/templateSummary.ts`
  (`TemplateSummary`, `toTemplateSummaries`), and any leftover imports.
- **Acceptance:** `tsc` clean; grep for `TemplateLibrary`/`toTemplateSummaries`
  returns nothing outside git history.

### 9. (Stretch) Seed a real PocketBase instance
- **Behavior:** a one-off script/task that runs `seedLibraryResources` and
  optionally `seedDemoInstance` against a live `pbAdapter`, for standing up a
  shared demo environment (e.g. for Peter Tubak) or for onboarding a first
  real cohort with library resources already in place.
- **Not required** for the mock-adapter cleanup to be complete — do last.

### 10. Verification pass
- Re-run `applyDefaultOnboardingJourney.test.ts` (unaffected by this work,
  but confirms the template path still resolves resource bindings correctly).
- Add tests for `seedLibraryResources` (idempotency) and `seedDemoInstance`
  (produces expected session/player/progress state, idempotent on re-run).
- Manual smoke: landing page profile picker still shows the two demo
  profiles at the same ids; player cockpit and GM view both load correctly
  off the freshly-seeded data.

---

## File map (this effort)

| Concern | Files |
| ------- | ----- |
| Stable ids | `adapters/interface.ts`, `adapters/mock/mockAdapter.ts`, `adapters/pocketbase/pbAdapter.ts` |
| Library resources | `constants/defaultLibraryResources.ts` (new), `use-cases/seedLibraryResources.ts` (new) |
| Demo instance | `constants/demoInstance.ts` (new), `use-cases/seedDemoInstance.ts` (new) |
| Mock adapter rewire | `adapters/mock/mockAdapter.ts`, `adapters/mock/mockData.ts` (shrinks/removed) |
| Landing flow | `hooks/useLandingFlow.ts` |
| Dead code removal | `components/shared/TemplateLibrary.tsx`, `utils/templateSummary.ts` |
| Existing template plumbing (unaffected) | `constants/defaultOnboardingTemplate.ts`, `use-cases/importTemplate.ts`, `use-cases/exportTemplate.ts` |

---

## Changelog

- 2026-07-06 — Plan created from source-of-truth audit (templates, library
  resources, demo instance, dead code).
