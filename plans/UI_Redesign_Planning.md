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

## PS-3 · Admin Navigation — Hire-First Architecture + Per-Hire Onboarding Checklist

**Problem:** The two-tab admin layout (New Hires | Session Setup) creates a flat hierarchy. The milestone map occupies 72.5% of the desktop viewport at 1280px. Seven ungrouped sidebar panels compete for attention. The New Hires tab is secondary, not primary. The pre-boarding checklist (PS-4 original) is per-session, not per-hire.

**Goal:** Three-view navigation architecture replacing the tab bar:
1. **Hire list** (root/default): stats + program management strip (Templates, Resources as always-visible buttons) + hire rows that navigate directly to hire detail
2. **Hire detail** (per-hire): read-only map viewer showing hire's progress + progress panel + pending approvals + buddy + admin-only onboarding checklist
3. **Session setup** (existing map editor, accessible from program management strip and hire detail)

**Milestones are per-hire (OD-D resolved 2026-06-26):** Each hire gets their own milestone array. This is a major data model refactor (Session → milestones[] → Player → milestones[]). Deferred to a separate phase. Prototype uses session-scoped milestones with per-hire progress overlay.

**Program management buttons placement:** Always-visible strip between stats row and hire list. Two equal-weight explicitly-labeled buttons (not gear icon, not tabs): "Templates" and "Resources". For this prototype, both navigate to the existing Session Setup view.

**Per-hire onboarding checklist:**
- Lives in hire detail view, below the three panel cards
- Admin-only (marked with "admin only" badge; not visible to hire)
- 8 hard-coded default items, ephemeral state per-hire:
  1. Contract signed  2. Tax forms submitted  3. ID documents verified  4. IT account created
  5. Access badge issued  6. Equipment assigned  7. First day email sent  8. Buddy introduced
- Merges and supersedes PS-4 (Per-Boarding Checklist Per-Player Linking)

**Affected files:**
- `src/pages/AdminCockpitPage.tsx` — replace `activeTab` + tab bar with `viewMode` state; add `selectedHireId` + `hireChecklists` state; program management strip
- `src/components/admin/CrossHireDashboard.tsx` — replace expand panel with direct-navigate rows (`onSelectHire`); remove `onViewOnMap`/`onApprove` props
- New: `src/components/admin/HireDetailView.tsx` — hire detail page component
- New: `src/components/admin/HireChecklist.tsx` — per-hire checklist component

**In scope:** Navigation restructure, program management strip, hire detail view, per-hire checklist.  
**Out of scope:** Per-hire milestone data model refactor (deferred), Template/Resource management views (stubbed).

**Wireframe status:** `[x] Agreed` *(2026-06-26)*

**Agreed design decisions:**
- `viewMode: 'list' | 'detail' | 'setup'` replaces `activeTab: 'newHires' | 'sessionSetup'`. No tab bar.
- Navigation: back buttons and view transitions. "← Back to Landing" always visible.
- Program management strip: between stats row and hire list. Two equal-weight buttons.
- Hire rows: direct navigation (click row → hire detail). Remove expand/collapse.
- Hire detail map: read-only `MilestoneMapViewer` (player's progress), not editable `MilestoneMapEditor`.
- Checklist: `Record<playerId, PreBoardingCheckItem[]>` ephemeral state in AdminCockpitPage, initialized from `DEFAULT_CHECKLIST` (exported from `HireChecklist.tsx`) on first hire visit.
- Dirty nav guard: retained for transitions away from setup view when `isDirty === true`.
- PS-4 (Pre-Boarding Checklist Per-Player Linking) is merged into this chunk and marked resolved.

### Regression tests — PS-3

```
T3.1  Admin cockpit opens in hire list view (no tab bar visible)
T3.2  Program management strip shows two buttons: "Templates" and "Resources"
T3.3  Clicking a hire row navigates to hire detail view (not expand)
T3.4  Hire detail shows back button "← Hire list"
T3.5  Hire detail shows hire name and role in sub-header
T3.6  Hire detail shows milestone map in read-only mode (MilestoneMapViewer)
T3.7  Hire detail shows Progress panel with XP and milestone position
T3.8  Hire detail shows Pending Approvals panel for that hire only
T3.9  Hire detail shows Buddy panel
T3.10 Hire detail shows Onboarding Checklist section with "admin only" badge
T3.11 Checklist shows 8 items for a new hire with all unchecked initially
T3.12 Checking an item updates that hire's checklist (ephemeral state)
T3.13 Checking an item for Hire A does not affect Hire B's checklist
T3.14 Back button in hire detail navigates to hire list
T3.15 "Configure" / "Templates" / "Resources" navigates to setup view
T3.16 Setup view shows "← Hire list" back navigation
T3.17 Dirty nav guard fires when leaving setup view with isDirty === true
```

### Test results — PS-3 (desktop 1440px + mobile 390×844, 2026-06-26)

```
T3.1  ✅  Opens in list view, no tab bar
T3.2  ✅  "Templates" and "Resources" strip visible between stats and hire list
T3.3  ✅  Hire row tap navigates to hire detail
T3.4  ✅  "← Hire list" back button in detail sub-header
T3.5  ✅  Name + role shown in sub-header; truncated correctly on narrow viewport
T3.6  ✅  MilestoneMapViewer rendered (read-only); node tap does nothing (no handler)
T3.7  ✅  Progress panel: XP total, milestone N / total, progress bar
T3.8  ✅  Pending Approvals panel; approve/reject buttons per event
T3.9  ✅  Buddy assignment panel with save
T3.10 ✅  Checklist shows "admin only" badge and "0 / 8" progress pill
T3.11 ✅  8 default items, all unchecked on first hire visit
T3.12 ✅  Toggling an item updates the checklist for that hire
T3.13 ✅  Hire A checklist state independent of Hire B (separate ephemeral records)
T3.14 ✅  Back button returns to list view
T3.15 ✅  "Configure" in detail sub-header → setup view; "Templates"/"Resources" in strip → setup view
T3.16 ✅  Setup view back arrow returns to list view
T3.17 ✅  Dirty nav guard fires; Save / Discard / Cancel all work as specified

Notes:
- Milestone map showed "0 missions" on all nodes in player view and hire detail map.
  Root cause: MilestoneMapViewer did not accept a missionCounts prop (unlike
  MilestoneMapEditor which did). Fixed by adding missionCounts?: Record<string,number>
  to MilestoneMapViewer, computing counts at call sites (PlayerCockpitPage,
  HireDetailView), and threading through. Zero-mission display is now correct.
- TopBar logout icon added for both admin and player roles, replacing the standalone
  "Back to Landing" bar. Hire detail sub-header top offset corrected from
  calc(topbar-h + 2.5rem) to topbar-h after the bar was removed.
```

> **PLR-1 / PS-12 Addendum (2026-06-26):** Once PLR-1 is implemented, `CrossHireDashboard` must handle *pending* hires (`uid === ""`): rows without XP, milestone position, or progress data, rendered with a "pending" visual indicator. This is a minor revision to the already-implemented PS-3 hire list. The pending row variant and "Add hire" button placement are specified in PS-12.

---

## PS-4 · Checklist CRUD — Inline Edit Mode

**Problem:** The onboarding checklist added in PS-3 had a broken "Edit" button: `_editMode` state was toggled but intentionally unused (underscore prefix). No edit UI was rendered. Admins could check items off but could not customize the checklist for a specific hire's context — they couldn't add items, remove irrelevant ones, rename, or reorder.

**Goal:** A lightweight inline edit mode (no modal) that allows full CRUD on the per-hire checklist while keeping state in `AdminCockpitPage` where it already lives.

**Affected files:**
- `src/components/admin/HireChecklist.tsx` — full CRUD implementation
- `src/components/admin/HireDetailView.tsx` — four new prop wires (`onRename`, `onDelete`, `onAdd`, `onReorder`)
- `src/pages/AdminCockpitPage.tsx` — four new handlers + `getChecklist` helper

**In scope:** Edit mode toggle, inline rename, delete, add, drag-to-reorder. All state remains ephemeral.  
**Out of scope:** Persistence, template presets, per-hire due dates (field exists on type, not surfaced in this PS).

**Wireframe status:** `[x] Agreed` *(2026-06-26)*

### Agreed design decisions

**Edit/Done toggle:**
- Header shows "Edit" (underlined text button) in read mode and "Done" (accent pill button) in edit mode.
- "Editing checklist" replaces the section title in edit mode; progress pill and "admin only" badge are hidden.

**Edit mode row layout (per item):**
```
┌──────────────────────────────────────────────┐
│ ⠿  Contract signed                        ×  │
│ ⠿  Tax forms submitted                    ×  │
│ ⠿  ID documents verified                  ×  │
│     ...                                      │
├──────────────────────────────────────────────┤
│ [ Add a checklist item…           ] [ Add ]  │
└──────────────────────────────────────────────┘
```
- `⠿` = `MdDragIndicator` (six-dot vertical grip). Single column, naturally wide touch target.
- Label field = inline `<input>` with no border (border-bottom highlights on focus). Commits on blur/Enter; Escape restores original value.
- `×` = delete button (1.5rem × 1.5rem with 1px border).

**Why drag handle instead of ↑↓ arrows:**
The initial implementation used two stacked small arrow buttons per row. These were rejected as not mobile-appropriate and diverging from the wireframe. Replaced with `MdDragIndicator` + HTML5 drag API:
- `draggable={true}` on each row
- `onDragStart` stores `fromIndex` in a `useRef` (not state — avoids re-render)
- `onDragOver` (with `preventDefault`) sets `dragOverIndex` state → highlighted bottom border (2px accent)
- `onDrop` calls `onReorder(from, to)`; `onDragEnd` clears both refs
- Dragging row goes to `opacity: 0.4` via `dragIndexRef.current === idx` check (ref, not state)

**Add row:**
- Always visible at the bottom of the edit list (not a button that reveals an input)
- Input state (`newLabel`) is component-local
- Enter key submits; focus returns to input after add
- "Add" button disabled (+ greyed) when input is empty

**State ownership (unchanged from PS-3):**
```ts
// AdminCockpitPage
hireChecklists: Record<string, ReadonlyArray<PreBoardingCheckItem>>

// Four new handlers
handleChecklistRename(playerId, itemId, newLabel)
handleChecklistDelete(playerId, itemId)
handleChecklistAdd(playerId, label)     // generates id: `chk_custom_${Date.now()}`
handleChecklistReorder(playerId, fromIndex, toIndex)

// Helper (used by all four to avoid code duplication)
getChecklist(playerId): ReadonlyArray<PreBoardingCheckItem>
  → hireChecklists[playerId] ?? DEFAULT_CHECKLIST
```

### Regression tests — PS-4

```
T4.1  Edit button visible in checklist header in read mode
T4.2  Tapping Edit shows "EDITING CHECKLIST" title + Done button; hides progress pill
T4.3  Tapping Done returns to read mode with progress pill and admin-only badge
T4.4  Each edit-mode row shows: drag handle icon, editable label input, delete ×
T4.5  Clicking into a label input highlights its bottom border (accent color)
T4.6  Editing a label and pressing Tab/blur commits the rename
T4.7  Pressing Escape in a label input restores the original value
T4.8  Clicking × removes the item from the list immediately
T4.9  "Add a checklist item…" input visible at bottom of edit list
T4.10 Typing in add input and clicking "Add" appends the item to the list
T4.11 Add input is cleared and focused after a successful add
T4.12 "Add" button is disabled/greyed when add input is empty
T4.13 Enter key in add input submits (same as clicking Add)
T4.14 Dragging an item to a new position reorders the list
T4.15 Drop target row shows 2px accent bottom border during drag-over
T4.16 After drop, list order reflects the reorder operation
T4.17 All CRUD operations are isolated per-hire (Hire A edits don't affect Hire B)
```

### Test results — PS-4 (desktop 1440px, 2026-06-26)

```
T4.1  ✅  Edit button present in read mode header
T4.2  ✅  Edit mode shows "EDITING CHECKLIST" + Done pill; progress pill absent
T4.3  ✅  Done → read mode with progress pill and "admin only" badge restored
T4.4  ✅  Drag handle + editable input + × delete on every row
T4.5  ✅  Focus turns on accent border-bottom
T4.6  ✅  Tab blur commits rename
T4.7  ✅  Escape restores original value
T4.8  ✅  Delete removes item
T4.9  ✅  Add row visible at bottom
T4.10 ✅  Add appends new item
T4.11 ✅  Add input clears after submit
T4.12 ✅  Add button greyed when input empty
T4.13 ✅  Enter submits add
T4.14 ⚠️  Drag-to-reorder: HTML5 drag API fires correctly (dragStart/dragOver/drop
          events verified in console). Visual drop feedback (accent border) renders.
          Playwright cannot simulate a full HTML5 drag sequence in headless mode;
          manual verification confirms reorder works on desktop Chrome.
T4.15 ✅  Drop target border accent appears on dragOver (verified visually)
T4.16 ✅  List reflects reorder after drop (verified manually)
T4.17 ✅  Hire isolation confirmed (separate hireChecklists[playerId] records)

Notes:
- T4.14/T4.16: Playwright browser_drag uses pointer events, not the HTML5 drag API.
  Reorder cannot be automated via Playwright. Acceptable trade-off for prototype;
  if drag becomes critical path, switch to @dnd-kit/core (pointer-event-based) in a
  later phase — no change to state ownership or handler signatures required.
```

---

## PLR-1 · Player Slot & Invite System — Page Logic Refactoring

> **Type:** Logic/data layer refactor — no significant UI changes. A prerequisite for PS-12, PS-5, and the PS-3 pending-hire addendum. No wireframe needed; design agreed 2026-06-26.

**Problem:** The current join flow is player-initiated. Players create themselves by typing the session code and entering their name. `joinSession` creates a minimal Player record with a device-generated UID — the admin has no way to pre-seed a slot. There is no invite mechanism. There is no concept of a "pending" hire (admin-created but not yet joined). The `department` form field is silently dropped on submit and not persisted to the Player record.

**Goal:** Establish the data model and use-case layer so that:
1. The admin can pre-create a Player slot with name, role, and department before the player joins
2. Each slot has a one-time `inviteToken` → invite URL → invite QR
3. A player claims the slot via the token; the token is cleared on claim
4. The admin can re-issue a token (rotating it, invalidating current player access, preserving all progress)
5. The profile form (`mission_m1_profile`) pre-populates from the player record's admin-seeded fields
6. `department` is correctly persisted to the Player record on form submit

**Affected files:**
- `src/types/domain.ts` — add `department?: string` and `inviteToken?: string` to `Player`
- `src/adapters/interface.ts` — add `getPlayerByInviteToken(token: string, sessionId: string): Promise<Player | null>`
- `src/adapters/mock/mockAdapter.ts` — implement new method; filter `uid === ""` entries from player-facing queries; add `getPlayerByInviteToken`
- `src/adapters/mock/mockData.ts` — add one pending player slot (uid = "", inviteToken set) to `MOCK_PLAYERS`
- `src/use-cases/joinSession.ts` — add `claimPlayerSlot(token, sessionId, adapter)` alongside existing `joinSession`
- New `src/utils/inviteUrl.ts` — `generateInviteToken(): string`, `buildInviteUrl(sessionId: string, token: string): string`
- `src/hooks/useLandingFlow.ts` — detect `?token` query param on mount; if present, call `getPlayerByInviteToken` → auto-claim → skip manual join steps; also pre-fill session code from `:sessionId` route param (currently ignored)
- `src/hooks/useFormMission.ts` — pre-populate profile form initial values from player record fields when `missionId === PROFILE_MISSION_ID`; fix `department` not being written to Player on submit

**In scope:** Player type extension, adapter contract + mock implementation, claim use case, invite URL utility, landing flow branching, profile form pre-population, `department` field fix.  
**Out of scope:** Admin UI for hire creation (PS-12), pending hire rendering in hire list (PS-12), invite QR component (PS-12).

**Blocks:** PS-12 (depends entirely on this), PS-5 (needs `department` on Player type), PS-7 (pending state variant for wireframe).

**Design decisions (agreed 2026-06-26):**

| Decision | Resolution |
|----------|-----------|
| How is "pending" encoded? | `uid === ""` sentinel — no separate status field. `getPlayer(uid)` returns null for old uid after re-invite. |
| Does `listPlayers` return pending slots? | Yes — admin needs to see them. Player-facing queries must filter `uid === ""` entries out. |
| Token format | Short random alphanumeric string (12 chars). No HMAC — the DB lookup IS the validation. |
| Re-invite mechanism | `updatePlayer(id, { uid: "", inviteToken: generateToken() })`. Progress events keyed by `player.id` (PB record ID) are unaffected. |
| Token in URL | Query param: `/join/:sessionId?token=<token>`. Existing route structure unchanged. |
| Form pre-population | `useFormMission` reads player record fields as initial values when opening `PROFILE_MISSION_ID`. Player can edit all fields; submit overwrites. |
| `department` fix | Add to the patch in `useFormMission.submitForm`; add field to Player type in this refactor. |

**Regression tests — PLR-1**

```
T-PLR1.1  Player type accepts `department` and `inviteToken` fields without TS errors
T-PLR1.2  `getPlayerByInviteToken` returns the pending slot for a valid token
T-PLR1.3  `getPlayerByInviteToken` returns null for an unknown or used token
T-PLR1.4  `claimPlayerSlot` sets uid + recoveryKey and clears inviteToken on the Player record
T-PLR1.5  After claim, the old token no longer resolves via `getPlayerByInviteToken`
T-PLR1.6  Navigating to `/join/:sessionId?token=<valid>` bypasses the manual join steps
T-PLR1.7  Navigating to `/join/:sessionId?token=<used>` shows an error state
T-PLR1.8  Profile form opens pre-populated with admin-seeded name, role, department
T-PLR1.9  Submitting the profile form writes `department` to the Player record
T-PLR1.10 `listPlayers` returns pending slots (uid = "") alongside active players
T-PLR1.11 `getPlayer(uid)` returns null after re-invite clears uid
T-PLR1.12 Re-invite preserves all progress events for the Player record
T-PLR1.13 `buildInviteUrl` returns a valid URL containing sessionId and token
T-PLR1.14 `/join/:sessionId` pre-fills the session code input from the route param
```

**Implementation status:** ⬜ Not started

---

## PS-5 · Profile Edit Views (Player + Game Maker)

> **Implemented 2026-06-29.** PLR-1 prerequisite was already in place. Smoke-tested against the full stack (port 8700) — all T5.1–T5.14 pass. Minor fix applied post-test: `AdminCockpitPage` GM display name fallback corrected from `session?.name` to `identity?.name` (requires Docker rebuild to take effect).

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
- New `src/components/shared/ProfileEditSheet.tsx` — shared sheet component, parameterised by fields
- `src/types/index.ts` — confirm `department` field exists on Player type
- `src/hooks/useResolvedPlayer.ts` — expose `updatePlayer` with partial update signature

**In scope:** Profile edit UI, department display, avatar click trigger.  
**Out of scope:** Avatar upload infrastructure (stub only), authentication changes.

**Wireframe status:** `[x] Agreed` *(2026-06-26)*

---

### Wireframe — Player Profile Sheet

The sheet slides up from the bottom of the screen, covering approximately 55–65% of viewport height. A scrim covers the rest; tapping it closes without saving. A drag handle at the top communicates dismissibility.

```
╔══════════════════════════════════════════╗
║         ╌╌╌╌╌╌  (drag handle)           ║
║                                          ║
║   ◉ AJ   Edit profile                   ║
║   [tap to upload photo — coming soon]    ║
║                                          ║
║  Display name                            ║
║  ┌──────────────────────────────────┐   ║
║  │ Alex Johnson                     │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  Preferred name (shown in greetings)     ║
║  ┌──────────────────────────────────┐   ║
║  │ Alex                             │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  Role / title                            ║
║  ┌──────────────────────────────────┐   ║
║  │ Digital Content Manager          │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  Department                              ║
║  ┌──────────────────────────────────┐   ║
║  │ Marketing                        │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  ┌──────────────────────────────────┐   ║
║  │         Save changes             │   ║  ← primary button (full width)
║  └──────────────────────────────────┘   ║
║               Cancel                    ║  ← ghost text button
╚══════════════════════════════════════════╝
```

Avatar circle in the sheet header:
- Shows current initials (same logic as TopBar)
- "Tap to upload" label underneath — shows a `"Coming soon"` toast on tap; no upload implemented

Department field renders under the welcome header on the player cockpit:
```
Welcome, Alex.
Digital Content Manager · Marketing       ← new line, muted text, font-size: var(--text-sm)
Your onboarding journey starts here.
```

---

### Wireframe — GM Profile Sheet

Simpler — only display name, since GM auth state is thinner than a full Player record.

```
╔══════════════════════════════════════════╗
║         ╌╌╌╌╌╌  (drag handle)           ║
║                                          ║
║   ◉ M2   Edit your display name         ║
║                                          ║
║  Display name                            ║
║  ┌──────────────────────────────────┐   ║
║  │ Game Master                      │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  ┌──────────────────────────────────┐   ║
║  │         Save changes             │   ║
║  └──────────────────────────────────┘   ║
║               Cancel                    ║
╚══════════════════════════════════════════╝
```

GM name change updates the `TopBar` display only (session-scoped string state in `AdminCockpitPage`; no backend write needed in prototype).

---

### User interaction flow

**Player — open and edit:**
1. Player taps the avatar initials circle in TopBar (top-left)
2. `onAvatarClick` fires → `PlayerCockpitPage` sets `isProfileEditOpen = true`
3. `ProfileEditSheet` renders with `open={true}` → sheet animates up from bottom
4. Fields pre-filled from `player` record (`name`, `preferredName`, `role`, `department`)
5. Player edits any combination of fields (local draft state inside `ProfileEditSheet`)
6. Player taps **Save changes**:
   a. `updatePlayer({ name, preferredName, role, department })` called (mock adapter: immediate)
   b. Sheet closes (`isProfileEditOpen = false`)
   c. TopBar re-renders with new initials/name (via the same `player` record)
   d. Welcome header re-renders with updated name + department
7. Player taps **Cancel** or the scrim → sheet closes; draft state discarded; no update call

**Player — unsaved changes guard:**
- If player edited at least one field and taps Cancel or the scrim → confirm discard:
  ```
  "Discard changes?" [ Keep editing ]  [ Discard ]
  ```
  This is a lightweight `window.confirm` or inline pill — not a full ConfirmDialog — to keep the interaction fast.

**GM — open and edit:**
1. GM taps avatar in TopBar (same `onAvatarClick` prop)
2. `AdminCockpitPage` sets `isGMProfileEditOpen = true`
3. Simpler sheet renders with only display name field
4. Save → updates session-scoped GM name string in local state → TopBar re-renders
5. Cancel → closes, no change

---

### Pre-implementation decisions to confirm

| Decision | Options | Resolution |
|----------|---------|-----------|
| Is `name` editable? | Yes (editable) / No (read-only, set at join) | **Editable** — players often join with a full name and want to use a shorter display name |
| `department` field on `Player` type | Added in PLR-1 | ✅ Resolved by PLR-1 — do not add again |
| `preferredName` field on `Player` type | Already present in `domain.ts` | ✅ Confirmed present |
| Where does `department` appear in player cockpit? | Under welcome header / on buddy card / TopBar subtitle | **Under welcome header** — buddy card is about the buddy, not the player |
| Avatar upload | Implement / Stub with "coming soon" | **Stub** — keep scope tight; infrastructure cost is non-trivial |
| Unsaved changes guard | `window.confirm` / inline pill / full `ConfirmDialog` | **Inline pill** — matches the lightness of the sheet interaction |
| GM profile persistence | Session-scoped state / Player record update | **Session-scoped** for prototype |

---

### Affected files

- `src/components/shared/TopBar.tsx` — add `onAvatarClick?: () => void`; convert `.topbar__avatar` div → `<button>`; remove `aria-hidden`; add `cursor: pointer` and `minWidth/minHeight: var(--min-touch)`
- `src/pages/PlayerCockpitPage.tsx` — `isProfileEditOpen` state; `handleAvatarClick`; render `<ProfileEditSheet>`
- `src/pages/AdminCockpitPage.tsx` — `isGMProfileEditOpen` state; `handleAvatarClick`; render `<GMProfileSheet>` (or reuse `ProfileEditSheet` with `variant="gm"`)
- New `src/components/shared/ProfileEditSheet.tsx` — controlled sheet component; internal draft state; `onSave(fields)` / `onClose()` props
- `src/pages/PlayerCockpitPage.tsx` — add department line under welcome header
- `src/types/domain.ts` — audit `Player` type for `preferredName`, `department` fields
- `src/hooks/useResolvedPlayer.ts` — confirm `updatePlayer` accepts partial `Player` fields

### Regression tests — PS-5

```
T5.1  TopBar avatar is a focusable button element (not aria-hidden)
T5.2  Tapping avatar in player cockpit opens the profile edit sheet
T5.3  Sheet pre-fills all fields from the current player record
T5.4  Editing a field and saving updates the player cockpit welcome header
T5.5  Saving updates the TopBar initials/name if name was changed
T5.6  Cancel closes the sheet with no changes to the player record
T5.7  Tapping the scrim closes the sheet (same as Cancel)
T5.8  Editing a field then tapping Cancel shows the discard prompt
T5.9  Department is shown under the welcome header in player cockpit
T5.10 Tapping avatar in admin cockpit opens the GM profile sheet (not player sheet)
T5.11 GM sheet contains only the display name field
T5.12 Saving GM sheet updates the TopBar display name in admin cockpit
T5.13 Avatar "upload" tap shows "Coming soon" toast; no upload dialog opens
T5.14 Sheet is accessible: all inputs are labelled; focus is trapped inside sheet
T5.15 Sheet closes correctly on mobile when the OS keyboard appears and dismisses
```

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

> **Partially blocked by PLR-1 / PS-12.** The hire list row wireframe must incorporate the "pending" hire state introduced by PLR-1/PS-12 (no XP, no progress, pending indicator). Finalize the PS-7 wireframe after PS-12 design is locked.

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

## PS-12 · Admin Hire Creation + Invite Flow

> **Depends on PLR-1.** Do not implement until PLR-1 is complete.

**Problem:** The admin has no way to create a hire slot from the dashboard. The only way a player enters the system is by typing the session code themselves on the landing page — the admin cannot pre-seed name, role, or department, and there is no invite mechanism to direct a specific person to a specific slot.

**Goal:** Add an "Add hire" action to the admin hire list view. The created slot appears immediately in the hire list with a "pending" status (invite not yet accepted). The hire detail view shows an invite block (URL + QR) for unclaimed slots, and a low-prominence "Re-invite player" button for active players that rotates the token and reverts the hire to pending.

This is the sole new admin UI chunk enabled by PLR-1.

**Affected files:**
- `src/pages/AdminCockpitPage.tsx` — "Add hire" handler; `createPlayerSlot` use-case call; re-invite handler
- `src/components/admin/CrossHireDashboard.tsx` — "pending" state row variant for `uid === ""` hires; "Add hire" button in toolbar
- `src/components/admin/HireDetailView.tsx` — invite block for pending hires; re-invite button for active hires; re-invite confirmation dialog
- New `src/components/admin/HireCreateForm.tsx` — inline/sheet form: name (required), role (required), department (required), buddy (optional)
- New `src/components/admin/InviteBlock.tsx` — invite URL text + QR code + copy-link button + status message

**In scope:** Hire creation form, invite block UI, pending row variant in hire list, re-invite button + confirmation, invite QR display.  
**Out of scope:** Invite delivery by email, per-hire milestone setup (deferred — see PS-3 note), QR scanning infrastructure (already exists separately for mission validation).

**Depends on:** PLR-1 (types, adapter, `claimPlayerSlot` use case, `inviteUrl.ts` utility).

**Wireframe status:** `[x] Agreed` *(2026-06-26)*

---

### Wireframe — Hire List with Pending State

```
┌──────────────────────────────────────────────┐
│  New Hires  · 3 active  · 1 pending          │
│                                              │
│  [ + Add new hire ]   [ Templates ] [ Resources ] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🟡  Sarah K.   · HR & Organisation    │ >│  ← pending (uid = "")
│  │     Invite not yet accepted            │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ 🟢  Alex Johnson  · Marketing          │ >│  ← active
│  │     Milestone 2 / 4  ·  40 XP         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Wireframe — Invite Block (Pending Hire Detail)

```
╔══════════════════════════════════════════╗
║  ← Hire list    Sarah K.  · HR & Org    ║  ← sub-header (unchanged)
╠══════════════════════════════════════════╣
║                                          ║
║  ┌──────────────────────────────────┐   ║
║  │  Waiting for player to join      │   ║
║  │                                  │   ║
║  │       [████ QR CODE ████]        │   ║
║  │                                  │   ║
║  │  https://…/join/sess_…?          │   ║
║  │  token=XXXXXXXXXXXX              │   ║
║  │  [ Copy link ]                   │   ║
║  │                                  │   ║
║  │  This player has not joined yet. │   ║
║  │  Share this link with them.      │   ║
║  └──────────────────────────────────┘   ║
║                                          ║
║  (milestone map, checklist below)        ║
╚══════════════════════════════════════════╝
```

### Wireframe — Re-invite (Active Hire Detail Footer)

```
╔══════════════════════════════════════════╗
║  (hire detail content above)             ║
╠══════════════════════════════════════════╣
║                                          ║
║  ┌──────────────────────────────────┐   ║
║  │  [ Re-invite player ]            │   ║  ← small, muted, destructive styling
║  └──────────────────────────────────┘   ║
╚══════════════════════════════════════════╝

Confirmation dialog:
"This will invalidate Alex's current access. They will need to rejoin
using a new link. Their progress will be preserved."
                              [ Cancel ]  [ Re-invite ]
```

### Regression tests — PS-12

```
T12.1  "Add new hire" button is visible in the hire list toolbar
T12.2  Clicking "Add new hire" opens the hire creation form
T12.3  Hire creation form requires: name, role, department
T12.4  Submitting the form creates a Player record with uid="" and an inviteToken
T12.5  New hire appears immediately in the hire list with a pending indicator
T12.6  Pending hire row shows "Invite not yet accepted" (no XP, no milestone)
T12.7  Clicking a pending hire's row opens hire detail with the invite block
T12.8  Invite block shows a QR code and a copyable URL
T12.9  Invite block message: "This player has not joined yet. Share this link with them."
T12.10 "Copy link" copies the full invite URL to clipboard
T12.11 An active hire (uid ≠ "") does NOT render the invite block
T12.12 An active hire renders a "Re-invite player" button in the detail view
T12.13 Tapping "Re-invite player" shows the destructive confirmation dialog
T12.14 Confirmation dialog warns that current access will be invalidated
T12.15 Confirming re-invite calls updatePlayer({ uid: "", inviteToken: newToken })
T12.16 After re-invite, hire switches to pending in the list
T12.17 After re-invite, existing player's CachedIdentity no longer resolves (getPlayer → null)
T12.18 After re-invite, player progress events are unchanged
T12.19 Player joining via new invite link successfully claims the same Player record
```

---

## Implementation Order (Dependency Graph)

```
PLR-1 (page logic: types, adapter, use cases, landing flow, form pre-fill)
  └── PS-12 (admin hire creation + invite UI)    ← blocked by PLR-1
  └── PS-5  (profile edit views)                 ← blocked by PLR-1 (department field)
  └── PS-7  (hire list + map sizing)             ← partially blocked (pending row variant)
  └── PS-3 addendum (pending hire in list)       ← minor revision, depends on PLR-1

PS-8 (milestone node visuals)  ← independent; CSS-only
  └── PS-11A (remove YouAreHereMarker)           ← depends on PS-8 being done

PS-6  (AI chat expanded)       ← independent, player cockpit only
PS-9  (XP gain toasts)         ← depends on useProgress hook; player cockpit only
PS-10 (quiz mission type)      ← independent feature track; own data + UI track
PS-11B (active mission view)   ← player cockpit only; audit sidebar at wireframe stage
```

**Recommended sequence:**
1. **PLR-1** — logic prerequisite for the invite flow; no UI changes
2. **PS-12** — admin hire creation + invite UI (depends on PLR-1)
3. **PS-5** — profile edit views (unblocked after PLR-1 adds `department`)
4. **PS-8** — milestone node visuals (independent; CSS-only)
5. **PS-11A** — remove YouAreHereMarker (after PS-8)
6. **PS-11B** — active mission view (wireframe pattern decision first)
7. **PS-9** — XP gain toasts (after mission view is stable)
8. **PS-6** — AI chat expanded (independent)
9. **PS-7** — hire list + map sizing (wireframe after PS-12 design is locked)
10. **PS-10** — quiz mission type (own track; can start any time)

---

## Implementation Status

| Chunk | Type | Wireframe / Design | Implementation |
|-------|------|--------------------|----------------|
| PS-1 · Admin Cockpit Primary View | UI | ✅ Agreed 2026-06-25 | ✅ Implemented 2026-06-25 |
| PS-2 · Map + Mission Lazy Render | UI | ✅ Agreed 2026-06-25 | ✅ Implemented 2026-06-25 |
| PS-3 · Admin Hire-First Architecture | UI | ✅ Agreed 2026-06-26 | ✅ Implemented 2026-06-26 |
| PS-4 · Checklist CRUD — Inline Edit Mode | UI | ✅ Agreed 2026-06-26 | ✅ Implemented 2026-06-26 |
| PLR-1 · Player Slot & Invite System | Logic | ✅ Design agreed 2026-06-26 | ✅ Implemented 2026-06-29 |
| PS-12 · Admin Hire Creation + Invite UI | UI | ✅ Agreed 2026-06-26 | ⬜ Blocked by PLR-1 |
| PS-5 · Profile Edit Views | UI | ✅ Agreed 2026-06-26 | ✅ Implemented 2026-06-29 |
| PS-6 · AI Chat Expanded | UI | ⬜ Not started | — |
| PS-7 · Hire List + Map Sizing | UI | ⬜ Blocked by PS-12 | — |
| PS-8 · Milestone Node Visuals | UI | ⬜ Not started | — |
| PS-9 · XP Toast Notifications | UI | ⬜ Not started | — |
| PS-10 · Quiz Mission Type | Feature | ⬜ Not started | — |
| PS-11A · Remove YouAreHereMarker | UI | ✅ Agreed | ⬜ After PS-8 |
| PS-11B · Active Mission View | UI | ⬜ Not started | — |

**Implementation entry point for a coding agent:** PS-1 through PS-5 and PLR-1 are fully implemented. Next up is PS-12 (admin hire creation + invite UI) — depends on PLR-1 which is now done. PS-8 (milestone node visuals) is independent and can proceed in parallel.

---

## Session Backlog

- [x] **PS-1 · Admin restructure** — agreed 2026-06-25; implemented 2026-06-25
- [x] **PS-2 · Lazy map tab** — agreed 2026-06-25; implemented 2026-06-25
- [x] **PS-3 · Admin hire-first architecture** — agreed + implemented 2026-06-26; see PLR-1/PS-12 addendum for pending hire revision
- [x] **PS-4 · Checklist CRUD** — agreed + implemented 2026-06-26; drag handle replaces ↑↓ arrows
- [x] **PLR-1 · Player slot & invite system** — implemented 2026-06-29; types, adapter (mock + PB), use cases, landing flow branching, form pre-fill
- [ ] **PS-12 · Admin hire creation + invite UI** — wireframe agreed 2026-06-26; blocked by PLR-1; hire creation form, invite block, pending state, re-invite
- [x] **PS-5 · Profile edit views** — implemented 2026-06-29; player + GM bottom sheets, department under welcome header, smoke-tested T5.1–T5.14
- [ ] **PS-6 · AI chat expanded** — wireframe decision needed: pattern A (overlay), B (draggable sheet), or C (dedicated tab)
- [ ] **PS-7 · Sizing adjustments** — wireframe after PS-12 locked; hire list row layout (inc. pending variant) + map container proportions
- [ ] **PS-8 · Milestone node visuals** — agree color tier palette + text contrast fix; CSS-only
- [ ] **PS-9 · XP gain toasts** — agree position (top vs. bottom), style (Toast variant), animation; implement after mission view stable
- [ ] **PS-10 · Quiz mission type** — agree notation format (MCQ + fill-in-the-blank syntax); own track; GM authoring view + player quiz flow
- [x] **PS-11A · Remove YouAreHereMarker** — agreed; implement after PS-8
- [ ] **PS-11B · Active mission view** — decide pattern: tabs (A) vs. accordion (B) vs. priority split (C); wireframe milestone grouping + GM priority badge
