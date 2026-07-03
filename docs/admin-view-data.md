# Game Maker (Admin) View — Data & Architecture

> Rewritten 2026-07-01 against the actual codebase (previous version described
> `AdminCockpitPage.tsx`, a single-cockpit architecture that no longer exists).
> Everything below was verified by reading the current source, not inferred
> from the old doc.

## 0. Naming inconsistency — read this first

The user in this role is called **five different things** in five different
places in the codebase. None of these are typos; they're layers that
accumulated as the architecture evolved from "one admin, one session" to
"one Game Maker, many hire sessions." You specifically asked this be
flagged, so here's the full inventory:

| Form | Where it appears | Example |
|---|---|---|
| `admin` | Route paths, page/component/folder names, hook mode string | `/admin/:sessionId`, `AdminHomePage.tsx`, `components/admin/`, `useProgressAdmin`, `mode: "admin"` |
| `gamemaker` (one word, lowercase) | The actual `UserRole` enum value; the `role` option string threaded through `useSession`/`useBuddyProfile`/`useResources` | `USER_ROLE.GAMEMAKER = "gamemaker"`, `useSession(sid, { role: "gamemaker" })` |
| `Game Master` | `TopBar`'s `role` prop, hardcoded in every GM-facing page — rendered as a visually-hidden `<span>` (screen-reader-only accessible name, not visible on screen) | `<TopBar role="Game Master" />` in `AdminHomePage.tsx`, `HireDetailPage.tsx`, `QRScannerView.tsx`, `ValidationPage.tsx` |
| `Game Maker` | Error copy, code comments, this project's own `CLAUDE.md` | `useLandingFlow.ts`: *"Ask your Game Maker for a new one"*; `gmHires.ts` doc comment: *"owned by the Game Maker"* |
| `GM` (abbreviation) | Hook/variable/type names | `useGmHires`, `GmHireRow`, `gmUid`, `currentAdminUid` (mock adapter — itself inconsistent, calls it "admin" mid-implementation), `simulateGmApproval` |

There is no single source of truth for what to call this role. The most
consequential split is **`admin` vs `gamemaker`**: the enum value is
`"gamemaker"`, but every route, folder, and the still-live
`useProgressAdmin`/`admin.ts` hook say `admin`. A reader has to already know
they're the same concept — nothing in the code declares that equivalence
explicitly. Picking one term (this project's own docs lean "Game Maker") and
doing a project-wide rename would remove a real source of confusion for
anyone joining the project, human or AI agent.

## 1. Routes

| Path | Component | Guard |
|---|---|---|
| `/` | `LandingPage` (admin-create form + recovery, shared with player) | none |
| `/admin/:sessionId` | `AdminHomePage` | `RequireRole(GAMEMAKER)` |
| `/admin/:sessionId/hire/:hireId` | `HireDetailPage` | `RequireRole(GAMEMAKER)` |
| `/admin/:sessionId/scan` | `QRScannerView` | `RequireRole(GAMEMAKER)` |
| `/validate/:sessionId?t=<token>` | `ValidationPage` | **none** (see §3.4) |

**Correction to the previous `player-view-data.md`:** `ValidationPage` and
`QRScannerView` are Game-Maker-facing, not player-facing. The player never
navigates to `/validate/...` — they display a QR code (`QRDisplay.tsx`,
rendered inside their own mission popup) and the *Game Maker's own device*
scans it via `QRScannerView`, which decodes the token and navigates the GM's
browser to `/validate/:sessionId`. The previous doc's inclusion of
`ValidationPage` under player pages was wrong; it's fixed here and removed
from `player-view-data.md`.

## 2. The "hire" model (the multi-player-per-GM architecture)

There is **no dedicated data model for "a Game Maker's roster."** A Game
Maker's home session and every "hire" they create are the exact same
PocketBase collection: `sessions`. Ownership is a raw string match, not a
relation:

```ts
// Session (src/types/domain.ts)
readonly gameMakerId: string; // raw UID string, not a PB relation
```

- **Home session** — created once at signup (`createGameMakerSession` in
  `use-cases/joinSession.ts`), `gameMakerId = own uid`. The GM's own identity
  (`CachedIdentity.sessionId`) points at this session. This is the id in
  `/admin/:sessionId`.
- **Hire session** — created via `AdminHomePage`'s "Add new hire" button,
  which calls `useGmHires().createHire(name)` → `adapter.createSession(name,
  gmUid)`. Same collection, same `gameMakerId` field, pointing at the *same*
  GM uid. This is the id in `/admin/:sessionId/hire/:hireId` — `hireId` in
  the URL is a *different session id* than `sessionId`, not a child record of
  it.

**How the hire list is built** (`useGmHires`,
`hooks/useProgress/gmHires.ts`): `adapter.listSessions()` fetches *every*
session in the database, then filters client-side for `s.gameMakerId ===
gmUid`. There is no server-side query — a PocketBase filter on
`gameMakerId` would do the same job without shipping every other GM's
sessions to the client on every hire-list load. This works today only
because the dataset is small; it doesn't scale, and because the `sessions`
collection has fully public API rules (`004_public_api_rules.go`), every
browser can currently list every GM's sessions regardless of ownership.
Nothing enforces `gameMakerId` server-side.

**Cardinality assumption baked in but only half-enforced:** `useGmHires`
takes `players[0] ?? null` per hire session — i.e. "one hire session, one
real player" is assumed everywhere a hire is displayed. But the underlying
`useProgressAdmin` hook (still used by `HireDetailPage` for the single hire
being viewed) is written for a *list* of players with a `selectedPlayerId`
dropdown — `handlePlayerSelect`, a `players` array, "auto-select the first
on load." The UI hides this: `HireBuddyTab` passes `showPlayerSelect={false}`
to `BuddyAssignmentForm`, so the multi-player affordance is deliberately
switched off, not removed. This is a leftover from the pre-refactor
single-session multi-player architecture (see §6) — `useProgressAdmin` is
solving a more general problem than the current UI ever exercises.

## 3. Pages and their data flow

### 3.1 `AdminHomePage.tsx` (`/admin/:sessionId`) — the hire list

- Identity: `useActiveProfile(sid, GAMEMAKER)` — must match a locally cached
  identity with this exact `sessionId` (the GM's *home* session).
- Data: `useGmHires(identity?.uid, true)` — for each owned session, fetches
  `listPlayers`, `listMilestones`, `listMissions`, and (if a player exists)
  `listProgressEvents`, then runs the shared `computeProgress()` use-case to
  derive a `progressPercent` per hire. **Every hire card on this page
  re-runs the full progress computation on every page load** — there is no
  cached/stored progress percentage anywhere (consistent with the project's
  "progress is never snapshotted" rule, but worth knowing it's
  O(hires × missions) client-side work on every visit).
- "Add new hire" → `createHire(name)` → `adapter.createSession(name, gmUid)`
  → navigates to `/admin/:sessionId/hire/:newHireId?new=1`.
- Only hires with `joined === true` (i.e. `players[0]` exists) are shown;
  pending/unclaimed hires are silently filtered out of the list entirely,
  including from the "N active" count. A GM who created a hire and hasn't
  sent the invite yet, or whose invite hasn't been claimed, sees nothing
  differentiating "no hires" from "hires waiting to be joined."

### 3.2 `HireDetailPage.tsx` (`/admin/:sessionId/hire/:hireId`) — per-hire cockpit

Composed by `useHireDetailPage.ts`, which fans out to per-tab hooks. Four
tabs (`hire-detail/constants.ts`):

| Tab | Component | Backing hook(s) |
|---|---|---|
| Analytics | `HireAnalyticsTab.tsx` | `useProgressAdmin` (approve/reject, pending list), `computeProgress` (via the hook) |
| Customize | `HireCustomizeTab.tsx` | `useAdminMilestoneEditor`, `useAdminMissionEditor`, `useHireTemplates`, `useResources`, `useSession(role: "gamemaker")` |
| Assign Buddy | `HireBuddyTab.tsx` | `useBuddyProfile(sid, playerId, { role: "gamemaker" })` |
| Pre-boarding | `HirePreboardingTab.tsx` | `usePreBoardingChecklist(sid, session)` |

Session data (`session`, `milestones`, `missions`) is loaded once at the
`useHireDetailPage` level via `useSession(hireId, { role: "gamemaker" })` and
passed down to all four tabs — they don't each fetch independently.

**Analytics tab data flow:** `useProgressAdmin({ sid: hireId, milestones,
missions, validatorUid: identity.uid })` fetches `listPlayers(hireId)`
(auto-selects `players[0]`), then `listProgressEvents` for every player
found, and derives `selectedPlayerProgress` via `computeProgress()`.
`pendingEvents` (status `pendingApproval`) render in
`PendingApprovalsPanel`; Approve calls `adapter.upsertProgressEvent(playerId,
missionId, { status: "completed", validatedBy: gmUid })`, Reject resets
`status` back to `"pending"`. Both re-fetch that player's full event list
afterward rather than patching local state optimistically.

**Customize tab data flow:** milestones/missions are edited as **local
draft state** (`useAdminMilestoneEditor`/`useAdminMissionEditor`), not
persisted until "Save changes." `useHireDetailPage.handleSave()` calls
`milestoneEditor.saveMilestones()` then `missionEditor.saveMissions()` in
sequence, then clears all dirty flags and calls `refreshSession()`. Mission
XP is derived via `deriveXP()` at save time — not editable directly, only
via `difficulty`. Form-schema upserts for `type: "form"` missions happen in
the same `saveMissions()` pass, keyed off the mission id returned by
`createMission()` for brand-new drafts (this is the create-time bug fixed
earlier today — see `project_messebuddy_production_audit_part2` memory).

Templates (`useHireTemplates`) let a GM apply a canned milestone/mission/
resource bundle to a hire, or save the current hire's setup as a new
reusable template — stored in the `templates` PB collection as a single
JSON blob (`TemplateExport`), not as normalized rows.

**Buddy tab:** a single-player form (`showPlayerSelect={false}`) against
`useBuddyProfile`, which upserts a `buddy_profiles` row keyed by
`assignedToPlayerId`. Silently no-ops (per the earlier smoke-test audit) if
no player has joined yet — no user-visible feedback either way.

**Pre-boarding tab:** the checklist is **not its own collection** — it's a
JSON array (`PreBoardingCheckItem[]`) stored directly on the `Session`
record's `preBoardingChecks` field, mutated via `updateSession()`. This
keeps the mock/PB shapes trivially identical (see §4), but means checklist
items have no independent `id`/`created`/`updated` metadata, no per-item
history, and every checkbox toggle rewrites the entire array back through
`updateSession()`.

### 3.3 `QRScannerView.tsx` (`/admin/:sessionId/scan`)

Pure camera → decode → redirect. `CameraFeed` hands a scanned string to
`parseValidationToken()`; on success, navigates straight to
`/validate/:hireSessionId?t=<token>` — this page holds no session/player
data itself beyond the `identity` used for the TopBar label.

There's also a **dev-only "Simulate Scan"** path
(`useQRScanContext.buildSimulateScanUrl()`, wired into
`AdminQRScannerModal.tsx`) that fabricates a valid signed QR payload for the
first player and first `qr`-validated mission it finds, without a camera —
useful for testing, worth knowing it exists so it isn't mistaken for a
security hole (it's dev tooling gated behind the modal, not exposed to
players).

### 3.4 `ValidationPage.tsx` (`/validate/:sessionId?t=<token>`)

Fixed earlier today (see `project_messebuddy_production_audit_part2`
memory). Not wrapped in `RequireRole` because the URL's `sessionId` is the
*hire's* session, which never equals a GM's home-session identity. Instead:
`useValidationConfirm` decodes the HMAC-signed token (`qrPayload.ts`, secret
= `session.qrSecret ?? sessionId`), resolves the hire's
`session.gameMakerId`, and the page cross-checks that against every locally
cached identity to find one matching GM whose `role === GAMEMAKER`. If none
match, an explicit "not authorized" panel is shown instead of silently
bouncing to `/` (the old, broken behavior).

Confirm writes `upsertProgressEvent(playerId, missionId, { status:
"completed", validatedBy: gmUid })` — same single write-path as everything
else in the app (C-05).

**Known unfixed gap (flagged, not yet resolved):** on success,
`goToAdmin()` navigates to `/admin/${hireSessionId}`, but that route expects
the GM's *home* session, not the hire's — it will bounce via `RequireRole`.
The QR write itself is unaffected; this is purely a post-confirm redirect
target bug. Fixing it needs a decision on where the GM's home-session id
should come from at this point (it isn't currently threaded anywhere on
this page).

## 4. Mock data shape parity — verified, not assumed

You asked me to verify that mock data has the exact same shape as real
PocketBase data, differing only in storage/loading. Confirmed:

- Both adapters implement the single `AppAdapter` interface
  (`adapters/interface.ts`) — TypeScript enforces identical method
  signatures and return types for both.
- `mockData.ts` seeds plain `Session`/`Player`/`Milestone`/etc. objects — the
  *same* domain types from `types/domain.ts` that `pbAdapter`'s
  `parsers.ts` marshals real PB records into (e.g. `marshalSession` builds
  exactly a `Session`, field-for-field matching `MOCK_SESSION`'s shape).
- The one real difference: `parsers.ts` unmarshal's PB's raw JSON-string
  fields (`preBoardingChecks`, `skillsConfident`, `tags`, `formResponse`,
  etc. are stored as JSON strings in PocketBase and parsed via
  `parseJsonField()`), while the mock data is authored as native JS
  arrays/objects directly. That parsing step is the entire difference — the
  shape both sides expose to components is identical.
- This confirms the "swap the adapter, nothing else changes" design
  actually holds today, for both roles.

## 5. Adapter → PocketBase collection map (GM-relevant calls)

| Hook / use-case | Adapter method | PB collection |
|---|---|---|
| `useGmHires` | `listSessions`, `listPlayers`, `listMilestones`, `listMissions`, `listProgressEvents` | `sessions`, `players`, `milestones`, `missions`, `progress_events` |
| `useProgressAdmin` | `listPlayers`, `listProgressEvents`, `upsertProgressEvent` | `players`, `progress_events` |
| `useAdminMilestoneEditor` | `createMilestone`, `updateMilestone`, `deleteMilestone` | `milestones` |
| `useAdminMissionEditor` | `createMission`, `updateMission`, `deleteMission`, `upsertFormSchema` | `missions`, `form_schemas` |
| `useSession(role: gamemaker)` | `getSession`, `updateSession` (incl. `bgImageUrl` file upload, `preBoardingChecks`) | `sessions` |
| `useBuddyProfile` | `getBuddyProfile`, `upsertBuddyProfile` | `buddy_profiles` |
| `useResources` | `listResources`, `createResource`, `updateResource`, `deleteResource` | `resources` |
| `useHireTemplates` | `listTemplates`, `saveTemplate` | `templates` |
| `useValidationConfirm` / QR flow | `getSession`, `getPlayerById`, `listProgressEvents`, `upsertProgressEvent` | `sessions`, `players`, `progress_events` |

All collections carry fully public API rules (`004_public_api_rules.go`) —
no auth-based access control exists anywhere; every "authorization" check in
this app (`RequireRole`, `ValidationPage`'s GM match) is a client-side
convenience against locally cached identity, not a security boundary. Worth
being explicit about since it's easy to misread `RequireRole` as a real
guard.

## 6. Oddities / dead code found while writing this doc

Verified via grep — not imported anywhere outside their own file:

- **`components/admin/PlayerSelectorDropdown.tsx`** — orphaned.
- **`components/admin/MilestoneSidebarEditor.tsx`** — orphaned (superseded
  by `MilestoneMapEditor.tsx` + `MilestoneGrid.tsx`, used in
  `HireCustomizeTab`).
- **`components/admin/PlayerProfileCard.tsx`** — orphaned.
- **`components/admin/AdminMissionsList.tsx`** — orphaned.
- **`hooks/useProgress/crossHire.ts`** (`useProgressCrossHire`) — exported
  from `useProgress/index.ts` but has zero consumers anywhere in
  `src/pages` or `src/components`. This was almost certainly the data
  source for the old `CrossHireDashboard.tsx` (referenced in the previous
  version of this doc) that no longer exists. Its job — "all hires in one
  dashboard" — is now done inline and independently inside `useGmHires`,
  with different (simpler, per-row) math. Safe to delete unless a planned
  dashboard view needs it.

These four components plus one hook are pure removal candidates — nothing
depends on them today. Leaving them in place costs nothing at runtime but is
a real maintenance/comprehension tax on anyone (human or agent) grepping
`components/admin/` to understand what's actually live.

## 7. Open items carried over from the production audit (2026-07-01)

Not new to this doc, but relevant to "what's still rough" in this view:
- GM identities have **no recovery mechanism** — `recoverIdentity.ts` only
  looks up players (`getPlayerByRecoveryKey`); there is no equivalent
  adapter method or use-case for GMs. A GM who clears `localStorage` loses
  access to every hire they've created, permanently, with no recovery path.
- Post-confirm redirect bug in `ValidationPage.goToAdmin()` (§3.4).
