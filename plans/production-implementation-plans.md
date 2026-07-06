# Production Implementation Plan — MesseBuddy

**Status:** Active handoff document  
**Last updated:** 2026-07-05 (ARCH-08–11 shipped in mock/dev)

Use this file to resume implementation in a new session. **Product behavior** is
in [`SPECS.md`](../SPECS.md) (including the append-only Decision Log — see
**D-ARCH-2** through **D-NAMING-2** for the locked architecture).
**Historical notes** live in [Changelog](#changelog) only.

---

## Authority

| Document | Role |
| -------- | ---- |
| [`SPECS.md`](../SPECS.md) | Target product behavior, constraints, routes, Decision Log |
| **This file** | Code status, next tasks, smoke tests, file map |
| [`docs/pb-schema.md`](../docs/pb-schema.md) | PocketBase collections (current + ARCH target) |

When SPECS and code disagree, **SPECS wins** until ARCH closes the gap.

---

## Backlog

| Pri | ID | Item | Spec / OD |
| --- | -- | ---- | --------- |
| P0 | OJ-01 | Onboarding journey UI redesign — landing + wizard + player detail gating | [`plans/onboarding-journey-redesign.md`](onboarding-journey-redesign.md) |
| P1 | DS-01 | Data source-of-truth consolidation — templates, library resources, demo instance | [`plans/data-source-of-truth-consolidation.md`](data-source-of-truth-consolidation.md) |
| P0 | P-02 | `peerScan` — page, `peer_scans` collection, admin feed | C-25, OD-21 |
| P1 | P-04 | Buddy save disabled / no-op before `claimStatus=claimed` | QoL |
| P1 | P-05 | Analytics empty-state on zero missions (re-verify) | — |
| P2 | P-06 | Tutorial references missing settings | — |
| P2 | P-08 | Landing shows misleading demo session codes | — |
| P2 | P-09 | AI chat no upfront unavailable state | — |
| P3 | P-10 | Admin header ignores `preferredName` | — |
| P3 | P-11 | No starter template on add player | OD-20 |
| P3 | P-12 | QR scanner camera-only (no manual token) | C-07 |
| P3 | P-13 | Invite QR uses external CDN | — |
| P3 | P-14 | ValidationPage shows raw player UID | — |

**Polish register (non-blocking):** G-03 form response review · G-04 pre-boarding
for player · G-05 profile field display · G-06–G-09 · G-16–G-17 tutorial copy.

**peerScan delivery (P-02):** PB migration → `PeerScanPage` `/peer/:sessionId?t=`
→ player peer QR variant → GM analytics feed.

---

## Production testing

### Smoke checklist

**Dev mock (`:5173`) — verified 2026-07-05:**

- [x] GM home **Players \| Resource library** tabs; library CRUD
- [x] Player detail `/gamemaker/:sessionId/player/:playerId`
- [x] Invite URL `?t=` prefill on landing
- [x] Player cockpit loads; `deno task build` · `deno task lint` green

**Target model (ARCH-13 — run after compose rebuild):**

- [ ] GM workspace → player list (no phantom workspace row)
- [ ] Add player → `inviteToken`; URL `/join/:sessionId?t=`
- [ ] Claim sets `claimStatus=claimed`; GM sees joined vs invited
- [ ] Same invite on second device → same `players` row, progress syncs
- [ ] Resource library visible; attach to player milestone
- [ ] Template import onto selected player only (not new session)
- [ ] Drill-down `/gamemaker/:sessionId/player/:playerId`
- [ ] Multi-player workspace: form + validation scoped to correct `playerId`

**Regression (both environments):**

- [ ] gmApprove + selfApprove + form mission loops
- [ ] Logout preserves profile; auto-resume via `/` when `mb_active_uid` set
- [ ] Orphaned profile badge on landing; player `session-missing` card
- [ ] Mission reorder + milestone rename reflect in sheet before save

---

## Key file map

| Concern | Files |
| ------- | ----- |
| Spec + decisions | `SPECS.md` (D-ARCH-2 … D-NAMING-2) |
| Schema | `docs/pb-schema.md`, `server/pb_migrations/001_initial_collections.go` |
| GM signup / claim | `joinSession.ts`, `claimPlayer.ts`, `invitePlayer.ts` |
| Player list | `src/hooks/useProgress/gmPlayers.ts` |
| GM dashboard | `src/pages/GameMakerHomePage.tsx`, `GmPlayersTab.tsx`, `ResourceLibraryTab.tsx` |
| Per-player editor | `src/pages/player-detail/`, `usePlayerDetailPage.ts` |
| Player scoping | `useSession.ts`, `usePlayerCockpitPage.ts`, `FormPage.tsx`, `useValidationConfirm.ts` |
| Mission / milestone editors | `useGmMissionEditor.ts`, `useGmMilestoneEditor.ts` |
| Landing / identity | `useLandingFlow.ts`, `useIdentity.ts`, `RootRedirect.tsx` |
| OJ-01 redesign | [`plans/onboarding-journey-redesign.md`](onboarding-journey-redesign.md) — wizard, landing, invite gating |
| Player cockpit | `src/pages/player-cockpit/usePlayerCockpitPage.ts` |
| Adapters | `mockAdapter.ts`, `pocketbase/pbAdapter.ts` |
| Templates | `importTemplate.ts`, `exportTemplate.ts`, `usePlayerTemplates.ts` |
| DS-01 consolidation | [`plans/data-source-of-truth-consolidation.md`](data-source-of-truth-consolidation.md) — one declared source per concept (template, library resources, demo instance) |
| Resource library | `useLibraryResources.ts`, `LibraryResourceFormModal.tsx` |
| QR validate | `ValidationPage.tsx`, `qrPayload.ts` |

---

## By design (testers)

| Behavior | Note |
| -------- | ---- |
| `mandatory` mission tag | Badge only — no enforcement |
| Mock `gmApprove` | Auto-completes ~4s in mock; production stays `pendingApproval` |
| Chat | Ephemeral — not persisted in PB |
| PB `difficulty` column | Legacy; XP authoritative via `missions.xpValue` (OD-02) |
| Multi-device edits | Last-write-wins (OD-27); no conflict UI in prototype |
| Library edit policy | Any GM may edit templates and library resources (D-ARCH-5) |
| Departments | Not in system; session ≈ department by convention (D-ARCH-4) |

---

## Changelog

Append-only history. Do not duplicate this material in sections above.

### 2026-07-05 — ARCH-08 through ARCH-11 shipped (mock/dev)

- **ARCH-08:** Scoped `useSession` by `playerId` in `FormPage`, `useValidationConfirm`
  (adapter-scoped decode + `payload.playerId`), and `QRDisplay`.
- **ARCH-09:** Deleted orphan `src/pages/hire-detail/`; live route remains
  `/gamemaker/:sessionId/player/:playerId` → `PlayerDetailPage`.
- **ARCH-10:** Deleted duplicate `src/components/admin/`; active GM UI is
  `src/components/gamemaker/` only (`useGmPlayers`, `usePlayerTemplates`).
- **ARCH-11:** `src/` grep clean — no `hire` in routes, hooks, strings, or
  `data-testid`. Updated `scripts/smoke-e2e.ts` label **Admin** → **Game Maker**.
- Deleted unused `bootstrapFromTemplate.ts` (ARCH-05).
- `deno task build` and `deno task lint` pass.

### 2026-07-05 — ARCH-06 resource library (mock/dev)

- `GameMakerHomePage` **Players \| Resource library** tabs; global library CRUD;
  `useLibraryResources`, `ResourceLibraryTab`, tag input, auto `resourceKey`.

### 2026-07-05 — Docs aligned to locked architecture

- Rewrote `docs/pb-schema.md` (library_resources, milestone_resources, GM on session).
- Replaced `hire-lifecycle.puml` → `player-lifecycle.puml`; updated ts-data-model,
  qr-routing, mission-validation, C4 diagrams; added `docs/README.md`.

### 2026-07-05 — Architecture lock-in (SPECS + plan)

- Locked final architecture in SPECS Decision Log: **D-ARCH-2** (workspace +
  `players` identities, GM on session), **D-ARCH-3** (global library),
  **D-ARCH-4** (session ≈ department), **D-ARCH-5** (any GM edits library),
  **D-NAMING-1/2** (player naming, purge hire).
- Remapped ARCH tasks ARCH-01–ARCH-13 including systematic hire → player rename.
- Supersedes prior ARCH task table that assumed `players.role` and GM `players` row.

### 2026-07-05 — Plan rewrite + spec cleanup

- Rewrote this plan as handoff doc; moved investigation notes and completed phases here.
- SPECS: consolidated Decision Log; removed implementation meta from spec body.
- Product decisions recorded in SPECS Decision Log: D-ARCH workspace model; `role` vs `jobTitle`; per-player `inviteToken` (OD-25); resources per `milestoneId` + Resources tab (OD-22/26); multi-device last-write-wins (OD-27).

### 2026-07-05 — Shipped in code (legacy model)

| ID | Summary |
| -- | ------- |
| P-01 | Admin draft projection: derive `selectedMilestone` from `draftMilestones`; merge `missionOrderChanges` into `sheetMissions`. |
| P-07 | Player `session-missing` UI with remove profile (mirrors GM stale session). |
| P-16 | GM Journey Map XP fallback via `computeProgress` when no player joined. |
| P-17 | Landing orphaned profile detection, badge, confirm-remove. |
| P-18 | `RootRedirect` + `mb_active_uid`; logout/leave clears active pointer. |

Full-stack smoke validated P-01, P-16, P-17, P-18, P-07, and core GM/player loops.

### 2026-07-05 — Architecture decision (not yet in code)

**P-15 / D-ARCH:** Root cause of “GM home = hire #1” — both `createGameMakerSession` and `useGmHires.createHire` call `adapter.createSession`. Fix: one workspace session per GM; players are `players` rows. Folded into ARCH-07.

### 2026-07-04 — P-18 design

- `/` should auto-resume last-active profile via `mb_active_uid`.
- Profile picker only on explicit logout or zero profiles.
- Dead active pointer → bounce to picker with P-17 orphan badge.
- Switch-profile link scoped (TopBar has no settings yet — P-06).

### 2026-07-03 — Live smoke + Phase 1

**Surfaced:** P-15 (home session as hire #1), P-16 (GM 0/0 XP before join), P-17 (silent orphaned profiles). P-05 flagged for re-verification (may already be fixed on empty hire).

**Phase 1 completed:** C-23 logout behavior · C-24 hire list (legacy semantics) · smoke #20 duplicate CTA · smoke #25b editor back guard · OD-02 XP-only + C-04 threshold on save.

### 2026-07-03 — Plan consolidation

- Merged five prior `plans/` documents into this file.
- Superseded: audits, gap analysis, UI redesign backlog as separate living docs.

### 2026-07-01 — Audits

- Hire creation navigation race (PB sequencing).
- QR `ValidationPage` GM guard via `gameMakerId`.
- Form schema saved on first mission create.
- Post-QR navigation to GM `identity.sessionId`.

### 2026-06-30 — Integration gap analysis

- Input/storage matrix; G-01–G-19. Display gaps G-03–G-09, G-16–G-17 remain in polish register.

### Closed issue notes (pre-2026-07-05 implementation)

**P-01 (before fix):** `selectedMilestone` was a snapshot; `missionOrderChanges` not merged into list props.

**P-03 (superseded by ARCH-03):** Invite was shared `/join/:sessionId`; dead code for token claim. Target: `?t=inviteToken` per SPECS C-27.

**P-17 (before fix):** `handleResume` had no backend check; stale player profiles failed silently.

**P-18 (before fix):** `/` always showed full profile picker.

### Historical phased plan (superseded)

| Phase | Was | Status |
| ----- | --- | ------ |
| 1 | Spec alignment quick wins | Done 2026-07-03 |
| 2 | GM editor correctness | P-01 done; re-verify post-ARCH |
| 3 | Invite + identity hardening | P-07/17/18 done; token claim → ARCH-03 |
| 4 | `peerScan` | Open — P-02 |
| 5 | QoL polish | Backlog |
| 6 | UI redesign (`AdminCockpitPage`) | Superseded by `GameMakerHomePage` + player detail |

UI redesign intent (2026-06): GM player list as primary view, per-player detail with customize/analytics — **achieved** in current pages; ARCH renames hire → player and adds resource library tab.
