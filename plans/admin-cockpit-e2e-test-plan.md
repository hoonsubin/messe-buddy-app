# Admin Cockpit — E2E Test Plan

> **Project:** MesseBuddy  
> **Target:** Admin Cockpit Phase 6 Gap Analysis fixes (GAP #1, #2, #3)  
> **Author:** QA / Documentation  
> **Date:** 2026-06-15  
> **Status:** Draft  

---

## Table of Contents

1. [Test Environment Prerequisites](#test-environment-prerequisites)
2. [Session A: MilestoneMapEditor CRUD](#session-a-milestonemapeditor-crud)
3. [Session B: Mission List + Batch Save](#session-b-mission-list--batch-save)
4. [Session C: Form Schema Persistence](#session-c-form-schema-persistence)
5. [Session D: Template Library](#session-d-template-library)
6. [Session E: Visual Regression](#session-e-visual-regression)
7. [Pass/Fail Checklist](#passfail-checklist)

---

## Test Environment Prerequisites

| Requirement | Value |
|-------------|-------|
| Browser | Chrome 120+, Firefox 120+, Safari 17+ |
| Device testing | Desktop (mouse + keyboard) + Mobile (touch, ≥375px viewport) |
| Dev server | `deno task dev` running on `http://localhost:5173` |
| Adapter | Mock adapter (default) — no PocketBase required |
| Seed data | Default mock seed data with ≥2 sessions, ≥4 milestones, ≥6 missions |
| Network | Local only — no external API dependencies |
| Console | DevTools open to monitor console errors |

### Pre-Test Checklist

- [ ] `deno task dev` starts without errors
- [ ] Admin cockpit loads at `http://localhost:5173/admin/{sessionId}`
- [ ] Mock data includes milestones with missions across multiple types (text, form, qr/link)
- [ ] Console shows no uncaught errors on initial load
- [ ] `data-testid` attributes present on key containers: [`admin-cockpit-page`](../src/pages/AdminCockpitPage.tsx:869), [`milestone-map-editor`](../src/components/admin/MilestoneMapEditor.tsx:407), [`admin-missions-list`](../src/components/admin/AdminMissionsList.tsx:198), [`map-editor-drag-area`](../src/components/admin/MilestoneMapEditor.tsx:429), [`template-library`](../src/components/admin/TemplateLibrary.tsx:45), [`save-template-modal`](../src/components/admin/SaveTemplateModal.tsx:17), [`grid-overlay`](../src/components/admin/GridOverlay.tsx:12), milestone nodes (`milestone-node-{id}`)

### Test Data Conventions

| Identifier | Example value | Notes |
|------------|---------------|-------|
| Session ID | `mock-session-1` | First seed session |
| Milestones | `ms-1` through `ms-N` | Provided by mock seed data |
| Missions | `mission-1` through `mission-N` | Provided by mock seed data |
| Draft IDs | Auto-generated 15-char hex | Synthetic IDs for unsaved records |
| Template names | `"QA Test Template"` | Used during template save/load tests |

### Verification Methods

Tests in this plan use the following verification methods:

| Method | Description |
|--------|-------------|
| **Visual check** | Observe UI changes directly in the browser |
| **Console monitoring** | Monitor browser DevTools console for errors during interaction |
| **Data persistence check** | Reload the page and verify state is preserved |
| **DOM inspection** | Use DevTools Elements panel to verify attributes (`data-testid`, `aria-*`, CSS classes) |
| **Network monitoring** | Verify mock adapter calls via expected behavior (no actual network) |

---

## Session A: MilestoneMapEditor CRUD

**Feature:** MilestoneMapEditor Touch-Friendly CRUD  
**Device coverage:** Desktop scenarios use mouse + right-click; touch scenarios use touch emulation or physical device  
**Core file:** [`src/components/admin/MilestoneMapEditor.tsx`](../src/components/admin/MilestoneMapEditor.tsx)  
**Related:** [`src/components/shared/MilestoneNode.tsx`](../src/components/shared/MilestoneNode.tsx)

---

### A-1: Desktop — Right-click milestone → Rename via context menu

| Field | Value |
|-------|-------|
| **Scenario** | Desktop right-click context menu rename |
| **Feature** | MilestoneMapEditor context menu |
| **Precondition** | Admin cockpit loaded with ≥1 milestone on map |
| **Steps** | 1. Navigate to admin cockpit for a seeded session<br>2. Locate a milestone node on the map<br>3. Right-click on the milestone node<br>4. In the context menu that appears, click "Rename"<br>5. In the inline rename input that appears, type "Renamed Milestone A"<br>6. Press Enter (or click the "Rename" button) |
| **Expected Result** | • Context menu appears at cursor position with "Rename" and "Delete" menu items<br>• Inline rename input appears below the map after clicking "Rename"<br>• The milestone name updates to "Renamed Milestone A" after submission<br>• The [`handleRenameSubmit`](../src/components/admin/MilestoneMapEditor.tsx:309) callback fires: `onRename(milestoneId, "Renamed Milestone A")`<br>• Milestone node label in the map updates immediately |
| **Pass/Fail Criteria** | Pass: Milestone name is updated visually on the map node. Fail: Context menu does not appear, rename input does not appear, or name does not change. |
| **Test Data** | Right-click on any seeded milestone (e.g., the first milestone in order) |

---

### A-2: Desktop — Double-click milestone → inline rename

| Field | Value |
|-------|-------|
| **Scenario** | Desktop double-click inline rename |
| **Feature** | MilestoneMapEditor inline rename (desktop) |
| **Precondition** | Admin cockpit loaded; mouse and keyboard available (no touch emulation) |
| **Steps** | 1. Locate a milestone node on the map<br>2. Double-click the milestone node<br>3. Observe the inline rename input appears below the map<br>4. Type "Double-click Rename" in the input<br>5. Press Enter |
| **Expected Result** | • Double-click triggers [`handleNodeDoubleClick`](../src/components/admin/MilestoneMapEditor.tsx:392) → sets `renameId`<br>• Inline rename input appears with placeholder "New milestone name"<br>• Submitting changes the milestone name to "Double-click Rename"<br>• The [`onRename`](../src/components/admin/MilestoneMapEditor.tsx:17) callback fires with correct ID and name<br>• Single click on desktop navigates to detail; double-click enters rename |
| **Pass/Fail Criteria** | Pass: Milestone name updates to "Double-click Rename" after double-click + rename action. Single click does NOT enter rename mode on desktop. |
| **Test Data** | Use any milestone that is not currently being dragged or editted |

---

### A-3: Desktop — Drag milestone to new position → verify grid snap

| Field | Value |
|-------|-------|
| **Scenario** | Desktop drag with snap-to-grid |
| **Feature** | MilestoneMapEditor drag with grid snap |
| **Precondition** | Grid overlay enabled via "Grid on" toggle button; admin cockpit loaded |
| **Steps** | 1. Enable grid overlay by clicking the "Grid on" button (map top-left corner)<br>2. Verify grid lines are visible on the map across the entire viewport<br>3. Locate a milestone node with known position (e.g., `xPercent: 25, yPercent: 40`)<br>4. Click and hold (pointer down) on the milestone node<br>5. Drag the node diagonally at least 20px to a position roughly (33%, 38%)<br>6. Observe the ghost outline at the original position and snap indicator at target<br>7. Release the pointer (pointer up)<br>8. Verify the milestone's new position snaps to grid (nearest 10%) |
| **Expected Result** | • Pointer down sets `setPointerCapture()` and initializes [`dragRef`](../src/components/admin/MilestoneMapEditor.tsx:57)<br>• Ghost element (`milestone-node__ghost` class, `aria-hidden="true"`) appears at original position during drag<br>• Snap indicator (`snap-indicator` class, `aria-hidden="true"`) appears at the nearest 10%×10% grid intersection when grid is enabled and the difference exceeds 1%<br>• On release, position rounds to nearest 10% (e.g., 33%→30%, 38%→40%)<br>• [`handleNodeDrop`](../src/components/admin/MilestoneMapEditor.tsx:14) fires with snapped `xPercent` and `yPercent` values<br>• Milestone visually moves to new snapped position<br>• Drag state is cleaned up: ghost + snap indicator disappear, `dragRef` set to null |
| **Pass/Fail Criteria** | Pass: Milestone snaps to nearest 10% grid line and remains at snapped position after release. Ghost and snap indicator visible during drag. |
| **Test Data** | Drag a milestone from (25%, 40%) to approximately (33%, 38%) → should snap to (30%, 40%) |

---

### A-4: Touch — Long-press on node → context menu → Rename

| Field | Value |
|-------|-------|
| **Scenario** | Touch long-press context menu rename |
| **Feature** | MilestoneMapEditor touch long-press context menu |
| **Precondition** | Touch-enabled device or browser DevTools touch emulation; admin cockpit loaded |
| **Steps** | 1. Enable touch emulation in DevTools (Chrome: Device Toolbar, select a mobile device)<br>2. Locate a milestone node on the map<br>3. Touch and hold (long-press) the milestone node for 500+ ms without moving<br>4. Observe the context menu appears<br>5. Tap "Rename" in the context menu<br>6. Type "Touch Rename" in the inline rename input<br>7. Tap the "Rename" button |
| **Expected Result** | • After 500ms hold, context menu appears at touch position<br>• [`handlePointerUp`](../src/components/admin/MilestoneMapEditor.tsx:214) detects `e.pointerType === "touch"` AND `elapsed >= LONG_PRESS_MS` (500) AND `!moved` → sets context menu state<br>• Tapping "Rename" dismisses context menu and shows inline rename input<br>• Submitting the rename updates the milestone name to "Touch Rename"<br>• `onRename` callback fires correctly |
| **Pass/Fail Criteria** | Pass: Long-press on touch device shows context menu, rename flow completes successfully. Short tap enters rename directly without context menu (per A-5). |
| **Test Data** | Any seeded milestone; rename to "Touch Rename" |

---

### A-5: Touch — Single tap on node → inline rename

| Field | Value |
|-------|-------|
| **Scenario** | Touch single tap inline rename |
| **Feature** | MilestoneMapEditor touch inline rename |
| **Precondition** | Touch emulation active; admin cockpit loaded |
| **Steps** | 1. Tap (short press, <500ms) a milestone node on the map<br>2. Observe the inline rename input appears below the map |
| **Expected Result** | • Short tap on touch device triggers [`handleNodeClick`](../src/components/admin/MilestoneMapEditor.tsx:378) → since `isTouchDevice` is true, sets `renameId` directly (bypasses context menu)<br>• Inline rename input appears below the map with placeholder "New milestone name"<br>• Entering a name and submitting updates the milestone |
| **Pass/Fail Criteria** | Pass: Single tap on touch device enters rename mode directly without context menu. |
| **Test Data** | Tap any milestone node |

---

### A-6: Touch — Drag milestone → ghost + snap indicator

| Field | Value |
|-------|-------|
| **Scenario** | Touch drag with visual feedback |
| **Feature** | MilestoneMapEditor touch drag with visual feedback |
| **Precondition** | Grid overlay enabled; touch emulation active; admin cockpit loaded |
| **Steps** | 1. Enable grid overlay<br>2. Touch a milestone node<br>3. Drag it (move finger) across the map past the 5px threshold<br>4. Observe the ghost at original position and snap indicator during drag<br>5. Release at new position |
| **Expected Result** | • [`onPointerDown`](../src/components/admin/MilestoneMapEditor.tsx:107) fires with `e.pointerType === "touch"` → `setIsTouchDevice(true)`<br>• After exceeding [`DRAG_THRESHOLD_PX`](../src/components/admin/MilestoneMapEditor.tsx:8) (5px), `hasDragged` set to true → drag visuals activate<br>• Ghost element visible at original position throughout drag<br>• Snap indicator appears when grid is enabled and position nears a 10% grid line<br>• [`setPointerCapture()`](../src/components/admin/MilestoneMapEditor.tsx:137) ensures drag events track even if finger leaves the node<br>• On pointer up, milestone moves to snapped position<br>• Drag state cleaned up: ghost + snap indicator disappear |
| **Pass/Fail Criteria** | Pass: Ghost and snap indicator visible during touch drag. Milestone position updates on release. |
| **Test Data** | Drag milestone from original position to roughly (55%, 60%) |

---

### A-7: Long-press on empty map area → new milestone created

| Field | Value |
|-------|-------|
| **Scenario** | Empty-area long-press creates milestone |
| **Feature** | MilestoneMapEditor empty-area long-press |
| **Precondition** | Admin cockpit loaded; map area has at least one empty space (no milestone at target position) |
| **Steps** | 1. Locate an empty area on the map (no milestone nodes nearby)<br>2. Touch and hold the empty area for 500+ ms without moving<br>3. Observe that a new milestone appears at the pressed position<br>4. Verify the new milestone has the default name "New Milestone" |
| **Expected Result** | • After 500ms hold, [`onAddMilestoneAt`](../src/components/admin/MilestoneMapEditor.tsx:16) fires with computed `xPercent` and `yPercent`<br>• [`clientToPercent()`](../src/components/admin/MilestoneMapEditor.tsx:81) converts touch coordinates to percentage (0–100), applying grid snap if enabled<br>• New milestone added to `draftMilestones` state with name "New Milestone"<br>• Milestone node appears on the map at the correct position<br>• The new milestone has a synthetic ID generated by [`makeId()`](../src/pages/AdminCockpitPage.tsx:70)<br>• Pointer movement before 500ms cancels the long-press timer (no milestone created) |
| **Pass/Fail Criteria** | Pass: New "New Milestone" node appears at the long-pressed position on the map. Moving before 500ms cancels creation. |
| **Test Data** | Long-press at roughly 40% from left, 60% from top of the map area |

---

### A-8: Right-click → Delete → confirmation modal

| Field | Value |
|-------|-------|
| **Scenario** | Delete milestone with confirmation |
| **Feature** | MilestoneMapEditor delete with confirmation |
| **Precondition** | Admin cockpit loaded; ≥1 milestone on map |
| **Steps** | 1. Right-click on a milestone node<br>2. In the context menu, click "Delete"<br>3. Observe that a confirmation modal appears<br>4. Verify the modal shows the milestone name (e.g., "Are you sure you want to delete 'Milestone Name'?")<br>5. Cancel the modal by clicking outside or "Cancel" — verify milestone still visible<br>6. Right-click → Delete again to reopen modal<br>7. Click the "Delete" button in the modal |
| **Expected Result** | • Right-click → [`handleContextMenu`](../src/components/admin/MilestoneMapEditor.tsx:295) fires → context menu appears<br>• Clicking "Delete" in context menu sets `deleteConfirmId` → confirmation modal appears<br>• Modal shows: "Are you sure you want to delete '{milestone name}'? All associated missions will also be removed. This action cannot be undone."<br>• Canceling dismisses the modal without removing the milestone<br>• Clicking "Delete" in the modal calls [`handleDeleteConfirm`](../src/components/admin/MilestoneMapEditor.tsx:329) → `onDelete` fires<br>• Milestone removed from `draftMilestones` — milestone node disappears from the map<br>• Deletion is only in draft state — actual persistence happens on Save |
| **Pass/Fail Criteria** | Pass: Confirmation modal shows correct milestone name with mission warning. Cancel does not remove milestone. Confirming removes milestone from map. |
| **Test Data** | Delete the first milestone in the list (e.g., the one with the lowest order) |

---

### A-9: Grid overlay toggle → verify snap behavior changes

| Field | Value |
|-------|-------|
| **Scenario** | Grid toggle affects snap |
| **Feature** | MilestoneMapEditor grid toggle |
| **Precondition** | Admin cockpit loaded |
| **Steps** | 1. Click the grid toggle button (shows "Grid off" initially)<br>2. Verify the button text changes to "Grid on" and `aria-pressed` is `true`<br>3. Verify the grid overlay SVG becomes visible with column and row lines<br>4. Drag a milestone and verify snap indicator appears during drag<br>5. Click the grid toggle button again<br>6. Verify button text changes to "Grid off" and `aria-pressed` is `false`<br>7. Verify grid overlay disappears<br>8. Drag a milestone and verify no snap indicator appears during drag |
| **Expected Result** | • Toggling button sets [`gridEnabled`](../src/components/admin/MilestoneMapEditor.tsx:51) state<br>• Grid overlay SVG (with `data-testid="grid-overlay"`) shown/hidden based on state<br>• [`GridToggleButton`](../src/components/admin/GridOverlay.tsx:29) updates `aria-pressed` and label text<br>• With grid on: [`clientToPercent`](../src/components/admin/MilestoneMapEditor.tsx:81) rounds to nearest 10%, snap indicator visible<br>• With grid off: raw pixel-to-percent conversion, no snap indicator<br>• Ghost element appears at original position regardless of grid state |
| **Pass/Fail Criteria** | Pass: Grid toggles on/off visually. Snap indicator appears only when grid is enabled. |
| **Test Data** | Test drag with grid on, then with grid off — verify snap behavior difference |

---

### A-10: "+ Add Milestone" button → verify milestone created

| Field | Value |
|-------|-------|
| **Scenario** | Button-based milestone creation |
| **Feature** | MilestoneMapEditor button-based milestone creation |
| **Precondition** | Admin cockpit loaded |
| **Steps** | 1. Click the "+ Add Milestone" button below the map<br>2. Observe a new milestone appears at the default position (50%, 50%)<br>3. Verify the new milestone has the default name "New milestone" (lowercase 'm') |
| **Expected Result** | • Clicking the button fires [`onAddMilestone`](../src/components/admin/MilestoneMapEditor.tsx:15)<br>• [`handleAddMilestone`](../src/pages/AdminCockpitPage.tsx:399) creates a new `DraftMilestone` with `id` from `makeId()`, name `"New milestone"`, position `(50, 50)`<br>• New milestone node renders on the map at (50%, 50%)<br>• The milestone is in `draftMilestones` state |
| **Pass/Fail Criteria** | Pass: New "New milestone" node appears at (50%, 50%) on the map after clicking the button. |
| **Test Data** | Click the button 3 times → verify 3 new milestones appear (all at 50%, 50%, overlapping — each can be dragged to separate positions) |

---

## Session B: Mission List + Batch Save

**Feature:** AdminMissionsList grouping + drag reorder + batch save (GAP #1, GAP #2)
**Core files:** [`src/components/admin/AdminMissionsList.tsx`](../src/components/admin/AdminMissionsList.tsx), [`src/pages/AdminCockpitPage.tsx`](../src/pages/AdminCockpitPage.tsx) (save logic at lines 662–772)

---

### B-1: Verify AdminMissionsList renders below the map

| Field | Value |
|-------|-------|
| **Scenario** | Missions list baseline rendering |
| **Feature** | AdminMissionsList rendering |
| **Precondition** | Admin cockpit loaded with a session that has ≥1 milestone with ≥1 mission |
| **Steps** | 1. Load admin cockpit page<br>2. Scroll down below the map area<br>3. Verify the "Missions" section is visible<br>4. Verify `data-testid="admin-missions-list"` is present |
| **Expected Result** | • [`AdminMissionsList`](../src/components/admin/AdminMissionsList.tsx:73) component renders below the map<br>• Section header "Missions" is visible in uppercase with sticky positioning<br>• Each milestone appears as a group with missions listed below |
| **Pass/Fail Criteria** | Pass: Missions list section is visible below the map with correct header. |
| **Test Data** | Load session with known missions (e.g., `mock-session-1`) |

---

### B-2: Verify missions grouped by milestone with count

| Field | Value |
|-------|-------|
| **Scenario** | Milestone grouping and count display |
| **Feature** | AdminMissionsList group rendering |
| **Precondition** | Admin cockpit loaded with a session containing multiple milestones, each with missions |
| **Steps** | 1. Observe the missions list<br>2. Verify milestones are grouped with a header showing the milestone name<br>3. Verify each group header shows a mission count (e.g., "3 missions")<br>4. Verify groups are sorted by milestone order (`milestone.order`) |
| **Expected Result** | • [`buildGroups()`](../src/components/admin/AdminMissionsList.tsx:36) correctly groups missions by `milestoneId`<br>• Each group header displays milestone name + count (e.g., "2 missions")<br>• Groups sorted by `milestone.order` (ascending)<br>• Missions within each group sorted by `mission.order` (ascending) |
| **Pass/Fail Criteria** | Pass: Missions appear under correct milestone headers with accurate counts, sorted by order. |
| **Test Data** | Use seed data with known milestone→mission relationships |

---

### B-3: Collapse/expand a milestone group

| Field | Value |
|-------|-------|
| **Scenario** | Collapse/expand milestone groups |
| **Feature** | AdminMissionsList collapsible groups |
| **Precondition** | Missions list rendered with ≥2 groups |
| **Steps** | 1. Click the header of a milestone group (the button with milestone name)<br>2. Verify the group collapses — missions inside are hidden<br>3. Verify the chevron icon changes from `MdExpandMore` (▼) to `MdChevronRight` (▶)<br>4. Click the same header again<br>5. Verify the group expands — missions become visible again<br>6. Verify the chevron returns to `MdExpandMore` |
| **Expected Result** | • Collapse toggle adds the milestone ID to [`collapsedGroups`](../src/components/admin/AdminMissionsList.tsx:82) state Set<br>• Missions in collapsed group are hidden (the `!isCollapsed` branch skips rendering)<br>• Chevron icon toggles between `MdExpandMore` and `MdChevronRight`<br>• Other groups are unaffected by the toggle |
| **Pass/Fail Criteria** | Pass: Clicking a group header toggles its collapsed/expanded state. Icon reflects current state. |
| **Test Data** | Toggle the first milestone group, then toggle a different group — verify independent state |

---

### B-4: Drag a mission to reorder within its group

| Field | Value |
|-------|-------|
| **Scenario** | Drag-to-reorder mission within group |
| **Feature** | AdminMissionsList HTML5 drag-to-reorder |
| **Precondition** | Missions list rendered with a group containing ≥2 missions |
| **Steps** | 1. Locate a mission row in an expanded group<br>2. Drag the mission by its drag handle (the six-dot `MdDragIndicator` icon on the left) to a new position within the same group<br>3. Drop the mission at the new position<br>4. Verify the mission order changes visually in the list<br>5. Verify `onReorder` fires with the mission ID and new index |
| **Expected Result** | • `onDragStart` sets `dragMissionId` and `dragMilestoneId` refs at [`handleDragStart`](../src/components/admin/AdminMissionsList.tsx:108)<br>• During drag, `dragOverIndex` tracks the target position<br>• `onDrop` at [`handleDrop`](../src/components/admin/AdminMissionsList.tsx:140) reorders the local `groups` state (visual reorder)<br>• `onReorder?.(missionId, toIndex)` callback fires → [`missionOrderChanges`](../src/pages/AdminCockpitPage.tsx:644) map updates<br>• Only intra-group reorder is allowed (cross-group drag is blocked — `dragMilestoneId` must match group's milestone ID)<br>• Dropping at the end of the group (below the last mission) is also valid |
| **Pass/Fail Criteria** | Pass: Mission reorders visually in the list and `missionOrderChanges` state updates. Drag within same group only. |
| **Test Data** | Take mission at index 2 and drag it to index 0 within the same milestone group |

---

### B-5: Click a mission → sidebar opens with that mission selected

| Field | Value |
|-------|-------|
| **Scenario** | Mission click opens sidebar |
| **Feature** | AdminMissionsList → MilestoneSidebarEditor linkage |
| **Precondition** | Missions list rendered; MilestoneSidebarEditor not yet visible |
| **Steps** | 1. Click on a mission row in the list<br>2. Verify the MilestoneSidebarEditor panel appears (slide-in from right)<br>3. Verify the sidebar shows the selected mission's details (title, body, type, difficulty, etc.)<br>4. Verify the milestone associated with that mission is selected |
| **Expected Result** | • `onMissionClick(missionId)` fires<br>• [`AdminCockpitPage`](../src/pages/AdminCockpitPage.tsx:1004) callback finds the mission's milestone and calls `setSelectedMilestone(milestone)` and `handleMissionSelect(missionId)`<br>• `MilestoneSidebarEditor` renders with the milestone data and active draft mission<br>• The mission's draft is seeded from the real mission data via [`handleMissionSelect`](../src/pages/AdminCockpitPage.tsx:433) |
| **Pass/Fail Criteria** | Pass: Clicking a mission row opens the sidebar editors with the correct mission and milestone selected. |
| **Test Data** | Click on a mission with known type "text" — verify sidebar shows correct title and body |

---

### B-6: Edit mission A title, edit mission B difficulty → Save → both persisted

| Field | Value |
|-------|-------|
| **Scenario** | Batch save multiple dirty drafts |
| **Feature** | Batch save multiple dirty drafts (GAP #2 fix) |
| **Precondition** | Two missions exist; sidebar editor available |
| **Steps** | 1. Click mission A in the list → sidebar opens with mission A<br>2. Change mission A's title to "Edited Mission A"<br>3. Click mission B in the list → sidebar updates with mission B<br>4. Change mission B's difficulty to 5<br>5. Click the "Save" button in the sidebar<br>6. Reload the page<br>7. Verify mission A's title is "Edited Mission A"<br>8. Verify mission B's difficulty is 5 |
| **Expected Result** | • Editing mission A sets `isDirty: true` and updates the draft in `draftMissions` map keyed by mission A's ID<br>• Switching to mission B does NOT clear mission A's dirty draft (both drafts coexist in the Map)<br>• [`handleSave()`](../src/pages/AdminCockpitPage.tsx:662) iterates ALL entries in `draftMissions` — does NOT use `selectedMissionId`<br>• For each dirty draft with `draft.originalId` (existing missions): calls `adapter.updateMission(originalId, patch)`<br>• Both changes persist across page reload |
| **Pass/Fail Criteria** | Pass: Both changes (title of A, difficulty of B) are saved and survive page reload. `selectedMissionId` is NOT referenced in save logic. |
| **Test Data** | Mission A original title: "Welcome", new title: "Edited Mission A"; Mission B original difficulty: 3, new difficulty: 5 |

---

### B-7: Create new draft mission → Save → verify created

| Field | Value |
|-------|-------|
| **Scenario** | New mission creation via save |
| **Feature** | New mission creation via batch save |
| **Precondition** | A milestone is selected in the sidebar; no unsaved draft missions exist |
| **Steps** | 1. Click "Add Mission" button in the sidebar<br>2. Verify a new draft mission appears with default values (type "text", difficulty 1)<br>3. Set the title to "Newly Created Mission"<br>4. Click "Save"<br>5. Reload the page<br>6. Verify "Newly Created Mission" appears in the missions list |
| **Expected Result** | • [`handleAddMission`](../src/pages/AdminCockpitPage.tsx:462) creates a draft with synthetic `makeId()` (no `originalId` field)<br>• In `handleSave()`: draft with no `originalId` → `adapter.createMission(...)` is called<br>• New mission created with `sessionId`, `milestoneId`, and all provided fields<br>• New mission persists after page reload |
| **Pass/Fail Criteria** | Pass: Newly created mission appears in the list after page reload. |
| **Test Data** | Create mission under any milestone; title "Newly Created Mission" |

---

### B-8: Reorder missions via drag → Save → verify reorder persisted

| Field | Value |
|-------|-------|
| **Scenario** | Mission reorder persistence after save |
| **Feature** | Mission reorder persistence (GAP #1) |
| **Precondition** | ≥2 missions in the same milestone group |
| **Steps** | 1. Note the current order of missions in a group (order: 0, 1, 2)<br>2. Drag the mission at index 2 to index 0<br>3. Verify the list reorders visually<br>4. Click "Save"<br>5. Reload the page<br>6. Verify the mission that was at index 2 is now at the top of the group |
| **Expected Result** | • Drag updates [`missionOrderChanges`](../src/pages/AdminCockpitPage.tsx:644) map: `{ missionId: 0 }`<br>• `handleSave()` step 4 iterates `missionOrderChanges` and calls `adapter.updateMission(missionId, { order: newOrder })` for each entry<br>• After reload, [`buildGroups()`](../src/components/admin/AdminMissionsList.tsx:36) sorts missions by `order` → reorder reflected |
| **Pass/Fail Criteria** | Pass: Mission order after save + reload matches the drag-reordered position. |
| **Test Data** | Group with 3 missions: [Welcome (order 0), Tour (order 1), Forms (order 2)] → drag Forms to position 0 |

---

### B-9: Verify type badges show correctly

| Field | Value |
|-------|-------|
| **Scenario** | Type badge colors and labels |
| **Feature** | AdminMissionsList type badges |
| **Precondition** | Missions list rendered with missions of all three types (text, form, link) |
| **Steps** | 1. Locate a "Text"-type mission in the list<br>2. Verify the type badge shows "TEXT" with a blue background (`hsl(200, 70%, 45%)`)<br>3. Locate a "Form"-type mission<br>4. Verify the type badge shows "FORM" with a green background (`hsl(150, 55%, 42%)`)<br>5. Locate a "Link"-type mission (QR missions use type `link`)<br>6. Verify the type badge shows "LINK" with a purple background (`hsl(270, 60%, 50%)`) |
| **Expected Result** | • [`TYPE_LABEL`](../src/components/admin/AdminMissionsList.tsx:8) maps `MISSION_TYPE.TEXT → "Text"`, `MISSION_TYPE.FORM → "Form"`, `MISSION_TYPE.LINK → "Link"`<br>• [`TYPE_COLOR`](../src/components/admin/AdminMissionsList.tsx:14) maps each type to the correct color<br>• Badge text is white, semibold, uppercase with letter-spacing<br>• Badge renders with rounded corners (`border-radius: var(--radius-sm)`) |
| **Pass/Fail Criteria** | Pass: Each mission type shows the correct badge color and label. |
| **Test Data** | Check all missions visible in the seeded data for type coverage |

---

### B-10: Verify XP badge shows correct value

| Field | Value |
|-------|-------|
| **Scenario** | XP badge display |
| **Feature** | AdminMissionsList XP display |
| **Precondition** | Missions list rendered with missions that have non-zero `xpValue` |
| **Steps** | 1. Locate a mission in the list<br>2. Verify the XP badge shows the mission's XP value (e.g., "50 XP")<br>3. Cross-reference with the mission's `xpValue` in seed data |
| **Expected Result** | • Each mission row renders `{mission.xpValue} XP` (e.g., "50 XP")<br>• Font size `var(--text-xs)`, color `hsl(var(--color-muted-fg))`<br>• Badge right-aligned, after the ellipsized title |
| **Pass/Fail Criteria** | Pass: XP badge matches the mission's `xpValue` from data. |
| **Test Data** | Verify against known seed values (e.g., mission-1 has xpValue = 50, badge shows "50 XP") |

---

## Session C: Form Schema Persistence

**Feature:** Form-type missions persist form fields via `upsertFormSchema` on Save (GAP #3 fix)
**Core files:** [`src/pages/AdminCockpitPage.tsx`](../src/pages/AdminCockpitPage.tsx) (form schema save at lines 728–733), [`src/adapters/mock/mockAdapter.ts`](../src/adapters/mock/mockAdapter.ts) (`upsertFormSchema` at lines 297–308)

---

### C-1: Edit form-type mission form fields → Save → verify persisted

| Field | Value |
|-------|-------|
| **Scenario** | Form schema persistence on save |
| **Feature** | Form schema persistence on save (GAP #3) |
| **Precondition** | A form-type mission exists in the session; sidebar editor open with this mission selected |
| **Steps** | 1. Click on a form-type mission in the missions list<br>2. In the sidebar editor, navigate to the form fields editor<br>3. Add a new form field: label "Email", type "text", required true<br>4. Click "Save"<br>5. Reload the page<br>6. Click the same form-type mission again<br>7. Verify the "Email" form field is still present in the form fields editor |
| **Expected Result** | • Editing form fields sets the draft's `formFields` and marks `isDirty: true`<br>• [`handleSave()`](../src/pages/AdminCockpitPage.tsx:728) iterates dirty drafts<br>• For drafts where `draft.type === MISSION_TYPE.FORM` AND `draft.originalId` exists AND `draft.formFields.length > 0`:<br>  → Calls `adapter.upsertFormSchema(draft.originalId, draft.formFields)`<br>• Mock adapter stores the schema keyed by mission ID (at [`upsertFormSchema`](../src/adapters/mock/mockAdapter.ts:297))<br>• After reload, `getFormSchema` returns the saved schema → fields appear in editor |
| **Pass/Fail Criteria** | Pass: Form fields added before save persist after page reload. |
| **Test Data** | Use a seeded form-type mission; add a text field "Email" set to required |

---

### C-2: Edit text-type mission → Save → verify no `upsertFormSchema` call

| Field | Value |
|-------|-------|
| **Scenario** | Form schema skip for non-form missions |
| **Feature** | Form schema skip for non-form missions |
| **Precondition** | A text-type mission exists; no form-type missions selected |
| **Steps** | 1. Click on a text-type mission in the missions list<br>2. Change the mission's body or title<br>3. Click "Save"<br>4. Verify the save completes successfully (toast shows "All changes saved") |
| **Expected Result** | • `handleSave()` form schema loop (step 3) iterates dirty drafts<br>• When `draft.type !== MISSION_TYPE.FORM`, the `upsertFormSchema` block is skipped (`continue`)<br>• Only milestone updates and mission updates occur<br>• The form schema store remains unchanged for this mission ID |
| **Pass/Fail Criteria** | Pass: Save completes without errors and no form schema upsert is triggered for text-type missions. |
| **Test Data** | Use a text-type mission (e.g., "Welcome" with type "text"); modify title to "Updated Welcome" |

---

### C-3: Verify form fields survive page reload

| Field | Value |
|-------|-------|
| **Scenario** | Form schema read-back after reload |
| **Feature** | Form schema read-back |
| **Precondition** | A form-type mission with previously saved form fields exists (from C-1) |
| **Steps** | 1. Hard-reload the page (Cmd+Shift+R / Ctrl+Shift+R)<br>2. Navigate to the same admin session<br>3. Click on the form-type mission from C-1<br>4. Verify the form fields editor shows the previously saved fields<br>5. Verify the field names, types, and required flags match what was saved |
| **Expected Result** | • Page reload re-fetches session data from adapter<br>• `adapter.getFormSchema(missionId)` returns the stored schema<br>• Form fields are loaded into the sidebar editor state<br>• All field attributes (label, type, required) match what was saved in C-1 |
| **Pass/Fail Criteria** | Pass: Form fields are identical before and after page reload. |
| **Test Data** | Same mission as C-1; verify "Email" field with type "text" and required true |

---

## Session D: Template Library

**Feature:** Template save/browse/load flow
**Core files:** [`src/pages/AdminCockpitPage.tsx`](../src/pages/AdminCockpitPage.tsx) (export at lines 792–835, load at lines 846–860), [`src/use-cases/exportTemplate.ts`](../src/use-cases/exportTemplate.ts), [`src/use-cases/importTemplate.ts`](../src/use-cases/importTemplate.ts), [`src/components/admin/TemplateLibrary.tsx`](../src/components/admin/TemplateLibrary.tsx)

---

### D-1: Save current session as template → verify JSON download

| Field | Value |
|-------|-------|
| **Scenario** | Save session as downloadable template |
| **Feature** | Template export |
| **Precondition** | Admin cockpit loaded with a session containing milestones, missions, and resources |
| **Steps** | 1. Open the sidebar and scroll to the "Save as template" button<br>2. Click the save-as-template button<br>3. Observe the [`SaveTemplateModal`](../src/components/admin/SaveTemplateModal.tsx:1) appears<br>4. Enter "QA Test Template" as the template name<br>5. Confirm to save<br>6. Verify a JSON file is downloaded to the browser's default download location |
| **Expected Result** | • Modal has `data-testid="save-template-modal"` with template name input<br>• Confirm button is enabled only when name is non-empty<br>• [`handleExportTemplate`](../src/pages/AdminCockpitPage.tsx:792) creates a `Blob` from JSON output of `exportTemplate()`<br>• A temporary `<a>` element triggers download<br>• File is downloaded as `{name}.json` (spaces replaced with hyphens, lowercase)<br>• Modal closes automatically after download<br>• Template is also saved in the mock adapter via `adapter.saveTemplate(template)` |
| **Pass/Fail Criteria** | Pass: JSON file is downloaded with correct filename and valid JSON content. Modal closes after save. |
| **Test Data** | Template name: "QA Test Template" → expects file `qa-test-template.json` |

---

### D-2: Browse TemplateLibrary → verify 3 templates shown

| Field | Value |
|-------|-------|
| **Scenario** | Template library displays templates |
| **Feature** | Template library browsing |
| **Precondition** | Admin cockpit loaded; at least one template saved from D-1 (or placeholder defaults) |
| **Steps** | 1. Scroll to the "Onboarding Templates" section in the sidebar<br>2. Verify `data-testid="template-library"` is present<br>3. Verify the template list is visible<br>4. If no templates saved, verify 3 placeholder templates are shown:<br>   - "Engineering Onboarding" (4 milestones, 12 missions)<br>   - "Sales Bootcamp" (3 milestones, 8 missions)<br>   - "Executive Welcome" (5 milestones, 15 missions) |
| **Expected Result** | • [`TemplateLibrary`](../src/components/admin/TemplateLibrary.tsx:38) renders a list of template cards<br>• Each card shows template name, milestone count, and mission count<br>• Each card has a "Use Template" button<br>• If no templates in adapter (`listTemplates` returns empty), [`PLACEHOLDER_TEMPLATES`](../src/components/admin/TemplateLibrary.tsx:17) are shown<br>• If templates exist (from D-1), the real templates take precedence |
| **Pass/Fail Criteria** | Pass: Template library shows either the saved template(s) from D-1 or the 3 placeholder templates. |
| **Test Data** | Observe the initial state (no saved templates) → 3 placeholders; then save template in D-1 → see it listed |

---

### D-3: Use a template → verify new session created with all records

| Field | Value |
|-------|-------|
| **Scenario** | Load template creates new session |
| **Feature** | Template import |
| **Precondition** | At least one template available (saved from D-1 or placeholder) |
| **Steps** | 1. Click "Use Template" on any template card<br>2. Verify the browser navigates to a new admin cockpit URL (`/admin/{newSessionId}`)<br>3. Verify the page URL has changed to a different session ID than the original<br>4. Verify the new session name matches the template name |
| **Expected Result** | • Clicking "Use Template" calls [`handleLoadTemplate`](../src/pages/AdminCockpitPage.tsx:846)<br>• [`importTemplate`](../src/use-cases/importTemplate.ts:13) calls `adapter.createSession(name, gmUid)` → new session ID<br>• Navigate to `/admin/{newSessionId}` via `navigate()` with `replace: true`<br>• New session page loads with the template data |
| **Pass/Fail Criteria** | Pass: Clicking "Use Template" navigates to a new session with the template data loaded. |
| **Test Data** | Use "Engineering Onboarding" template (or the template saved in D-1) |

---

### D-4: Verify milestones imported with correct positions

| Field | Value |
|-------|-------|
| **Scenario** | Imported milestone positions |
| **Feature** | Template import — milestones |
| **Precondition** | Template loaded from D-3; navigated to new session |
| **Steps** | 1. After loading a template, observe the milestone nodes on the map<br>2. Verify the number of milestones matches the expected count from the template<br>3. Verify milestones appear at the correct positions (xPercent, yPercent from template data) |
| **Expected Result** | • [`importTemplate`](../src/use-cases/importTemplate.ts:24) sorts milestones by `order` and creates them in order<br>• `adapter.createMilestone({ ...ms, sessionId })` is called for each milestone<br>• Milestones appear on the map at positions matching the template data |
| **Pass/Fail Criteria** | Pass: Milestones appear with same count and positions as in the original template. |
| **Test Data** | If using "Engineering Onboarding": verify 4 milestones exist on the map |

---

### D-5: Verify missions linked to correct milestones

| Field | Value |
|-------|-------|
| **Scenario** | Imported mission→milestone linkage |
| **Feature** | Template import — missions |
| **Precondition** | Template loaded from D-3 |
| **Steps** | 1. Scroll to the missions list below the map<br>2. Verify the number of missions matches the expected count from the template<br>3. Verify missions are grouped under the correct milestone headers |
| **Expected Result** | • [`importTemplate`](../src/use-cases/importTemplate.ts:34) extracts `_milestoneOrder` from each exported mission<br>• Uses `milestoneIdByOrder` map to translate old milestone order to new milestone ID<br>• Each mission's `milestoneId` maps to the correct newly-created milestone<br>• Missions appear in the correct milestone groups in `AdminMissionsList` |
| **Pass/Fail Criteria** | Pass: Missions appear under correct milestone headers matching the original template structure. |
| **Test Data** | If using "Engineering Onboarding" (12 missions across 4 milestones): verify correct distribution |

---

### D-6: Verify form schemas imported correctly

| Field | Value |
|-------|-------|
| **Scenario** | Imported form schema fields |
| **Feature** | Template import — form schemas |
| **Precondition** | Template loaded from D-3 |
| **Steps** | 1. Click on a form-type mission in the new session<br>2. Verify the form fields editor shows the saved fields from the template<br>3. Verify field names, types, and required flags match the original template data |
| **Expected Result** | • [`importTemplate`](../src/use-cases/importTemplate.ts:45) extracts `_missionOrder` from each form schema<br>• Uses `missionIdByOrder` map to translate old mission order to new mission ID<br>• Calls `adapter.upsertFormSchema(newMissionId, schemaData.fields)` for each schema<br>• Form schemas are stored in the adapter keyed by the new mission ID |
| **Pass/Fail Criteria** | Pass: Form mission fields appear correctly in the editor after template import. |
| **Test Data** | Verify against any form-type mission that was part of the imported template |

---

### D-7: Verify resources imported with correct sessionId

| Field | Value |
|-------|-------|
| **Scenario** | Imported resource session linkage |
| **Feature** | Template import — resources |
| **Precondition** | Template loaded from D-3 |
| **Steps** | 1. Scroll to the Resources section in the sidebar<br>2. Verify resources from the template are listed<br>3. Verify the resource count matches the template data<br>4. Verify resource titles, URLs, and visibility settings match the original |
| **Expected Result** | • [`importTemplate`](../src/use-cases/importTemplate.ts:51) creates each resource with `adapter.createResource({ ...resource, sessionId })`<br>• Resources are linked to the new session ID, not the original<br>• Resources appear in the admin resources editor with correct attributes<br>• [`listResources(sessionId)`](../src/adapters/mock/mockAdapter.ts:394) returns these resources when filtering by the new session ID |
| **Pass/Fail Criteria** | Pass: Resources from the template appear in the new session's resource list. |
| **Test Data** | If using "Engineering Onboarding": verify matching resource count and content |

---

## Session E: Visual Regression

**Feature:** Responsive layout, touch targets, map clipping
**Core files:** [`src/pages/AdminCockpitPage.tsx`](../src/pages/AdminCockpitPage.tsx) (admin-layout CSS grid), [`src/components/admin/MilestoneMapEditor.tsx`](../src/components/admin/MilestoneMapEditor.tsx), [`src/components/shared/MilestoneNode.tsx`](../src/components/shared/MilestoneNode.tsx)

---

### E-1: Verify responsive layout at mobile width (375px)

| Field | Value |
|-------|-------|
| **Scenario** | Mobile layout at 375px viewport |
| **Feature** | Responsive layout |
| **Precondition** | DevTools set to responsive mode with width = 375px |
| **Steps** | 1. Set viewport to 375px × 812px (iPhone-like dimensions)<br>2. Reload the admin cockpit page<br>3. Verify the map panel takes full width at the top<br>4. Verify the sidebar panels stack below the map in a single column<br>5. Verify no horizontal scrollbar appears (content fits within viewport width)<br>6. Verify the tab bar tabs are horizontally scrollable (overflow-x: auto) |
| **Expected Result** | • Layout adapts to narrow viewport without overflow<br>• Map panel renders at full width<br>• Sidebar elements stack vertically below map and mission list<br>• Tab bar shows scrollable tabs with `overflow-x: auto` and `scrollbar-width: none`<br>• All interactive elements remain tappable |
| **Pass/Fail Criteria** | Pass: Layout renders correctly at 375px width without horizontal scroll. |
| **Test Data** | Use Chrome DevTools responsive mode at 375×812 |

---

### E-2: Verify responsive layout at desktop width (1280px)

| Field | Value |
|-------|-------|
| **Scenario** | Desktop layout at 1280px viewport |
| **Feature** | Responsive layout |
| **Precondition** | DevTools set to responsive mode with width ≥1280px |
| **Steps** | 1. Set viewport to 1280px × 800px<br>2. Reload the admin cockpit page<br>3. Verify the three-panel layout renders: map (left), missions list (center), sidebar (right)<br>4. Verify the sidebar content is scrollable (overflow-y: auto)<br>5. Verify the map is not clipped |
| **Expected Result** | • CSS grid `.admin-layout` renders with map, missions list, and sidebar columns<br>• All panels are visible simultaneously without overlapping<br>• Sidebar has `overflow-y: auto` for scrollable content<br>• No visual clipping of map or any panel |
| **Pass/Fail Criteria** | Pass: Three-panel layout renders correctly at 1280px. |
| **Test Data** | Use Chrome DevTools responsive mode at 1280×800 |

---

### E-3: Verify scrollable content on mobile

| Field | Value |
|-------|-------|
| **Scenario** | Mobile content scrolling |
| **Feature** | Scrollable content |
| **Precondition** | Viewport set to 375px × 812px; admin cockpit loaded |
| **Steps** | 1. Navigate to the admin cockpit at 375px viewport width<br>2. Scroll down through the entire page content<br>3. Verify the map panel collapses (scroll-collapse behavior) as the user scrolls past it<br>4. Verify the missions list is accessible via scrolling<br>5. Verify all sidebar panels are reachable via scrolling |
| **Expected Result** | • The map panel's scroll-collapse feature (if enabled) hides the map to give more space to content below<br>• All content is reachable via vertical scrolling<br>• No content is cut off or hidden behind non-scrollable containers<br>• The sidebar panel (`.admin-layout__sidebar`) has `overflow-y: auto` |
| **Pass/Fail Criteria** | Pass: All content is accessible via vertical scrolling at 375px width. |
| **Test Data** | Standard mobile scrolling test |

---

### E-4: Verify map is not clipped at any container size

| Field | Value |
|-------|-------|
| **Scenario** | Map container clipping |
| **Feature** | Map rendering bounds |
| **Precondition** | Admin cockpit loaded |
| **Steps** | 1. Set viewport to 375px width<br>2. Verify the map viewport area renders fully within its container<br>3. Verify milestone nodes are not cut off at the edges of the map<br>4. Set viewport to 1280px width<br>5. Repeat steps 2–3<br>6. Verify milestone percentage positions (0–100) map correctly within the visible area in both viewports |
| **Expected Result** | • The map container (`.admin-layout__map`) preserves aspect ratio and does not clip content<br>• Milestone nodes positioned at 0% or 100% remain partially visible (percentage positions are bounded to 0–100)<br>• The `MapViewport` component wraps the drag area and grid overlay correctly<br>• No overflow clipping of milestone nodes at any viewport |
| **Pass/Fail Criteria** | Pass: Map renders fully at both 375px and 1280px without clipping milestone nodes. |
| **Test Data** | Check milestones at border positions (0%, 0%) and (100%, 100%) |

---

### E-5: Verify milestone nodes have 44px min touch target

| Field | Value |
|-------|-------|
| **Scenario** | Milestone node touch target size |
| **Feature** | WCAG touch target compliance |
| **Precondition** | Admin cockpit loaded; DevTools Element inspector open |
| **Steps** | 1. Inspect a milestone node in the DOM<br>2. Verify the milestone node element has `min-height` and `min-width` of at least 44px<br>3. Check the `.milestone-node` CSS class or inline styles<br>4. Verify the mission list rows have `minHeight: "var(--min-touch)"` which resolves to ≥44px |
| **Expected Result** | • [`MilestoneNode`](../src/components/shared/MilestoneNode.tsx:27) renders as a `<button>` with class `milestone-node`<br>• The node has CSS `touch-action: none` and a minimum size of 44px (or `var(--min-touch)`)<br>• Mission rows in `AdminMissionsList` use `minHeight: "var(--min-touch)"` (44px)<br>• Milestone group headers use `minHeight: "var(--min-touch)"` |
| **Pass/Fail Criteria** | Pass: All interactive elements in the missions list and map nodes meet the 44px minimum touch target. |
| **Test Data** | Check milestone nodes, mission rows, group headers, and action buttons |

---

### E-6: Verify session invite card and other sidebar panels render

| Field | Value |
|-------|-------|
| **Scenario** | Sidebar panels rendering |
| **Feature** | Sidebar content completeness |
| **Precondition** | Admin cockpit loaded with mock data containing players |
| **Steps** | 1. With a desktop viewport (≥1280px), scroll through the sidebar<br>2. Verify the following panels are visible in order:<br>   - Session Invite Card<br>   - Player Selector Dropdown<br>   - Player Profile Card<br>   - Pending Approvals Panel<br>   - Buddy Assignment Form<br>   - Resources Editor<br>   - Template Library<br>3. Verify all panels have proper spacing and headings |
| **Expected Result** | • All sidebar panels render in sequence<br>• Each panel has appropriate headings and interactive elements<br>• Panels are visually separated with spacing or borders<br>• No component errors in console |
| **Pass/Fail Criteria** | Pass: All 7 sidebar panels render without errors in correct sequence. |
| **Test Data** | Seed data with ≥1 player, ≥1 pending approval, ≥1 resource |

---

## Pass/Fail Checklist

Use this checklist to track the overall test pass/fail status. Mark each scenario as ✅ Pass, ❌ Fail, or ⏭️ Skipped.

### Session A: MilestoneMapEditor CRUD

| # | Scenario | Status |
|---|----------|--------|
| A-1 | Desktop: Right-click → Rename via context menu | ⬜ |
| A-2 | Desktop: Double-click → inline rename | ⬜ |
| A-3 | Desktop: Drag milestone → grid snap verification | ⬜ |
| A-4 | Touch: Long-press on node → context menu → Rename | ⬜ |
| A-5 | Touch: Single tap on node → inline rename | ⬜ |
| A-6 | Touch: Drag milestone → ghost + snap indicator | ⬜ |
| A-7 | Long-press on empty area → new milestone created | ⬜ |
| A-8 | Right-click → Delete → confirmation modal | ⬜ |
| A-9 | Grid overlay toggle → snap behavior change | ⬜ |
| A-10 | "+ Add Milestone" button → milestone created | ⬜ |

### Session B: Mission List + Batch Save

| # | Scenario | Status |
|---|----------|--------|
| B-1 | AdminMissionsList renders below map | ⬜ |
| B-2 | Missions grouped by milestone with count | ⬜ |
| B-3 | Collapse/expand milestone group | ⬜ |
| B-4 | Drag mission to reorder within group | ⬜ |
| B-5 | Click mission → sidebar opens with selection | ⬜ |
| B-6 | Edit mission A + mission B → Save → both persisted | ⬜ |
| B-7 | Create new draft mission → Save → verified | ⬜ |
| B-8 | Reorder via drag → Save → reorder persisted | ⬜ |
| B-9 | Type badges correct (colors + labels) | ⬜ |
| B-10 | XP badge shows correct value | ⬜ |

### Session C: Form Schema Persistence

| # | Scenario | Status |
|---|----------|--------|
| C-1 | Edit form fields → Save → verify persisted | ⬜ |
| C-2 | Edit text-type → Save → no upsertFormSchema call | ⬜ |
| C-3 | Form fields survive page reload | ⬜ |

### Session D: Template Library

| # | Scenario | Status |
|---|----------|--------|
| D-1 | Save as template → JSON download | ⬜ |
| D-2 | Browse TemplateLibrary → 3 templates shown | ⬜ |
| D-3 | Use template → new session created | ⬜ |
| D-4 | Milestones imported with correct positions | ⬜ |
| D-5 | Missions linked to correct milestones | ⬜ |
| D-6 | Form schemas imported correctly | ⬜ |
| D-7 | Resources imported with correct sessionId | ⬜ |

### Session E: Visual Regression

| # | Scenario | Status |
|---|----------|--------|
| E-1 | Responsive layout at 375px | ⬜ |
| E-2 | Responsive layout at 1280px | ⬜ |
| E-3 | Scrollable content on mobile | ⬜ |
| E-4 | Map not clipped at any container size | ⬜ |
| E-5 | Milestone nodes have 44px min touch target | ⬜ |
| E-6 | Sidebar panels render correctly | ⬜ |

### Summary

| Metric | Count |
|--------|-------|
| **Total scenarios** | 36 |
| **Passed** | — |
| **Failed** | — |
| **Skipped** | — |
| **Pass rate** | — |

---

*End of test plan*