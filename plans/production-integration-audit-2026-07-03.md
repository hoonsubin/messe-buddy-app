# Production Integration Audit — MesseBuddy (2026-07-03)

**Date:** 2026-07-03
**Method:** Playwright smoke test against the live stack at `http://localhost:8700/` (real PocketBase, real container build — not the Vite dev server), with source reads to confirm root cause on every item. Every finding below was reproduced live, not inferred.
**Scope:** Functional gaps only — where the UI describes or implies a capability that isn't actually implemented or wired up. Security/auth hardening is explicitly out of scope (intranet-only deployment, no sensitive data, per product decision). The AI assistant backend is known to be temporarily unavailable; it's included only for the one UI-affordance gap that's independent of the backend being up.
**Supersedes:** Confirms two items from `plans/production-integration-audit-2026-07-01.md` are still open (§4, §7 below) and two are now fixed (see "Fixed since 07-01" at the bottom).

Each item below is a standalone task — check it off as it's fixed and verified live.

---

## Task list

- [ ] 1. Buddy assignment silently discards input when no player has joined
- [ ] 2. No Settings screen exists, but the app tells players one does
- [ ] 3. Mission editor's "XP value" chip does not set the XP the player receives
- [ ] 4. "Suggested next step" falsely claims completion on empty hires
- [ ] 5. Invite link is a shared join URL, not a single-recipient invite
- [ ] 6. Orphaned/stale identities fail silently instead of surfacing an error
- [ ] 7. Session-code join fails for codes the UI itself displays
- [ ] 8. Post-QR-confirm navigation strands the Game Maker
- [ ] 9. AI Assistant tab gives no upfront signal it's unavailable

---

## 1. Buddy assignment silently discards input when no player has joined

**Problem statement:** On a hire's "Assign Buddy" tab, a Game Maker can fill in buddy name, role, tenure, and contact URL, and click "Save buddy assignment." If no player has joined that hire yet, the save is a complete no-op — no error, no success confirmation, no disabled state on the button. The GM has no way to know the data wasn't saved.

**Repro:** Create a new hire → don't invite/join a player → go to Assign Buddy tab → fill all four fields → click Save. Confirmed via direct API check immediately after: `GET /api/collections/buddy_profiles/records?filter=sessionId="<id>"` returns `totalItems: 0`.

**Root cause:** `src/hooks/useBuddyProfile.ts`, `upsertBuddy()`:
```ts
const upsertBuddy = useCallback(async () => {
  if (!playerId) return;
  ...
```
Returns immediately if `playerId` is empty. `src/components/admin/BuddyAssignmentForm.tsx` has no knowledge of this precondition and always renders an active "Save buddy assignment" button.

**Expected outcome:** One of two acceptable fixes — either disable the Save button and show inline copy ("Buddy can be assigned once a player has joined") until `playerId` exists, or decouple buddy assignment from `playerId` so it can be saved against the hire/session and attached to the player once they join. Definition of done: filling the form and saving on a hire with no player either visibly blocks with an explanation, or actually persists and is visible once a player joins.

---

## 2. No Settings screen exists, but the app tells players one does

**Problem statement:** The onboarding tutorial's skip-confirmation dialog reads: *"You can always complete the tutorial later from settings."* There is no settings route anywhere in the app. The only element that looks like an entry point — the avatar/"Edit profile" button in the player top bar — is permanently disabled everywhere it appears.

**Repro:** Join as a player → dismiss the "Let's start" tutorial via Skip → confirm dialog reads "from settings" → no settings link exists on Dashboard or AI Assistant tabs → the avatar button top-left is disabled in every screenshot taken this session.

**Root cause:** `src/components/shared/TopBar.tsx`:
```tsx
aria-label="Edit profile"
onClick={props.onAvatarClick}
disabled={!props.onAvatarClick}
```
No page in the app currently passes `onAvatarClick`, so the button is unconditionally disabled. No settings page/route exists in `App.tsx`.

**Expected outcome:** Either build a minimal settings surface (at minimum: replay tutorial, maybe recovery key display) and wire the avatar button to it, or remove the "from settings" claim from the tutorial copy and remove/hide the disabled avatar button until the feature exists. Definition of done: the app never references a screen that doesn't exist, and any visible-but-disabled affordance is either removed or has a clear reason for being disabled.

---

## 3. Mission editor's "XP value" chip does not set the XP the player receives

**Problem statement:** When a Game Maker creates a mission, the editor shows an "XP value" selector with Fibonacci chips (1, 2, 3, 5, 8, 13, 21, 34). This reads as "this mission is worth N points." It isn't. The number picked is a relative difficulty weight; the actual XP awarded to the player is derived by normalizing all missions in a milestone so they sum to the milestone's fixed 100-point threshold. The GM never sees the real number, before or after saving.

**Repro:** Created a mission with the default "1" chip selected (never touched) in a milestone with no other missions. Checked the persisted record via API: `xpValue: 100`. The player-facing mission card and "Current Missions" list both display "100 XP" — nowhere does the editor show this derived value while the GM is setting it up.

**Root cause:** `src/hooks/useAdminMissionEditor.ts` computes the real value via `deriveXP(allMissions)` at save time; the editor UI (`src/components/shared/XpSelector.tsx`) only ever renders and edits the raw Fibonacci `difficulty` input, aria-labeled "XP value."

**Expected outcome:** Either relabel the selector to reflect what it actually is ("Relative weight" / "Difficulty") and show the derived XP value live next to it as a preview, or change the field to directly set XP and derive difficulty for internal sorting instead. Definition of done: what the GM sees while editing a mission's point value matches what the player actually receives.

---

## 4. "Suggested next step" falsely claims completion on empty hires

**Problem statement:** A brand-new hire with zero milestones and zero missions shows "All tasks complete 🎉" under "Suggested next step for [Name]" on the Analytics tab — before any onboarding content has been configured at all.

**Repro:** Create a new hire, go straight to Analytics tab without adding any milestones/missions. Widget reads "All tasks complete 🎉" at 0 days / 0% progress. Confirmed this is a genuine empty-state bug, not the correct message, by later adding and completing one real mission on the same hire — the widget showed the identical text for a genuinely-100%-complete hire, meaning the "nothing configured" and "everything finished" states are currently indistinguishable.

**Root cause:** Not yet isolated to a specific file this session — likely a division/fallback in the "next step" derivation that defaults to the completed branch when there are zero missions to iterate. Needs a source read of whatever hook powers the Analytics tab's "Suggested next step" card before fixing.

**Expected outcome:** A hire with no missions configured shows something like "No missions set up yet — add some in the Customize tab," distinct from genuine 100% completion. Definition of done: the two states render different, correct copy.

---

## 5. Invite link is a shared join URL, not a single-recipient invite

**Problem statement:** "Send [Name] their onboarding link" frames the generated link/QR as personal to that hire. In reality it's a plain shared join URL with no per-invite token — anyone who has it can join as a new, distinct player in that hire's session. The rest of the admin UI (hire detail, analytics, buddy assignment) assumes exactly one player per hire.

**Repro:** Confirmed live: the generated URL was `http://localhost:8700/join/<sessionId>` with no `?token=` parameter. Source has a fully-built, wired token/claim mechanism (`generateInviteToken`, `claimPlayerSlot`, the `?token=` auto-claim effect in `useLandingFlow.ts`) that the actual invite button (`SessionInviteCard.tsx`) never calls.

**Root cause:** `SessionInviteCard.tsx` builds `${origin}/join/${sessionId}` directly instead of calling `buildInviteUrl(sessionId, token)` with a token minted via `generateInviteToken()`.

**Expected outcome:** Decide one of two directions and implement it: (a) wire the invite button to the existing token/claim flow so the link is genuinely single-use, or (b) if a shared link is actually fine for this use case, delete the dead token/claim code instead of leaving two parallel, half-connected mechanisms. Definition of done: exactly one invite mechanism exists, and it matches what the UI copy promises.

---

## 6. Orphaned/stale identities fail silently instead of surfacing an error

**Problem statement:** Locally saved profiles that point at a session no longer present in PocketBase (e.g. after a DB reset/rebuild) resume into a normal-looking, empty "0 active hires" or blank cockpit screen — with no indication that the underlying account/session is actually gone.

**Repro:** Confirmed live: resuming a saved "Peter Tubak" admin profile whose session ID 404s against the current PocketBase (`GET /api/collections/sessions/records/<id>` → 404) lands cleanly on "No new hires yet. Add your first one to start their onboarding." — indistinguishable from a legitimately fresh account.

**Root cause:** No error branch is surfaced when the session fetch 404s; the page just renders its normal empty state.

**Expected outcome:** Detect a 404 on the session fetch specifically (vs. "zero hires") and show something like "This session could not be found. Remove this profile?" instead of silently rendering an empty dashboard. Definition of done: a stale profile is visibly distinguishable from a real empty account.

---

## 7. Session-code join fails for codes the UI itself displays

**Problem statement:** The landing page's "enter a session code" flow does an exact-ID lookup against PocketBase. The demo session code shown one line above it on the same screen (and other codes visible in the saved-profiles list) all 404 against the real backend, because they're either mock-only IDs or point at sessions no longer in the current database.

**Repro:** Confirmed live: entering `sess_mmt2026` (visible on-screen as Sofia Chen's/Peter Tubak's demo session) into "Session code" → Verify → "Session not found." Same result for a previously-real session ID (`tfvvvop33i61cuf`) that no longer exists in the current PocketBase instance.

**Root cause:** `handleVerifySession` in `src/hooks/useLandingFlow.ts` calls `adapter.getSession(sessionCode)`, an exact record-ID lookup with no fallback or friendlier error distinguishing "never existed" from "was reset." This item was flagged in the 2026-07-01 audit and remains open — the demo/mock session IDs are inherently never going to resolve against real PocketBase, which is expected, but the confusing part is that the UI shows them as if they're valid example codes.

**Expected outcome:** At minimum, stop using a live demo/mock session ID as the input's placeholder example (it invites exactly this confusion). Ideally, also handle the "was reset" case with clearer messaging than "Session not found." Definition of done: the placeholder/example text shown to a real user doesn't reference a code that will never resolve.

---

## 8. Post-QR-confirm navigation strands the Game Maker

**Problem statement:** After a Game Maker successfully scans and confirms a QR validation, the "back to admin" action sends their device to the wrong route and bounces them out to the public landing page.

**Repro:** Confirmed unchanged in current source (same line flagged in the 2026-07-01 follow-up audit): `src/pages/ValidationPage.tsx`, `goToAdmin()` still calls `navigate(\`/admin/${sid}\`, { replace: true })` using the hire's own session ID, not the GM's home session ID. That route's `RequireRole` guard expects the GM's home session, so it redirects to `/`. The QR write itself is unaffected — this is navigation only.

**Root cause:** `ValidationPage` has no way to know the GM's home session ID; it only has the hire's session ID from the QR payload/URL.

**Expected outcome:** Thread the GM's home session ID to `ValidationPage` (via the QR payload, a lookup on `gameMakerId`, or similar) so `goToAdmin()` lands back on the GM's actual admin home instead of bouncing to the landing page. Definition of done: completing a QR scan and tapping back returns the GM to their hire list, not the public landing page.

---

## 9. AI Assistant tab gives no upfront signal it's unavailable

**Problem statement:** The AI Assistant tab renders as a fully live chat interface — suggested-question chips, an active Send button — with no indication anywhere that the backend is down. A user only discovers it doesn't work by sending a message and getting a generic error.

**Repro:** Confirmed live: sending "How many vacation days do I get?" returns "I didn't get a response. Please rephrase or try again shortly." — phrasing indistinguishable from a transient network hiccup, not a known outage.

**Root cause:** Not applicable to source — this is a UI/messaging gap, not a bug in the chat logic itself (the backend being down is a known, separate, current condition, not something to fix in this pass).

**Expected outcome:** When the assistant backend is known to be unavailable, surface that state proactively (a banner or disabled input with explanatory copy) rather than only failing after a user attempts to send a message. Definition of done: a user can tell the assistant is down without having to try it first. Lower priority than items 1–8 since this depends on backend status, not app logic.

---

## Fixed since the 2026-07-01 audit (no action needed)

- **Tutorial skip-state now persists.** Previously re-shown on every fresh page load; confirmed this session it no longer reappears after a reload following Skip.
- **`/join/:sessionId` now prefills the session code.** Previously "silently degrades to the plain landing page, fires zero API calls, no prefill" — confirmed this session that tapping "Employee" from a `/join/:sessionId` link now correctly prefills the session code field.

## Confirmed working this session (no action needed)

Real session/hire/milestone/mission creation, self-approve mission completion with correct XP and milestone recompute, pre-boarding checklist add/complete, resource search box, template-save dialog, and the invite QR code image rendering correctly in this test environment.

## Testing considerations

Every live testing requires a manual docker compose build. The served app will be available on port 8700. Do not try to perform a live smokescreen test until the user confirms the redeployment.