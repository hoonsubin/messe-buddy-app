# MesseBuddy Smoke Test — 2026-07-07

Follow-up to `MesseBuddy_Smoke_Test_2026-07-06.md`. Tested at 390×844 against the already-running dev server on `localhost:5173` (no rebuild/redeploy). All flows run on **fresh, non-demo sessions**: a new GM workspace ("Alex Rivera" / "Smoke Test 2026-07-07") and a new player ("Jordan Lee") joined via a real invite link, with the full Messe München template (6 milestones, 33 missions) applied. GM and player were kept open in two separate browser tabs simultaneously to test real-time sync and multi-user consistency.

## Regressions found this session

**1. Milestone editor no longer opens — blocks all mission/resource editing from the map.** Tapping any milestone node on either the Customize tab or the Analytics tab's "Journey Map" does nothing visible: no sheet, no dialog, node just gets an `[active]` state. Reproduced identically via a native Playwright click, a raw DOM `.click()`, and a synthetic touch `pointerdown`/`pointerup` sequence, across two different milestones, ruling out a click-target or automation artifact. Root cause found by reading source, not just observing behavior: `useGmPlayerDetailPage.ts:693-696` has
```
useEffect(() => { closeMilestoneEditor(); }, [playerId, closeMilestoneEditor]);
```
intended to close a stale sheet only when navigating to a different player. But `closeMilestoneEditor` (line 688) depends on `[missionEditor, milestoneEditor]`, and `useGmMilestoneEditor.ts:243` returns a brand-new object literal on every render (no `useMemo`) — so `closeMilestoneEditor` gets a new identity every render, and the effect fires on **every render**, not just on `playerId` changes. Net effect: `openMilestone(id)` sets state, the very next render's effect immediately nulls it back out. This is very likely the fix for last session's "orphaned ghost dialog" bug (#1) having overshot — the guard that stops a stale sheet from persisting now stops *any* sheet from persisting.

Impact: blocks per-milestone mission editing, per-milestone resource assignment, and mission creation entirely through the UI. This is a P0 for the interim presentation if GMs are expected to build/edit journeys live.

**2. Stale local identity causes an unthrottled request storm.** Opening the app with a leftover `mb_identity` pointing at a session that no longer exists in PocketBase (e.g. from a previous testing session) causes hundreds of `GET /api/collections/sessions/records/{staleId}` calls per second with zero backoff, generating 190+ console errors within seconds of load. Not a data-correctness bug, but a real resource/DoS-shaped issue and a bad failure mode for any user whose session was deleted or expired — the app should detect the 404, clear the stale identity, and redirect to landing instead of retrying indefinitely.

## Bugs from 2026-07-06 — status

| # | Issue | Status |
|---|---|---|
| 1 | Orphaned "Milestone" ghost dialog after journey wizard | **Fixed**, but see regression #1 above — the fix appears to have removed sheet-opening entirely, not just the ghost |
| 2 | Layered tutorial + skip-confirmation modals | **Fixed** — confirmation now replaces the tutorial modal, never stacks |
| 3 | Milestone-scoped resources stub / global search broken | **Partially fixed** — global player resource search now correctly returns results (tested "Benefits" → "Employee Benefits Overview"). Could not re-verify the GM-side per-milestone stub claim because the milestone panel no longer opens (regression #1) |
| 4 | `/llm/health/readiness` 502 | **Not fixed** — still 502s. Confirmed (again) this is cosmetic: real chat queries return correct, well-formatted, grounded answers with no user-visible degradation |
| 5 | Empty-state CTA duplication (Library vs Players) | Could not re-test the empty case — shared resource library is pre-seeded and never empty in this environment. Single "Add resource" button observed, no duplicate |
| 6 | "1 missions" grammar | **Fixed** — correctly pluralized across all milestone badges (1 mission, 7 missions, 11 missions, etc.) |
| 7 | Player name entered twice | **Fixed** — join flow Step 2 now prefills "Your name" with the name the GM entered |
| 8 | Start Date unvalidated free text | **Fixed** — now a native `input[type=date]`, calendar-constrained |
| 9 | Truncated player-detail header | **Fixed** (or a side effect of shortened copy) — header now reads "Jordan's Onboarding", fits on one line at 390px |
| 10 | Silent required-field validation | **Fixed** — empty submit now shows explicit `role="alert"` text per field ("Preferred Name is required", etc.) instead of silent refocus |

## Real-time / multi-user verification

Ran with GM and player as two genuinely separate, concurrently-open sessions (not the shared demo session):

- **Buddy assignment → player, live:** buddy entered during the invite wizard appeared correctly on the player's dashboard immediately on join, no reload.
- **Profile-form completion → GM, live:** player submitted the "Complete Your Profile" mission (selfApprove); XP went 0→10 and the milestone progress bar went 0%→20% on the **already-open GM tab** with zero manual refresh — confirms this isn't polling-on-focus but genuine live sync.
- **QR-validated mission:** "Complete Safety Briefing" correctly transitioned to a pending state with a real signed QR payload rendered ("Ask your Game Master to scan this code"). Actual camera-scan completion is untestable in headless Playwright — consistent with prior sessions' "blocked, not a bug" classification, not treated as a failure here.
- **Validation errors:** tested by submitting the profile form empty — all four required fields correctly blocked submission with visible per-field errors (see table row 10).

No new data-consistency bugs found in the paths that were testable end-to-end.

## What worked cleanly

Fresh GM workspace creation, the 3-step invite wizard (including template selection), invite-link join with name prefill, buddy prefill on player's first load, tutorial skip flow, global resource search, profile-form submission with real-time XP/progress sync to a separately-open GM session, QR mission generation, and the AI assistant chat (real grounded answers, ~unaffected by the readiness-check 502).

## Recommended priority

1. **Regression #1 (milestone editor not opening)** — highest priority, blocks core GM workflow (building/editing journeys). Fix: memoize `useGmMilestoneEditor`'s and `useGmMissionEditor`'s return objects (`useMemo`), or change the `useEffect` at `useGmPlayerDetailPage.ts:693` to depend only on `playerId` and call a ref-stable close function.
2. **Regression #2 (stale-identity request storm)** — add a 404 handler that clears `mb_identity` and redirects, plus basic backoff/circuit-breaking on repeated failures regardless.
3. `/llm/health/readiness` 502 — still low priority given the chat itself works, but worth fixing before anything downstream starts gating on it.
