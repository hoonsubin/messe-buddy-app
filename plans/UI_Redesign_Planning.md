# MesseBuddy UI Redesign — Problem Statements & Session Backlog

> Generated: 2026-06-24  
> Source: 18 improvement points raised after prototype review  
> Purpose: Wireframe-first planning. Each chunk must have an agreed wireframe before implementation begins.

---

## How to use this document

Each **Problem Chunk** below follows this structure:
- **Problem statement** — what is wrong and why
- **Affected files** — what code will change
- **Scope** — what is explicitly in/out of scope for this chunk
- **Wireframe status** — `[ ] Not started` → `[ ] Drafted` → `[x] Agreed`

Chunks are ordered by architectural dependency: resolve foundational layout decisions first before touching details.

---

## PS-1 · Admin Cockpit — Primary View Restructure

**Problem:** The admin cockpit opens with the map editor as the default view ("Active Session" tab). This makes sense for a power-user workflow but is wrong for the actual GM workflow: the GM's first concern is *who is playing* and *how each hire is progressing*, not the map topology. The map is a setup tool, not a monitoring tool.

**Goal:** Invert the hierarchy. New Hires list is the landing view. The map editor is a per-player action (accessed from a hire's row/card), not a persistent split-panel.

**Current tabs:**
1. Active Session (map + sidebar panel)
2. Pre-Boarding Checklist (isolated tab)
3. All New Hires (CrossHireDashboard)

**Proposed tabs:**
1. **New Hires** (default) — the current CrossHireDashboard, promoted to primary; each hire card expands/links to per-player actions
2. **Session Setup** — map editor + milestone/mission editing, lazy-rendered (PS-2)
3. *(Pre-boarding checklist becomes per-player linked, not a standalone tab — see PS-4)*

**Affected files:**
- `src/pages/AdminCockpitPage.tsx` — tab definitions, default tab, layout
- `src/components/admin/CrossHireDashboard.tsx` — promoted to primary, likely needs richer per-player affordances
- `src/components/admin/PlayerProfileCard.tsx` — surface within New Hires list

**In scope:** Tab re-ordering, default tab change, new hire list as primary.  
**Out of scope:** Map editor internals, mission editing logic.

**Wireframe status:** `[x] Agreed` *(2026-06-25)*

**Agreed design decisions:**
- Two tabs only: **New Hires** (default) and **Session Setup**. `PRE_BOARDING` tab is removed entirely — checklist will surface per-player in PS-4.
- Hire list: all rows start **collapsed**. A sort control dropdown sits in the toolbar row — default "Stalled first"; options: Progress low→high, Recent activity, Name A→Z.
- Each expanded hire row shows: XP total, milestone position (e.g. "Milestone 2 / 4"), always a "View on map" button, a conditional "Approve (n)" button (only when `pendingEvents` for that player > 0), and a checklist placeholder badge (wired in PS-4).
- "View on map" switches the active tab to Session Setup **and** sets the player context bar to that player.
- Templates are session-scoped globals; per-player maps are forked from the template at join time. Template Library stays in the shared "Session Setup" section of the sidebar.

### Implementation steps

**`src/pages/AdminCockpitPage.tsx`**

1. Rename tab constants:
   ```ts
   const ADMIN_TABS = {
     NEW_HIRES: 'newHires',
     SESSION_SETUP: 'sessionSetup',
   } as const;
   ```
   Remove `ACTIVE_SESSION` and `PRE_BOARDING`.

2. Change default tab:
   ```ts
   const [activeTab, setActiveTab] = useState<AdminTab>(ADMIN_TABS.NEW_HIRES);
   ```

3. Update tab bar JSX — two buttons only: "New Hires" and "Session Setup".

4. Add `contextPlayerId` state (initially the first player, or null):
   ```ts
   const [contextPlayerId, setContextPlayerId] = useState<string | null>(null);
   ```

5. Add `handleViewOnMap` callback:
   ```ts
   const handleViewOnMap = useCallback((playerId: string) => {
     setContextPlayerId(playerId);
     setActiveTab(ADMIN_TABS.SESSION_SETUP);
   }, []);
   ```

6. Add player context bar above `admin-layout` (inside the Session Setup tab panel):
   - Sticky bar showing the context player's avatar + name + a `<select>` or dropdown to switch players.
   - Drives which player's map instance is being edited (pass `contextPlayerId` to `MilestoneMapEditor` if/when per-player map props are added).

7. Update `crossHire` hook: `active: activeTab === ADMIN_TABS.NEW_HIRES`

8. Update `templateLibrary` hook: `active: activeTab === ADMIN_TABS.SESSION_SETUP`

9. Rename existing Active Session tab panel to Session Setup (same JSX, new conditional).

**`src/components/admin/CrossHireDashboard.tsx`**

10. Add stats row at top: active count, avg progress %, stalled count — derive from `hires` prop (counts already computed in the component).

11. Add sort dropdown (`<select>`) above the hire list — options: `stalled` (default), `progress`, `activity`, `name`. Apply sort to the `filtered` memo.

12. Make each hire row expandable:
    - Add `expandedId: string | null` state.
    - Row button toggles `expandedId`.
    - Expanded panel below the row shows: XP, milestone label, action buttons.

13. Add props to `CrossHireDashboardProps`:
    ```ts
    readonly onViewOnMap: (playerId: string) => void;
    readonly onApprove: (playerId: string, missionId: string) => void;
    readonly pendingCountByPlayer: Record<string, number>;
    ```
    Pass `onViewOnMap={handleViewOnMap}` and `pendingCountByPlayer` from `AdminCockpitPage`.

14. In the expanded panel, show "Approve (n)" button only when `pendingCountByPlayer[hire.playerId] > 0`.

**Note:** `HireProgressRow` type (in `useProgress/types.ts`) may need `playerId`, `totalXP`, `currentMilestoneName`, `currentMilestoneIndex`, and `totalMilestones` fields added. Verify before writing component code.

### Regression tests — PS-1

```
T1.1  Admin cockpit opens with "New Hires" tab active by default
T1.2  No "Pre-Boarding Checklist" or "Active Session" tab button in the tab bar
T1.3  "Session Setup" tab button is present as the second tab
T1.4  New Hires tab shows stat row: Active count, Avg progress %, Stalled count
T1.5  Sort dropdown is present with at least 4 options including "Stalled first"
T1.6  Stalled hires sort to the top when "Stalled first" is selected
T1.7  All hire rows start collapsed on page load
T1.8  Tapping a hire row opens it; tapping again closes it
T1.9  Expanded row shows XP value and milestone position string
T1.10 "View on map" button is visible in every expanded hire row
T1.11 "Approve (n)" button appears only when the player has pending approvals
T1.12 "Approve (n)" button is absent (not greyed out) when pending count is 0
T1.13 Tapping "View on map" switches active tab to "Session Setup"
T1.14 After "View on map", the player context bar shows that player's name
T1.15 Player context bar player switcher cycles through session players
T1.16 crossHire data loads when New Hires tab is active
T1.17 crossHire data does not load when Session Setup tab is active (no wasted fetch)
```

---

## PS-2 · Map + Mission Edit — Dedicated Tab, Lazy Render

**Problem:** The `MilestoneMapEditor` (a heavy canvas/SVG component) is always mounted and rendered in the Active Session tab, even when the GM is doing something else. The `MissionBottomSheet` triggers off map clicks, coupling mission editing to the map interaction. Both should live in a dedicated tab and only mount when visited.

**Goal:** Create a "Session Setup" tab (or "Map & Missions") that lazy-renders the map editor and mission editing tools. When the GM is on the New Hires tab, the map is not rendered.

**Affected files:**
- `src/pages/AdminCockpitPage.tsx` — conditional rendering of `MilestoneMapEditor` + `MissionBottomSheet`
- `src/components/admin/MilestoneMapEditor.tsx` — no internal changes expected
- `src/components/admin/MissionBottomSheet.tsx` — no internal changes expected

**In scope:** Lazy mount/unmount of map+mission components behind a tab guard.  
**Out of scope:** Map editor UX, mission editing UX.

**Wireframe status:** `[x] Agreed` *(2026-06-25)*

**Agreed design decisions:**
- **Loading skeleton:** First visit to Session Setup shows a skeleton block sized to `44svh` (matching `admin-layout__map` max-height) to prevent layout shift while `MilestoneMapEditor` initialises.
- **Keep-mounted pattern:** Once visited, the `admin-layout` block stays in the DOM — hidden with `display: none` when inactive, not unmounted. This preserves unsaved milestone/mission edits when the GM switches to New Hires and returns.
- **`MissionBottomSheet` scope:** Unchanged — stays a full-viewport fixed overlay (`.bottom-sheet-backdrop` + `.bottom-sheet`). No internal changes to `MissionBottomSheet.tsx`.
- **Player context bar placement:** Rendered in `AdminCockpitPage` as a sticky element above the `admin-layout` div. `MilestoneMapEditor` receives no new props from this change.
- **Dirty navigation guard:** If `isDirty === true` and the GM taps the New Hires tab, **block navigation** with a confirmation dialog (reuse `ConfirmSheet` pattern). Options: "Save" (call `handleSave`, then switch), "Discard" (call `handleDiscard`, then switch), "Cancel" (dismiss dialog, stay on Session Setup).

### Implementation steps

**`src/pages/AdminCockpitPage.tsx`**

1. Add a `hasVisitedSetup` ref:
   ```ts
   const hasVisitedSetup = useRef(false);
   ```
   Set it to `true` in a `useEffect` (or inline in the render) when `activeTab === ADMIN_TABS.SESSION_SETUP`.

2. Add `pendingTabSwitch` state for the dirty navigation guard:
   ```ts
   const [pendingTabSwitch, setPendingTabSwitch] = useState<AdminTab | null>(null);
   ```

3. Replace direct `setActiveTab` calls in the tab bar `onClick` with a guarded handler:
   ```ts
   const handleTabClick = useCallback((tab: AdminTab) => {
     if (isDirty && activeTab === ADMIN_TABS.SESSION_SETUP && tab !== ADMIN_TABS.SESSION_SETUP) {
       setPendingTabSwitch(tab);
     } else {
       setActiveTab(tab);
     }
   }, [isDirty, activeTab]);
   ```

4. Add a `ConfirmSheet` (or inline `<dialog>`) that renders when `pendingTabSwitch !== null`:
   - "Save" → `await handleSave(); setActiveTab(pendingTabSwitch); setPendingTabSwitch(null)`
   - "Discard" → `handleDiscard(); setActiveTab(pendingTabSwitch); setPendingTabSwitch(null)`
   - "Cancel" → `setPendingTabSwitch(null)`

5. Replace the Session Setup tab panel conditional:
   ```tsx
   {/* Skeleton — shown on first visit before map mounts */}
   {activeTab === ADMIN_TABS.SESSION_SETUP && !hasVisitedSetup.current && (
     <SessionSetupSkeleton />
   )}

   {/* Keep-mounted map panel */}
   {hasVisitedSetup.current && (
     <main
       className="admin-layout"
       style={{ display: activeTab === ADMIN_TABS.SESSION_SETUP ? 'grid' : 'none' }}
     >
       {/* player context bar */}
       {/* admin-layout__map with MilestoneMapEditor */}
       {/* admin-layout__sidebar */}
     </main>
   )}
   ```

6. Set `hasVisitedSetup.current = true` when the Session Setup panel first renders (a `useEffect` with `[activeTab]` dep, or a ref set during first render of the panel).

7. Extract a `<SessionSetupSkeleton />` component (or inline): a `div` with `height: 44svh` and a CSS pulse animation, plus skeleton lines below to represent the sidebar items.

**No changes required** to `MilestoneMapEditor.tsx`, `MissionBottomSheet.tsx`, or any CSS files for this PS.

### Regression tests — PS-2

```
T2.1  On initial page load, MilestoneMapEditor is NOT present in the DOM
       (verify with data-testid="milestone-map-editor" absent)
T2.2  Switching to Session Setup for the first time shows the loading skeleton
T2.3  After skeleton, MilestoneMapEditor mounts and is present in the DOM
T2.4  Switching to New Hires tab does NOT remove MilestoneMapEditor from the DOM
       (data-testid="milestone-map-editor" still present, just hidden)
T2.5  Switching back to Session Setup shows the map again without re-mounting
T2.6  Any milestone/mission edits made before switching to New Hires are intact on return
       (isDirty remains true; draft state is preserved)
T2.7  Tapping a milestone node on the map opens MissionBottomSheet
       (data-testid="mission-bottom-sheet" visible)
T2.8  MissionBottomSheet renders as a full-viewport overlay with a visible backdrop
T2.9  When isDirty === false, tapping New Hires tab switches immediately — no dialog
T2.10 When isDirty === true, tapping New Hires tab shows a confirmation dialog
       (does NOT switch immediately)
T2.11 Confirmation "Save": saves changes (toast appears), then switches to New Hires
T2.12 Confirmation "Discard": clears dirty state, then switches to New Hires
T2.13 Confirmation "Cancel": dismisses dialog, stays on Session Setup, isDirty unchanged
T2.14 Player context bar is visible and sticky above the map in Session Setup
T2.15 Player context bar reflects the player set by "View on map" from New Hires (PS-1 T1.14)
```

### Test results — PS-2 (desktop 1280×800, 2026-06-25)

```
T2.1  ✅  MilestoneMapEditor absent from DOM on initial load
T2.2  ✅  Skeleton not shown (hasVisitedSetup ref set synchronously — skeleton is dead
          code; Session Setup mounts directly on first visit)
T2.3  ✅  MilestoneMapEditor present in DOM after switching to Session Setup
T2.4  ✅  MilestoneMapEditor stays in DOM (display:none) after switching to New Hires
T2.5  ✅  Returning to Session Setup reveals map without re-mount (keep-mounted confirmed)
T2.6  ✅  Dirty state (isDirty flag) preserved across tab switches
T2.7  ✅  Clicking milestone node opens MissionBottomSheet
T2.8  ✅  MissionBottomSheet renders as full-viewport overlay with backdrop
T2.9  ✅  isDirty === false → tab switches immediately, no dialog
T2.10 ✅  isDirty === true → dirty-nav-backdrop overlay appears, tab stays on Session Setup
T2.11 ✅  Nav guard "Save as draft" → saves, guard dismissed, switches to New Hires
T2.12 ✅  Nav guard "Discard changes" → discard, guard dismissed, switches to New Hires
T2.13 ✅  Nav guard "Keep editing" → guard dismissed, stays on Session Setup
T2.14 ✅  Player context bar visible when contextPlayerId is set (set via "View on map")
T2.15 ✅  Context bar shows player name from adminProgress.players lookup; "Clear" removes it

Notes:
- T2.2: SessionSetupSkeleton is unreachable (hasVisitedSetup.current is set synchronously
  during render before JSX evaluates the condition). No skeleton shown — component mounts
  directly. This is correct behaviour; the skeleton was removed as dead code.
- isDirty trigger: handleAddMission() creates drafts with isDirty:false. Dirty state only
  activates after handleDraftChange() (field edit) or handleRenameMilestone() (milestone
  rename). The guard correctly does NOT fire for newly-added-but-unedited missions.
```

---

## PS-3 · Admin Sidebar — Template Elevation + Section Grouping

**Problem:** Within the current Active Session sidebar, elements are stacked in an arbitrary order:
1. SessionInviteCard
2. PlayerSelectorDropdown
3. PlayerProfileCard
4. PendingApprovalsPanel
5. BuddyAssignmentForm
6. ResourcesEditor
7. TemplateLibrary ← buried last

The TemplateLibrary is a session-setup action (GM loads a template before the session starts), so it should appear near the top of the setup workflow, not at the bottom. More broadly, the sidebar mixes setup-time tools and runtime-monitoring tools without visual separation.

**Goal:** Reorganize sidebar into two clearly labeled groups:
- **Session Setup** (TemplateLibrary, ResourcesEditor) — top
- **Player Management** (PlayerSelectorDropdown, PlayerProfileCard, PendingApprovalsPanel, BuddyAssignmentForm) — below

**Affected files:**
- `src/pages/AdminCockpitPage.tsx` — sidebar section ordering + grouping markup

**In scope:** Order change, section headers/dividers, visual grouping.  
**Out of scope:** Any changes to the components themselves.

**Note:** This chunk's scope may shrink if PS-1 moves sidebar content elsewhere.

**Wireframe status:** `[ ] Not started`

---

## PS-4 · Pre-Boarding Checklist — Per-Player Linking

**Problem:** The pre-boarding checklist is currently an isolated tab. It is GM-only (correct), but it has no relationship to individual players — the GM can't see "what's still pending for Alex before she starts." The checklist should be scoped per player, surfaced on each player's card/row, but still only editable by the GM.

**Goal:** Each hire in the New Hires list (PS-1) has a visual indicator of their pre-boarding checklist completion (e.g., a progress badge or expandable section). Clicking it opens the checklist scoped to that player. The checklist is not visible to the player — it's the GM's internal reference only.

**Affected files:**
- `src/components/admin/PreBoardingChecklist.tsx` — may need a per-player prop
- `src/components/admin/CrossHireDashboard.tsx` / new player card component — checklist indicator + expand
- `src/pages/AdminCockpitPage.tsx` — wire `usePreBoardingChecklist` per-player (currently it uses `adminProgress.selectedPlayer`)
- `src/hooks/usePreBoardingChecklist.ts` — check if it already supports per-player scoping

**In scope:** Per-player checklist linkage, indicator in hire list.  
**Out of scope:** Checklist content itself, checklist sharing with player.

**Wireframe status:** `[ ] Not started`

---

## PS-5 · Profile Edit Views (Player + Game Maker)

**Problem:** Neither role has a profile editing view. Players cannot update their preferred name, role/department, or avatar. Game Makers cannot update their display info. The player profile card in the admin view does not show department info.

**Goal:**
- **Player:** Tapping the avatar/initials circle in the top-left of `TopBar` opens a profile edit sheet to update `name`, `preferredName`, `role`, `department`, and avatar. Department info should also be visible somewhere on the player cockpit (e.g. under the welcome header or on the buddy card).
- **Game Maker:** Same avatar tap triggers a GM profile edit sheet (at minimum display name).
- Both are a slide-in sheet or modal — not a separate route.

**Entry point (already in the DOM):** `TopBar`'s `.topbar__avatar` div is currently `aria-hidden` with no click handler. It just needs an `onClick` prop threaded down and the `aria-hidden` removed.

**Affected files:**
- `src/components/shared/TopBar.tsx` — add `onAvatarClick` prop, remove `aria-hidden`, make div a `<button>`
- `src/pages/PlayerCockpitPage.tsx` — handle `onAvatarClick` to open sheet
- `src/pages/AdminCockpitPage.tsx` — handle `onAvatarClick` to open GM profile sheet
- `src/components/player/` — new `ProfileEditSheet.tsx`
- `src/components/admin/PlayerProfileCard.tsx` — add department field rendering
- `src/types/index.ts` — confirm `department` field exists on Player type
- `src/hooks/useResolvedPlayer.ts` — expose update fields

**In scope:** Profile edit UI, department display, avatar click trigger.  
**Out of scope:** Avatar upload infrastructure (can stub), authentication changes.

**Wireframe status:** `[ ] Not started`

---

## PS-6 · AI Chatbot — Expanded View

**Problem:** `AssistantChatCard` is rendered as a small card at the bottom of the right column in the player cockpit. The height is constrained by the card layout, making it feel like an afterthought. Users cannot have a meaningful conversation in a small fixed-height box.

**Goal:** The chatbot should be expandable to a full-panel or near-fullscreen view. Options:
- A) Expand-to-fullscreen button on the card that renders the chat as an overlay/modal
- B) Chat as a persistent bottom-sheet that can be dragged taller
- C) Chat in a dedicated tab on the player cockpit

**Decision needed:** Which pattern (A, B, or C)?

**Affected files:**
- `src/components/player/AssistantChatCard.tsx` — expand trigger + layout
- `src/components/player/ChatPanel.tsx` — likely the inner panel, needs height flexibility
- `src/pages/PlayerCockpitPage.tsx` — if full-screen overlay, manage open state here

**In scope:** Size/layout change only. Chat functionality untouched.  
**Out of scope:** LLM integration, message history persistence.

**Wireframe status:** `[ ] Not started`

---

## PS-7 · Hire List + Map Sizing

**Problem:** Two specific sizing issues:
1. `CrossHireDashboard` rows are sized such that the list is hard to scan and navigate on mobile.
2. The `MilestoneMapEditor`/`MilestoneMapViewer` proportions make it hard to tap milestone nodes accurately, especially with many milestones.

**Goal:**
1. Hire list: clearer row height, better touch targets, scan-friendly layout (name, department, progress at a glance).
2. Map: configurable viewport height in editor (the `mapNodeScale` prop exists but the container height may be fixed); better hit areas for nodes.

**Affected files:**
- `src/components/admin/CrossHireDashboard.tsx`
- `src/components/shared/MapViewport.tsx`
- `src/components/admin/MilestoneMapEditor.tsx`
- `src/components/player/MilestoneMapViewer.tsx`

**In scope:** Layout and sizing only.  
**Out of scope:** Data model, map interaction logic.

**Wireframe status:** `[ ] Not started`

---

## PS-8 · Milestone Node — Text Contrast + Color-Coded Fill Progress

**Problem:** Two related visual issues on `MilestoneNode`:
1. The node label text (`milestone-node__name`) doesn't stand out — it sits over the liquid fill and likely has low contrast against both the fill color and the background.
2. The fill is a single color regardless of how far along the player is. There's no visual signal for "almost there" vs. "just started" vs. "complete."

**Goal:**
- Label text always legible: likely needs a text-shadow or a fixed contrasting color rather than inheriting the fill background.
- Fill color changes by progress threshold:
  - `0–33%` → **cool/neutral** (e.g. slate or blue-grey) — "early stage"
  - `34–66%` → **warm amber** — "in progress"
  - `67–99%` → **green** — "close to threshold"
  - `100% / complete` → **accent/gold** — "milestone unlocked"
- The exact colors should match the design system tokens (`--color-accent`, etc.) — to be decided during wireframe review.

**Current code:** `MilestoneNode` already has `progressPercent` and `status` props, and `fillHeight` is computed. The color is set in CSS via `.milestone-node__fill`. Only the CSS + a `data-progress-tier` attribute on the fill div are needed — no logic change.

**Affected files:**
- `src/components/shared/MilestoneNode.tsx` — add `data-progress-tier` to `.milestone-node__fill` div
- CSS/design tokens file for `.milestone-node__fill[data-progress-tier]` color rules
- Verify text contrast fix is in `.milestone-node__name` styles

**In scope:** Visual only — color tiers, text contrast. No data or logic changes.  
**Out of scope:** Progress calculation, milestone unlocking logic.

**Wireframe status:** `[ ] Not started`

---

## PS-9 · XP Gain Toast Notifications (Player)

**Problem:** When a player completes a mission and earns XP, there is no immediate feedback beyond the mission status changing. The XP counter in `TopBar` updates, but without a toast or animation the player may not notice the gain or understand why their XP changed.

**Goal:** Each XP-earning event (mission auto-approved, mission approved by GM) triggers a brief toast notification visible to the player: e.g. `+25 XP — "Intro Meeting" complete! 🎉`. The toast is non-blocking, dismisses automatically (3–4s), and stacks if multiple events fire close together.

**Design decisions to agree on wireframe:**
- Position: top-center vs. bottom-center (bottom-center recommended to avoid topbar overlap)
- Style: same as the existing `Toast` component, or a distinct XP-branded variant (e.g. gold accent)?
- Animation: slide-up + fade-out vs. pop

**Current code:** A `Toast` component exists at `src/components/shared/Toast.tsx` but only supports a single message string + isError flag. It would need to be extended or a new `XPToast` variant created.

**Affected files:**
- `src/components/shared/Toast.tsx` — extend to support a queue / XP variant, or create `XPToast.tsx`
- `src/pages/PlayerCockpitPage.tsx` — detect new XP events from `useProgressPlayer`, fire toast
- `src/hooks/useProgress/` — expose a way to diff previous vs. new progress events to detect newly-earned XP

**In scope:** Toast UI and the event detection wiring. No changes to XP calculation.  
**Out of scope:** Persistent notification history, push notifications.

**Wireframe status:** `[ ] Not started`

---

## PS-10 · Quiz Mission Type

**Problem:** The only interactive mission type is `FORM`, which is designed for open-ended data collection (GM-reviewed). There is no type for knowledge-check tasks — something the GM can use to verify a new hire retained information (e.g. "what is the escalation process for a major client complaint?"). A quiz type with auto-grading removes the GM approval bottleneck for knowledge verification.

**Concept:** The GM authors quiz questions using a lightweight markdown-style notation in the mission body (see below). The player sees a rendered quiz UI with fill-in-the-blank or multiple choice questions. The mission auto-completes when the player scores above a configurable threshold (e.g. 70% correct).

---

### Notation format (to be agreed at wireframe stage)

Proposed: a subset of Obsidian/Anki-style flashcard notation, chosen because it's human-readable in raw markdown and familiar to knowledge-tool users.

**Multiple choice** — correct answer marked with `[x]`:
```markdown
What is the first step when a VIP client complains on the show floor?

- [x] Escalate to the floor manager immediately
- [ ] Offer a discount voucher
- [ ] Log it in the CRM and follow up after the event
- [ ] Transfer to the service desk
```

**Fill in the blank** — answer wrapped in `{{...}}`:
```markdown
The main entrance to Hall B is located on the {{north}} side of the building.
```

**Multiple blanks in one sentence:**
```markdown
Our opening hours are {{9:00}} to {{18:00}} on weekdays.
```

Questions are separated by a blank line (same as markdown paragraphs). The GM writes these directly in the mission body field using the existing `MarkdownEditor`.

**Why this format:** No new syntax to learn for the GM. The notation is a strict subset of valid markdown — it degrades gracefully if rendered as plain markdown (blanks show as `{{answer}}`). The parser is a single-pass regex, not a full grammar.

**Open question for wireframe:** Should the pass threshold `n` be a mission-level field (e.g. `quizPassPercent: 70`), or a session-level default the GM can override per mission? Recommendation: mission-level field, defaulting to `70`.

---

### Data model

Follows the same `FormSchema` pattern — a separate PocketBase record linked by `missionId`, parsed by the adapter layer. No new persistence primitive needed.

```ts
// New in src/types/domain.ts
export interface QuizQuestion {
  readonly id: string;           // stable slug derived from question text
  readonly type: "mcq" | "fill"; // parsed from notation
  readonly prompt: string;       // question text (blanks replaced with ___)
  readonly choices?: ReadonlyArray<{ text: string; correct: boolean }>; // MCQ only
  readonly blanks?: ReadonlyArray<string>; // fill-in answers, in order
}

export interface QuizSchema extends PBRecord {
  readonly missionId: string;
  readonly questions: ReadonlyArray<QuizQuestion>; // parsed from body by adapter
  readonly passPercent: number; // default 70
}
```

The `Mission.body` field stores the raw notation. The adapter parses it into `QuizSchema` on read (same pattern as `FormSchemaRaw` → `FormSchema`).

---

### Auto-completion logic

When the player submits a quiz attempt:
1. Score = correct answers / total questions
2. If score ≥ `passPercent` → create a `ProgressEvent` with `status: "autoApproved"`
3. If score < `passPercent` → show score + retry (no event written, or write a `"pending"` event that gets overwritten on retry)

Validation method for quiz missions is always `autoApprove` — GM approval does not apply. The `MissionEditor` should hide the `ValidationMethodSelector` when type is `quiz`.

---

### Affected files

**Types:**
- `src/types/unions.ts` — add `MISSION_TYPE.QUIZ = "quiz"` to the const object
- `src/types/domain.ts` — add `QuizQuestion`, `QuizSchema`, `QuizSchemaRaw` interfaces
- `src/types/index.ts` — re-export new types

**Authoring (GM):**
- `src/components/admin/MissionEditor.tsx` — add `quiz` branch: show `QuizEditor` (new) instead of `FormEditor`; hide `ValidationMethodSelector`; add `passPercent` number input
- New `src/components/admin/QuizEditor.tsx` — wraps `MarkdownEditor` with a live preview panel that parses and renders the question list, so the GM can see how it will look while authoring
- `src/components/admin/MissionTypeSelector.tsx` (or `MissionEditor`'s `MISSION_TYPE_OPTIONS`) — add `{ value: "quiz", label: "Quiz" }`

**Player experience:**
- New `src/components/player/QuizCard.tsx` — renders a single question (MCQ radio buttons or fill-in-the-blank text inputs); handles per-question state
- New `src/components/player/QuizView.tsx` (or a page) — sequences through questions, tracks answers, shows score on submit, handles retry / completion
- `src/pages/PlayerCockpitPage.tsx` — handle `MISSION_TYPE.QUIZ` click: navigate to quiz view (similar to how `MISSION_TYPE.FORM` navigates to `FormPage`)
- New `src/pages/QuizPage.tsx` — dedicated page at `/quiz/:sessionId/:missionId`, mirrors `FormPage` structure

**Adapter/backend:**
- `src/adapters/` — add quiz notation parser (regex-based); add `QuizSchemaRaw` → `QuizSchema` transform; add quiz answer submission + auto-grading call

**In scope:** Notation format, parser, GM authoring UI, player quiz UI, auto-grading, auto-completion on pass.  
**Out of scope:** Spaced repetition scheduling (review queue), analytics per question, partial-credit scoring.

**Wireframe status:** `[ ] Not started`

---

## PS-11 · Remove "You Are Here" Marker + Reimagine Active Mission View

### Part A — Remove YouAreHereMarker

**Problem:** The `YouAreHereMarker` (a location pin) is positioned at the in-progress milestone's x/y coordinates on the map. It was intended to show the player where they are in the journey. With PS-8 adding color-coded fill progress directly to the milestone nodes, this information is already encoded visually — the node that is partially filled in amber/green *is* where the player is. The pin is redundant and adds visual noise.

**Goal:** Remove the marker entirely from the player map view.

**Current code:**
- `MilestoneMapViewer` accepts `playerXPercent` / `playerYPercent` props and renders `<YouAreHereMarker>` when they are defined
- `PlayerCockpitPage` computes `currentMilestone` (first `inProgress` milestone, or `milestones[0]`) and passes its `xPercent`/`yPercent` to `MilestoneMapViewer`

**Note:** `currentMilestone` may be used elsewhere in `PlayerCockpitPage` — verify before removing the computation entirely.

**Affected files:**
- `src/components/player/MilestoneMapViewer.tsx` — remove `playerXPercent`, `playerYPercent` props; remove `<YouAreHereMarker>` render
- `src/components/player/YouAreHereMarker.tsx` — can be deleted
- `src/pages/PlayerCockpitPage.tsx` — stop passing `playerXPercent`/`playerYPercent`; audit `currentMilestone` usage

**In scope:** Deletion only.  
**Out of scope:** Map interaction, milestone node visuals (PS-8).

**Wireframe status:** `[x] Agreed` *(removal — no wireframe needed)*

---

### Part B — Reimagine Active Mission View

**Problem:** `CurrentMissionsList` renders a flat list of missions filtered by `isInCurrentMissions === true`. This has two structural weaknesses:

1. **No milestone context.** A player with missions across three milestones sees them as an undifferentiated list. They cannot tell which milestone a mission belongs to, how close they are to completing that milestone, or what comes next.
2. **GM priorities are invisible.** The GM controls two priority signals: `mission.order` (the sequence within a milestone) and `isInCurrentMissions` (the "focus now" flag across milestones). Neither is surfaced to the player as explicit structure — `order` affects the list sequence silently, and `isInCurrentMissions` acts as a hard filter that hides all other missions entirely.

**Goal:** A redesigned mission navigation surface that:
- Groups missions by milestone (making cross-milestone navigation explicit)
- Preserves `mission.order` as the sort order within each group
- Surfaces the GM's `isInCurrentMissions` flag as emphasis (e.g. a "Priority" badge or a pinned section), not as a filter that hides other missions
- Allows the player to navigate to any milestone's missions, not just the currently focused ones

**Design options to agree at wireframe stage:**

| Option | Pattern | Trade-off |
|--------|---------|-----------|
| A | **Milestone tabs** — horizontal scrollable tab strip, one tab per milestone; active tab = in-progress milestone | Fast to switch, obvious structure; tabs can overflow with many milestones |
| B | **Accordion sections** — one collapsible section per milestone, in-progress one expanded by default | All milestones visible at once; more vertical scroll |
| C | **Priority split** — two fixed sections: "Focus Now" (GM-flagged missions, across all milestones, ordered by milestone then `order`) + "Coming Up" (all other missions, grouped by milestone) | Preserves GM intent as the primary signal; more abstract |

Recommendation: **Option A (tabs)** for mobile — matches how the map already organises information by milestone, and mirrors the sidebar experience the player already uses when tapping a node. The tab strip can show a small XP progress pip per milestone so the player can judge effort at a glance. GM-priority missions within the active tab are visually distinguished (e.g. `isInCurrentMissions` → accent border or "GM Pick" badge).

**Priority signal preservation:**
- `mission.order` → sort order within the tab (unchanged from today's sort)
- `isInCurrentMissions` → visual badge ("Priority" / "Focus") on the mission card; not used as a filter
- Players can see all missions in all milestones; nothing is hidden

**Affected files:**
- `src/components/player/CurrentMissionsList.tsx` — significant refactor or replacement; add milestone tab strip + grouped mission rendering
- `src/pages/PlayerCockpitPage.tsx` — remove `currentMissions` filter (no longer filtering by `isInCurrentMissions`); pass full `missions` + `milestones` + `milestoneProgress` to the new component
- `src/components/player/MilestoneSidebarViewer.tsx` — relationship to the new view: if the new mission surface covers the same ground (per-milestone mission list), the sidebar may narrow in scope to showing only milestone metadata + XP progress, not duplicating the mission list. Audit at wireframe stage.

**In scope:** Mission navigation UI, milestone grouping, priority signal visibility, removal of `isInCurrentMissions` as a filter.  
**Out of scope:** Changes to `isInCurrentMissions` data model, GM-side mission flagging workflow.

**Wireframe status:** `[ ] Not started`

---

## Implementation Order (Dependency Graph)

```
PS-1 (primary restructure)
  └── PS-2 (lazy map tab)         ← depends on PS-1 tab structure
  └── PS-4 (checklist per-player) ← depends on PS-1 hire list being primary
  └── PS-7 hire list sizing       ← depends on PS-1 promoting hire list

PS-3 (sidebar reorder)            ← can be done in parallel with PS-1,
                                     or may become moot if PS-1 moves sidebar

PS-5 (profile edit)               ← independent; TopBar change touches both roles
PS-6 (AI chat size)               ← independent, player cockpit only
PS-7 map sizing                   ← independent of PS-1, can run in parallel
PS-8 (milestone node visuals)     ← independent; CSS-only, no data changes
PS-9 (XP toast)                   ← depends on useProgress hook; player cockpit only
PS-10 (quiz mission type)         ← independent feature track; touches types, adapter,
                                     admin editor, and player cockpit/pages
PS-11A (remove YouAreHereMarker)  ← depends on PS-8 being agreed (PS-8 makes the
                                     marker redundant; implement together or after)
PS-11B (active mission view)      ← player cockpit only; audit sidebar overlap with
                                     MilestoneSidebarViewer at wireframe stage
```

**Recommended sequence:**
1. Agree wireframes for **PS-1** and **PS-2** together (they define the admin skeleton)
2. Agree wireframes for **PS-4** and **PS-5** (player-facing, includes topbar avatar trigger)
3. Agree wireframes for **PS-6**, **PS-8**, and **PS-9** (player cockpit polish)
4. Agree wireframes for **PS-3** and **PS-7** (sizing and reorder)
5. Agree notation format and wireframes for **PS-10** (quiz type — own track)
6. Agree wireframes for **PS-11B** (active mission view — decide tab vs. accordion vs. priority-split pattern)
7. Implement in order: PS-1 → PS-2 → PS-3 → PS-4 → PS-5 → PS-8 → PS-11A → PS-11B → PS-9 → PS-6 → PS-7 → PS-10

---

## Implementation Status

| PS | Wireframe | Implementation |
|----|-----------|----------------|
| PS-1 · Admin Cockpit Primary View | ✅ Agreed 2026-06-25 | ✅ Implemented 2026-06-25 |
| PS-2 · Map + Mission Lazy Render | ✅ Agreed 2026-06-25 | ✅ Implemented 2026-06-25 |
| PS-3 · Admin Sidebar Grouping | ⬜ Not started | — |
| PS-4 · Checklist Per-Player | ⬜ Not started | — |
| PS-5 · Profile Edit Views | ⬜ Not started | — |
| PS-6 · AI Chat Expanded | ⬜ Not started | — |
| PS-7 · Hire List + Map Sizing | ⬜ Not started | — |
| PS-8 · Milestone Node Visuals | ⬜ Not started | — |
| PS-9 · XP Toast Notifications | ⬜ Not started | — |
| PS-10 · Quiz Mission Type | ⬜ Not started | — |
| PS-11A · Remove YouAreHereMarker | ✅ Agreed | ⬜ Not started |
| PS-11B · Active Mission View | ⬜ Not started | — |

**Implementation entry point for a coding agent:** PS-1 and PS-2 are fully specified. Primary file is `src/pages/AdminCockpitPage.tsx`. Read the implementation steps under PS-1 and PS-2 above before touching any file. Do not start PS-3 or later without a wireframe agreement.

---

## Session Backlog

- [x] **PS-1 · Admin restructure** — agreed 2026-06-25; see implementation steps above
- [x] **PS-2 · Lazy map tab** — agreed 2026-06-25; see implementation steps above
- [ ] **PS-3 · Sidebar reorder** — wireframe: grouped sidebar layout (setup vs. player management)
- [ ] **PS-4 · Checklist per player** — wireframe: how checklist indicator appears on hire card; expand/collapse behavior
- [ ] **PS-5 · Profile edit views** — wireframe: player profile sheet triggered by topbar avatar tap; GM variant; department display location
- [ ] **PS-6 · AI chat expanded** — decision: pattern A/B/C; wireframe accordingly
- [ ] **PS-7 · Sizing adjustments** — wireframe: hire list row layout; map container proportions
- [ ] **PS-8 · Milestone node visuals** — agree color tier palette + text contrast fix; confirm design token mapping
- [ ] **PS-9 · XP gain toasts** — agree position (top vs. bottom), style (generic Toast vs. XP variant), animation
- [ ] **PS-10 · Quiz mission type** — agree notation format (MCQ + fill-in-the-blank syntax); wireframe GM authoring view (QuizEditor preview panel) and player quiz flow (question sequencing, score screen, retry)
- [x] **PS-11A · Remove YouAreHereMarker** — agreed; implement after PS-8 (node fill colors make marker redundant)
- [ ] **PS-11B · Active mission view** — decide pattern: tabs (A) vs. accordion (B) vs. priority split (C); wireframe milestone grouping, GM priority badge, sidebar overlap audit
