# Admin Cockpit — Implementation Plan (Phase 6 Gap Analysis)

> **Date:** 2026-06-14  
> **Authority sources:** [Figma wireframe](https://www.figma.com/make/ggcp1mnflafNAXM2vHMgho/Onboarding-Login-and-Form?code-node-id=0-9&p=f&t=RTVqbEuntR3EHH0X-0&fullscreen=1), [SPECS.md](../SPECS.md), [prototype-impl-strategy.md](./prototype-impl-strategy.md)  
> **Current state:** Admin cockpit at `http://localhost:5173/admin/sess_mmt2026`

---

## Executive Summary

The admin cockpit is ~85% complete. Most Phase 6 deliverables are wired and functional, but several gaps prevent the usability test scenarios from being fully completable. The three critical missing pieces are:

1. **Mission list under map editor** — Figma shows a scrollable mission list below the map with drag-to-reorder; currently absent
2. **SaveActions Save button** — only saves milestones, not draft missions or form schemas (incomplete batch save)
3. **Template Library "Use Template" flow** — loads template but doesn't create records properly

---

## Gap Analysis by Phase 6 Deliverable

### 6a. AdminCockpitPage — data wired ✅ COMPLETE

All three tabs render with real mock data:
- Active Session tab: PlayerSelector, PlayerProfileCard, PendingApprovalsPanel all wired
- Pre-Boarding Checklist tab: fully functional with toggle/add/mark-all-done
- All New Hires tab: CrossHireDashboard with 3 rows from 2 sessions

### 6b. MilestoneMapEditor — drag wired ✅ COMPLETE

Drag-to-reposition works. Grid overlay toggle works. Changes batched until Save.

**Gap:** No mission list below the map (see Gap #1).

### 6c. MilestoneSidebarEditor — wired ✅ COMPLETE

Opens on milestone click, shows missions list, MissionEditor for selected mission, SaveActions at bottom.

### 6d. MissionEditor — full form ✅ COMPLETE

All fields present:
- Title, Body with markdown preview toggle ✓
- Type selector (switching type adjusts visible fields) ✓
- Difficulty + XP preview ✓
- Tags multi-select ✓
- Suggested due date ✓
- ValidationMethod selector (disabled when type=form, C-06) ✓
- isInCurrentMissions toggle ✓
- FormEditor for form-type missions ✓

### 6e. Pre-Boarding Checklist — wired ✅ COMPLETE

Reachable via tab within 2 taps. Default items loaded from mock data. Checkbox state persisted to `session.preBoardingChecks`. Add item + Mark all done buttons work.

### 6f. Admin QR Scanner — wired ✅ COMPLETE

Opens from PendingApprovalsPanel "Scan QR" button. Camera feed with jsqr decode. Payload validation against context. Auto-close on success. Simulate Scan button for testing. Error handling for mismatched payloads.

### 6g. HR Cross-New-Hire Dashboard — wired ✅ COMPLETE

3 rows across 2 sessions, varying progress states. Stalled indicator (>3 days). Sort by last activity ascending. Filter input present.

### 6h. Supporting admin sections — PARTIALLY WIRED ⚠️

| Component | Status |
|-----------|--------|
| BuddyAssignmentForm | ✅ Wired — select player, fill fields, upsert BuddyProfile |
| ResourcesEditor | ✅ Wired — CRUD for resources with visibility toggle |
| **CurrentMissionsList (admin)** | ❌ **MISSING** — spec says "drag-to-reorder updates mission.order" |

### 6i. SaveActions + Template Library — PARTIALLY WIRED ⚠️

| Feature | Status |
|---------|--------|
| Save button UI | ✅ Present in MilestoneSidebarEditor |
| **Save milestones** | ✅ Implemented (handleSave) |
| **Save draft missions** | ❌ **INCOMPLETE** — only saves `selectedMissionId`, not all dirty drafts |
| **Save form schemas** | ❌ **MISSING** — no code to persist FormSchema for form-type missions |
| Save as Template | ✅ Present, downloads JSON file |
| TemplateLibrary browse | ✅ Shows 3 templates from mock data |
| **Use Template → create records** | ⚠️ **PARTIAL** — calls `importTemplate` but may not handle all record types |

---

## Detailed Gap Items

### GAP #1: Mission List Under Map Editor (spec 6h)

**Figma shows:** Below the map canvas, a scrollable list of missions with drag handles for reordering. Each row shows mission title and type icon.

**Current state:** No such component rendered in AdminCockpitPage. The `MilestoneSidebarEditor` only appears when a milestone is selected (as an overlay sidebar), not as a persistent panel below the map.

**Implementation approach:**
- Create or reuse `CurrentMissionsList` for admin view
- Render it below `<div className="admin-layout__map">` in AdminCockpitPage
- Show all missions from `missions` prop, grouped by milestone
- Add drag-to-reorder using existing drag infrastructure (or a simple reordering mechanism)
- On reorder: update local state → on Save, call `adapter.updateMission(missionId, { order })`

**Files affected:**
- `src/pages/AdminCockpitPage.tsx` — add rendering below map
- Possibly `src/components/player/CurrentMissionsList.tsx` or create admin variant

### GAP #2: Batch Save Missions (spec 6i)

**Figma shows:** "Save" button saves all changes. "Discard changes" reverts all.

**Current state in [`AdminCockpitPage.handleSave()`](src/pages/AdminCockpitPage.tsx:633):**
```typescript
// Saves milestones ✓
for (const dm of draftMilestones) { ... }

// Saves missions — BUGGY ✗
for (const [, draft] of draftMissions) {
  if (!draft.isDirty) continue;
  const real = missions.find((m) => m.id === selectedMissionId); // ← only checks selected!
```

The loop iterates all dirty drafts but the `find` always looks for `selectedMissionId`, meaning:
- Editing mission A, then editing mission B → saving only saves B's changes
- New draft missions (with synthetic IDs) are never found in real missions → they go to create path ✓
- But existing mission edits that aren't currently selected get silently dropped

**Fix:** Replace the `find` with a proper lookup by matching draft milestoneId + title, or better: store the original PB ID on each DraftMission.

### GAP #3: Save Form Schemas (spec 6d)

When editing a form-type mission's fields via `FormEditor`, those changes are stored in `DraftMission.formFields`. On save, these must be persisted as a `FormSchema` record.

**Current state:** No code in `handleSave()` calls `adapter.upsertFormSchema()`. Form field edits are lost on page reload.

**Fix:** In `handleSave()`, after saving missions:
```typescript
for (const [, draft] of draftMissions) {
  if (!draft.isDirty || draft.type !== MISSION_TYPE.FORM) continue;
  const real = findRealMission(draft); // proper lookup
  if (real && draft.formFields?.length > 0) {
    await adapter.upsertFormSchema(real.id, {
      missionId: real.id,
      fields: draft.formFields,
    });
  }
}
```

### GAP #4: Template Library "Use Template" Flow (spec 6i) ✅ VERIFIED WORKING

**Current state in [`handleLoadTemplate()`](src/pages/AdminCockpitPage.tsx:800):**
```typescript
const template = templates.find((t) => t.name === templateId);
// ... calls importTemplate(template, name, gmUid, adapter)
```

Verified `importTemplate.ts` handles all 5 record types in correct order:
1. Session → new sessionId ✓
2. Milestones (sorted by `_milestoneOrder`) with remapping ✓
3. Missions (remapped via `_milestoneOrder`) + `missionIdByOrder` map ✓
4. FormSchemas (remapped via `_missionOrder`) calling `adapter.upsertFormSchema()` ✓
5. Resources with new sessionId ✓

**Verdict:** No fix needed for importTemplate.ts.

### GAP #5: Save as Template — Store in Mock Adapter ✅ VERIFIED WORKING

Verified `mockAdapter.saveTemplate(template)` stores to in-memory Map keyed by name, and `listTemplates()` returns `[...templates.values()]`. Both methods are exported from the mock adapter.

**Verdict:** No fix needed for template store wiring.

---

## MilestoneMapEditor Enhancement: Touch-Friendly CRUD Design

The current [`MilestoneMapEditor`](src/components/admin/MilestoneMapEditor.tsx) supports drag-to-reposition, context menu (rename/delete), add button, and grid overlay toggle. However, the UX is desktop-oriented and needs enhancement for touch devices and intuitive interaction:

**Current capabilities:**
- Drag nodes to reposition (mouse drag only — no touch support)
- Right-click context menu → Rename / Delete
- "+ Add Milestone" toolbar button below map
- Grid overlay toggle snaps to 10% grid

**Proposed enhancements for touch-friendly design:**
1. **Touch drag support** — add `touchstart`/`touchmove`/`touchend` handlers alongside existing mouse drag, using pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) for unified input handling
2. **Long-press context menu** — on mobile, long-press a node (500ms) to open rename/delete options instead of requiring right-click
3. **Inline rename on tap** — tapping a milestone name enters edit mode directly (no context menu needed), with save/cancel buttons visible
4. **Swipe-to-delete gesture** — swipe left on a node reveals delete confirmation button (optional, can be added later)
5. **Visual feedback during drag** — show ghosted outline of original position while dragging; snap indicator when grid is enabled
6. **Add milestone via long-press on empty map area** — long-press anywhere on the canvas to create a new milestone at that location (with default name "New Milestone")
7. **Confirmation dialog for delete** — before deleting, show a confirmation modal with the milestone name and list of associated missions (if any)

**Files affected:**
- `src/components/admin/MilestoneMapEditor.tsx` — add pointer event handlers, long-press detection, inline rename UI, delete confirmation
- `src/components/shared/MilestoneNode.tsx` — may need touch-friendly hit area expansion (min 44px touch target per C-12)

**Design reference:** Figma wireframe shows milestone nodes as circular buttons with status colors. The edit mode should feel like a native map editor app, not a web form.

---

## Implementation Order (Recommended)

1. **GAP #2: Fix batch save missions** — highest impact, blocks testing
2. **GAP #3: Save form schemas** — required for form-type mission editing to work end-to-end
3. **GAP #4: Verify/fix importTemplate** — needed for template reuse flow
4. **GAP #5: Verify mock adapter template store** — prerequisite for #4 testing
5. **GAP #1: Mission list under map editor** — visual completeness, lower priority
6. **MilestoneMapEditor touch enhancements** — UX polish, non-blocking

---

## Testability Checklist (Post-Implementation)

| Scenario | Source | Status |
|----------|--------|--------|
| GM creates session → assigns missions → saves | Spec 6i | Needs verification after GAP #2 fix |
| GM edits mission title/difficulty/tags → Save → changes persist | Spec 6d, 6i | Blocked by GAP #2 |
| GM edits form fields for a form-type mission → Save → fields persist | Spec 6d | Blocked by GAP #3 |
| GM saves template → browses TemplateLibrary → uses template → new session created | Spec 6i | Needs verification after GAP #4, #5 |
| GM scans QR code (Simulate Scan) → approval completes → player sees XP update | Spec 6f | Already working |
| Supervisor finds Pre-Boarding Checklist within 2 taps | Spec 6e | Already working |
| HR sees 3 new hires with stalled indicators | Spec 6g | Already working |

Everything must be tested on a live browser environment from the user's perspective using the playwright MCP tool.

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/pages/AdminCockpitPage.tsx` | Fix batch save loop, add form schema persistence, add mission list rendering | P0 |
| `src/use-cases/importTemplate.ts` | Verify all record types handled | P1 |
| `src/adapters/mock/mockAdapter.ts` | Verify template store wired | P2 |
| `src/components/admin/MilestoneMapEditor.tsx` | Touch-friendly CRUD enhancements (pointer events, long-press, inline rename) | P3 |

---

## Risk Assessment

- **Low risk:** All changes are in existing code paths; no new components needed for GAP #2, #3
- **Medium risk:** GAP #1 (mission list) may need a new component or significant refactoring of CurrentMissionsList
- **No breaking changes expected** — all fixes extend existing functionality
