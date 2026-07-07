# Player milestone sidebar vs tab bar — layout options

**Status:** **Option B approved** (2026-07-07) — see implementation tasks **8.15.1–8.15.7** in [`plans/pages-and-data-refactor.md`](../../plans/pages-and-data-refactor.md).

**Context:** On 390×844, opening the milestone sidebar (`MilestoneSidebarViewer`) blocks taps on **Dashboard** / **AI Assistant** tabs — the overlay intercepts pointer events. User must close the sidebar (×) first.

**Goal:** Let players read milestone missions/resources without trapping navigation.

Viewport reference: iPhone-class **390×844** ([`design-tokens.md`](../design-tokens.md)).

---

## Current (problem)

```
┌─────────────────────────────┐
│ Jordan Lee            10 XP │  ← topbar
├─────────────────────────────┤
│ Dashboard │ AI Assistant    │  ← tab bar (visible but untappable)
├───────────┬─────────────────┤
│ Milestone │ (dimmed main)   │
│ sidebar   │                 │
│  [×]      │                 │
│ Missions  │                 │
│ Resources │                 │
│ …         │                 │
└───────────┴─────────────────┘
     ↑ overlay covers tab bar hit targets
```

**Smoke:** Playwright click on “AI Assistant” fails while sidebar open; succeeds after Close.

---

## Option A — Raise tab bar above overlay (recommended default)

Keep sidebar as a **left drawer**; tab bar stays **fixed and tappable** (`z-index` above sidebar scrim, below modals).

```
┌─────────────────────────────┐
│ topbar                      │
├─────────────────────────────┤
│ Dashboard │ AI Assistant    │  ← always tappable (z-index ↑)
├───────────┬─────────────────┤
│ sidebar   │ scrim + map     │
│ (scroll)  │                 │
└───────────┴─────────────────┘
```

| Pros | Cons |
|------|------|
| Minimal behaviour change; matches “app chrome always works” | Sidebar is narrower or main content more obscured |
| One-line fix (`z-index` + pointer-events on tab bar) | Tab switch leaves sidebar open on other tab (may be OK) |

**Product note:** When user switches to AI Assistant with sidebar open, either leave sidebar state on Dashboard tab only, or auto-close on tab change (see B).

---

## Option B — Auto-dismiss sidebar on tab tap ✅ **Approved**

Sidebar unchanged visually; tapping **Dashboard** / **AI Assistant** closes sidebar then navigates.

```
User taps "AI Assistant"
  → close sidebar (animate out)
  → navigate /assistant
```

| Pros | Cons |
|------|------|
| No z-index fight; clear mental model | Extra animation on every tab switch |
| Sidebar can stay full-height | User loses sidebar context when peeking assistant |

**Implementation:** `onTabActivate` on player `RouteTabBar` + `closeMilestoneSidebar()` in `usePlayerCockpitPage`; partial **A** z-index on `.player-cockpit .route-tab-bar`. **Not** `PlayerSessionLayout` (auth wrapper only).

---

## Option C — Bottom sheet instead of side drawer

Milestone detail becomes a **draggable bottom sheet** (like GM mission editor). Tab bar remains above sheet handle / not covered.

```
┌─────────────────────────────┐
│ topbar                      │
│ Dashboard │ AI Assistant    │
│ map + missions (main)       │
├─────────────────────────────┤
│━━ Rules & Compliance    [×] │  ← sheet (~60% height)
│ Missions │ Resources        │
│ …                           │
└─────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Familiar pattern (matches GM bottom sheets) | Larger UX change; map less visible while open |
| Tabs never covered | Swipe-dismiss vs scroll conflict (existing `BottomSheet` patterns) |

---

## Option D — Full-screen milestone mode (hide tab bar)

Sidebar expands to **full viewport**; tab bar hidden until user taps **Back** or **×**.

```
┌─────────────────────────────┐
│ ← Back    Rules & Compliance│
│ Missions │ Resources         │
│ (full height list)          │
│                             │
└─────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Maximum space for missions/resources | Hides assistant entry while reading milestone |
| No overlap ambiguity | Extra back affordance; diverges from current drawer |

---

## Recommendation

| Priority | Option | When | Status |
|----------|--------|------|--------|
| **1 (ship fast)** | **B** (+ partial **A** z-index) | Tabs work; sidebar does not persist across tabs | **Approved** |
| **1 (alt)** | **A** alone | Tabs always tappable; sidebar may persist | Deferred |
| **2 (polish)** | **C** | Align player milestone UX with GM sheet patterns | Deferred |
| **3 (defer)** | **D** | Only if product wants “milestone focus mode” | Deferred |

**Decision (2026-07-07):** **B + partial A** — raise tab bar `z-index` so taps register, and **close sidebar on tab navigation** so Assistant opens clean.

**Files to touch:** `src/styles/components/player.css`, `RouteTabBar.tsx`, `PlayerCockpitPage.tsx`, `usePlayerCockpitPage.ts` (`selectedMilestoneId`); trim duplicate sidebar-tab rules from `shared.css`.

---

*Wireframe for smoke item **8.15** · [`plans/pages-and-data-refactor.md`](../../plans/pages-and-data-refactor.md)*
