# MesseBuddy Smoke Test — 2026-07-06

Persona: HR manager (Game Master role) onboarding a new employee ("Jamie Novak"), then switching to the player's join flow to walk the same journey end-to-end. Tested at 390×844 (mobile), localhost:5173, live PocketBase backend (not mock data). Full flow: workspace creation → resource library → player invite wizard → GM customize/buddy/pre-boarding tabs → player join → tutorial → profile form → mission completion → resource search → AI chat.

Console: 0 errors, 0 warnings across the whole session. No 4xx/5xx on any functional API call.

## Bugs / dead ends

**1. Orphaned "Milestone" dialog after journey creation.** Immediately after finishing the 3-step "New onboarding journey" wizard, an unlabeled `dialog` with heading "Milestone" and a "+ Add mission" button is mounted in the DOM but never rendered on screen (confirmed via full-page screenshot — nothing visible). It persists across tab switches (Customize → Assign Buddy → Pre-boarding) and only disappears once you manually tap the milestone node, which opens the *real*, correctly-labeled "Arrive & Get Set Up" panel. Until then it's dead weight sitting in the accessibility tree — a focus trap risk for keyboard/screen-reader users, and likely a stale mount left by the "start from scratch" template flow. Screenshots: `05_milestone_sheet_state.png`, `07_buddy_tab_with_ghost_dialog.png`.

**2. Layered modals on player first login.** Tutorial modal ("Hello, Jamie") + its own "Skip tutorial?" confirmation render simultaneously, both visible, with the confirmation modal's backdrop blocking clicks on the tutorial modal underneath. Functionally recoverable (the top modal's own button works), but visually it reads as double-stacked dialogs, and Playwright's own click-stability check flagged the backdrop intercepting pointer events. Screenshot: `09_player_dashboard.png`.

**3. Milestone-scoped resources are a stub.** The milestone sidebar's "Resources" tab literally says "Resources for this milestone will appear here in a future sprint." Consequence: a resource added to the shared library (e.g. "Parking & Access Guide") never surfaces to the player, even via the dashboard's global resource search — search returns "No resources found" for any query. The library resource does exist server-side (`library_resources` fetch returns 200 with the record), it's just not wired to milestones yet. Not a regression, but worth flagging since the empty search state gives the player zero explanation of *why* — no "ask your buddy" fallback, no link to browse the library.

**4. `/llm/health/readiness` returns 502 repeatedly.** Polled every ~10s in the background throughout the session, every single call 502s. The actual AI chat endpoint works fine (`/llm` proxy answered the vacation-days question correctly with real content), so this looks like a broken or misconfigured standalone health-check route rather than the chat feature itself being down — but if anything downstream gates on this readiness check (e.g. an "AI Assistant unavailable" banner), it would falsely report the assistant as down.

## UX inconsistencies

**5. Empty-state CTA duplication differs between Players and Resource Library — confirms your hypothesis.** Resource Library's empty state shows "Add resource" *twice* (header button + center button, `03_library_empty.png`). Players' empty state shows "New onboarding journey" *once* — the header button is entirely absent until at least one player exists, then it appears (`02_players_empty.png` vs `08_players_list_with_player.png`). Neither pattern is wrong per se, but they're inconsistent with each other, and the Resource Library case is a straightforward duplicate-CTA smell.

**6. Grammar: "1 missions".** Milestone node badge reads "1 missions" instead of "1 mission" — no singular/plural handling. Visible on any milestone with exactly one mission.

**7. Player name entered twice.** The GM specifies the player's name ("Jamie Novak") when creating the journey; the player then has to re-type their own name from scratch during join (Step 2 of the join flow arrives with an empty "Your name" field). Given the GM already declared it, either prefill it or drop the redundant prompt — as-is it's a small but pointless duplicate-entry moment right at first contact.

**8. "Start Date" is unvalidated free text.** Field is a plain textbox with a date-shaped placeholder ("e.g. 2026-06-16") but no format enforcement — typing "next monday" submits without complaint. Downstream anything reading this field as a date will need to handle garbage input.

**9. Truncated player-detail header.** "Jamie Novak's Onboarding Process" truncates mid-word to "Jamie Novak's Onboarding …" in the 390px header — cosmetic, but on a project explicitly targeting mobile-first, worth a look.

**10. Required-field validation on the profile form is silent.** Submitting empty just refocuses the first required field with no visible error text or styling (native browser validation, no custom messaging) — easy to miss on a touch device where there's no hover/focus ring feedback as obvious as on desktop.

## What worked cleanly

Workspace creation, resource CRUD (add/edit/delete), the 3-step player invite wizard, QR code + join-URL generation, the join flow's token verification, buddy assignment (prefilled correctly when revisiting the tab), pre-boarding checklist add/complete, mission completion + XP award (10/100 XP tracked correctly on both GM and player sides), the milestone map zoom/pan controls, and the AI assistant chat (real, on-topic answers, not a stub).

## Screenshots

All in `messebuddy_smoketest_screenshots/`: empty states, the ghost dialog, the layered-modal moment, the player dashboard, and form validation.
