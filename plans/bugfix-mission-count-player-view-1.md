---
goal: Add `totalMissionCount` to `MilestoneProgress` so all player views display mission counts consistently
version: 1.0
date_created: 2026-06-18
last_updated: 2026-06-18
owner: architect
status: Planned
tags: [bug, architecture, progress]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

The player milestone map view (`MilestoneMapViewer`) always shows "0 missions" on every milestone node, even though the underlying data is correct (the `MilestoneSidebarViewer` that opens on click correctly lists missions). The root cause is that `MilestoneMapViewer` never passes the `missionCount` prop to the shared `MilestoneNode` component — the prop defaults to `0`.

Rather than patching this at the component level, this plan adds `totalMissionCount` to the canonical derived type `MilestoneProgress`, making mission counts available to **all** consumers of progress data — player views, admin views, and any future dashboard — without duplicating computation logic.

## 1. Requirements & Constraints

- **REQ-001**: The player milestone map must display the correct number of missions per milestone, matching the admin view.
- **REQ-002**: The fix must work identically with both the mock adapter and the future PocketBase adapter.
- **REQ-003**: No adapter interface changes (C-13 — adapter boundary types must not leak to components).
- **CON-001**: `computeProgress` is a pure function that re-derives at read time (C-11). All derived data must flow through it.
- **CON-002**: `MilestoneProgress` is the canonical per-milestone-progress type consumed by all views. Adding a field here propagates everywhere.
- **CON-003**: No TypeScript `enum` — use `const` object + `keyof` union (C-12).
- **PAT-001**: The `missionCount` prop already exists on shared `MilestoneNode` (`readonly missionCount?: number`). The fix only needs to wire it.

## 2. Implementation Steps

### Implementation Phase 1 — Add `totalMissionCount` to `MilestoneProgress` and wire it through

- GOAL-001: Augment the `MilestoneProgress` derived type with `totalMissionCount`, compute it in `computeProgress`, and consume it in `MilestoneMapViewer`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `readonly totalMissionCount: number` field to `MilestoneProgress` interface in [`src/types/ephemeral.ts:20-27`](src/types/ephemeral.ts:20) | | |
| TASK-002 | Add `totalMissionCount: msMissions.length` to the return object in [`src/use-cases/computeProgress.ts:59-66`](src/use-cases/computeProgress.ts:59) — this already has `msMissions` computed on line 36 | | |
| TASK-003 | In [`src/components/player/MilestoneMapViewer.tsx:34-43`](src/components/player/MilestoneMapViewer.tsx:34), read `mp?.totalMissionCount ?? 0` from the `MilestoneProgress` map and pass as `missionCount` prop to `MilestoneNode` | | |
| TASK-004 | Run `deno task build` to verify type checking passes across all consumers | | |

### Phase 2 — Verification (future / manual)

- GOAL-002: Verify the fix works end-to-end.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Open the player cockpit page and verify milestone nodes display correct mission counts | | |
| TASK-006 | Open the admin cockpit page and verify milestone node mission counts are unchanged (confirm no regression) | | |
| TASK-007 | Verify `MilestoneSidebarViewer` still shows missions correctly when a milestone is clicked | | |

## 3. Alternatives

- **ALT-001: Pass `missions` array to `MilestoneMapViewer` and compute counts inside** — This violates the component/hook boundary principle: components own UI, hooks/use-cases own data derivation. `MilestoneMapViewer` would need to filter `missions` by `milestoneId`, duplicating the grouping logic already present in `computeProgress`.
- **ALT-002: Compute `missionCounts` in `PlayerCockpitPage` (mirror admin pattern)** — This duplicates the `missionCounts` `useMemo` between `AdminCockpitPage` and `PlayerCockpitPage`. Every future page that displays milestone map nodes would need to copy the same logic. Adding it to `MilestoneProgress` is the single source of truth.
- **ALT-003: Add `missionCount` field to `Milestone` domain type** — This would require an adapter method to compute and store it, mixing derived state with persisted state. Violates C-11 (progress never snapshotted) and would break with dynamic mission additions.

## 4. Dependencies

- **DEP-001**: `MilestoneProgress` in [`src/types/ephemeral.ts`](src/types/ephemeral.ts:20) — the type being augmented.
- **DEP-002**: `computeProgress` in [`src/use-cases/computeProgress.ts`](src/use-cases/computeProgress.ts:19) — the pure derivation function. Already has access to `missions` array and groups by `milestoneId` on line 36.
- **DEP-003**: `MilestoneNode` in [`src/components/shared/MilestoneNode.tsx`](src/components/shared/MilestoneNode.tsx:10) — already has optional `missionCount` prop. No changes needed.

## 5. Files

| File | Change | Lines |
|------|--------|-------|
| [`src/types/ephemeral.ts`](src/types/ephemeral.ts:20) | Add `readonly totalMissionCount: number` to `MilestoneProgress` interface | 1 line |
| [`src/use-cases/computeProgress.ts`](src/use-cases/computeProgress.ts:59) | Add `totalMissionCount: msMissions.length` to return object | 1 line |
| [`src/components/player/MilestoneMapViewer.tsx`](src/components/player/MilestoneMapViewer.tsx:34) | Pass `missionCount={mp?.totalMissionCount ?? 0}` to `MilestoneNode` | 1 line |

## 6. Testing

- **TEST-001**: TypeScript compilation — `deno task build` must pass with no type errors.
- **TEST-002**: Manual smoke test — player milestone map shows `N missions` where N > 0 for milestones that have missions.
- **TEST-003**: Regression check — admin milestone map mission counts unchanged.
- **TEST-004**: Sidebar check — `MilestoneSidebarViewer` still lists missions correctly.

## 7. Risks & Assumptions

- **RISK-001**: `computeProgress` returns `null` (in `useProgressPlayer`) when `!playerId || milestones.length === 0 || missions.length === 0`. The viewer already handles missing `mp` via `mp?.percentComplete ?? 0` and `mp?.status ?? "upcoming"`. The new field follows the same pattern: `mp?.totalMissionCount ?? 0`. **Risk: None.**
- **ASSUMPTION-001**: No consumer of `MilestoneProgress` will break from the additional field. All consumers destructure specific fields or read them optionally; a new field is backward-compatible. **Verified.**
- **ASSUMPTION-002**: The `missionCount` on `MilestoneNode` is intentionally total missions (not player-specific completed/remaining). This matches the admin view's current behavior and the semantic of "how many missions are in this milestone?"

## 8. Related Specifications / Further Reading

- [SPECS.md — Design Constraints & Invariants](SPECS.md#design-constraints--invariants)
- [computeProgress.ts](src/use-cases/computeProgress.ts:19) — pure derivation function
- [MilestoneProgress type](src/types/ephemeral.ts:20) — canonical derived progress type
- [MilestoneNode shared component](src/components/shared/MilestoneNode.tsx:25) — already supports `missionCount` prop
