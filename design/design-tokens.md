# MesseBuddy Design Tokens

Authoritative UI reference for agents modifying this codebase. **Source of truth for runtime values:** [`src/styles/tokens.css`](../src/styles/tokens.css). **Component architecture:** [`component-architecture.md`](component-architecture.md). **Styles:** [`src/index.css`](../src/index.css) (import manifest) + [`src/styles/components/`](../src/styles/components/). **Do not introduce inline styles** unless matching an existing exception (dynamic geometry only).

Mobile-first. Primary smoke viewport: **390×844** (iPhone-class). Admin desktop breakpoint: **≥ 40rem (640px)** for two-column cockpit.

---

## 1. Token architecture

| Layer | Location | Rule |
|-------|----------|------|
| Primitive tokens | [`src/styles/tokens.css`](../src/styles/tokens.css) `:root` | HSL channels without `hsl()` wrapper |
| Semantic usage | `hsl(var(--color-*))` or `hsl(var(--color-*) / 0.5)` | Always compose alpha this way |
| Utility classes | [`src/styles/utilities.css`](../src/styles/utilities.css) | `core-{property}` prefix for single-purpose utilities |
| UI primitive CSS | [`src/styles/components/button.css`](../src/styles/components/button.css) etc. | BEM blocks for Button, Card, Form, Avatar |
| Pattern / domain CSS | [`src/styles/components/`](../src/styles/components/), [`src/styles/layouts/`](../src/styles/layouts/) | One focused file per domain or pattern |
| Import manifest | [`src/index.css`](../src/index.css) | Fonts + ordered `@import` only |
| React primitives | [`src/components/ui/`](../src/components/ui/) | Typed wrappers over BEM classes |
| Pages | `src/pages/**` | Compose primitives + patterns; < 200 lines |

### CSS file import order (in [`src/index.css`](../src/index.css))

```css
@import "./styles/reset.css";
@import "./styles/tokens.css";
@import "./styles/utilities.css";
@import "./styles/layouts/page.css";
@import "./styles/components/button.css";
@import "./styles/components/card.css";
@import "./styles/components/form.css";
@import "./styles/components/icon-button.css";
@import "./styles/components/avatar.css";
@import "./styles/components/topbar.css";
@import "./styles/components/modal.css";
@import "./styles/components/bottom-sheet.css";
@import "./styles/components/a11y.css";
@import "./styles/components/chat.css";
@import "./styles/components/map.css";
@import "./styles/components/sidebar.css";
@import "./styles/components/qr.css";
@import "./styles/components/shared.css";
@import "./styles/components/player.css";
@import "./styles/components/admin.css";
@import "./styles/components/tutorial.css";
```

### CSS class naming conventions

| Prefix | Scope | Example |
|--------|-------|---------|
| `core-` | Utility (layout, typography, icons, spacing) | `.core-flex-row`, `.core-text-sm`, `.core-mb-4` |
| `{component}-` | Component block (BEM: `block__element--modifier`) | `.daily-plan__header`, `.hire-analytics__stat-row--wrap` |
| `{page}-` | Page-scoped layout | `.cockpit-col`, `.landing__card` |
| `.btn` / `.btn--` | Shared button system | `.btn--primary`, `.btn--ghost` |
| `.card` | Shared card surface | `.card` (padding, border-radius, shadow) |

**Fonts loaded in** [`src/index.css`](../src/index.css): Geist (UI + display headings), Geist Mono (codes/keys).
Note: PR #17 unified the project to Geist font family; DM Sans, Playfair Display, and Inter are no longer loaded.

---

## 2. Color tokens

All values are HSL channels. Usage: `hsl(var(--token))`.

### 2.1 Surface & text

| Token | Channels | Role | Example use |
|-------|----------|------|-------------|
| `--color-bg` | `220 43% 97%` | App background | `body`, landing grid, tutorial |
| `--color-fg` | `221 61% 14%` | Primary text | Headings, labels |
| `--color-card` | `0 0% 100%` | Elevated surface | Cards, inputs, sheets |
| `--color-card-fg` | `221 61% 14%` | Text on card | — |
| `--color-muted` | `220 43% 96%` | Subtle fill | Completed cards, ghost hover |
| `--color-muted-fg` | `214 19% 45%` | Secondary text | Subtitles, hints, ghost buttons |
| `--color-border` | `217 37% 89%` | Dividers, card borders | `.card`, `.form-input` |
| `--color-input` | `217 37% 89%` | Input border | `.form-input` |

### 2.2 Brand & actions

| Token | Channels | Role |
|-------|----------|------|
| `--color-primary` | `227 59% 27%` | Brand navy — top bar, primary buttons, milestone fill |
| `--color-primary-fg` | `0 0% 100%` | Text/icons on primary |
| `--color-secondary` | `220 50% 95%` | Secondary button bg, map viewport bg |
| `--color-secondary-fg` | `221 61% 14%` | Text on secondary |
| `--color-accent` | `227 59% 27%` | Same as primary (alias) |
| `--color-destructive` | `353 78% 44%` | Errors, discard actions |
| `--color-destructive-fg` | `0 0% 100%` | Text on destructive |
| `--color-ring` | `227 59% 27%` | Focus ring |

### 2.3 Progress & status

| Token | Channels | Role |
|-------|----------|------|
| `--color-xp-ring` | `227 59% 27%` | XP ring active |
| `--color-xp-ring-track` | `217 37% 89%` | XP ring track |
| `--color-status-upcoming` | `214 19% 65%` | Not started |
| `--color-status-progress` | `227 59% 55%` | In progress |
| `--color-status-complete` | `142 71% 45%` | Complete / success toast |

### 2.4 Role & mission semantics

| Token | Channels | Role |
|-------|----------|------|
| `--color-role-player` | `212 72% 37%` | Landing employee accent |
| `--color-role-player-bg` | `212 72% 93%` | Landing employee surface |
| `--color-role-admin` | `160 73% 28%` | Landing admin accent |
| `--color-role-admin-bg` | `160 73% 91%` | Landing admin surface |
| `--color-mission-text` | `200 70% 45%` | Text mission badge |
| `--color-mission-link` | `270 60% 50%` | Link mission badge |
| `--color-mission-form` | `150 55% 42%` | Form mission badge |

Apply via `data-role` / `data-mission-type` in CSS — not hardcoded HSL in TSX.

---

## 3. Typography

| Token | Value | Use |
|-------|-------|-----|
| `--font-sans` | `"Geist", system-ui, sans-serif` | Body, buttons, forms, all UI |
| `--font-display` | `"Geist", system-ui, sans-serif` | All headings (unified to Geist; no serif display font) |
| `--font-mono` | `"Geist Mono", ui-monospace, monospace` | Recovery keys, session codes, invite URLs |

### Scale

| Token | Size | Typical use |
|-------|------|-------------|
| `--text-xs` | 0.75rem (12px) | Badges, footer, divider labels |
| `--text-sm` | 0.875rem (14px) | Labels, buttons, body secondary |
| `--text-base` | 1rem (16px) | Body, inputs |
| `--text-lg` | 1.125rem (18px) | Sheet titles, modal titles |
| `--text-xl` | 1.25rem (20px) | Modal headings |
| `--text-2xl` | 1.5rem (24px) | Form shell titles |
| `--text-3xl` | 1.875rem (30px) | Landing page title |

| Token | Value |
|-------|-------|
| `--weight-normal` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |
| `--leading-tight` | 1.25 |
| `--leading-normal` | 1.5 |
| `--leading-relaxed` | 1.75 |

---

## 4. Spacing

4px base grid via rem. **Prefer existing tokens — never arbitrary pixel gaps in inline styles.**

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-5` | 1.25rem |
| `--space-6` | 1.5rem |
| `--space-8` | 2rem |
| `--space-10` | 2.5rem |
| `--space-12` | 3rem |

---

## 5. Radius, shadow, motion

### Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 0.25rem |
| `--radius` | 0.5rem — default buttons, inputs |
| `--radius-md` | (used in Toast inline — prefer `--radius`) |
| `--radius-lg` | 0.75rem — cards, map viewport |
| `--radius-xl` | 1rem — modals, bottom sheets |
| `--radius-full` | 9999px — pills, avatars |

### Shadow

| Token | Use |
|-------|-----|
| `--shadow-sm` | Cards at rest, top bar |
| `--shadow-md` | Landing card, hover elevation |
| `--shadow-lg` | Modals, bottom sheets, toasts |

### Motion

| Token | Value |
|-------|-------|
| `--duration-fast` | 150ms — hovers, focus |
| `--duration-normal` | 250ms |
| `--duration-slow` | 400ms — progress fills, sheet open |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |

Map collapse uses `0.35s cubic-bezier(0.4, 0, 0.2, 1)` — keep consistent when touching admin layout.

---

## 6. Layout constants

| Token | Value | Use |
|-------|-------|-----|
| `--topbar-h` | 3.5rem (56px) | Fixed header; pages use `.page--has-topbar` |
| `--sidebar-w` | 22rem (352px) | Admin sidebar at desktop |
| `--ms-strip-h` | 7rem | Player mission strip |
| `--touch-target` / `--min-touch` | 2.75rem (44px) | WCAG minimum tap target |

### Breakpoints (in CSS)

| Query | Behavior |
|-------|----------|
| `min-width: 640px` | Resources grid 2 columns |
| `min-width: 40rem` | Admin `.admin-layout` → map + sidebar columns |
| `min-width: 64rem` | Additional admin/player layout adjustments |

### Z-index stack (do not invent new layers without updating this table)

| z-index | Layer |
|---------|-------|
| 10 | Map zoom controls, grid overlay |
| 50 | Milestone sidebar overlay |
| 100 | TopBar, bottom-sheet backdrop |
| 101 | Bottom sheet panel |
| 200 | Modal backdrop, recovery modal, FetchErrorPanel context |
| 250 | Tutorial overlay |
| 300 | QR scanner fullscreen |
| 2000 | Toast (inline style — highest) |

---

## 7. Component catalog

Reuse these before creating new components. Paths relative to `src/components/`.

### 7.1 Actions

| Class / component | Variants | When to use |
|-------------------|----------|-------------|
| [`Button`](../src/components/ui/Button.tsx) | `primary`, `secondary`, `ghost`, `destructive`, `fullWidth` | Preferred over raw `.btn` |
| `.btn` | — | Base; prefer `Button` component |
| `.btn--primary` | — | Primary CTA (join, create, submit) |
| `.btn--secondary` | — | Secondary actions, "Use template" |
| `.btn--ghost` | — | Back, tertiary, demo links |
| `.btn--destructive` | — | Delete, irreversible |
| Landing helpers | `.landing__btn-full`, `.landing__btn-muted`, `.landing__btn-demo` | Full-width landing actions only |

**Rules:** `min-height: var(--touch-target)`; disabled → `opacity: 0.5`. Never force-click obscured buttons in tests — fix layout.

### 7.2 Surfaces

| Class | Use |
|-------|-----|
| `.card` | Generic elevated panel (template rows, resource wrappers) |
| `.landing__card` | Landing form container (max-width 22rem) |
| `.mission-card` | Mission list item; `--completed` for done state |
| `.resource-card__*` | Resource list entries |

### 7.3 Forms

| Class | Use |
|-------|-----|
| `.form-field` | Label + control wrapper |
| `.form-label` | Field label; `--required` adds asterisk |
| `.form-input` | text, textarea, select |
| `.form-error` | Inline validation (`role="alert"`) |
| `.form-shell` | Full mission form page layout |
| [`FormField.tsx`](../src/components/form/FormField.tsx) | Dynamic mission fields from schema |
| [`FormShell.tsx`](../src/components/form/FormShell.tsx) | Mission form page chrome |

### 7.4 Navigation & chrome

| Component | Classes | Pages |
|-----------|---------|-------|
| [`TopBar.tsx`](../src/components/shared/TopBar.tsx) | `.topbar`, `.topbar__*` | Player cockpit, Admin pages, Form |
| [`LandingShell.tsx`](../src/pages/landing/LandingShell.tsx) | `.landing`, `.landing__*` | Landing |
| `.page`, `.page--has-topbar` | Page wrapper with top bar offset | |

### 7.5 Overlays

| Pattern | Classes | Components |
|---------|---------|------------|
| Center modal | `.modal-backdrop`, `.modal`, `.modal__*` | [`Modal`](../src/components/patterns/Modal.tsx) — prefer component |
| Bottom sheet | `.bottom-sheet-*`, `.sheet-*` | [`BottomSheet`](../src/components/patterns/BottomSheet.tsx) |
| Recovery key (legacy CSS aliases) | `.recovery-modal__*` | Use `Modal variant="narrow"` |
| Confirm sheet | `.sheet-confirm` | [`ConfirmSheet`](../src/components/admin/ConfirmSheet.tsx) |
| Full-screen | `.tutorial-overlay`, `.qr-scanner` | Tutorial, QR scanner |
| Toast | inline styles only | [`Toast.tsx`](../src/components/shared/Toast.tsx) |
| Error full page | inline styles | [`FetchErrorPanel`](../src/components/shared/FetchErrorPanel.tsx) |

### 7.6 Data display

| Component | Classes |
|-----------|---------|
| [`TagBadge`](../src/components/shared/TagBadge.tsx) | `.tag-badge`, `--mandatory`, `--urgent` |
| [`XpBadge`](../src/components/shared/XpBadge.tsx) | `.xp-badge` |
| [`SegmentGroup`](../src/components/shared/SegmentGroup.tsx) | `.segment-group`, `.segment-btn--active` |
| [`TemplateLibrary`](../src/components/shared/TemplateLibrary.tsx) | `.template-library__*` |
| [`SearchBar`](../src/components/shared/SearchBar.tsx) | Used inside template library |
| [`MissionCard`](../src/components/shared/MissionCard.tsx) | `.mission-card__*` |

### 7.7 Map & milestones

| Component | Classes |
|-----------|---------|
| [`MapViewport`](../src/components/shared/MapViewport.tsx) | `.map-viewport`, `.map-canvas`, `.map-zoom-*` |
| [`MilestoneNode`](../src/components/shared/MilestoneNode.tsx) | `.milestone-node`, liquid `.milestone-node__fill` |
| [`IsometricMilestoneMap`](../src/components/player/IsometricMilestoneMap.tsx) | Isometric 3D player map (PR #17); used by `MilestoneMapViewer` for player-facing map |
| Admin editor | `.milestone-map-editor`, `.map-editor-toolbar__*` | |

Milestone positions use **percentage** coordinates (`xPercent` / `yPercent` 0–100) — never pixel positions in domain data.

---

## 8. Page composition map

How routes assemble components (for regression scope). PR #17 replaced the admin tab-based `AdminCockpitPage` with separate route-based pages.

| Route | Page | Layout | Key components |
|-------|------|--------|----------------|
| `/`, `/join/:sessionId` | [`LandingPage`](../src/pages/LandingPage.tsx) | `LandingShell` + view switch | `RoleSelectView`, `JoinSessionView`, `CreateSessionView`, `TemplatesView`, `RecoverView`, modals |
| `/session/:id` | [`PlayerCockpitPage`](../src/pages/PlayerCockpitPage.tsx) | `TopBar` + tab bar (Dashboard / AI Assistant) | `MilestoneMapViewer` (→ `IsometricMilestoneMap`), `MilestoneSidebarViewer`, `CurrentMissionsList`, `BuddyCard`, `ResourcesSection`, `ChatPanel`, `TutorialOverlay` |
| `/admin/:id` | [`AdminHomePage`](../src/pages/AdminHomePage.tsx) | `TopBar` + hire list | `GmHireRow` cards, status indicators, "Add hire" placeholder |
| `/admin/:id/hire/:hireId` | [`HireDetailPage`](../src/pages/HireDetailPage.tsx) | `TopBar` + detail columns | `IsometricMilestoneMap` (read-only), `MilestoneMapEditor` (editable), `MissionBottomSheet`, `HireAnalytics`, `MissionTimelineChart`, `SessionInviteCard`, `ResourcesEditor`, `TemplateSelect`, `SaveActions`, `BuddyAssignmentForm` |
| `/form/:sessionId/:missionId` | [`FormPage`](../src/pages/FormPage.tsx) | `TopBar` + `FormShell` | `FormField` per schema |
| `/admin/:sessionId/scan` | [`QRScannerView`](../src/pages/QRScannerView.tsx) | Full-screen `.qr-scanner` | `CameraFeed`, `ValidationResult` |

### Landing view states

| View | Subtitle copy (`landingCopy.ts`) | Primary actions |
|------|----------------------------------|-----------------|
| `role-select` | "Choose how you'd like to join" | New Employee / Admin / Recover |
| `join` | "Enter your session code" | Join session |
| `create` | "Create a new onboarding session" | Create / import / browse templates |
| `templates` | (section label only) | TemplateLibrary + back |
| `recover` | "Restore your progress" | Restore progress |

Invite URL `/join/:sessionId` pre-fills join form — **no auto-submit**.

---

## 9. UX rules (regression guardrails)

### Accessibility

- Minimum touch target **44×44px** (`--touch-target`) on all interactive controls.
- Form errors: `role="alert"` on `.form-error`.
- Modals: `role="dialog"`, `aria-modal="true"`, labelled title.
- Decorative elements: `aria-hidden="true"` (e.g. landing MM mark).
- Screen-reader-only: `.visually-hidden`.

### Mobile-first layout

- Design at **390px width** first; verify no horizontal overflow.
- Admin map collapses to **20svh** on sidebar scroll (`data-map-collapsed="true"`).
- Bottom sheets height **94dvh** — content scrolls inside sheet body.
- **Never** `display: none` on primary actions to fix overlap — fix stacking/spacing.

### Visual consistency

- **Primary brand** = navy (`--color-primary`), not black.
- **Display serif** only for hero/form titles — not body UI.
- **Mono font** only for recovery keys and similar codes.
- Grid background on landing: `.landing--grid-bg` (2rem cells) — do not duplicate inline.
- Dividers with centred label: `.landing__divider` + `__divider-line` + `__divider-label`.

### Interaction

- Primary button disabled when required fields empty or `status === "loading"`.
- Loading labels: "Joining…", "Creating…", "Recovering…", "Importing…", "Loading…".
- Destructive copy on ghost buttons uses `--color-destructive` (see ConfirmSheet).

---

## 10. Agent checklist (UI change verification)

After any UI change, verify on **390×844** (Playwright MCP, Firefox/iPhone 15 profile):

1. **Landing** (`/`, `/join/:sessionId`): brand, grid bg, card max-width, all five views, modals after join/create.
2. **Player cockpit** (`/session/:id` demo): TopBar, map visible, mission list scrolls, no clipped CTAs.
3. **Admin cockpit** (`/admin/:id` demo): map + sidebar, bottom sheet opens, tabs switch.
4. **Form** (`/form/:missionId`): TopBar + form fields + submit.
5. Console: no errors. Screenshots → `.playwright-mcp/`.
6. **Token drift:** new colours/spacing must extend `tokens.css`, not hardcode hex/rgb in TSX.

### Common regression patterns to reject

| Symptom | Likely cause |
|---------|--------------|
| Button below fold, untappable | Missing `--touch-target`, sheet height overflow |
| Double navigation on landing | Calling `setIdentity` before recovery modal dismiss |
| Map nodes misaligned | Changed `%` positioning or viewport aspect ratio |
| Inline style proliferation | Skipped existing BEM class — refactor to CSS |
| Wrong font | Used Inter or system default instead of `--font-sans` |

---

## 11. Adding new tokens

1. Add primitive to [`src/styles/tokens.css`](../src/styles/tokens.css).
2. Reference via `var(--token)` in the appropriate component CSS file under [`src/styles/components/`](../src/styles/components/).
3. Document semantic purpose in this file (section 2–6).
4. If a new component is shared across ≥2 pages, place under `src/components/shared/`.
5. Page-only UI stays under `src/pages/<page>/`.

---

*Last synced with codebase: 2026-06-29.*
