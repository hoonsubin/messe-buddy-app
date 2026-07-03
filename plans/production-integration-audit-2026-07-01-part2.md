# Production Integration Audit — MesseBuddy (Part 2)

**Date:** 2026-07-01 (same day, continued session, after the 1.1 fix + milestone-creation fix were deployed)
**Method:** Playwright MCP against the rebuilt `http://localhost:8700/` stack. Built out a real hire end-to-end (milestones, 4 missions covering all mission types and validation methods, resources, buddy, pre-boarding checklist), invited and joined a real player, then drove the full player-completion → GM-approval loop for each validation method. Supersedes/refines parts of `production-integration-audit-2026-07-01.md` — specifically finding 3 (QR), which was verified there only against the flat demo session and is shown here to fail in the real two-tier hire model.

---

## 1. 🔴 CRITICAL — QR mission validation is broken for every real hire

**Repro:** As GM Peter Tubak (home session `tfvvvop33i61cuf`), open a hire (`7g3sty2r0pa0zin`), open the QR scanner, click "Simulate Scan" against a real `qr`-validation mission. Expected: land on `ValidationPage` showing the mission/player/XP with a Confirm button. **Actual:** silently redirected to `/` (the landing page) — no error, no toast, nothing in the console.

**Root cause:** `src/components/layout/RequireRole.tsx` guards `/validate/:sessionId` by looking up a stored identity profile matching the URL's `sessionId` *exactly* (`useActiveProfile(sessionId, GAMEMAKER)`). But the QR token's `sessionId` (embedded by `useQRScanContext.buildSimulateScanUrl` / real camera scans alike, per `qrPayload.ts`) is the **hire's own session id** (`7g3sty2r0pa0zin`), while the GM's stored identity is scoped to their **home session** (`tfvvvop33i61cuf`) — that's simply how the two-tier home-session → hire-session model works everywhere else in the app (`/admin/:sessionId/hire/:hireId`). `useActiveProfile('7g3sty2r0pa0zin', GAMEMAKER)` finds nothing, `RequireRole` returns `<Navigate to="/" />`, and the scan is silently discarded.

**Why the previous audit missed this:** that pass tested QR by manually reconstructing a token against the flat demo session `sess_mmt2026`, where the GM identity's session id and the "hire" are the same session (no home/hire split). The route guard happens to pass in that case, masking the mismatch. The two-tier hire model (added/exercised for the first time end-to-end in this session) exposes it immediately.

**User-facing effect:** the entire QR physical-presence validation mechanic — called out in this project's own design values as a deliberate, non-negotiable feature (not a limitation) — cannot currently be completed for any real onboarding hire. It only "worked" in the single flat demo session used for earlier spot-checks.

**Fix direction:** `RequireRole` (or a QR-specific variant) needs to resolve the GM identity against the hire's **home** session, not the hire session itself — e.g. look up which home session owns hire `sessionId` before checking for a matching identity, or encode the home session id (not just the hire session id) into the QR payload/URL so the guard can check the right key.

---

## 2. 🔴 CRITICAL — Form-mission field definitions are silently dropped on first save

**Repro:** In the Customize tab, add a new mission, set its type to "Form", add a form field (e.g. "Preferred laptop OS", required), save. Expected: the field persists and the player's `/form/:sessionId/:missionId` page renders it. **Actual:** the mission itself saves fine, but the field definition is lost — confirmed both via direct PocketBase query (`form_schemas` collection has zero rows for the new mission) and live in the player UI, which shows **"No form schema found for this mission."** — a genuine dead end; the player cannot complete this mission at all.

**Root cause:** `src/hooks/useAdminMissionEditor.ts`, `saveMissions()`, step 2:

```ts
// 2. Save form schemas
for (const [, draft] of drafts) {
  if (!draft.isDirty || draft.type !== MISSION_TYPE.FORM) continue;
  if (draft.originalId && draft.formFields?.length) {
    await adapter.upsertFormSchema(draft.originalId, draft.formFields);
  }
}
```

`draft.originalId` is only ever set in `handleMissionSelect`, when selecting a mission that already exists in the server-fetched `missions` list. A brand-new draft mission (created via `handleAddMission`, keyed by a local draft id) has no `originalId` at save time — step 1 creates it server-side in the same `saveMissions()` call, but step 2 has already been skipped for it by the time that happens, and nothing re-runs step 2 with the newly-assigned id. Net effect: **any form mission's fields are lost the very first time it's created**, and only survive if you go back in and edit the same mission again afterward (at which point `originalId` is populated and the save path works normally — this matches why the bug wasn't caught earlier: editing an already-saved mission works fine).

**Fix direction:** capture the created mission's id from step 1's `createMission()` return value and use it (instead of relying on `draft.originalId`) when deciding whether/where to upsert that mission's form schema in step 2 — or simply merge steps 1 and 2 per-mission so the id is always in scope.

---

## 3. ✅ Confirmed working end-to-end (real PocketBase, real player, hard-reload-verified where noted)

- **Hire build-out**: milestones, missions (all 3 mission types × all 3 validation methods represented), resources, buddy assignment, and pre-boarding checklist items all created via the real Customize/Buddy/Pre-boarding UI and confirmed persisted after a hard reload.
- **Invite → join**: the token-less `/join/:sessionId` link (see part 1, finding 1.2 — still unresolved, not re-litigated) correctly prefills the session code and lands a newly-named player in the cockpit with the GM-configured milestones, missions, buddy, and resources all visible.
- **selfApprove mission**: "Mark Complete" → instant `progress_events` write (`status: autoApproved`) → player XP and milestone % update immediately, no GM action needed.
- **gmApprove mission** (link-type): player "Mark as Visited" → mission shows "Waiting for approval" → GM's Analytics tab "Pending Approvals" panel shows the player/mission/XP → GM "Approve" → `PATCH progress_events` → player's XP and mission checkmark update immediately on next load.
- **Resources visibility**: `isVisibleToPlayer` correctly gates whether a resource appears in the player's resource search — verified by toggling both directions and confirming via direct API and the player's live search box, in both directions.
- **Buddy assignment**: correctly no-ops (by design — nothing to assign a buddy *to*) until a real player has joined, then saves and displays correctly in the player's "Your buddy" card once a player exists.

An earlier reading of the resources visibility test **falsely** suggested the checkbox was inverted (Munich Office Map ended up hidden, Draft Benefits Guide ended up visible, opposite of what was set at creation). Root-caused this to my own test automation: a `document.querySelector('input[type="checkbox"]')` in the test script matched the *first* checkbox in the DOM — which was an already-rendered resource's own visibility-toggle checkbox in the list, not the "Add resource" modal's intended checkbox — so the script actually flipped an existing resource's visibility as a side effect rather than setting the new one's. Corrected and re-verified with properly scoped selectors; the app's behavior is correct. Noting this so the false trail isn't mistaken for a real product bug later.

## 4. 🟡 Minor observations (not blockers)

- **Milestone completion % is XP-threshold-based, not mission-count-based.** A milestone with `xpThreshold: 100` (the default) shows "100% complete" the moment any single 100-XP mission is done, even if 3 sibling missions in the same milestone remain outstanding. Likely intentional (threshold, not checklist, semantics), but the "100% complete" label reads as "all missions done" and will confuse GMs glancing at the map. Worth either relabeling or reconsidering the default `xpThreshold` relative to per-mission XP.
- **Onboarding tutorial dialog re-appears on every fresh page load**, even after "Skip tutorial" was confirmed earlier in the same browsing session — no persisted "seen" flag. Minor annoyance, not a functional gap.
- **Assign Buddy tab gives no feedback** when Save is clicked with no player yet joined — the form is fully interactive and the button isn't disabled, it just silently does nothing. A disabled state or inline "Invite a player first" message would remove the ambiguity.

---

## Priority punch list (this session's findings, on top of part 1's)

1. **QR validation route-guard mismatch (1 above)** — blocks the entire QR mechanic for real hires; matches the severity of the original 1.1 fix, arguably higher given this is a named design value of the project.
2. **Form-mission schema loss on create (2 above)** — blocks any newly-created form mission from ever being completable by a player.
3. Everything else in this file is confirmation, not a new gap — the hire build-out, invite/join, selfApprove, and gmApprove loops are all solid end-to-end.

---

## Fixes implemented and verified live (2026-07-01, same day)

Both fixes above were implemented and verified against a freshly rebuilt stack:

- **QR fix**: `App.tsx` no longer wraps `/validate/:sessionId` in `RequireRole`; `ValidationPage.tsx` resolves the authorized GM identity by matching the hire's `gameMakerId` against locally stored profiles instead. Live-verified: GM scan → simulate scan → lands on `ValidationPage` (previously bounced to `/`) → shows the correct milestone/mission/player/XP → Confirm → `progress_events` record created with `status: "completed"` and a real `validatedBy` uid (previously fell back to the literal string `"gm"`).
- **Form-schema fix**: `useAdminMissionEditor.ts`'s `saveMissions()` now captures the id returned by `createMission()` and uses it immediately to upsert the form schema, rather than relying on `draft.originalId` (only ever set for pre-existing missions). Live-verified: created a brand-new form mission with one field in a single save → `form_schemas` collection has a real record for it immediately (previously zero rows until a second, separate edit+save).

**New minor finding surfaced by the QR fix actually completing for the first time:** after a successful `Confirm`, `ValidationPage.goToAdmin()` navigates to `/admin/${sid}` where `sid` is the *hire's* session — but `/admin/:sessionId` expects a GM's *home* session. This hits the same RequireRole exact-match issue described in finding 1 and bounces the GM to the landing page instead of back into their admin view. The QR write itself is unaffected (confirmed via direct API — the `progress_events` record persists correctly regardless of where the redirect lands); this is purely a post-confirm navigation rough edge, not a data-integrity issue. Not fixed in this pass — flagged for a follow-up decision on where "back to admin" should actually go, since `ValidationPage` has no way to know the GM's home session id on its own.
