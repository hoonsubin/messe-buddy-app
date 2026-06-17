---
goal: Convert ResourcesSection into a collapsible search bar where results appear only after typing
version: 1.0
date_created: 2026-06-17
last_updated: 2026-06-17
status: Planned
tags: feature, refactor, player-cockpit
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Refactor the [`ResourcesSection`](src/components/player/ResourcesSection.tsx:1) component in the Player Cockpit view so that:

1. The resource section is **collapsed by default**, showing only a compact trigger bar (label + search icon).
2. Clicking the trigger bar **expands** the search input.
3. The resource card **list is only populated/visible after the user types** at least one character into the search input.
4. The existing resource card rendering and CSS classes are preserved.

This follows the existing collapsible pattern established by [`AssistantChatCard`](src/components/player/AssistantChatCard.tsx:16) — a boolean `expanded` state toggling between a collapsed `<button>` bar and an expanded body with search + results.

---

## 1. Requirements & Constraints

- **REQ-001**: Resource section must be **collapsed by default** on page load.
- **REQ-002**: Collapsed state shows only a trigger bar with the section label ("Resources") and a search icon.
- **REQ-003**: Clicking the trigger bar expands the search input; clicking a close/chevron button collapses it back.
- **REQ-004**: Resource cards are **only rendered when `query.length >= 1`**. When query is empty, the grid area shows nothing (or an empty-state prompt like "Type to search resources").
- **REQ-005**: Existing resource card markup (`.resource-card`, type icons, title, description) must remain unchanged.
- **REQ-006**: Existing CSS classes (`.resources-section`, `.search-bar`, `.resources-grid`, `.resource-card`) must remain functional and unchanged.
- **REQ-007**: The `onSearch` callback prop must still be called on input change for consistency with the existing props interface, even though the parent currently passes a no-op.
- **CON-001**: No changes to the adapter layer or `useResources` hook — data fetching remains identical.
- **CON-002**: No changes to `PlayerCockpitPage.tsx` except possibly removing the `<section aria-label="Resources">` wrapper if `ResourcesSection` now provides its own `<section>`.
- **CON-003**: Must follow the `AssistantChatCard` collapsible pattern: `expanded` boolean, conditional rendering of bar vs. body, `aria-expanded` on the trigger.
- **GUD-001**: Keep component under 200 lines (architectural rule from AGENTS.md).
- **PAT-001**: Follow `AssistantChatCard` toggle structure: collapsed `<button>` bar → expanded header + body.

---

## 2. Implementation Steps

### Implementation Phase 1: Refactor `ResourcesSection` Component

- GOAL-001: Refactor [`ResourcesSection`](src/components/player/ResourcesSection.tsx:32) into a collapsible component. The component is the **only** file that needs modification for this feature.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `expanded` boolean state (`useState(false)`) inside `ResourcesSection`. | | |
| TASK-002 | Implement the **collapsed** state: render a `<button>` trigger bar styled as `.resources-section` containing the section label "Resources" and an `MdSearch` icon. Use `aria-expanded="false"` and `onClick={() => setExpanded(true)}`. | | |
| TASK-003 | Implement the **expanded** state: render a header row with the section label "Resources", the search bar, and a close/chevron-up button (`MdExpandLess` used in `AssistantChatCard`). The header closes via `onClick={() => setExpanded(false)}`. | | |
| TASK-004 | Change the `filtered` derivation so that when `query.trim().length === 0`, `filtered` is an empty array (not the full resource list). Keep the existing `title`/`description` substring filter for when query is non-empty. | | |
| TASK-005 | Add an empty-state message below the search bar when `query.trim().length === 0` inside the expanded body: "Type to search resources…" (muted text, centered). | | |
| TASK-006 | Ensure the "No resources found." message still renders when `filtered.length === 0` but `query.trim().length > 0`. | | |
| TASK-007 | Add new minimal CSS class `.resources-collapsed-bar` to `src/index.css` for the collapsed trigger button styling, positioned between the existing `.resources-section` block (line 918) and `.resources-grid` block (line 930). The collapsed bar should reuse `.resources-section` base styles (padding, border, shadow) plus `cursor: pointer`, `display: flex`, `align-items: center`, `gap`, and hover state similar to `.assistant-chat-card__bar`. | | |
| TASK-008 | Add a new CSS class `.resources-expanded-header` for the expanded header row (flex row with label, search bar, close button). | | |

### Implementation Phase 2: Verify Consumer Integration

- GOAL-002: Verify that [`PlayerCockpitPage`](src/pages/PlayerCockpitPage.tsx:451) integration works correctly with the refactored component. No page-level changes should be required since `ResourcesSection` retains the same props interface.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Confirm in `PlayerCockpitPage.tsx` that the `<section aria-label="Resources">` wrapper at line 451 is compatible. If `ResourcesSection` now renders its own `<section>`, remove the outer wrapper to avoid nested `<section>` elements. | | |
| TASK-010 | Run `deno task build` to confirm no TypeScript errors. | | |
| TASK-011 | Run `deno task lint` to confirm no lint violations. | | |

---

## 3. Alternatives

- **ALT-001 — Debounced server-side search**: Instead of client-side filtering, call `adapter.searchResources(sessionId, query)` with debounce. Rejected because it requires a new adapter method (not yet implemented in mock or PB), increases complexity, and client-side filtering is perfectly adequate for the expected resource count (typically < 50 items).
- **ALT-002 — Animate the expand/collapse with CSS transitions**: Could add `max-height` transition on a wrapper div. Rejected for now because `AssistantChatCard` does not animate its toggle either; consistency trumps visual flair. Can be added later as a separate enhancement.

---

## 4. Dependencies

- **DEP-001**: No new dependencies. Uses existing `react-icons/md` (`MdSearch`, `MdExpandLess`) already imported in `AssistantChatCard.tsx`.
- **DEP-002**: No library or framework changes required.

---

## 5. Files

- **FILE-001**: [`src/components/player/ResourcesSection.tsx`](src/components/player/ResourcesSection.tsx:1) — Primary file to modify. Add collapsible toggle logic, restructure JSX into collapsed/expanded branches, change filter behavior.
- **FILE-002**: [`src/index.css`](src/index.css:1) — Add `.resources-collapsed-bar` and `.resources-expanded-header` CSS classes.
- **FILE-003**: [`src/pages/PlayerCockpitPage.tsx`](src/pages/PlayerCockpitPage.tsx:451) — Potentially remove outer `<section>` wrapper if `ResourcesSection` provides its own.

---

## 6. Testing

- **TEST-001**: Manual smoke test — load Player Cockpit, verify resource section shows only collapsed bar with "Resources" label + search icon.
- **TEST-002**: Click collapsed bar → verify search input appears, no resource cards shown.
- **TEST-003**: Type into search → verify resource cards appear filtered by query.
- **TEST-004**: Clear search input → verify resource cards disappear, "Type to search resources…" message appears.
- **TEST-005**: Click close/chevron button → verify section collapses back to trigger bar.
- **TEST-006**: Type a query with no matches → verify "No resources found." message appears.
- **TEST-007**: Mobile viewport (390×844) — verify trigger bar and expanded search are touch-friendly (min 44px touch targets).
- **TEST-008**: Desktop viewport (≥64rem) — verify resources appear in the right rail column, single-column layout.

---

## 7. Risks & Assumptions

- **RISK-001**: If resources have already been fetched and the user has a slow connection, there is no loading state for the search — but since filtering is client-side on already-loaded data, this is negligible.
- **RISK-002**: The `onSearch` prop is currently a no-op; if a future adapter implementation uses it for analytics or server-side search, the collapsible behavior must ensure `onSearch` is still called on every keystroke (which it already does via `handleSearch`).
- **ASSUMPTION-001**: The resource list is small enough (< 100 items) that client-side filtering is performant. If it grows beyond this, ALT-001 (server-side search) should be revisited.
- **ASSUMPTION-002**: The `AssistantChatCard` collapsible pattern is the intended UX pattern for this codebase, so mirroring it is the correct approach.

---

## 8. Related Specifications / Further Reading

- [`AGENTS.md`](AGENTS.md) — Project architecture, code style, and UI development workflow
- [`SPECS.md`](SPECS.md) — Authoritative specification and design constraints
- [`src/components/player/AssistantChatCard.tsx`](src/components/player/AssistantChatCard.tsx:1) — Reference collapsible pattern
- [`src/components/player/ResourcesSection.tsx`](src/components/player/ResourcesSection.tsx:1) — Current resource section to refactor
- [`src/hooks/useResources.ts`](src/hooks/useResources.ts:1) — Resource data hook (no changes needed)
- [`src/types/domain.ts`](src/types/domain.ts:103) — `Resource` interface
- [`.roo/skills/frontend-design/SKILL.md`](.roo/skills/frontend-design/SKILL.md) — Frontend design guidance for visual choices
