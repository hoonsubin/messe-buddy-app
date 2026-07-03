# Player View — Data & Architecture

> Rewritten 2026-07-01 against the actual codebase. Structurally this doc
> holds up better than `admin-view-data.md` did — the player pages
> themselves haven't been re-architected — but one page was misfiled (see
> §0) and the page components have since been split into subfolders that
> weren't documented before.

## 0. Correction: `ValidationPage` is not a player page

The previous version of this doc listed `ValidationPage` as one of four
player-facing pages, tagged "GameMaker (confirm)" in its own table — which
already contradicted the "player-facing" framing. It's fully moved to
`docs/admin-view-data.md` §3.4 now. To be precise about why: the player
never visits `/validate/:sessionId`. The player's device only ever *shows* a
QR code (`QRDisplay.tsx`); the Game Maker's device scans it and is the one
that navigates to `/validate/...`. Every identity check, TopBar label
(`role="Game Master"`), and redirect target on that page assumes a Game
Maker is looking at it. There are genuinely **three** player-facing pages,
not four.

## 1. Routes

| Path | Component | Guard | Purpose |
|---|---|---|---|
| `/` , `/join/:sessionId` | `LandingPage` | none | Identity selection, join, recovery (shared with GM's "create session" form) |
| `/session/:sessionId` | `PlayerCockpitPage` | `RequireRole(PLAYER)` | Dashboard — milestone map, current missions, buddy card, resources, AI chat, tutorial |
| `/form/:sessionId/:missionId` | `FormPage` | `RequireRole(PLAYER)` | Dedicated form-filling page for `MISSION_TYPE.FORM` missions |

**Key distinction from the GM view (still accurate):** players are
**read-only consumers** of session config, milestones, missions, resources,
and buddy profiles. Their only writes are `upsertProgressEvent` (self-
approve, request-approval, form submission) and `updatePlayer` (profile
fields, tutorial-complete flag). They never mutate session structure,
create/edit milestones or missions, manage resources, or touch templates.

## 2. Page structure

### 2.1 `LandingPage.tsx` + `pages/landing/*`

`LandingPage.tsx` was split into subcomponents since the previous doc:
`LandingShell.tsx` (layout), `ProfileList.tsx`/`ProfileCard.tsx` (cached
identities), `EmployeeForm.tsx`, `AdminForm.tsx`, `RecoverySection.tsx`, and
`landingUtils.ts`. All state and handlers live in `useLandingFlow.ts` — the
subcomponents are presentational only.

No adapter data is fetched proactively on this page; every action is a
single explicit call:

| User action | Use-case | Adapter call |
|---|---|---|
| "Verify session" (employee, step 1) | `verifySession()` | `adapter.getSession(code)` |
| "Join" (employee, step 2) | `joinSession()` | `adapter.createPlayer(data)` |
| "Create" (GM path) | `createGameMakerSession()` | `adapter.createSession(name, uid)` |
| "Recover" (key only) | `recoverIdentity()` | `adapter.getPlayerByRecoveryKey(key)` — **players only**, see §5 |
| `/join/:sessionId?token=<t>` (auto-claim on mount) | `claimPlayerSlot()` | `adapter.getPlayerByInviteToken(token, sessionId)` then `adapter.updatePlayer(...)` |

Two demo profiles (`DEMO_PROFILES` in `useLandingFlow.ts`) are seeded into
`localStorage` on first mount if not already present: Sofia Chen (player,
`sess_mmt2026`) and Peter Tubak (Game Master, same session — note this is
the one case where a GM's home session and a "hire" session are literally
the same record, which is why the pre-fix QR bug never surfaced in the demo
data — see `admin-view-data.md` §3.4).

### 2.2 `PlayerCockpitPage.tsx` + `pages/player-cockpit/*`

Also split since the previous doc: `PlayerCockpitToolbar.tsx`,
`PlayerDashboardView.tsx`, `constants.ts` (tab keys + the
`TUTORIAL_FORM_KEY` sessionStorage key), and the real logic in
`usePlayerCockpitPage.ts`.

Composition, in fetch order:
1. `useActiveProfile(sessionId, PLAYER)` — identity from `localStorage`,
   exact-match on session + role.
2. `useResolvedPlayer(identity.uid)` → `adapter.getPlayer(uid)` — resolves
   the cached uid to the canonical `Player` record. (Mock adapter treats an
   empty-string uid as "not found" by design — that's the sentinel for an
   admin-seeded, not-yet-claimed player slot; see `mockData.ts`'s
   `player_sarah_k`.)
3. `useSession(sessionId)` → `getSession`, `listMilestones`, `listMissions`.
4. `useProgressPlayer({ playerId, milestones, missions })` →
   `listProgressEvents(playerId)`, then derives `PlayerProgress` client-side
   via the shared `computeProgress()` use-case — same function the GM side
   uses, so player and GM views of "how far along is this hire" can never
   drift out of sync with each other; they're the same computation over the
   same source events.
5. `useBuddyProfile(sessionId, playerId, { role: "player" })` →
   `getBuddyProfile`.
6. `useResources(sessionId, { role: "player" })` → `listResources` (filtered
   to `isVisibleToPlayer: true` — the visibility toggle the GM controls).
7. `useTutorial(...)` — first-run walkthrough, gated on
   `player.tutorialComplete`; demo players always replay it
   (`tutorialPlayer` override forces `tutorialComplete: false` for demo
   identities specifically, so the tutorial can be re-demoed without
   mutating the seeded record).
8. `useChat(aiAppContext)` — the AI assistant, given a small app-context
   block (player's preferred name, buddy name/role/contact) injected as a
   system-level trusted-facts string, separate from anything the player
   types.

Clicking a mission: if `type === "form"` and not yet completed, navigates to
`/form/:sessionId/:missionId`; otherwise opens `MissionDetailPopup` in
place. Self-approve / request-approval / QR display all happen from this
popup without leaving the page.

### 2.3 `FormPage.tsx`

Re-resolves the same three things independently rather than receiving them
from the cockpit (`useActiveProfile`, `useResolvedPlayer`, `useSession`,
`useProgressPlayer`) — this is a separate route, so there's no shared
component state to inherit; each is a fresh fetch on mount. Form-specific
logic lives in `useFormMission(sessionId, missionId, missions, { player,
updatePlayer, markAutoApproved })`, which:
- Fetches the `FormSchema` for the mission (`getFormSchema`).
- Pre-fills `initialValues` from any admin-seeded data on the player record
  (the code comment marks this `PLR-1` — pre-loaded recovery/profile
  values for admin-created slots).
- On submit: writes the form response via `markAutoApproved(missionId, {
  formResponse })`, i.e. `upsertProgressEvent(..., { status:
  "autoApproved", formResponse })`, then (per the app's C-06 constraint)
  form missions are always auto-approved — there is no GM review step for
  form submissions, unlike QR/self-approve/gmApprove missions which can
  land in `pendingApproval`.
- "Save for later" only toggles local `isDraft` UI state — nothing is
  persisted; closing the tab loses draft input. There's no partial-form
  autosave.

## 3. QR display (player side) — the other half of the validation flow

`QRDisplay.tsx`, rendered inside `MissionDetailPopup` for `qr`-validated
missions: encodes `{ playerId, missionId, sessionId, xpValue, issuedAt
}` via `encodeQRPayload()` (HMAC, secret = `session.qrSecret ?? sessionId`),
builds a validation URL (`buildValidationUrl`), and renders it as a QR
canvas. It also opens a live subscription
(`useWatchMission(playerId).watchMission(missionId, ...)`) so that once a
Game Maker scans and confirms the code elsewhere (`ValidationPage`, a
different device entirely), this popup updates in real time without the
player refreshing — this is the one place player-side code reacts to a
write it didn't make itself. Confirms the "GM scans; player never writes
via QR" split (C-07) still holds structurally.

## 4. Mock data shape parity

Verified in `admin-view-data.md` §4 — same `AppAdapter` interface, same
domain types on both sides, only the JSON-string-vs-native-object
marshaling in `parsers.ts` differs. Applies identically here; not
re-verified separately since this is a properties of `types/domain.ts` and
the adapter contract, not something specific to the player role.

## 5. Adapter → PocketBase collection map (player-relevant calls)

| Hook / use-case | Adapter method | PB collection |
|---|---|---|
| `useLandingFlow` | `getSession`, `createPlayer`, `getPlayerByRecoveryKey`, `getPlayerByInviteToken`, `updatePlayer` | `sessions`, `players` |
| `useResolvedPlayer` | `getPlayer`, `updatePlayer` | `players` |
| `useSession` | `getSession`, `listMilestones`, `listMissions` | `sessions`, `milestones`, `missions` |
| `useProgressPlayer` | `listProgressEvents`, `upsertProgressEvent`, `subscribeProgressEvent` | `progress_events` |
| `useBuddyProfile(role: player)` | `getBuddyProfile` | `buddy_profiles` |
| `useResources(role: player)` | `listResources` | `resources` |
| `useFormMission` | `getFormSchema` | `form_schemas` |

## 6. Constraints (verified still accurate)

Carried over from the previous doc and re-checked against current source —
still true:
- **C-03** — no auth system; all identity is client-cached, all API rules
  public (confirmed via `004_public_api_rules.go`, all collections open).
- **C-05 / C-14** — every progress write goes through the single
  `upsertProgressEvent()` path, keyed `${playerId}::${missionId}` in the
  mock adapter, unique-indexed the same way in PB
  (`idx_player_mission`, added in `003_hardening.go`).
- **C-06** — form missions are always `autoApproved`, no GM review step.
- **C-07** — QR validation is offline/local from the player's perspective;
  the player never writes anything via the QR flow, only displays a token.
- **C-08** — milestone `xPercent`/`yPercent` are percentage-based canvas
  positions, not pixel coordinates.
- **C-11** — progress is never snapshotted; `computeProgress()` re-derives
  it from live mission/milestone/event data on every read, for both player
  and GM views.
- **C-12** — no TypeScript enums anywhere; `const` object + `keyof` pattern
  throughout `types/unions.ts` (`USER_ROLE`, `MISSION_TYPE`,
  `VALIDATION_METHOD`, etc.).
- **C-13** — raw-PB-string JSON parsing is centralized in
  `adapters/pocketbase/parsers.ts`; components never see
  `FormSchemaRaw`/`ProgressEventRaw`.
- **C-18** — ESLint (`no-restricted-imports`) blocks direct `useAdapter`/
  `AppAdapter` imports under `src/pages/**` and `src/components/**` — access
  is hooks-only, enforced at lint time, not just convention.
- **C-20** — SSE-style live updates live in the adapter
  (`subscribeProgressEvent`); `useWatchMission` is the only sanctioned
  component-facing boundary for it (used by `QRDisplay`).

## 7. What changed since the previous version of this doc

- `ValidationPage` removed from this doc (§0) — it's a Game Maker page.
- `LandingPage` and `PlayerCockpitPage` are now composed from
  `pages/landing/*` and `pages/player-cockpit/*` subfolders respectively;
  the previous doc referenced them as flat single files.
- No change to the underlying player data-flow logic itself — the hooks
  this doc's tables reference (`useResolvedPlayer`, `useProgressPlayer`,
  `useBuddyProfile`, `useResources`, `useFormMission`) are unchanged in
  behavior from what the old doc described, only regrouped into subfolders.
