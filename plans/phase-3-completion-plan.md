# Phase 3 Completion Plan — Data Hooks + Testing Fixes

> **Goal:** Complete all missing Phase 3 deliverables and fix the issues discovered during Playwright testing.
> **Spec authority:** [`../SPECS.md`](../SPECS.md)
> **Strategy authority:** [`../plans/prototype-impl-strategy.md`](../plans/prototype-impl-strategy.md)
> **Created:** 2026-06-14

---

## Overview

The Playwright test session identified **5 issues** and the code audit revealed **4 missing Phase 3 deliverables**. This plan addresses both in a logical order — quick wins first, then architectural work, then the major refactor.

---

## Logical Execution Order

1. **Quick housekeeping** — delete stale boilerplate, fix trivial CSS/UX bugs
2. **Create 4 data hooks** — the critical missing Phase 3a deliverable
3. **Refactor PlayerCockpitPage** — replace direct mock imports with hooks + adapter
4. **Architectural consistency** — RecoveryKeyModal inline styles
5. **Verify exit condition** — `deno task build` + Playwright smoke test

---

## Task 1 — Quick Housekeeping

### 1.1 Delete stale boilerplate files

| File | Reason | Action |
|---|---|---|
| [`../src/App.css`](../src/App.css) | Unused Vite scaffold CSS with `px` values, not imported anywhere | Delete |
| [`../src/assets/react.svg`](../src/assets/react.svg) | Unused Vite boilerplate asset | Delete |
| [`../src/assets/vite.svg`](../src/assets/vite.svg) | Unused Vite boilerplate asset | Delete |

**Exit condition:** Files no longer exist on disk. `deno task build` passes.

### 1.2 Fix QR scanner background color

**Problem:** [`../src/pages/QRScannerView.tsx:19`](../src/pages/QRScannerView.tsx:19) uses inline `background: "hsl(var(--color-bg))"` which overrides the `.qr-scanner` CSS class that correctly has `background: hsl(0 0% 0%)`.

**Fix:** Remove the inline `background` style from the `<main>` element on QRScannerView. The `.qr-scanner` class already provides the correct dark background.

**Exit condition:** QR scanner page renders with black background, CSS class provides the color, no inline override.

---

## Task 2 — Create Data Hooks (Phase 3a)

Create 4 hooks in [`../src/hooks/`](../src/hooks/). Each hook:
- Uses [`useAdapter()`](../src/adapters/useAdapter.ts) internally (never imports mock directly)
- Returns `{ data, loading, error }` or a typed result
- Calls `computeProgress` use case where specified

### 2.1 `useSession` — [`../src/hooks/useSession.ts`] (NEW)

Fetches Session + Milestones + Missions for a session ID.

```typescript
export interface UseSessionResult {
  readonly session: Session | null;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly loading: boolean;
  readonly error: Error | null;
}

export const useSession = (sessionId: string): UseSessionResult => { ... }
```

**Implementation:**
- Import `useAdapter` from `../adapters/useAdapter.ts`
- Import `useEffect`, `useState` from React
- On mount (or `sessionId` change), call `Promise.all`:
  - `adapter.getSession(sessionId)`
  - `adapter.listMilestones(sessionId)`
  - `adapter.listMissions(sessionId)`
- Set loading/error state appropriately

**Invariant from strategy doc:** Data shapes come from [`../src/types/domain.ts`](../src/types/domain.ts) — no inline object types.

### 2.2 `usePlayerProgress` — [`../src/hooks/usePlayerProgress.ts`] (NEW)

Fetches ProgressEvents and derives PlayerProgress.

```typescript
export interface UsePlayerProgressResult {
  readonly playerProgress: PlayerProgress | null;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly loading: boolean;
  readonly error: Error | null;
}

export const usePlayerProgress = (
  playerId: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
): UsePlayerProgressResult => { ... }
```

**Implementation:**
- Calls `adapter.listProgressEvents(playerId)`
- Passes result + milestones + missions to `computeProgress(playerId, missions, milestones, progressEvents)`
- Returns the derived `PlayerProgress`
- Re-computes whenever `playerId`, `milestones`, or `missions` change (useEffect dependency array)

**Critical:** Uses the [`computeProgress`](../src/use-cases/computeProgress.ts) use case — the single source of truth for progress. This eliminates the duplicate algorithm in PlayerCockpitPage.

### 2.3 `useBuddy` — [`../src/hooks/useBuddy.ts`] (NEW)

Fetches BuddyProfile for a player.

```typescript
export interface UseBuddyResult {
  readonly buddy: BuddyProfile | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

export const useBuddy = (playerId: string): UseBuddyResult => { ... }
```

**Implementation:**
- Calls `adapter.getBuddyProfile(playerId)`
- Returns the profile or null if not found

### 2.4 `useResources` — [`../src/hooks/useResources.ts`] (NEW)

Fetches resources for a session, filtered by `isVisibleToPlayer: true`.

```typescript
export interface UseResourcesResult {
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
}

export const useResources = (sessionId: string): UseResourcesResult => { ... }
```

**Implementation:**
- Calls `adapter.listResources(sessionId)`
- Client-side filter: `.filter(r => r.isVisibleToPlayer)` — per strategy doc §3a

### Exit Condition for Task 2

`deno task build` passes. All 4 hooks are importable and return correctly typed results.

---

## Task 3 — Refactor PlayerCockpitPage (Phase 3b)

**Problem:** [`../src/pages/PlayerCockpitPage.tsx`](../src/pages/PlayerCockpitPage.tsx) currently:
1. Imports `MOCK_*` directly from [`../src/adapters/mock/mockData.ts`](../src/adapters/mock/mockData.ts) (violates adapter boundary)
2. Has inline progress computation logic (lines 41-69) that differs from [`computeProgress.ts`](../src/use-cases/computeProgress.ts) (mission-count-based vs XP-based)
3. Hard-codes `totalXP={83}` instead of deriving from progress
4. Doesn't render [`BackgroundCanvas`](../src/components/shared/BackgroundCanvas.tsx)
5. Hard-wires player `PLAYER = MOCK_PLAYERS[1]` and `BUDDY = MOCK_BUDDY_PROFILES[1]`

### 3.1 Replace direct mock imports with adapter + hooks

**Current pattern:**
```typescript
import { MOCK_BUDDY_PROFILES, MOCK_MILESTONES, ... } from "../adapters/mock/mockData.ts";
const PLAYER = MOCK_PLAYERS[1]!;
```

**Target pattern:**
```typescript
import { useParams } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { usePlayerProgress } from "../hooks/usePlayerProgress.ts";
import { useBuddy } from "../hooks/useBuddy.ts";
import { useResources } from "../hooks/useResources.ts";
import BackgroundCanvas from "../components/shared/BackgroundCanvas.tsx";

const PlayerCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const adapter = useAdapter();
  const { identity } = useIdentity();

  // Fetch session data
  const { session, milestones, missions, loading: sessionLoading } = useSession(sessionId!);

  // Resolve player ID from identity -> adapter.getPlayer(uid)
  // ... (see detailed plan below)

  const { buddy } = useBuddy(playerId);
  const { playerProgress, progressEvents } = usePlayerProgress(playerId, milestones, missions);
  const { resources } = useResources(sessionId!);
  ...
}
```

### 3.2 Player identity resolution flow

The page needs to bridge `identity.uid` (client-generated) to `player.id` (PB record ID):

```
identity.uid → adapter.getPlayer(uid) → player.id (for hooks)
```

This can be done via a `useEffect` or a simple helper hook. The flow:
1. On mount, call `adapter.getPlayer(identity.uid)` to get the full Player record
2. Use `player.id` for `usePlayerProgress` and `useBuddy`
3. Use `player.name`, `player.role`, etc. for TopBar and display

### 3.3 Remove inline progress computation

**Action:** Delete the `useMemo` block at lines 41-69 and the `COMPLETED_STATUSES` constant at line 24.

Replace with:
```typescript
const { playerProgress, progressEvents } = usePlayerProgress(
  playerId,
  milestones ?? [],
  missions ?? [],
);
```

Pass `playerProgress.totalXP` to `<TopBar>` instead of hard-coded `83`.

### 3.4 Add BackgroundCanvas

Render `<BackgroundCanvas imageUrl={session.bgImageUrl} alt="Session background" />` inside the page layout, positioned behind the main content. Use CSS `position: fixed; z-index: 0` to establish the layer hierarchy.

**Note from strategy doc:** `session.bgImageUrl` is empty string for now → falls back to gradient ([`prototype-impl-strategy.md:256`](../plans/prototype-impl-strategy.md:256)). The `BackgroundCanvas` component already handles this via the `.milestone-map__bg--placeholder` class.

### 3.5 Pass real data to all components

Replace hard-coded/static props with hook-derived data:

| Component | Current | Target |
|---|---|---|
| `<TopBar>` | `playerName={PLAYER.name}`, `totalXP={83}` | `playerName={player?.name ?? ""}`, `totalXP={playerProgress?.totalXP ?? 0}` |
| `<MilestoneMapViewer>` | `milestones={MOCK_MILESTONES}` | `milestones={milestones}` |
| `<MilestoneSidebarViewer>` | `currentXP={49}` | `currentXP={msProgress?.earnedXP ?? 0}` |
| `<CurrentMissionsList>` | `missions={currentMissions}` (manually filtered) | `missions={missions.filter(m => m.isInCurrentMissions)}` |
| `<BuddyCard>` | `name={BUDDY.name}` etc. | `name={buddy?.name ?? ""}` etc. |
| `<ResourcesSection>` | `resources={visibleResources}` (manually filtered) | `resources={resources}` (already filtered by hook) |

### 3.6 Empty/loading states

Add simple loading and empty state handling:
- **Loading:** While `sessionLoading` or `identity` is null, render a centered spinner or skeleton
- **Empty player:** If `player` is null after loading, show inline message (should not happen in practice)
- **Empty missions:** `<CurrentMissionsList>` already has `if (props.missions.length === 0) return null`
- **Empty buddy:** Show empty state with "You'll be assigned a buddy soon" message
- **Empty resources:** `<ResourcesSection>` already has "No resources found" display

### Exit Condition for Task 3

`deno task build` passes. PlayerCockpitPage:
- No longer imports from `mockData.ts`
- Uses `computeProgress` use case (no duplicate algorithm)
- Shows real XP from adapter data
- Renders BackgroundCanvas
- All components receive data via hooks and adapter

---

## Task 4 — Fix Testing Issues

### 4.1 FormPage topbar identity

**Problem:** [`../src/pages/FormPage.tsx`](../src/pages/FormPage.tsx) hard-wires `PLAYER = MOCK_PLAYERS[1]` (Sofia Chen) for the TopBar.

**Fix:** This is deferred to Phase 4 when FormPage is fully wired with adapter data. For now, set a comment explaining the pending wiring. No code change needed — mark as `// TODO(Phase 4): wire with real identity`.

### 4.2 Stale `App.css` import check

**Verification:** Confirm [`../src/main.tsx`](../src/main.tsx) does NOT import `App.css`. The current file shows it imports `./index.css` only — so deleting `App.css` is safe.

---

## Task 5 — Architectural Consistency

### 5.1 RecoveryKeyModal inline styles → CSS classes

**Problem:** [`../src/components/shared/RecoveryKeyModal.tsx`](../src/components/shared/RecoveryKeyModal.tsx) uses React inline `style` objects throughout, while the rest of the codebase uses BEM classes from [`../src/index.css`](../src/index.css).

**Fix:** Move all inline styles into `.recovery-modal`, `.recovery-modal__key`, `.recovery-modal__actions` BEM classes in `index.css`.

Before:
```tsx
<div style={{ position: "fixed", inset: 0, zIndex: 200, ... }}>
```

After:
```tsx
<div className="recovery-modal" role="dialog" ...>
```

Add the corresponding CSS in `index.css`:
```css
.recovery-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: hsl(var(--color-fg) / 0.5);
}
```

Repeat for all inner elements.

### Exit Condition for Task 5

`deno task build` passes. RecoveryKeyModal uses BEM classes only — zero inline `style` props on container elements.

---

## Task 6 — Verify Exit Condition

Run the full verification suite:

```bash
deno task build
```

Then re-run the Playwright smoke tests:

1. Landing page renders with 4 action areas
2. Join session → RecoveryKeyModal → redirects to player cockpit
3. Create session → RecoveryKeyModal → redirects to admin cockpit
4. Player cockpit shows 3 milestone nodes with correct progress percentages
5. Milestone sidebar opens and shows correct mission data
6. Admin cockpit shows all sections
7. Form page shows all 10 profile fields
8. QR scanner renders with dark background (fixed)
9. All viewport widths pass (390px → 1440px)
10. Zero console errors

---

## Dependency Graph

```
Task 1 (housekeeping)
  └─ no dependencies

Task 2 (data hooks)
  └─ depends on: types already exist [src/types/]
  └─ depends on: adapter interface [src/adapters/interface.ts]
  └─ depends on: computeProgress use case [src/use-cases/computeProgress.ts]

Task 3 (PlayerCockpitPage refactor)
  └─ depends on: Task 2 (hooks must exist first)
  └─ depends on: BackgroundCanvas component [src/components/shared/BackgroundCanvas.tsx]

Task 4 (testing fixes — QR bg)
  └─ no dependencies

Task 5 (RecoveryKeyModal)
  └─ depends on: index.css already has modal classes
  └─ can be done in any order

Task 6 (verify)
  └─ depends on: Tasks 1-5
```

**Recommended parallel execution:**
- Tasks 1 + 4 + 5 can run in parallel (no code conflicts)
- Task 2 must complete before Task 3 starts
- Task 6 runs last

---

## Todo List

```
[x] 1.1 Delete stale boilerplate (App.css, react.svg, vite.svg)
[x] 1.2 Fix QR scanner background (remove inline style override)
[x--] 2.1 Create useSession hook (src/hooks/useSession.ts)
[x--] 2.2 Create usePlayerProgress hook (src/hooks/usePlayerProgress.ts)
[x--] 2.3 Create useBuddy hook (src/hooks/useBuddy.ts)
[x--] 2.4 Create useResources hook (src/hooks/useResources.ts)
[x--] 3.1 Refactor PlayerCockpitPage — replace mock imports with hooks
[x--] 3.2 Add player identity resolution flow
[x--] 3.3 Remove inline progress computation (use computeProgress use case)
[x--] 3.4 Add BackgroundCanvas rendering
[x--] 3.5 Wire all child components with real hook data
[x--] 3.6 Add loading/empty states
[x--] 5.1 Convert RecoveryKeyModal inline styles to BEM classes
[x--] 6.0 Run deno task build + Playwright verification
```

**Status:** [ ] = pending, [x] = done, [x--] = in progress
