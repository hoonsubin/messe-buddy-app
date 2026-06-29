---
goal: Eliminate Inline Style Declarations and Consolidate CSS Architecture
version: 1.0
date_created: 2026-06-29
last_updated: 2026-06-29
owner: Architecture
status: Planned
tags: refactor, css, styling, consistency, architecture
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-planned-blue)

This plan migrates ~406 inline `style={{...}}` declarations across 40+ React component and page files into the project's existing CSS class system. The audit confirmed a mature global stylesheet exists at [`src/index.css`](src/index.css:1) (~3238 lines) with design tokens in [`src/styles/tokens.css`](src/styles/tokens.css:1), but components supplement these classes with inline layout, typography, spacing, and color declarations. Only 5 of ~65 component files use zero inline styles.

The goal is a single, consistent styling architecture where every reusable visual rule lives in CSS, components reference classes, and dynamic/computed values remain as justified inline styles.

## 1. Requirements & Constraints

- **REQ-001**: Every non-dynamic visual property must be defined in a CSS class, not `style={{...}}`. Dynamic values (computed from props/state — e.g. `left: props.xPercent + "%"`) remain inline.
- **REQ-002**: Use the existing design token system (`var(--token)`, `hsl(var(--color-*))`) for all new CSS. No hard-coded HSL values or raw hex in new CSS.
- **REQ-003**: Follow the existing BEM-like naming convention established in [`src/index.css`](src/index.css:222) (e.g., `.milestone-node__fill`, `.daily-plan__header`).
- **REQ-004**: Zero visual regression. Smoke-test every affected component after each phase. Use Playwright MCP with mobile-first viewport (390×844).
- **REQ-005**: Keep all CSS in `src/*.css` files. No CSS Modules, PostCSS plugins, or CSS-in-JS libraries. The Vite config has no CSS plugins beyond the default.
- **CON-001**: [`deno fmt`](deno.json:17) excludes `src/**/*.css` from formatting. CSS files are manually formatted.
- **CON-002**: The `verbatimModuleSyntax` TS setting requires `import type` for type-only imports. CSS imports remain side-effect imports.
- **CON-003**: No file edit may exceed 500 lines per operation (AGENTS.md constraint).
- **CON-004**: Components must be kept under 200 lines. If adding CSS classes pushes a component over 200 lines, extract internal sub-components.
- **PAT-001**: Dynamic styles that must remain inline: computed positioning (`left`/`top` from props), progress bar widths, collapse animation heights/transforms, backdrop opacity.
- **GUD-001**: `eslint-disable` suppression comments are design smells. Any `style={{...}}` that remains after refactoring must be annotated with a comment explaining why it's justified inline.

## 2. Implementation Steps

### Implementation Phase 1: Utility CSS Classes

- GOAL-001: Add a small set of `core-*` utility classes to eliminate the most common inline pattern repetitions (~200 occurrences). These are general-purpose classes that follow the token system.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create [`src/styles/utilities.css`](src/styles/utilities.css:1) with layout utility classes: `.core-flex-row` (flex + center), `.core-flex-col` (flex + column), `.core-flex-1`, `.core-shrink-0`, `.core-gap-1` through `.core-gap-4`. Each class uses token variables only. | | |
| TASK-002 | Add typography utility classes to `utilities.css`: `.core-text-xs`, `.core-text-sm`, `.core-text-base`, `.core-text-lg`, `.core-text-muted`, `.core-text-fg`, `.core-font-display`, `.core-weight-medium`, `.core-weight-semibold`, `.core-m-0`. | | |
| TASK-003 | Add icon utility classes: `.core-icon-muted` (`color: hsl(var(--color-muted-fg)); flex-shrink: 0`), `.core-icon-accent` (`color: hsl(var(--color-accent)); flex-shrink: 0`). Add button reset: `.core-btn-reset` (`background: none; border: none; cursor: pointer; padding: 0`). | | |
| TASK-004 | Import `src/styles/utilities.css` at the top of [`src/index.css`](src/index.css:2) via `@import "./styles/utilities.css";` so all utility classes are globally available. | | |
| TASK-005 | Apply utility classes to **5 lightweight components** as validation: [`Toast.tsx`](src/components/shared/Toast.tsx:27), [`PendingApprovalDisplay.tsx`](src/components/player/PendingApprovalDisplay.tsx:9), [`YouAreHereMarker.tsx`](src/components/player/YouAreHereMarker.tsx:12), [`ApprovalRequestCard.tsx`](src/components/admin/ApprovalRequestCard.tsx:13), [`FetchErrorPanel.tsx`](src/components/shared/FetchErrorPanel.tsx:27). Replace all non-dynamic `style={{...}}` with utility classes. Verify zero visual regression via Playwright snapshot comparison. | | |
| TASK-006 | Apply utility classes to **icons across all components**: replace every `style={{ color: "hsl(var(--color-muted-fg))", flexShrink: 0 }}` on `<Md*>` icons with `className="core-icon-muted"`, and similarly for accent-colored icons with `className="core-icon-accent"`. Files: [`MilestoneGrid.tsx`](src/components/admin/MilestoneGrid.tsx:108), [`PendingApprovalsPanel.tsx`](src/components/admin/PendingApprovalsPanel.tsx:31), [`SessionInviteCard.tsx`](src/components/admin/SessionInviteCard.tsx:192), [`BuddyAssignmentForm.tsx`](src/components/admin/BuddyAssignmentForm.tsx:34), [`ResourcesEditor.tsx`](src/components/admin/ResourcesEditor.tsx:163), [`MilestoneSidebarEditor.tsx`](src/components/admin/MilestoneSidebarEditor.tsx:164), [`AdminHomePage.tsx`](src/pages/AdminHomePage.tsx:124). | | |
| TASK-007 | Apply utility classes to **typography-only elements** across all pages and components. Replace `style={{ fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))", margin: 0 }}` with `className="core-text-sm core-text-muted core-m-0"`. Target files: [`LandingPage.tsx`](src/pages/LandingPage.tsx:1), [`ValidationPage.tsx`](src/pages/ValidationPage.tsx:1), [`NotFoundPage.tsx`](src/pages/NotFoundPage.tsx:1), [`FormPage.tsx`](src/pages/FormPage.tsx:1), plus all admin/player components with text elements. | | |

### Implementation Phase 2: Heavy Component CSS Extraction

- GOAL-002: Extract component-specific CSS classes for the 8 components with the most inline style declarations. Each gets a dedicated CSS block in `src/index.css` (co-located with existing component CSS sections).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | **DailyPlanView** — Add CSS classes `.daily-plan` (section wrapper: background, border-radius, box-shadow, flex column), `.daily-plan__header` (clickable bar: flex, align-items, gap, padding, cursor, user-select, min-height), `.daily-plan__header--collapsed` / `.daily-plan__header--expanded` (border-radius variants), `.daily-plan__title` (h2: margin, font-family, font-size, weight, color, line-height, flex-1), `.daily-plan__badge` (numbered circle: inline-flex, min-width, height, padding, border-radius, background, color, font-size, weight, line-height), `.daily-plan__chevron` (transition, transform based on collapsed state), `.daily-plan__content` (overflow, max-height transition), `.daily-plan__content-inner` (padding, flex column, gap), `.daily-plan__desc` (margin, font-size, color), `.daily-plan__empty` (margin, font-size, color, font-style, padding), `.daily-plan__list` (list-style none, padding, margin, flex column, gap), `.daily-plan__mission-row` (flex, align-items, space-between, padding, background, border-radius, gap, min-height). | | |
| TASK-009 | **DailyPlanView** TSX refactor — Replace all 15 inline `style={{...}}` blocks with the new CSS classes. Keep only the dynamic `maxHeight` and `borderRadius` conditionals on the collapsible content div (annotate with comment). File: [`DailyPlanView.tsx`](src/components/player/DailyPlanView.tsx:1). | | |
| TASK-010 | **HireAnalytics** — Add CSS classes `.analytics-grid` (flex column, gap space-4), `.analytics-cards` (grid, auto-fit, gap), `.analytics-stat` (card extension: padding, flex column, gap, justify-space-between), `.analytics-stat__header` (flex row, align-center, gap space-2), `.analytics-stat__icon` (inline-flex, primary color), `.analytics-stat__label` (text-base, weight-semibold, color-fg), `.analytics-stat__figure` (flex row, align-baseline, gap space-2), `.analytics-stat__number` (font-display, 3rem, weight-semibold, color-fg, line-height 1), `.analytics-stat__unit` (text-lg, weight-medium, color-muted-fg), `.analytics-stat__desc` (margin 0, text-sm, color-muted-fg), `.analytics-chart` (card extension: padding). | | |
| TASK-011 | **HireAnalytics** TSX refactor — Replace all ~15 inline `style={{...}}` blocks with CSS classes. [`HireAnalytics.tsx`](src/components/admin/HireAnalytics.tsx:1). | | |
| TASK-012 | **MilestoneGrid** — Add CSS classes `.milestone-grid` (display grid, auto-fit, minmax, gap), `.milestone-grid__empty` (text-sm, color-muted-fg, text-center, padding), `.milestone-grid__box` (extends card: padding, min-height, flex column, gap, cursor, text-align, border, background), `.milestone-grid__box-header` (flex, align-center, space-between), `.milestone-grid__box-index` (inline-flex, align-center, justify-center, 2rem, border-radius-full, bg-primary/0.1, color-primary, weight-semibold, text-sm), `.milestone-grid__box-name` (flex-1, weight-semibold, text-base, color-fg, line-height-tight, text-wrap balance), `.milestone-grid__box-meta` (text-xs, color-muted-fg). | | |
| TASK-013 | **MilestoneGrid** TSX refactor — Replace all ~10 inline `style={{...}}` blocks. [`MilestoneGrid.tsx`](src/components/admin/MilestoneGrid.tsx:1). | | |
| TASK-014 | **MilestoneSidebarEditor** — Add CSS classes `.ms-editor-section` (wrapping div with padding), `.ms-editor-name-input` (text-lg font-display), `.ms-editor-mission-list` (list-style none, padding 0, margin 0), `.ms-editor-mission-row` (width 100%, flex, align-center, padding, border-radius), `.ms-editor-add-btn` (margin-top space-3, width 100%). File: [`MilestoneSidebarEditor.tsx`](src/components/admin/MilestoneSidebarEditor.tsx:1). | | |
| TASK-015 | **MilestoneSidebarEditor** TSX refactor — Replace all ~12 inline `style={{...}}` blocks. Keep only the `animation` prop if present (dynamic). | | |
| TASK-016 | **ResourcesEditor** — Add CSS classes `.res-editor` (flex column, gap), `.res-editor__list` (list-style none, padding 0, margin 0), `.res-editor__item` (card extension: padding, flex, align-center, gap), `.res-editor__item-toggle` (flex, align-center, cursor-pointer, flex-shrink-0), `.res-editor__item-toggle-icon` (visibility icon wrapper), `.res-editor__item-body` (flex-1), `.res-editor__item-title` (text-sm, weight-medium), `.res-editor__item-url` (text-xs, color-muted-fg), `.res-editor__add-form` (card, width 100%), `.res-editor__add-form-header` (margin 0, font-display), `.res-editor__add-form-row` (flex, align-center, gap space-4), `.res-editor__add-form-label` (flex, flex-direction column, gap space-1, flex-1). File: [`ResourcesEditor.tsx`](src/components/admin/ResourcesEditor.tsx:1). | | |
| TASK-017 | **ResourcesEditor** TSX refactor — Replace all ~14 inline `style={{...}}` blocks. Keep the `style={{ display: "none" }}` on the visually-hidden checkbox (this is correct for a11y — add comment). | | |
| TASK-018 | **PreBoardingChecklist** — Add CSS classes `.checklist` (flex column, gap), `.checklist__header` (card extension: padding), `.checklist__heading` (margin 0 0 space-1, font-display), `.checklist__subtitle` (margin 0, text-sm, color-muted-fg), `.checklist__list` (list-style none, padding 0, margin 0, display flex, flex-direction column, gap), `.checklist__item` (flex, align-center, gap), `.checklist__item-checkbox` (display none — hidden native checkbox for a11y), `.checklist__item-visual` (display flex, align-center, justify-center, width, height, border-radius), `.checklist__item-label` (text-sm), `.checklist__item-desc` (text-xs, color-muted-fg), `.checklist__add-form` (flex, gap space-2), `.checklist__add-input` (flex 1), `.checklist__add-btn` (padding space-1 space-3). File: [`PreBoardingChecklist.tsx`](src/components/admin/PreBoardingChecklist.tsx:1). | | |
| TASK-019 | **PreBoardingChecklist** TSX refactor — Replace all ~15 inline `style={{...}}` blocks. | | |
| TASK-020 | **TutorialStep** — Add CSS classes `.tutorial-step__counter` (text-xs, color-muted-fg, margin 0, weight-medium), `.tutorial-step__dots` (flex, gap space-1), `.tutorial-step__dot` (width space-2, height space-2, border-radius-full), `.tutorial-step__dot--active` (bg-primary), `.tutorial-step__dot--inactive` (bg-border), `.tutorial-step__title` (margin 0, text-lg, weight-semibold), `.tutorial-step__body` (margin 0, text-sm, color-muted-fg, leading-relaxed), `.tutorial-step__actions` (flex, justify-space-between, align-center, margin-top space-2), `.tutorial-step__skip` (text-xs, color-muted-fg). File: [`TutorialStep.tsx`](src/components/tutorial/TutorialStep.tsx:1). | | |
| TASK-021 | **TutorialStep** TSX refactor — Replace all ~10 inline `style={{...}}` blocks. Keep the dynamic dot background condition inline (annotate with comment). | | |

### Implementation Phase 3: Remaining Light Inline Cleanup

- GOAL-003: Clean up inline styles in all remaining components, reaching zero non-dynamic inline styles across the codebase.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Clean up **admin components**: [`FormEditor.tsx`](src/components/admin/FormEditor.tsx:13), [`FormFieldEditor.tsx`](src/components/admin/FormFieldEditor.tsx:33), [`TemplateSelect.tsx`](src/components/admin/TemplateSelect.tsx:18), [`MissionEditorView.tsx`](src/components/admin/MissionEditorView.tsx:17), [`TagSelector.tsx`](src/components/admin/TagSelector.tsx:17), [`BackgroundImageUploader.tsx`](src/components/admin/BackgroundImageUploader.tsx:11), [`DraftRestoreBanner.tsx`](src/components/admin/DraftRestoreBanner.tsx:18), [`DifficultySelector.tsx`](src/components/admin/DifficultySelector.tsx:33), [`TemplateFields.tsx`](src/components/admin/TemplateFields.tsx:13), [`SaveTemplateModal.tsx`](src/components/admin/SaveTemplateModal.tsx:52), [`ConfirmSheet.tsx`](src/components/admin/ConfirmSheet.tsx:30). | | |
| TASK-023 | Clean up **player components**: [`BuddyCard.tsx`](src/components/player/BuddyCard.tsx:36), [`QRDisplay.tsx`](src/components/player/QRDisplay.tsx:81), [`CurrentMissionsList.tsx`](src/components/player/CurrentMissionsList.tsx:44), [`ResourcesSection.tsx`](src/components/player/ResourcesSection.tsx:73), [`MissionDetailPopup.tsx`](src/components/player/MissionDetailPopup.tsx:161), [`ProgressLegend.tsx`](src/components/player/ProgressLegend.tsx:16). | | |
| TASK-024 | Clean up **shared components**: [`MissionCard.tsx`](src/components/shared/MissionCard.tsx:32), [`ConfirmDialog.tsx`](src/components/shared/ConfirmDialog.tsx:56), [`TopBar.tsx`](src/components/shared/TopBar.tsx:30), [`NameCaptureModal.tsx`](src/components/shared/NameCaptureModal.tsx:51), [`RecoveryKeyModal.tsx`](src/components/shared/RecoveryKeyModal.tsx:1). | | |
| TASK-025 | Clean up **qr components**: [`CameraFeed.tsx`](src/components/qr/CameraFeed.tsx:246), [`ValidationResult.tsx`](src/components/qr/ValidationResult.tsx:45). | | |
| TASK-026 | Clean up **form components**: [`FormShell.tsx`](src/components/form/FormShell.tsx:35), [`FormField.tsx`](src/components/form/FormField.tsx:44). | | |
| TASK-027 | Clean up **tutorial components**: [`TutorialOverlay.tsx`](src/components/tutorial/TutorialOverlay.tsx:118). | | |
| TASK-028 | Clean up **page components**: [`LandingPage.tsx`](src/pages/LandingPage.tsx:59) (remaining inline after utility pass), [`AdminHomePage.tsx`](src/pages/AdminHomePage.tsx:37), [`FormPage.tsx`](src/pages/FormPage.tsx:121), [`HireDetailPage.tsx`](src/pages/HireDetailPage.tsx:288), [`PlayerCockpitPage.tsx`](src/pages/PlayerCockpitPage.tsx:189), [`QRScannerView.tsx`](src/pages/QRScannerView.tsx:57), [`ValidationPage.tsx`](src/pages/ValidationPage.tsx:68), [`NotFoundPage.tsx`](src/pages/NotFoundPage.tsx:14). | | |

### Implementation Phase 4: Verification & Documentation

- GOAL-004: Verify zero visual regression, update documentation, remove unused files.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-029 | Run full Playwright smoke test suite across all routes at both mobile (390×844) and desktop (1280×800) viewports. Compare screenshots against pre-refactor baselines (capture baseline before Phase 1 begins). Routes: `/`, `/join/:id`, `/session/:id`, `/admin/:id`, `/admin/:id/scan`, `/validate/:id`, `/form/:id`. | | |
| TASK-030 | Run `deno task lint` and `deno task build` to confirm zero type errors and production build succeeds. Check for any unused CSS class warnings (though no tooling exists for this in the current stack — manual grep-check for orphaned classes). | | |
| TASK-031 | Verify each remaining `style={{...}}` has a justification comment per GUD-001. Dynamic styles (C-03 position, progress bar widths, collapse animations) must have a `// Dynamic: ...` comment. Search: `rg "style=\{\{" src/ --type tsx` and manually review each remaining hit. | | |
| TASK-032 | Delete [`YouAreHereMarker.tsx`](src/components/player/YouAreHereMarker.tsx:1) if it's been rendered obsolete by PS-8 + PS-11A (per the UI Redesign plan). Verify no remaining imports reference it. | | |
| TASK-033 | Update [`design/design-tokens.md`](design/design-tokens.md:1) to document the new utility class vocabulary and component CSS naming conventions. Add a section: "CSS Class Naming Conventions" with the BEM-like pattern and the `core-*` utility prefix. | | |

## 3. Alternatives

- **ALT-001: CSS Modules** — Vite supports `.module.css` out of the box. Would provide scoped class names and eliminate global namespace concerns. Rejected because: (a) requires Vite config change to add CSS modules plugin, (b) the existing codebase already has a mature global CSS system with no collision issues, (c) `deno fmt` excludes CSS files, and CSS Modules would require co-located files that break the current single-file pattern, (d) adds unnecessary complexity for a prototype project.
- **ALT-002: Tailwind CSS / UnoCSS** — Utility-first framework that would naturally replace inline styles. Rejected because: (a) introduces a build dependency and configuration, (b) the existing design token system (`hsl(var(--color-*))`, `var(--space-*)`) would need to be mapped to Tailwind's config, (c) the project already has a mature semantic class system that would be partially orphaned, (d) violates CON-001 (no PostCSS plugins in current Vite config), and Tailwind requires PostCSS.
- **ALT-003: CSS-in-JS (styled-components, Panda CSS, vanilla-extract)** — Runtime or build-time CSS-in-JS libraries. Rejected because: (a) introduces npm dependency and build step, (b) the project uses Deno npm resolution which may have edge cases with CSS-in-JS extractors, (c) over-engineering for a prototype that already has a working class-based system, (d) the React 19 compiler auto-memoization already handles performance — CSS-in-JS runtime overhead provides no benefit.
- **ALT-004: Single migration pass (all inline styles → CSS classes in one PR)** — Would touch 40+ files at once. Rejected because: (a) violates CON-004 (no edit >500 lines), (b) makes regression testing difficult — can't bisect which change caused a visual defect, (c) the phased approach allows smoke-testing after each component group.

## 4. Dependencies

- **DEP-001**: Design tokens in [`src/styles/tokens.css`](src/styles/tokens.css:1) are the single source of truth for all CSS values. All new classes must reference these tokens via `var()` and `hsl(var())`.
- **DEP-002**: [`src/index.css`](src/index.css:1) is the global stylesheet. All new component CSS blocks are added here (no separate CSS files per component to keep the existing architecture consistent).
- **DEP-003**: Playwright MCP server must be available for smoke testing (TASK-029). If unavailable, test manually in browser dev tools.
- **DEP-004**: The `deno fmt` exclusion of CSS files means all CSS formatting is manual. Keep CSS blocks consistent with existing style (2-space indent, selector + space + `{`, one declaration per line).

## 5. Files

- **FILE-001**: [`src/styles/utilities.css`](src/styles/utilities.css:1) — **New file.** Core utility classes for layout, typography, icons, and button reset.
- **FILE-002**: [`src/index.css`](src/index.css:1) — **Modified.** Add `@import "./styles/utilities.css";` at line 2. Add component-specific CSS blocks below line 3238 for each heavy component refactored in Phase 2.
- **FILE-003**: [`src/styles/tokens.css`](src/styles/tokens.css:1) — **Unchanged.** Reference-only.
- **FILE-004**: [`design/design-tokens.md`](design/design-tokens.md:1) — **Modified.** Add CSS class naming convention documentation (TASK-033).
- **FILE-005–FILE-045**: 40+ component and page TSX files — **Modified.** Replace inline `style={{...}}` with CSS classes. See task list for specific files per phase.

## 6. Testing

- **TEST-001**: Playwright snapshot comparison — capture full-page screenshots of all 7 routes before Phase 1 begins. After each phase, capture again and diff against baseline. Acceptable tolerance: 0 pixel differences for layout/color; minor anti-aliasing differences on text are acceptable.
- **TEST-002**: Manual visual inspection of each affected component in both light mode (default) and any dark mode implementation. Verify `hsl(var(--color-*))` tokens resolve correctly.
- **TEST-003**: ESLint run (`deno task lint`) — must pass with zero new errors. Any `style={{}}` that remains must have a justification comment to satisfy future lint rules.
- **TEST-004**: TypeScript type-check (`deno task build`) — must produce zero type errors after all TSX changes.
- **TEST-005**: Mobile viewport (390×844) smoke test via Playwright — verify touch targets remain 44×44px minimum after class refactoring. Check for any layout overflow or z-index stacking issues.
- **TEST-006**: Desktop viewport (1280×800) smoke test — verify no layout shifts, no broken grid layouts, no missing box-shadows.
- **TEST-007**: Reduced motion (`prefers-reduced-motion: reduce`) — verify transitions from `DailyPlanView` collapse, `TutorialOverlay` highlights, and `MilestoneNode` shake animation respect the `0.01ms` duration rule in [`src/index.css:43`](src/index.css:43).

## 7. Risks & Assumptions

- **RISK-001: CSS specificity conflicts** — Adding utility classes alongside existing semantic classes could create unexpected specificity wins. Mitigation: utility classes use single-class selectors (`.core-flex-row` not `.core-flex-row.core-active`). Component classes follow existing BEM nesting (`.daily-plan__header` is scoped under `.daily-plan` conceptually, but not via CSS nesting — use descendant selectors if needed).
- **RISK-002: Class name collisions** — The global CSS namespace could see collisions between utility class names and future additions. Mitigation: the `core-` prefix establishes a naming convention that avoids collisions with semantic component classes. Document this convention in TASK-033.
- **RISK-003: Dynamic style regression** — Removing an inline style that appears static but was actually overridden by a parent component's state could cause visual regression. Mitigation: only replace styles that are unambiguously static (no ternary expressions, no prop-derived values). Conditional styles that use `props.x ? "a" : "b"` get converted to CSS classes with state-based toggles (e.g., `className={collapsed ? "daily-plan__header--collapsed" : "daily-plan__header--expanded"}`).
- **RISK-004: FormPage error state** — [`FormPage.tsx`](src/pages/FormPage.tsx:187) uses `style={{ color: "hsl(var(--color-destructive))" }}` conditionally for error messages. This should become a CSS class (`.form-error` already exists in `index.css:764`). Verify the class already provides the correct color and margin.
- **RISK-005: LandingPage dynamic border color** — [`LandingPage.tsx`](src/pages/LandingPage.tsx:272) uses `style={{ border: `1px solid ${PLAYER_ACCENT}` }}` which is derived from a JS constant. This is a justified dynamic style — annotate with comment, keep inline.
- **ASSUMPTION-001**: The Playwright MCP Firefox browser profile (iPhone 15, 390×844) is available and configured per the `.cursor/mcp.json` Playwright server.
- **ASSUMPTION-002**: No other branches are making sweeping CSS changes during this refactoring period. If conflicts arise, the CSS additions in `src/index.css` (appended to the end of the file) should merge cleanly.
- **ASSUMPTION-003**: The `@import` at the top of `src/index.css` for `tokens.css` works for `utilities.css` as well — Vite handles `@import` in CSS files natively.

## 8. Related Specifications / Further Reading

- [Audit results: In-Component Style Declaration Audit](#) — Full audit with 406 inline style occurrences catalogued by file, pattern, and severity.
- [`src/styles/tokens.css`](src/styles/tokens.css:1) — Design token definitions.
- [`src/index.css`](src/index.css:1) — Global stylesheet with existing component CSS classes.
- [`plans/UI_Redesign_Planning.md`](plans/UI_Redesign_Planning.md:1) — UI redesign plan; some PS tickets (PS-8, PS-11A) may interact with this refactoring.
- [`AGENTS.md` rules on React lifecycle](AGENTS.md) — Component-hook boundary and callback wrapping pattern rules.
- [Vite CSS documentation](https://vite.dev/guide/features.html#css) — Vite's native CSS handling and `@import` support.
