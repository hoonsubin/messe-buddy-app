---
goal: Consolidate 8 fragmented hooks into 4 role-aware shared hooks and unify Player/LocalIdentity
version: 1.0
date_created: 2026-06-18
last_updated: 2026-06-18
owner: Architecture
status: Planned
tags: refactor, architecture, phase-a, data-unification
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-planned-blue)

Phase A of the two-phase data schema unification refactoring. Consolidates 8 fragmented data-fetching hooks into 4 role-aware shared hooks. Merges `LocalIdentity` into `Player` so every participant has a single canonical type. Enforces [SPECS.md constraint C-18](SPECS.md:1086) — no component or page calls [`AppAdapter`](src/adapters/interface.ts:18) directly. Zero PocketBase schema changes.

## 1. Requirements & Constraints

- **REQ-001**: [`useProgress`](src/hooks/) must replace [`useAdminPlayers`](src/hooks/useAdminPlayers.ts:40), [`usePlayerProgress`](src/hooks/usePlayerProgress.ts:21), and [`useCrossHireData`](src/hooks/useCrossHireData.ts:10). Single hook that adapts behavior by role.
- **REQ-002**: [`useBuddyProfile`](src/hooks/) must replace the player-only [`useBuddy`](src/hooks/useBuddy.ts:12) hook and the inline `loadBuddyProfile` / `buddyDraft` pattern in [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:175).
- **REQ-003**: [`useResources`](src/hooks/useResources.ts:12) must support both roles. Player mode: filtered to `isVisibleToPlayer`. Admin mode: full list + `createResource`/`updateResource`/`deleteResource` callbacks.
- **REQ-004**: [`useIdentity`](src/hooks/useIdentity.ts:41) must return `Player[]` (or `CachedIdentity[]`) instead of `LocalIdentity[]`. The `LocalIdentity` type must be replaced by a `CachedIdentity` subset type. No component may import `LocalIdentity`.
- **REQ-005**: All new shared hooks must expose the standard Data-Fetching Hook Contract: `loading`, `error`, `data`, and `refresh`.
- **CON-001**: No PocketBase schema changes. Zero Go migration files. Mock adapter unchanged except where its types are referenced.
- **CON-002**: [`AppAdapter`](src/adapters/interface.ts:18) interface must not change shape. Phase A is pure hook/component refactoring above the adapter boundary.
- **CON-003**: All existing C-01 through C-17 constraints remain in force. C-18 is the only new constraint active in Phase A.
- **GUD-001**: Follow React Lifecycle Design Principles from [AGENTS.md](.roo/rules-architect/AGENTS.md): Data-Fetching Hook Contract (loading/error/data/refresh), Effect Lifecycle Tiers 2-4 require cleanup, callback wrapping pattern for volatile callbacks.
- **PAT-001**: Shared hooks use `role` parameter pattern: `useProgress(sessionId, { role: "player" | "gamemaker" })` returns role-appropriate data and callbacks.

## 2. Implementation Steps

### Implementation Phase 1: Identity Unification

- GOAL-001: Replace `LocalIdentity` type with `CachedIdentity` (a `Player` subset). Update `useIdentity` to return `Player`-aligned types. Update all consumers.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `CachedIdentity` type in [`src/types/value-objects.ts`](src/types/value-objects.ts:38): `{ uid, recoveryKey, sessionId, role, name?, isDemo? }`. Replace `LocalIdentity` export. | | |
| TASK-002 | Update [`useIdentity`](src/hooks/useIdentity.ts:41) return type from `LocalIdentity[]` to `CachedIdentity[]`. Change `setIdentity` parameter type. Keep `mb_identity` localStorage key unchanged. | | |
| TASK-003 | Update [`useLandingFlow`](src/hooks/useLandingFlow.ts:78) — change all `LocalIdentity` references to `CachedIdentity`. Update `DEMO_PROFILES` type. | | |
| TASK-004 | Search all `src/` files for `LocalIdentity` import. Replace every occurrence with `CachedIdentity`. Run `deno task lint` after. | | |
| TASK-005 | Update [`RequireRole`](src/pages/) and all route guards to reference `CachedIdentity.role` instead of `LocalIdentity.role`. | | |
| TASK-006 | Verify [`useIdentity`](src/hooks/useIdentity.ts:41) cross-tab `storage` event listener still works with `CachedIdentity`. Run manual test: open two tabs, change identity in one, verify other tab syncs. | | |

### Implementation Phase 2: Create `useProgress` Shared Hook

- GOAL-002: Create single `useProgress(sessionId, opts?)` hook that replaces `useAdminPlayers`, `usePlayerProgress`, and `useCrossHireData`. Behavior adapts by `opts.role` and `opts.mode`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Create [`src/hooks/useProgress.ts`](src/hooks/) with the contract: `useProgress(sessionId: string, opts?: { role: "player" | "gamemaker"; playerId?: string; crossSession?: boolean })`. Expose `UseProgressResult` interface. | | |
| TASK-008 | Implement player mode (`role === "player"`): return `playerProgress`, `progressEvents`, `loading`, `error`, `refresh`. Fetch `adapter.listProgressEvents(playerId)`, call [`computeProgress`](src/use-cases/computeProgress.ts:19). Use Tier 2 cleanup (cancelled boolean). | | |
| TASK-009 | Implement admin single-session mode (`role === "gamemaker"`, `crossSession !== true`): return `players`, `allProgressEvents`, `selectedPlayerId`, `selectedPlayer`, `selectedPlayerProgress`, `pendingEvents`, `selectPlayer`, `approve`, `reject`, `loading`, `error`, `refresh`. Port logic from [`useAdminPlayers`](src/hooks/useAdminPlayers.ts:40). | | |
| TASK-010 | Implement admin cross-session mode (`crossSession === true`): return `hireRows`. Port logic from [`useCrossHireData`](src/hooks/useCrossHireData.ts:10). Only fetch when `active` (cross-session tab selected). Use `cancelled` flag with inter-iteration checks. | | |
| TASK-011 | Implement `approve` / `reject` callbacks for admin mode: call `adapter.upsertProgressEvent` then re-fetch that player's events (same pattern as [`useAdminPlayers.handleApprove`](src/hooks/useAdminPlayers.ts:59)). Use Validator Ref Pattern for `validatorUid`. | | |
| TASK-012 | Add `refresh` callback (increment counter state → trigger effect re-run). Clear error on new fetch. | | |

### Implementation Phase 3: Create `useBuddyProfile` Shared Hook

- GOAL-003: Create single `useBuddyProfile(playerId, opts?)` hook replacing [`useBuddy`](src/hooks/useBuddy.ts:12) and the inline `loadBuddyProfile`/`buddyDraft` pattern.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create [`src/hooks/useBuddyProfile.ts`](src/hooks/) with contract: `useBuddyProfile(playerId: string, opts?: { role: "player" | "gamemaker" })`. Expose `UseBuddyProfileResult`. | | |
| TASK-014 | Implement player mode: return `buddy`, `loading`, `error`. Fetch `adapter.getBuddyProfile(playerId)`. Same as current [`useBuddy`](src/hooks/useBuddy.ts:12). | | |
| TASK-015 | Implement admin mode: return `buddy`, `buddyDraft`, `setBuddyDraft`, `upsertBuddy`, `loading`, `error`. Call `adapter.getBuddyProfile(playerId)` on mount/playerId change. `upsertBuddy()` calls `adapter.upsertBuddyProfile(playerId, draft)`. | | |
| TASK-016 | Admin mode must handle `buddyDraft` as local state (mirrors current [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:172) pattern but encapsulated in hook). `emptyBuddyDraft()` helper stays in hook file. | | |

### Implementation Phase 4: Extend `useResources` for Admin Role

- GOAL-004: Extend existing [`useResources`](src/hooks/useResources.ts:12) hook to support admin role with CRUD callbacks.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Update [`useResources`](src/hooks/useResources.ts:12) contract: add `opts?: { role: "player" | "gamemaker" }` parameter. Player mode unchanged. | | |
| TASK-018 | Implement admin mode: return all resources (unfiltered), plus `createResource`, `updateResource`, `deleteResource` callbacks. Each callback optimistically updates local state after adapter call. Port logic from [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:125-170). | | |
| TASK-019 | Add `searchQuery` / `setSearchQuery` state and `filteredResources` derivation to the hook (currently in [`ResourcesSection`](src/components/player/ResourcesSection.tsx) component). | | |

### Implementation Phase 5: Migrate Pages to Shared Hooks

- GOAL-005: Replace all direct adapter calls and old hook usage in pages with the new shared hooks. Remove deprecated hooks.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Migrate [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx:32): replace `usePlayerProgress` → `useProgress(sid, { role: "player", playerId })`. Replace `useBuddy` → `useBuddyProfile(playerId, { role: "player" })`. | | |
| TASK-021 | Migrate [`FormPage`](src/pages/FormPage.tsx:12): replace `usePlayerProgress` → `useProgress(sid, { role: "player", playerId })`. | | |
| TASK-022 | Migrate [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:41): replace `useAdminPlayers` → `useProgress(sid, { role: "gamemaker" })`. Replace `useCrossHireData` → `useProgress(sid, { role: "gamemaker", crossSession: true, active })`. Replace inline `loadBuddyProfile`/`buddyDraft` → `useBuddyProfile(selectedPlayerId, { role: "gamemaker" })`. Replace inline `adminResources` state + adapter calls → `useResources(sid, { role: "gamemaker" })`. | | |
| TASK-023 | Migrate [`ValidationPage`](src/pages/ValidationPage.tsx:11): replace inline `adapter.getPlayerById` + `adapter.listProgressEvents` calls. These are validation-specific and don't fit shared hooks — annotate with `// C-18 exception: validation page uses adapter directly for GM confirm flow` as this is a security-critical offline-verify path. | | |
| TASK-024 | Remove deprecated files: [`useAdminPlayers.ts`](src/hooks/useAdminPlayers.ts), [`usePlayerProgress.ts`](src/hooks/usePlayerProgress.ts), [`useCrossHireData.ts`](src/hooks/useCrossHireData.ts), [`useBuddy.ts`](src/hooks/useBuddy.ts). | | |
| TASK-025 | Run `deno task lint && deno task build` to verify no broken imports or type errors. | | |

### Implementation Phase 6: Diagram & Doc Updates

- GOAL-006: Update architecture diagrams and audit docs to reflect Phase A state.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Update [`docs/c4component.puml`](docs/c4component.puml:1): add `useProgress`, `useBuddyProfile`, `useResources` as shared React Hook components. Update relationships to show pages → shared hooks → pbAdapter. | | |
| TASK-027 | Update [`docs/app-class-component.puml`](docs/app-class-component.puml:1): update hook references in `PlayerCockpitPage` and `AdminCockpitPage`. Remove inline adapter call patterns. | | |
| TASK-028 | Update [`docs/ts-data-model.puml`](docs/ts-data-model.puml:1): add `recoveryKey`, `isDemo` fields to `Player` class. Add `mapNodeScale`, `qrSecret`, `preBoardingChecks` to `Session` class. | | |
| TASK-029 | Rename [`docs/admin-view-data.md`](docs/admin-view-data.md:1) → [`docs/admin-view-data-legacy.md`](docs/). Rename [`docs/player-view-data.md`](docs/player-view-data.md:1) → [`docs/player-view-data-legacy.md`](docs/). | | |
| TASK-030 | Create [`docs/shared-data-access.md`](docs/) documenting the new shared hook architecture: hook contracts, role-adaptive behavior, data flow diagram, error handling patterns. | | |

## 3. Alternatives

- **ALT-001**: Keep `useAdminPlayers` / `usePlayerProgress` separate and just merge identity. Rejected because it doesn't address the core fragmentation problem — 3 hooks doing `computeProgress` is the primary duplication.
- **ALT-002**: Combine all shared hooks into a single `useData(entity, role)` mega-hook. Rejected because it creates a single massive hook file, violates single-responsibility, and makes code-splitting impossible.
- **ALT-003**: Skip Phase A and go directly to Phase B (SharedDataProvider + view types). Rejected because Phase B's SharedDataProvider needs consolidated hooks as its internal implementation. Building the facade before the foundation is backward.
- **ALT-004**: Remove `LocalIdentity` entirely and always require a network call for identity resolution. Rejected because demo mode and offline identity resolution are explicit requirements (C-02, C-03).

## 4. Dependencies

- **DEP-001**: [`computeProgress`](src/use-cases/computeProgress.ts:19) — unchanged, consumed by new `useProgress`.
- **DEP-002**: [`AppAdapter`](src/adapters/interface.ts:18) — unchanged contract. New hooks call the same methods.
- **DEP-003**: [`AdapterContext`](src/adapters/AdapterContext.tsx:13) — unchanged. New hooks use `useAdapter()` same as old hooks.
- **DEP-004**: [`mockAdapter`](src/adapters/mock/mockAdapter.ts:1) — unchanged. No mock data shape changes needed.
- **DEP-005**: [`SPECS.md`](SPECS.md:1065) — C-18 through C-21 already written. No further SPECS.md changes needed for Phase A.
- **DEP-006**: `deno.json` import map — no new external dependencies. All imports are internal.

## 5. Files

### New Files (4)
- **FILE-001**: [`src/hooks/useProgress.ts`](src/hooks/) — Shared progress hook (~200 lines). Replaces 3 hooks.
- **FILE-002**: [`src/hooks/useBuddyProfile.ts`](src/hooks/) — Shared buddy hook (~80 lines). Replaces 1 hook + inline pattern.
- **FILE-003**: [`docs/shared-data-access.md`](docs/) — Architecture documentation for the new shared hook layer.
- **FILE-004**: [`src/types/value-objects.ts`](src/types/value-objects.ts) — Updated `CachedIdentity` type (replaces `LocalIdentity`).

### Modified Files (14)
- **FILE-005**: [`src/types/value-objects.ts`](src/types/value-objects.ts:38) — Replace `LocalIdentity` with `CachedIdentity`.
- **FILE-006**: [`src/types/index.ts`](src/types/index.ts:1) — Update barrel export.
- **FILE-007**: [`src/hooks/useIdentity.ts`](src/hooks/useIdentity.ts:41) — Return `CachedIdentity[]` instead of `LocalIdentity[]`.
- **FILE-008**: [`src/hooks/useLandingFlow.ts`](src/hooks/useLandingFlow.ts:78) — Update all `LocalIdentity` references.
- **FILE-009**: [`src/hooks/useResources.ts`](src/hooks/useResources.ts:12) — Add `opts.role` parameter, admin CRUD callbacks, search state.
- **FILE-010**: [`src/pages/PlayerCockpitPage.tsx`](src/pages/PlayerCockpitPage.tsx:32) — Migrate to `useProgress` + `useBuddyProfile`.
- **FILE-011**: [`src/pages/AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:41) — Migrate to `useProgress` + `useBuddyProfile` + `useResources`.
- **FILE-012**: [`src/pages/FormPage.tsx`](src/pages/FormPage.tsx:12) — Migrate to `useProgress`.
- **FILE-013**: [`src/pages/ValidationPage.tsx`](src/pages/ValidationPage.tsx:11) — Add C-18 exception annotation.
- **FILE-014**: [`src/components/admin/PendingApprovalsPanel.tsx`](src/components/admin/PendingApprovalsPanel.tsx:13) — Update to new `useProgress` return shape.
- **FILE-015**: [`src/components/admin/CrossHireDashboard.tsx`](src/components/admin/CrossHireDashboard.tsx:39) — Update to new `useProgress` return shape.
- **FILE-016**: [`src/components/admin/BuddyAssignmentForm.tsx`](src/components/admin/BuddyAssignmentForm.tsx:16) — Update to new `useBuddyProfile` return shape.
- **FILE-017**: [`src/components/admin/ResourcesEditor.tsx`](src/components/admin/ResourcesEditor.tsx:15) — Update to new `useResources` return shape.
- **FILE-018**: Search-and-replace all `src/` files for `LocalIdentity` import → `CachedIdentity`.

### Deprecated/Removed Files (4)
- **FILE-019**: [`src/hooks/useAdminPlayers.ts`](src/hooks/useAdminPlayers.ts) → **DELETE**
- **FILE-020**: [`src/hooks/usePlayerProgress.ts`](src/hooks/usePlayerProgress.ts) → **DELETE**
- **FILE-021**: [`src/hooks/useCrossHireData.ts`](src/hooks/useCrossHireData.ts) → **DELETE**
- **FILE-022**: [`src/hooks/useBuddy.ts`](src/hooks/useBuddy.ts) → **DELETE**

### Diagram Updates (3)
- **FILE-023**: [`docs/c4component.puml`](docs/c4component.puml:1)
- **FILE-024**: [`docs/app-class-component.puml`](docs/app-class-component.puml:1)
- **FILE-025**: [`docs/ts-data-model.puml`](docs/ts-data-model.puml:1)

### Audit Doc Reorganization (3)
- **FILE-026**: [`docs/admin-view-data.md`](docs/admin-view-data.md:1) → rename to `docs/admin-view-data-legacy.md`
- **FILE-027**: [`docs/player-view-data.md`](docs/player-view-data.md:1) → rename to `docs/player-view-data-legacy.md`
- **FILE-028**: [`docs/shared-data-access.md`](docs/) — new

## 6. Testing

- **TEST-001**: Smoke test Player Cockpit — verify milestone map renders, missions display, buddy card shows, resources load.
- **TEST-002**: Smoke test Admin Cockpit — verify player list loads, player selection works, pending approvals render, approve/reject functions.
- **TEST-003**: Smoke test Cross-Hire Dashboard — verify all-new-hires tab loads cross-session data.
- **TEST-004**: Smoke test Buddy Assignment — verify admin can load and save buddy profile per player.
- **TEST-005**: Smoke test Resources Editor — verify admin can add, delete, toggle visibility of resources.
- **TEST-006**: Identity persistence — verify localStorage `mb_identity` key format unchanged after migrate. Join session, close tab, reopen — identity resolves correctly.
- **TEST-007**: Cross-tab sync — open two tabs, remove profile in one, verify other tab's identity updates.
- **TEST-008**: Demo profiles — verify all demo profiles (`DEMO_PROFILES`) work after `LocalIdentity` → `CachedIdentity` migration.
- **TEST-009**: Recovery flow — verify recovery key entry resolves identity and routes to cockpit.
- **TEST-010**: Form submission — verify FormPage can submit form mission, progress updates correctly.
- **TEST-011**: Validation flow — verify QR scan + ValidationPage confirm writes `completed` status.
- **TEST-012**: `deno task lint` — zero errors.
- **TEST-013**: `deno task build` — successful production build.

## 7. Risks & Assumptions

- **RISK-001**: [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:41) is 653 lines and has complex state interdependencies (buddyDraft, adminResources, draftMilestones, draftMissions). Extracting inline patterns into hooks risks breaking save/discard/refresh flows. **Mitigation:** Migrate one section at a time (buddy first, then resources, then players). Test each section before proceeding.
- **RISK-002**: `CachedIdentity` rename is a project-wide search-and-replace. Missing an import could cause runtime errors not caught by TypeScript if the import path still resolves (`LocalIdentity` re-exported from index). **Mitigation:** Use `search_files` to find every `LocalIdentity` reference. Do NOT keep a `LocalIdentity` re-export as an alias — remove it entirely so broken imports are compile errors.
- **RISK-003**: Cross-session hire data in `useProgress` with `crossSession: true` must not stale-lock the hook during its long async fetch. If the user switches tabs mid-fetch, the `cancelled` flag must abort cleanly. **Mitigation:** Port the exact `cancelled` check pattern from [`useCrossHireData`](src/hooks/useCrossHireData.ts:18) with inter-iteration checks.
- **RISK-004**: `useResources` currently filters to `isVisibleToPlayer` in the player hook. The admin inline pattern does NOT filter. The shared hook must not accidentally apply player filtering to admin mode. **Mitigation:** Gate the `.filter()` call on `opts.role === "player"`.
- **ASSUMPTION-001**: The `Player` type already has all fields needed (`uid`, `recoveryKey`, `role`) — they exist in [`domain.ts`](src/types/domain.ts:36). The `isDemo` field does not exist on `Player` today and will need to be added. This is a type-only change that doesn't affect the PB schema — `isDemo` is a client-only flag on the `CachedIdentity` subset.
- **ASSUMPTION-002**: No component outside the pages listed depends on the internal state shape of `useAdminPlayers` or `usePlayerProgress`. If any shared component (`PendingApprovalsPanel`, `CrossHireDashboard`, etc.) destructures from these hooks directly, the migration must update those too.
- **ASSUMPTION-003**: `deno task build` type-checks all files. Any type mismatch from the `CachedIdentity` rename will be caught at build time.

## 8. Related Specifications / Further Reading

- [SPECS.md § Design Constraints](SPECS.md:1065) — C-18 through C-21
- [SPECS.md § Unified Identity Model](SPECS.md:229) — `Player` as canonical identity, `CachedIdentity` subset
- [SPECS.md § Terminology](SPECS.md:80) — Shared Hook, Canonical Domain Type definitions
- [AGENTS.md § React Lifecycle Design Principles](.roo/rules-architect/AGENTS.md) — Data-Fetching Hook Contract, Effect Lifecycle Tiers
- [AGENTS.md § Architecture](.roo/rules-architect/AGENTS.md) — Adapter pattern, design constraints
- [docs/admin-view-data.md](docs/admin-view-data.md:1) — Current admin data flow audit (pre-refactor baseline)
- [docs/player-view-data.md](docs/player-view-data.md:1) — Current player data flow audit (pre-refactor baseline)
- [docs/pb-schema.md](docs/pb-schema.md:1) — PocketBase schema (unchanged for Phase A)
- [plans/refactor-shared-hooks-consolidation-1.md](plans/refactor-shared-hooks-consolidation-1.md) — This plan
