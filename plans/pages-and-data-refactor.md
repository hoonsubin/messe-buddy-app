# Pages & Data Layer Refactor

**Status:** Approved (2026-07-06)  
**Companion:** [`design/component-architecture.md`](../design/component-architecture.md), [`SPECS.md`](../SPECS.md)

This refactor delivers a **smaller** codebase with **one path per concern**: seven flat page composers, six page hooks, one query store, and presentational components only. It is not additive — legacy fetch hooks, duplicate scan surfaces, and parallel roster pipelines are **deleted**, not wrapped.

---

## Problems (symptoms → root cause)

| Symptom | Root cause |
|---------|------------|
| Validation UI flicker | `useValidationConfirm` resets state while `useSession` refetches in parallel |
| Repeated PB log lines | ~18 independent `useEffect` fetch hooks; no coalescing |
| `playerId` cascade | `useSession` runs unscoped → scoped when player resolves |
| Tab over-fetch | `useState` tabs mount all hooks; library tab fetches even when hidden |
| GM home ↔ player detail double-fetch | `useGmPlayers` and `useProgressGamemaker` both call `listPlayers` + N× `listProgressEvents` |
| Component adapter calls | `QRDisplay`, `ResourceLibraryTab`, `OnboardingJourneyModal` fetch directly |

---

## Target architecture

```mermaid
flowchart TB
  subgraph L4 [pages — 7 files]
    P[compose components + page hook]
  end

  subgraph L5 [hooks/pages — 6 files]
    H[params → queries → actions]
  end

  subgraph store [store/]
    QC[queryClient: keys, dedup, invalidate, SSE patch]
  end

  subgraph L3 [components/ — presentational only]
    C[props in, callbacks out]
  end

  subgraph writes [use-cases/ + useMutation]
    UC[adapter writes → invalidateQuery]
  end

  P --> H
  P --> C
  H --> QC
  QC -->|read| Adapter[AppAdapter]
  UC --> Adapter
  UC --> QC
```

**Invariants after migration:**

1. **Reads** — only `hooks/pages/*` via `useQuery` → `store/`.
2. **Writes** — `use-cases/*` + `useMutation` → `invalidateQuery(keys)`; no `refreshSession()` pattern.
3. **SSE** — `subscribeProgressEvent` patches `progress:{playerId}` in the store; no standalone `useWatchMission`.
4. **Components** — no `useAdapter`, no domain fetch hooks (CI grep enforced).
5. **Tabs** — `NavLink` to real paths; no `useState` tab keys; drop `?journey=1` in favour of `/customize`.

---

## Pages & routes

`src/pages/` — **seven** `.tsx` files only (no subfolders, no `.ts` helpers):

| File | Route(s) | Pane from pathname |
|------|----------|-------------------|
| `LandingPage.tsx` | `/`, `/join/:sessionId` | Profile picker vs join claim (invite/QR URL only — no manual token step) |
| `PlayerCockpitPage.tsx` | `/session/:id`, `…/assistant` | dashboard vs assistant |
| `PlayerFormPage.tsx` | `/form/:id/:missionId` | — |
| `GmHomePage.tsx` | `/gamemaker/:id`, `…/library` | players vs library |
| `GmPlayerDetailPage.tsx` | `/gamemaker/:id/player/:pid`, `…/customize`, `…/buddy`, `…/preboarding`, `…/scan` | GM player tabs + full-page scan mode |
| `ValidationPage.tsx` | `/validate/:id` | — |
| `NotFoundPage.tsx` | `*` | — |

Wizards, overlays, modals, and loading/error branches stay in `components/` — not separate pages.

**QR scan — one UI, two hosts:** extract `components/qr/QrScanPanel.tsx` (camera + decode + navigate). Used by `GmPlayerDetailPage` scan mode (`/scan` path) only. Delete standalone `QRScannerView` and `/gamemaker/:sessionId/scan` (orphaned route — nothing navigates to it today).

---

## Data layer

### Query keys (complete set)

| Key | Fetcher | Invalidated by |
|-----|---------|----------------|
| `sessionMeta:{sessionId}` | `getSession` | `updateSession` (incl. pre-boarding checklist) |
| `journey:{sessionId}:{playerId}` | `listMilestones` + `listMissions` | template apply, GM editor save, mission CRUD |
| `player:uid:{uid}` | `getPlayer` | `updatePlayer` |
| `player:id:{playerId}` | `getPlayerById` | same |
| `progress:{playerId}` | `listProgressEvents` | `upsertProgressEvent`, SSE patch |
| `buddy:{playerId}` | `getBuddyProfile` | `upsertBuddyProfile` |
| `resources:{sessionId}:{playerId}` | `listResources` | resource CRUD |
| `templates` | `listTemplates` | save/delete template |
| `gmRoster:{sessionId}` | `listPlayers` + batched `listProgressEvents` | invite, progress writes |
| `formSchema:{missionId}` | `getFormSchema` | schema upsert |
| `libraryResources` | `listLibraryResources` | library CRUD |
| `buddyPicker:{sessionId}` | `listDistinctBuddyProfilesForPicker` | buddy upserts in session |

**Rules:**

1. Coalesce in-flight requests per key.
2. `isInitialLoading` vs `isRefreshing` — stable UI on background refresh (fixes validation flicker).
3. Gate `journey:*` on resolved `playerId` — never unscoped-then-scoped.
4. `sessionMeta` 404 replaces `useSessionExists` (orphan detection on landing uses same key).
5. `gmRoster` **replaces** `useGmPlayers` and `useProgressGamemaker` **reads** — one roster fetch, warm cache across GM home and player detail.

### Page hooks (`hooks/pages/` — six files)

| Hook | Queries (mount / tab activate) |
|------|----------------------------------|
| `useLandingPage` | `sessionMeta` per profile for orphan badges; join/create on action |
| `usePlayerCockpitPage` | `player:uid`, `sessionMeta`, `journey`, `progress`, `buddy`, `resources` |
| `usePlayerFormPage` | above + `formSchema:{missionId}` |
| `useGmHomePage` | `sessionMeta`, `gmRoster`; `libraryResources` + `buddyPicker` when library tab or wizard open |
| `useGmPlayerDetailPage` | `sessionMeta`, `journey`, `buddy`, `resources`, `templates`, `gmRoster` slice, `player:id` |
| `useValidationPage` | `sessionMeta` → local decode → `journey`, `progress`, `player:id` |

Each hook returns `{ data, isInitialLoading, isRefreshing, error, actions }`. Chat (`useChat`) and tutorial state stay inside `usePlayerCockpitPage` as ephemeral UI — no query keys.

GM editor draft state (`useGmMilestoneEditor`, `useGmMissionEditor`) stays in-memory; saves go through `useMutation` → invalidate `journey:*`. Mission bottom-sheet autosave keeps `utils/draftStorage.ts` (local crash recovery only).

### Developer backend trace (session-scoped, dev-only)

A single trace sink records **every backend touch** from this browser tab, filterable by the active route `sessionId`. Replaces ad-hoc `console.log` in hooks and makes PB read counts observable during migration.

**Module:** `store/devBackendTrace.ts` (+ wired from `queryClient`, `useMutation`, adapter proxy during Phase 3).

| Property | Value |
|----------|-------|
| Enabled when | `import.meta.env.DEV` **and** `localStorage.mb_dev_trace !== "0"` (on by default in dev; opt out per tab) |
| Scope key | Route `sessionId` from `useParams()` (validation route uses the URL session; landing/join logs as `_public`) |
| Storage | In-memory ring buffer per scope (last ~200 events); not persisted across reload |
| Console | One line per event: `[mb:trace:{sessionId}] {kind} {detail}` |
| DevTools | `window.__MB_DEV_TRACE__` — `{ getLog(sessionId?), clear(), setEnabled(bool) }` |

**Event kinds** (all include `ts`, `sessionId`, `kind`):

| Kind | When | Detail fields |
|------|------|---------------|
| `query:fetch` | `fetchQuery` starts (not coalesced joiner) | `key`, `deduped: false` |
| `query:coalesce` | subscriber joins in-flight fetch | `key` |
| `query:hit` | cache served without network | `key`, `ageMs` |
| `query:invalidate` | `invalidateQuery` | `keys[]` |
| `query:patch` | SSE or `patchQuery` | `key` |
| `mutation:start` / `mutation:done` / `mutation:error` | `useMutation` lifecycle | `label`, `invalidates[]` |
| `adapter:call` | direct adapter method (until hooks retired) | `method`, `args` summary |
| `sse:subscribe` / `sse:event` | progress subscription | `playerId`, `missionId` |

**Page-hook integration:** each page hook sets the active trace scope once from `useParams().sessionId` so navigating `/gamemaker/A` → `/gamemaker/B` partitions logs automatically.

**Migration use:** ValidationPage pilot success metric (“≤ 5 reads on load”) is verified by filtering `__MB_DEV_TRACE__.getLog(sessionId)` for `query:fetch` events on first paint.

---

## Deletions (not wrappers)

### Pages & routes

- `RootRedirect.tsx` — logic moves into `LandingPage`
- `GameMakerHomePage.tsx` → `GmHomePage.tsx`
- `PlayerDetailPage.tsx` → `GmPlayerDetailPage.tsx`
- `FormPage.tsx` → `PlayerFormPage.tsx`
- `QRScannerView.tsx` + `/gamemaker/:sessionId/scan` route
- `pages/landing/*`, `pages/player-cockpit/*`, `pages/player-detail/*`

### Fetch hooks (delete entire files)

| Hook | Replaced by |
|------|-------------|
| `useSession.ts` | `sessionMeta` + `journey` queries; GM session writes → `useMutation` |
| `useSessionExists.ts` | `sessionMeta` 404 |
| `useValidationConfirm.ts` | `useValidationPage` |
| `useResolvedPlayer.ts` | `player:uid` query |
| `useQRScanContext.ts` | `sessionMeta` + `gmRoster` + `journey` in page hook |
| `usePlayerInviteToken.ts` | `inviteToken` field from `player:id` / `gmRoster` |
| `useGmPlayers.ts` | `gmRoster` query |
| `useProgress/gamemaker.ts` | `gmRoster` query + mutation actions |
| `useProgress/gmPlayers.ts` | `gmRoster` query |
| `useProgress/watchMission.ts` | SSE → `progress` cache patch |
| `useProgress/player.ts` | `progress` query + mutation actions |
| `useBuddyProfile.ts` | `buddy` query + mutation |
| `useResources.ts` | `resources` query + mutation |
| `useFormMission.ts` | `formSchema` query; submit logic in `usePlayerFormPage` |
| `usePlayerTemplates.ts` | `templates` query + mutations in page hook |
| `useLibraryResources.ts` | `libraryResources` query + mutations in `useGmHomePage` |
| `useBuddyPickerOptions.ts` | `buddyPicker` query in `useGmHomePage` |
| `usePreBoardingChecklist.ts` | `sessionMeta` read + `updateSession` mutation in page hook |
| `useScrollCollapse.ts` | unused — delete |

Delete `hooks/useProgress/` folder after migration (types move to `hooks/pages/types.ts` or `store/queryKeys.ts`).

### Dead use-cases (git rm)

- `applyDefaultOnboardingJourney.ts` + `.test.ts`
- `applyScratchJourney.ts` + `.test.ts`

Already superseded by `applyTemplateIfBlank` + `applyTemplateToNewPlayer`.

### Component boundary fixes (lift fetch to page hook)

| Component | Today | After |
|-----------|-------|-------|
| `QRDisplay` | `useSession` + `useWatchMission` | props: `qrSecret`, `onProgressUpdate` |
| `ValidationDisplay` | `useWatchMission` | props: progress callback from page hook |
| `ResourceLibraryTab` | `useLibraryResources` | props from `useGmHomePage` |
| `OnboardingJourneyModal` | `useBuddyPickerOptions` | props from `useGmHomePage` |

---

## Code moves

| From | To |
|------|-----|
| `pages/landing/*` | `components/landing/*` |
| `pages/player-cockpit/*` (UI only) | `components/player/*` |
| `pages/player-detail/*` (UI only) | `components/gamemaker/player-detail/*` |
| `pages/*/use*Page.ts` | `hooks/pages/use*Page.ts` |
| `playerDetailStorage.ts` | `utils/playerDetailStorage.ts` |
| `TUTORIAL_FORM_KEY` (duplicated) | `components/tutorial/constants.ts` (single source) |
| New | `store/queryClient.ts`, `store/queryKeys.ts`, `store/QueryProvider.tsx`, `store/devBackendTrace.ts`, `hooks/useQuery.ts`, `hooks/useMutation.ts`, `components/qr/QrScanPanel.tsx` |

---

## Client storage (consolidate, don't multiply)

| Key | Fate |
|-----|------|
| `mb_identity`, `mb_active_uid` | Keep — identity only; pages use `useIdentity` exports, not raw strings |
| `mb_player_template_{playerId}` | Keep as UI hint for "save to template" prompt; not authoritative (or add server field later) |
| `mb_draft_{sessionId}_{missionId}` | Keep — GM mission bottom-sheet crash recovery |
| `mb_tutorial_*` | Centralize in `components/tutorial/constants.ts` |
| `mb_landing_toast` | **Delete** — read path exists, no writer |

---

## Migration phases

### Phase index

| Phase | Name | Source | Status |
|-------|------|--------|--------|
| **1** | Store + dead code removal | Refactor plan | Pending |
| **2** | Flat pages, routes, QR consolidation | Refactor plan | Pending |
| **3** | Query migration + hook retirement | Refactor plan | **Done** (page hooks migrated; legacy hooks deleted) |
| **4** | Verify + guard (refactor) | Refactor plan | **Done** (4.1–4.4) |
| **5** | Blockers — smoke remediation | Playwright 2026-07-06 | **Done** (5.1) |
| **6** | Realtime — GM + player live sync | Playwright 2026-07-06 | **Done** (6.1–6.5, **6.4** verified 2026-07-07) |
| **7** | Functional gaps — smoke remediation | Playwright 2026-07-06 | **Done** (7.1–7.7) |
| **8** | UX polish — smoke remediation | Playwright 2026-07-06 | **Done** (8.1–8.15) |
| **9** | Smoke verification | Phase 5–8 exit gate | **Done** — fresh-identity Playwright MCP (2026-07-07); **8.15** retest after fix |
| **10** | E2E harness + CI gate | Smoke scripts 2026-07-06 | **Deferred** — no CI smoke; Playwright MCP + visual analysis instead |

**Recommended execution order:** Phase **1–2** audit (checkboxes stale — most code merged) → **9.4** (mock path, optional).

**Verification (no smoke CI):** Use **Playwright MCP** at 390×844 against a clean rebuild (`deno task dev:full` or Docker). Capture screenshots per `design/design-tokens.md` §10. Do **not** add new smoke scripts — `scripts/smoke-live.ts` was removed; trim stale references in README/plan as encountered.

**Legacy smoke IDs → phase tasks:** ST-P1-1 = **5.1** · ST-RT-1…4 = **6.1…6.4** · ST-P2-1…4 = **7.1…7.4** · ST-P3-1…11 = **8.1…8.11**

### Smoke baseline (Playwright, PocketBase)

**Environment:** `http://127.0.0.1:5173` · `useMockPb: false` · iPhone 15 (390×844) · Playwright MCP visual pass only

| Persona | Pass | Fail / open | Notes |
|---------|------|-------------|-------|
| **Landing** | Home renders; GM workspace create | — | Demo cards gated to mock builds (**8.14**) |
| **Game Master** | Roster, wizard, milestone sheet (**7.6**), live progress, empty library (**8.4**), invite QR/link | — | Fresh workspace verified |
| **Player** | Invite URL → name → claim; form; resource search; map sidebar; tab bar with sidebar open (**8.15**) | Demo profiles on PB landing (**8.14**) | Join simplified (**8.13**) |
| **Validation / QR** | GM roster % after form (realtime) | Camera scan untestable headless | Simulate not re-run |

**Fresh-identity visual smoke (2026-07-07 evening, Playwright MCP):** Cleared storage → GM **Alex Rivera** / **Smoke Visual 2026-07-07** → wizard → **Jordan Lee** → invite URL from GM card → claim → profile form → GM roster **3%** without reload. Screenshots: `.playwright-mcp/smoke-fresh-*.png`. Item 12 (AI Assistant tab) required closing sidebar first — **8.15** addresses this.

**Manual smoke cross-ref:** [`MesseBuddy_Smoke_Test_2026-07-07.md`](MesseBuddy_Smoke_Test_2026-07-07.md)

### Phase 1 — Store + dead code removal

- [ ] **1.1** `store/` + `hooks/useQuery.ts` / `useMutation.ts` + unit tests (coalesce, invalidate, loading semantics)
- [ ] **1.2** `store/devBackendTrace.ts` — ring buffer, console sink, `window.__MB_DEV_TRACE__`; emit from `queryClient`
- [ ] **1.3** Mount `QueryProvider` in `App.tsx`
- [ ] **1.4** `git rm` dead use-case stubs + `useScrollCollapse.ts`
- [ ] **1.5** Centralize tutorial storage keys

### Phase 2 — Flat pages, routes, QR consolidation

- [ ] **2.1** Seven page files; router paths per table above
- [ ] **2.2** `RouteTabBar` → `NavLink`; derive active pane from pathname; drop `?journey=1`
- [ ] **2.3** Move subfolder UI to `components/`; move page hooks to `hooks/pages/`
- [ ] **2.4** Extract `QrScanPanel`; delete `QRScannerView` + orphaned scan route
- [ ] **2.5** Merge `RootRedirect` into `LandingPage`
- [ ] **2.6** Shared layouts in `components/layout/` (`PlayerSessionLayout`, `GmWorkspaceLayout`)

### Phase 3 — Query migration + hook retirement

Pilot first — proves the store before bulk migration:

- [x] **3.1** `useValidationPage` + thin `ValidationPage` → verify ≤ 5 PB reads, no flicker
- [x] **3.2** `usePlayerCockpitPage` — lift `QRDisplay` props
- [x] **3.3** `useGmHomePage` — lift `ResourceLibraryTab` + `OnboardingJourneyModal`; `gmRoster` + lazy `libraryResources`
- [x] **3.4** `useGmPlayerDetailPage` — editor saves → `invalidateQuery`; delete `refreshSession` calls
- [x] **3.5** `usePlayerFormPage`
- [x] **3.6** `useLandingFlow` + orphan check via `sessionMeta` (landing page hook pattern)
- [x] **3.7** Delete all hooks listed in **Deletions** section
- [x] **3.8** SSE patches `progress:{playerId}` in store; trace `sse:subscribe` / `sse:event`
- [x] **3.9** `useMutation` emits `mutation:*` events; adapter trace in `devBackendTrace`

### Phase 4 — Verify + guard (refactor)

- [x] **4.1** CI/lint: no `useAdapter` in `src/components/` — verified (0 call sites)
- [x] **4.2** Document trace in README dev section — see **Dev backend trace** in README
- [x] **4.3** `data-page` on all seven shells + design-tokens §10 table — Playwright MCP 2026-07-07; added `not-found`; `PlayerCockpitPage` session-redirect shell keeps `data-page`
- [x] **4.4** `deno task build`, `deno task lint` — build green; lint warnings pre-existing

### Phase 5 — Blockers (smoke remediation)

Ship before PocketBase onboarding demo.

- [x] **5.1** Player form infinite re-render on `/form/:id/:missionId` — `Maximum update depth exceeded`; submit never persisted *(done 2026-07-06: `formInitKey` + `buildFormDefaultValues` in `PlayerFormPage.tsx`; memoized `useDerivedPlayerProgress`; `src/utils/formDefaultValues.test.ts`)*

### Phase 6 — Realtime GM + player live sync

Dual-tab smoke (PocketBase): GM tab open **without reload** while player/validator acts elsewhere.

**Findings (2026-07-06, updated after systematic smoke):**

| Flow | Observer | Realtime? | Task |
|------|----------|-----------|------|
| Player claims via `/join/...` | GM Players roster | **Yes** (post **6.1**) | — |
| GM confirms QR mission | GM roster % / analytics | **Yes** (post **6.2**) | — |
| GM confirms QR mission | Player QR wait (`QRDisplay` → subscribe + poll) | **Yes** (post **6.5**) | — |
| Player submits profile form | GM roster % | **Yes** (same-tab invalidate + **6.2**) | — |

**Root cause (GM path, fixed):** `gmRoster:{sessionId}` was fetch-on-mount only — **6.1** / **6.2** add PB subscribe on `players` + session-scoped `progress_events`.

**Root cause (player QR dismiss, fixed):** (1) GM simulate validated the **first** QR mission in journey order, not the mission the player opened. (2) Unstable SSE callback re-subscribed on every render. Fix: `pickFirstIncompleteQrMission`, session-scoped subscribe, progress poll fallback, popup closes when `progressEvent` becomes validated.

- [x] **6.1** PB subscribe on `players` (`sessionId = …`) → `patchGmRosterFromPlayer` via `useGmRosterRealtime`
- [x] **6.2** PB subscribe on `progress_events` → `patchGmRosterFromProgressEvent`; wired in `useGmHomePage` + `useGmPlayerDetailPage`
- [x] **6.3** GM Analytics tab appears without reload when first event arrives
- [x] **6.4** Playwright dual-context: claim + form progress + QR validate; GM DOM updates without `page.reload()` — verified 2026-07-07 (historical `smoke-live.ts` run; script since removed)
- [x] **6.5** Player QR wait dismisses within 10s after GM confirm — session-scoped SSE + progress poll + popup auto-close on `isCompleted`; **simulate scan picks first incomplete QR mission** (`pickFirstIncompleteQrMission`); unblocks **9.3**
  - **Verify:** Playwright MCP dual-tab QR flow; player popup dismisses within 10s after GM confirm
  - **Files:** `src/hooks/useWatchProgressMission.ts`, `src/hooks/useQrScan.ts`, `src/utils/qrMissionPick.ts`, `src/components/player/MissionDetailPopup.tsx`, `src/adapters/pocketbase/pbAdapter.ts`

### Phase 7 — Functional gaps (smoke remediation)

- [x] **7.1** GM Customize map shows 0% while cockpit/analytics show real % — `milestoneProgress` prop on `MilestoneMapEditor` via `PlayerCustomizeTab` *(done 2026-07-06)*
- [x] **7.2** Ghost milestone dialog after scratch-template wizard — clear selection on `playerId` change only (ref-stable close); guard `MissionBottomSheet` mount *(done 2026-07-06; regressed 2026-07-07 as **7.6**, fixed same day)*
- [x] **7.3** Milestone-scoped resources — GM attach from library + detach (milestone sheet); player milestone sidebar Resources tab + search empty-state copy
  - **Files:** `ResourcesEditor.tsx`, `MilestoneSidebarViewer.tsx`, `useGmPlayerDetailPage.ts`, `ResourcesSection.tsx`
- [x] **7.4** `/llm/health/readiness` 502 — poll only on assistant tab; stop after consecutive failures (`useAssistantAvailability`, `useChat`, `usePlayerCockpitPage`)
  - **Acceptance:** 0 console 502 on `/session/:id` dashboard load when LiteLLM not running
- [x] **7.5** Scratch journey empty mission list — `CurrentMissionsList` shows caught-up card with map hint when `journeyMissionCount > 0` and no current missions
- [x] **7.6** Milestone editor won't open (2026-07-07 regression #1) — `closeMilestoneEditor` effect depended on unstable editor hook identity; fixed with ref-stable close on `playerId` / `isScanMode` only (`useGmPlayerDetailPage.ts`)
  - **Verify:** Playwright MCP — milestone sheet opens on map node tap
  - **Source:** [`MesseBuddy_Smoke_Test_2026-07-07.md`](MesseBuddy_Smoke_Test_2026-07-07.md) regression #1
- [x] **7.7** Stale `mb_identity` request storm (2026-07-07 regression #2) — `useQuery` subscribe re-fetched on every cache notify; `fetchQuery` now caches errors until `invalidateQuery`
  - **Verify:** Dev trace — &lt; 20 session fetches in 2.5s with stale identity
  - **Files:** `src/store/queryClient.ts`, `src/hooks/useQuery.ts`
  - **Follow-up:** auto-clear identity + redirect on session 404 — `useStaleSessionRedirect` on GM home, GM player detail, player cockpit

### Phase 8 — UX polish (smoke remediation)

- [x] **8.1** GM home empty-state flash — `loading` until first `gmRoster` fetch settles (`useGmHomePage`); `9.5.empty-flash` pass
- [x] **8.2** Layered modals on first login — hide tutorial when skip confirm opens; restore on cancel (`useTutorial`)
- [x] **8.3** Milestone bottom sheet on `/scan` — auto-close on scan route (`useGmPlayerDetailPage`); `G.7.scan-sheet` pass
- [x] **8.4** Empty-state CTA duplication — header “Add resource” hidden when library empty (`ResourceLibraryTab`); **verified** on fresh PB workspace (Playwright MCP `smoke-fresh-11-library-empty.png`)
- [x] **8.5** Grammar: "1 missions" → singular/plural (`MilestoneNode`, `TemplateSelect`)
- [x] **8.6** Player name prefill from invite token (`useLandingFlow`); claimed revisit auto-links to cockpit (multi-device)
- [x] **8.13** Join flow — remove manual “Step 1 of 2 — invite link”; `/join/:sessionId?t=` or QR only (`useLandingFlow`, `EmployeeForm`, `inviteUrl.ts`)
- [x] **8.14** **Demo profiles only in static/mock builds** — gate `DEMO_PROFILES` seeding + picker cards behind `isDemoBuild()` (`resolveUseMockPb` / `window.__MB_CONFIG__.useMockPb`). Hidden on PocketBase adapter (`dev:full`, Docker, production PB).
  - **Files:** `AdapterContextValue.ts` (`isDemoBuild`), `useLandingFlow.ts` (seed + `visibleProfiles` filter), `LandingPage.tsx` (skip demo auto-redirect), `ProfileCard.tsx` (`identity.isDemo`)
  - **Verify:** Playwright MCP — cleared storage on PB → landing shows "No saved profiles", no DEMO cards
- [x] **8.15** Player milestone sidebar vs tab bar — **Option B** (auto-dismiss on tab tap + partial A z-index) — **done 2026-07-07**
  - **Decision:** [`design/wireframes/player-sidebar-tab-bar-options.md`](../design/wireframes/player-sidebar-tab-bar-options.md) Option **B**
  - **Delivered:** `player.css` z-index 51 on `.route-tab-bar`; `closeMilestoneSidebar` + tab effect in `usePlayerCockpitPage`; `onTabActivate` on `RouteTabBar`; duplicate sidebar-tab CSS removed from `shared.css`
  - **Verified:** Playwright MCP `.playwright-mcp/smoke-815-*.png` — AI Assistant reachable with sidebar open
- [x] **8.7** Start Date — `FIELD_TYPE.DATE` + `<input type="date">`; `P.3.start-date` pass
- [x] **8.8** Truncated player-detail header — `{firstName}'s Onboarding` + smaller title font
- [x] **8.9** Inline required-field validation — `FormShell noValidate` + app `validate()`; `P.4.inline-validation` pass
- [x] **8.10** React `[TIMESTAMP]` profiler spam — **N/A:** no `Profiler` in `src/` (only `StrictMode`); closed
- [x] **8.11** Dev trace log levels — `query:fetch` + `mutation:done` → `console.info` (`devBackendTrace.ts`)
- [x] **8.12** Mobile scan button a11y — `aria-label` on header scan/back buttons (`PlayerDetailHeader.tsx`)

#### Documented behaviour (no change unless product disagrees)

| Note | Detail |
|------|--------|
| Mock reload | Mock adapter resets progress on full `page.goto`; PB persists (verified) |
| QR simulate scope | GM simulate picks first global QR mission, not milestone-specific |
| Dead file | `src/pages/player-detail/usePlayerDetailPage.ts` — already deleted |
| Sidebar CSS dup | `.sidebar-tab*` duplicated in `shared.css` and `sidebar.css` — **trimmed** in **8.15.5** |
| Smoke scripts | `scripts/smoke-live.ts` / `smoke-phase9.ts` removed — do not recreate; verify via Playwright MCP only |

### Phase 9 — Smoke verification

Exit gate for Phases 5–8. Run against **mock** and **live PocketBase**. **No CI gate** — primary verification is Playwright MCP + visual analysis (design-tokens §10). No headless smoke script in repo (`scripts/` = `generate-package-json.ts`, `check_python.py` only).

| ID | Check | PB status (2026-07-07) | Blocker |
|----|-------|------------------------|---------|
| **9.1** | Workspace → wizard → join → profile → reload → XP | **Pass** | — |
| **9.2** | Dual-tab claim + GM progress after form | **Pass** | — |
| **9.3** | Dual-tab QR: GM % live + player QR dismiss | **Pass** | — |
| **9.4** | Mock `sess_mmt2026` customize % vs cockpit | Not run | Mock path |
| **9.5** | GM home: no empty-state flash | **Pass** | — |
| **9.6** | Post-wizard: no ghost milestone dialog | **Pass** | — |
| **9.7** | Console: 0 depth / unhandled errors | **Pass** | — |
| **9.8** | Dev trace mutation events | **Pass** (API present) | — |
| **9.9** | design-tokens §10 screenshots | **Pass** (fresh identity) | `.playwright-mcp/smoke-fresh-*.png` |
| **9.10** | `deno task build`, `deno task lint` | **Pass** build; lint warnings pre-existing | **4.4** |

- [x] **9.1** PB onboarding happy path
- [x] **9.2** PB dual-tab claim + progress
- [x] **9.3** PB dual-tab QR — GM side + player dismiss
- [ ] **9.4** Mock `sess_mmt2026` customize % vs cockpit — verify via Playwright MCP if mock path still used
- [x] **9.5** GM empty-flash
- [x] **9.6** Ghost dialog
- [x] **9.7** Console critical errors (502 excluded — track under **7.4**)
- [x] **9.8** Dev trace
- [x] **9.9** Visual regression (390×844) — **Done** 2026-07-07; **8.14–8.15** verified
- [x] **9.10** Build green

**Dual-tab quick checks:**

```
☑ Tab A: GM home → Tab B: /join → Tab A roster active within 10s
☑ Tab B: profile form → Tab A GM % updates
☑ Tab B: player QR wait → Tab A GM confirm → Tab B popup dismisses within 10s
☑ Fresh-identity Playwright MCP pass (2026-07-07); **8.15** retest after sidebar fix
```

### 2026-07-07 manual smoke → plan mapping

| Manual ID | Issue | Plan task | Status |
|-----------|-------|-----------|--------|
| Regression #1 | Milestone editor won't open | **7.6** | **Fixed** — ref-stable `closeMilestoneEditor` |
| Regression #2 | Stale identity request storm | **7.7** | **Fixed** — error cache + stale-only refetch |
| 2026-07-06 #1 | Ghost milestone dialog | **7.2** | Fixed (caused **7.6**, re-fixed) |
| 2026-07-06 #3 | Milestone resources stub | **7.3** | **Fixed** — library attach + player sidebar |
| 2026-07-06 #4 | `/llm/health/readiness` 502 | **7.4** | Dashboard path quiet; assistant tab may still 502 when open |
| 2026-07-06 #5 | Library empty CTA dup | **8.4** | **Pass** — fresh workspace, single CTA |
| 2026-07-06 #6–10 | Grammar, prefill, date, header, validation | **8.5–8.9** | **Pass** (`smoke-live.ts` + visual) |
| Fresh visual | Demo profiles on landing with PB | **8.14** | **Fixed** — `isDemoBuild()` gate |
| Fresh visual | Sidebar blocks tab bar | **8.15** | **Fixed** — Option B verified MCP |
| Fresh visual | Join manual token step removed | **8.13** | **Done** |
| Fresh visual | Multi-device invite reopen | — | **Pass** — auto cockpit + 10 XP |
| Fresh visual | GM milestone sheet | **7.6** | **Pass** |
| Fresh visual | Player map milestone sidebar | — | **Pass** (opens; tab overlap **8.15**) |

### 2026-07-07 fresh-identity visual smoke — detailed findings

**Method:** Playwright MCP at 390×844; `localStorage` cleared; no demo session; no PocketBase API shortcuts — invite URL copied from GM `SessionInviteCard` UI.

**Session under test:** GM workspace `Smoke Visual 2026-07-07` (Alex Rivera) · player Jordan Lee · workspace id `thl0eevn6tub94b`.

| # | Area | Result | Screenshot |
|---|------|--------|------------|
| 1 | Landing (cleared storage) | Brief “No saved profiles” then DEMO cards appear on interaction | `smoke-fresh-01` |
| 2 | GM create + empty home | Pass | `smoke-fresh-02` |
| 3 | Invite wizard + player detail | Pass; invite QR + copy URL visible | `smoke-fresh-03` |
| 4 | Join URL auto-verify | “Opening your invite…” → name prefilled | `smoke-fresh-04–05` |
| 5 | Player cockpit + tutorial skip | Pass; skip confirm does not stack | `smoke-fresh-06` |
| 6 | Resource search “Benefits” | Employee Benefits Overview | `smoke-fresh-07` |
| 7 | Profile form empty + valid submit | Per-field alerts; 10 XP; GM 3% live | `smoke-fresh-08–09` |
| 8 | GM milestone map click | Sheet opens (**7.6** regression fixed) | `smoke-fresh-10` |
| 9 | Empty library (fresh workspace) | Single “Add resource” CTA (**8.4**) | `smoke-fresh-11` |
| 10 | Multi-device invite reopen | Same URL → cockpit with 10 XP, no name step | `smoke-fresh-12` |
| 11 | Join without `?t=` | Clear message; no manual codes | `smoke-fresh-13` |
| 12 | AI Assistant tab | Pass after closing sidebar | `smoke-fresh-14` |
| 13 | App console errors | 0 (excluding test harness on `about:blank`) | `smoke-fresh-console-errors.log` |

**Open blockers (user perspective):** None from Phases 5–8 smoke remediation.

**Not tested / N/A:** GM camera QR scan (headless); `/llm/health/readiness` 502 on assistant tab when LiteLLM down; mock-only `sess_mmt2026` path (**9.4**).

### Phase 10 — E2E harness + CI gate

**Deferred** — project uses Playwright MCP with visual analysis instead of CI smoke scripts.

- [~] **10.1** Wire headless smoke into CI — **won't do** (per product decision 2026-07-07); `smoke-live.ts` removed from repo
- [~] **10.2** Extend headless persona cases — **won't do** (no script)
- [~] **10.3** ESLint in smoke scripts — **N/A**
- [x] **10.4** Document verification in README: Playwright MCP, clean PB reset; removed stale `smoke-live.ts` command
- [x] **10.5** Phase 9 exit: **7.3**, **8.4**, **9.9** visual verify on fresh PB build; **8.14–8.15** done

#### Remaining work by priority

| Priority | Phase | Task | Effort |
|----------|-------|------|--------|
| P0 | **7.6** | Milestone sheet won't open | S — **done** |
| P1 | **7.7** | Stale identity request storm | S — **done** |
| P1 | **7.4** | Stop or fix `/llm/health/readiness` 502 polling | S — **done** |
| P1 | **8.12** | Scan QR `aria-label` on mobile header | S — **done** |
| P2 | **6.4** | Playwright dual-context verification | M — **done** (MCP / historical headless) |
| P1 | **8.14** | Gate demo profiles to mock/static builds only | S — **done** |
| P1 | **8.15** | Sidebar auto-dismiss on tab (Option B + z-index) | S — **done** |
| P2 | **8.4** | Verify library empty CTA on fresh PB | S — **done** |
| P3 | **4.3** | `data-page` + design-tokens §10 verify | S — **done** |
| P3 | **10.4** | README verification docs | S — **done** |
| P3 | **4.x** | Refactor CI guards (adapter boundary) | M — **4.1–4.2, 4.4** done |
| — | **9.9** | Playwright MCP visual pass (390×844) | **Done** 2026-07-07 |
| — | **10.x** | Smoke CI | **Deferred** |
| — | **1–2** | Original flat-page refactor (if not already merged) | L |
| — | **8.10** | Profiler spam | Closed (N/A) |

**S** = small (≤ half day) · **M** = medium · **L** = large

---

## Success metrics

| Metric | Before | Target |
|--------|--------|--------|
| Files in `pages/` | 30 (9 + 21 subfolder) | **7** `.tsx` |
| Domain fetch hooks in `hooks/` | ~18 independent fetchers | **0** (only `useQuery`, `useMutation`, chat/tutorial ephemeral) |
| Page hooks in `hooks/pages/` | 0 | **6** |
| QR scan surfaces | 3 (page + modal + validation) | **1** component, 2 hosts |
| GM roster fetch pipelines | 2 (`useGmPlayers` + `useProgressGamemaker`) | **1** (`gmRoster` key) |
| Validation PB reads on load | 15–20 | ≤ 5 |
| Player cockpit mount reads | 10–14 | ≤ 7 |
| Validation UI | Spinner ↔ card flicker | Stable card after first paint |
| Tab change | Re-fetch all parent hooks | Cache hit, no spinner |
| `useAdapter` in `components/` | 4 call sites | **0** |
| Backend calls visible per session (dev) | PocketBase logs only | `__MB_DEV_TRACE__.getLog(sessionId)` |

---

## Out of scope

- TanStack Query — only if custom cache exceeds ~300 lines
- `view-models/` folder — rejected
- Server-side seed consolidation (separate track)
- `player.appliedTemplateName` server field — optional follow-up to drop `playerDetailStorage` localStorage

---

## Decision log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-PAGE-1 | Seven page files max | Tabs, wizards, and state branches are not pages |
| D-PAGE-2 | URLs for tabs, one component per shell | Deep links without file proliferation |
| D-DATA-1 | FLUX query cache in `store/` | Dedup + invalidate fixes PB noise |
| D-DATA-2 | Page hooks in `hooks/pages/` | Single composition layer; no `view-models/` |
| D-DATA-3 | Split `useSession` → delete, not wrap | `sessionMeta` + `journey` keys |
| D-DATA-4 | `gmRoster` supersedes dual progress hooks | One roster path for GM home + player detail |
| D-DATA-5 | Delete legacy hooks on migration | No split-brain parallel caches |
| D-DATA-6 | Components never fetch | Props from page hooks; CI enforced |
| D-QR-1 | One `QrScanPanel`, delete orphaned scan route | `QRScannerView` unused in navigation |
| D-STORE-1 | SSE patches `progress` cache | Delete `useWatchMission` |
| D-DEV-1 | Session-scoped `devBackendTrace` in dev | One sink for query/adapter/SSE; replaces hook `console.log`; validates read budgets |
| D-UX-1 | Demo profiles (`DEMO_PROFILES`) only when `useMockPb === true` | Static/GitHub Pages demo without backend; PocketBase deployments must not inject Sofia/Peter picker cards |
| D-UX-2 | Join claim via invite/QR URL only — no manual workspace + token fields | SPECS capability URL; unclaimed → name; claimed → hydrate + cockpit |
| D-UX-3 | Player milestone sidebar: **Option B** on tab navigation | Auto-dismiss `selectedMilestoneId` + raise `.route-tab-bar` z-index above scrim; drawer UX unchanged; approved 2026-07-07 |
