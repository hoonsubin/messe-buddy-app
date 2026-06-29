# MesseBuddy - Implementation Strategy

> **Archived (2026):** Historical mock-first rollout plan. Milestone numbering below reflects original delivery order, not current codebase status. See [`SPECS.md`](../../SPECS.md) and [`design/component-architecture.md`](../../design/component-architecture.md) for active guidance.

> **Scope:** First iteration interactable prototype for user testing
> **Target repo:** `~/Projects/messe-buddy-app/`
> **Spec authority:** `~/Projects/messe-buddy-app/SPECS.md`
> **Wireframe authority:** `~/Projects/MesseBuddy/docs/MesseBuddy_Wireframe.html`
> **Last updated:** 2026-06-14

---

## How to Use This Document

This is a **prompt scaffold for a coding agent**. Each phase is one agent session. An agent receiving Phase N can work from it alone - entry conditions carry forward what matters; the agent reads SPECS.md and the wireframe directly for authority on specifics.

Two authorities, two domains:
- **Wireframe** → visual design: fonts, colors, spacing, layout, component appearance, copy text
- **Spec (SPECS.md)** → behavior: data types, use case logic, validation flows, constraints

When they conflict, the spec wins on behavior, the wireframe wins on appearance. The known divergence: the wireframe shows an immediate form on first load; the spec defines a tutorial sequence that *opens* the profile form as Mission 1. The implementation follows the spec.

---

## Testability Contract

The usability test plan defines three participant types and three tasks per type - nine test scenarios total. Every scenario must be completable against the mock adapter before Phase 7 PocketBase integration begins. This section maps each test scenario to the phase that delivers it. If a phase is incomplete, the linked test scenarios cannot be run.

### New Hire (Player)

| # | Task summary | Feature required | Delivered in |
|---|---|---|---|
| 1 | Log in → milestone map → daily plan → first mission | Login, Milestone Map, Daily Plan View, Mission List | Phase 2, 3 |
| 2 | Complete security briefing via QR flow → XP/progress update | QR Validation Flow, Progress Tracking, XP System | Phase 4 |
| 3 | Find answer to home office policy question | AI Q&A (mock), Resource Section | Phase 4 |

### Direct Supervisor (Game Maker)

| # | Task summary | Feature required | Delivered in |
|---|---|---|---|
| 1 | Create session for "Anna" → assign missions → template vs custom | Create Session, Mission Editor, Template Library | Phase 2, 6 |
| 2 | Find supervisor pre-boarding checklist | Pre-Boarding Checklist (separate from mission editor) | Phase 6 |
| 3 | Confirm Anna completed security briefing via approval + QR | Pending Approvals Panel, Admin QR Scanner | Phase 6 |

### HR / People & Culture (Game Maker)

| # | Task summary | Feature required | Delivered in |
|---|---|---|---|
| 1 | Understand platform structure (milestone/mission model) | Admin Cockpit overview, Role-based navigation | Phase 6 |
| 2 | Create reusable onboarding template | Save as Template, Template Library (browse + apply) | Phase 6 |
| 3 | Overview of three new hires across teams → stalled indicators | Cross-New-Hire Dashboard, Stalled Hire Alerts | Phase 6 |

---

## Principles (apply to every phase, every file)

**Types first.** Never write a component that uses a shape not defined in `src/types/`. If you need `{ id: string; name: string }`, stop - find or define the correct interface from SPECS.md.

**Adapter boundary.** Components never import an adapter directly. They consume `AdapterContext`. The mock and PB adapters implement the same `AppAdapter` interface. Swapping is a one-line change in the context provider.

**No `JSON.parse` in components.** All PocketBase JSON field parsing happens inside `src/adapters/pocketbase/` only. (Constraint C-13.)

**No direct `progress_events` writes from components.** All ProgressEvent mutations go through the `upsertProgressEvent` use case. (Constraint C-14.)

**Mobile-first layout.** The wireframe establishes the design intent; the concrete pixel dimensions of the wireframe are not the target - they are a reference. Every layout and sizing decision uses `rem`, `%`, `clamp()`, `dvh`/`svh`. No concrete `px` for positioning or sizing anywhere in the codebase. The result scales correctly at any viewport width without any viewport-size conditionals. Touch targets ≥ `var(--min-touch)` (44px in rem). Desktop layout is additive - wider viewports simply get more breathing room, not a different layout system.

**One write path.** `upsertProgressEvent` is the single mutation point for all progress state. See C-05.

**Use cases are pure functions.** `deriveXP`, `computeProgress`, `exportTemplate` have no side effects and no adapter calls. They take typed inputs, return typed outputs, and can be tested without a DOM.

---

## Project Structure (established in Phase 0, refined through Phase 4)

```
src/
  types/            # All TS interfaces and union types - verbatim from SPECS.md
    domain.ts       # PBRecord-extending interfaces: Session, Player, Milestone, etc.
    unions.ts       # MissionType, MissionTag, ValidationMethod, etc. (const+keyof)
    value-objects.ts # FieldSchema, QRPayload, ScanData, LocalIdentity
    ephemeral.ts    # MilestoneProgress, PlayerProgress, DraftMission, TemplateRecord
    exports.ts      # TemplateExport, FullSessionExport
    index.ts        # Barrel re-export
  use-cases/        # Pure business logic: deriveXP, computeProgress, joinSession, etc.
  adapters/
    interface.ts    # AppAdapter interface - the single contract
    AdapterContext.tsx   # Context provider (swaps mock ↔ PB in one line)
    AdapterContextValue.ts # Context value creation
    useAdapter.ts   # Hook to consume AppAdapter
    mock/           # Mock implementation: mockData.ts + mockAdapter.ts + index.ts
    pocketbase/     # Real PB adapter (Phase 7 only)
  hooks/            # React hooks: useIdentity, useSession, usePlayerProgress, etc.
  components/
    shared/         # Cross-cutting: TopBar, BackgroundCanvas, MapViewport, MilestoneNode, MissionCard, TagBadge, XpBadge, SearchBar, RecoveryKeyModal, ResourceCard
    player/         # Player-only: MilestoneMapViewer, MilestoneSidebarViewer, CurrentMissionsList, DailyPlanView, BuddyCard, MissionDetailPopup, ValidationDisplay, QRDisplay, PendingApprovalDisplay, ResourcesSection, ChatPanel, YouAreHereMarker, ProgressLegend
    admin/          # Game-Master-only: MilestoneMapEditor, MilestoneSidebarEditor, GridOverlay, PlayerSelectorDropdown, PlayerProfileCard, PendingApprovalsPanel, ApprovalRequestCard, PreBoardingChecklist, PreBoardingChecklistItem, CrossHireDashboard, HireProgressRow, StalledHireAlert, BuddyAssignmentForm, ResourcesEditor, MissionEditor, FormEditor, FormFieldEditor, MarkdownEditor, MissionTypeSelector, DifficultySelector, TagSelector, ValidationMethodSelector, SaveActions, SaveTemplateModal, TemplateLibrary, TemplateCard, TemplateFields, BackgroundImageUploader, AdminQRScannerModal
    form/           # Form building: FormShell, FormField
    layout/         # Route guards: RequireRole
    tutorial/       # TutorialOverlay, TutorialStep
    qr/             # QR scanning: CameraFeed, ValidationResult
  pages/            # Route-level page components (flat .tsx files)
    LandingPage.tsx
    PlayerCockpitPage.tsx
    AdminCockpitPage.tsx
    FormPage.tsx
    QRScannerView.tsx
  styles/
    tokens.css      # All CSS custom properties - derived from wireframe
  utils/
    qrPayload.ts    # Single encode/decode point for QR - see C-16
  index.css         # Reset styles + global typography + component CSS
```

---

## Phase 0 - Invisible Foundation

**One-line description:** Everything the app needs to exist logically, with nothing visible yet.

**Deliverables:**

**0a. TypeScript types (`src/types/`)**  
Transcribe verbatim from SPECS.md - every interface, every union type, every `const` + `keyof` pattern. No shortcuts, no inference. Files:
- `domain.ts` - all `PBRecord`-extending interfaces: Session, Player, Milestone, Mission, FormSchema, ProgressEvent, BuddyProfile, Resource
- `unions.ts` - MissionType, MissionTag, ValidationMethod, ProgressStatus, MilestoneStatus, ResourceType, FieldType, UserRole; all as `const` + `keyof` pattern (C-12: no TypeScript enums)
- `value-objects.ts` - FieldSchema, QRPayload, ScanData, SessionRole, LocalIdentity
- `ephemeral.ts` - MilestoneProgress, PlayerProgress, DraftMission, TemplateRecord
- `exports.ts` - TemplateExport, FullSessionExport
- `index.ts` - re-exports all of the above

**0b. AppAdapter interface (`src/adapters/interface.ts`)**
The contract both mock and PB adapters must satisfy. Methods:
```
Sessions: getSession, createSession, updateSession
Players: getPlayer, getPlayerById, createPlayer, updatePlayer, getPlayerByRecoveryKey, listPlayers
Milestones: listMilestones, createMilestone, updateMilestone, deleteMilestone
Missions: listMissions, createMission, updateMission, deleteMission
FormSchemas: getFormSchema, upsertFormSchema
ProgressEvents: upsertProgressEvent, listProgressEvents, subscribeProgressEvent
BuddyProfiles: getBuddyProfile, upsertBuddyProfile
Resources: listResources, createResource, updateResource, deleteResource
```
All methods return `Promise<T>`. `subscribeProgressEvent` returns `() => void` (unsubscribe).

**0c. Use cases (`src/use-cases/`)**  
Pure functions, all with full TypeScript signatures. Implement now:
- `deriveXP.ts` - full XP algorithm from SPECS.md §XP Derivation
- `computeProgress.ts` - derives `PlayerProgress` from `ProgressEvent[]` + `Mission[]`
- `joinSession.ts` - generates UID + 8-char recoveryKey, writes `LocalIdentity` to localStorage
- `recoverIdentity.ts` - looks up player by recoveryKey via adapter, restores localStorage
- `exportTemplate.ts` - pure transform: Session + arrays → TemplateExport (strips PB IDs)
- `importTemplate.ts` - takes TemplateExport + adapter, creates all records, returns new sessionId
- `getDailyMissions.ts` - derives the player's "missions for today": all `inProgress` milestones' missions that are not yet completed, sorted by `mission.order`. Returns `Mission[]`. Pure function: takes `PlayerProgress` + `Mission[]`, no adapter calls.

**0d. Mock data + adapter (`src/adapters/mock/`)**  
`mockData.ts`: one Session, 3 Milestones, 10 Missions (mix of text/link/form; all three `validationMethod` types represented), 2 Players (one `tutorialComplete: false`, one `tutorialComplete: true`), buddy profiles, form schemas, resources, progress events. Include at least one `gmApprove` mission in `pendingApproval` state so the approvals panel is non-empty on first load.

`mockAdapter.ts`: implements `AppAdapter`; stores state in module-level Maps. `subscribeProgressEvent` uses `setTimeout` to simulate async approval after 4 seconds (for testing gmApprove flow without a real GM).

**0e. Router + context (`src/App.tsx`, `src/main.tsx`)**
Wire `react-router-dom` v7. Routes:
```
/                   → LandingPage (stub div)
/session/:id        → PlayerCockpitPage (stub div)
/admin/:id          → AdminCockpitPage (stub div)
/form/:missionId    → FormPage (stub div)
/qr/:missionId      → QRScannerView (stub div)
```
`AdapterContext` (split into `AdapterContextValue.ts` + `AdapterContext.tsx` + `useAdapter.ts`): provided at root with `mockAdapter`. Components consume `useAdapter()`; never import adapters directly.

**0f. Identity hook (`src/hooks/useIdentity.ts`)**  
Reads/writes `localStorage.getItem('mb_identity')` typed as `LocalIdentity | null`.

**0g. Add to `deno.json` imports:**
- `react-router-dom` v7
- `pocketbase`
- `qrcode` (QR code generation)
- `jsqr` (QR frame decode)
- `marked` (Markdown rendering in MissionDetailPopup and MarkdownEditor)

**Exit condition:** `deno task build` compiles with zero TypeScript errors. `deno task dev` serves the app. Visiting any route shows a stub div. No console errors.

**Invariants carried forward:** All types defined here are never re-defined in components. The `AdapterContext` is the only data access path. Mock adapter is active for all subsequent phases until Phase 7.

---

## Phase 1 - Visual Shell

**One-line description:** Every page and component from the wireframe exists as a correctly structured, styled shell with no state or logic. A developer looking at the browser can see the full layout skeleton.

**This phase produces NO logic.** No `useState`, no adapter calls, no routing. Components receive hardcoded props or render with placeholder content. The purpose is to establish the visual language, component structure, and responsive layout that every subsequent phase builds on.

**Deliverables:**

**1a. Design tokens (`src/styles/tokens.css`)**  
Derive from the wireframe's rendered palette, typography, and spacing. Define all as CSS custom properties:
- Typography: `--font-display` (Playfair Display), `--font-body` (DM Sans), `--font-mono` (DM Mono)
- Color palette: background, card surfaces, text primary/muted, accent, XP color, milestone status colors (upcoming/inProgress/completed), tag colors (mandatory/urgent/overdue/needsApproval)
- Spacing scale: `--space-1` through `--space-12` in rem
- Touch minimum: `--min-touch: 2.75rem` (44px)
- Border radii: sm / md / lg / full
- Shadows and glassmorphism values matching wireframe

**1b. Reset + global styles (`src/index.css`)**
Box model reset, global typography, and all component CSS live in a single `index.css`. Import Google Fonts matching wireframe. Design tokens are in `src/styles/tokens.css`.

**1c. LandingPage shell**  
Full-bleed layout. Displays: brand logo/name, tagline copy from wireframe, four action areas (Join Session / Create Session / Recover Progress / Returning User redirect notice). No inputs wired. No onClick handlers. Visual matches wireframe landing screen.

**1d. PlayerCockpitPage shell**
Scrollable single-column layout. Contains in order, all with placeholder text:
- `TopBar` (in `components/shared/`) - fixed, shows logo, XP bar placeholder, avatar placeholder
- `DailyPlanView` (in `components/player/`) - card or banner showing "Today's Missions" with 2–3 placeholder mission rows; visually distinct from the full milestone mission list below it. This is the primary orientation surface for new hires.
- `MilestoneMapViewer` (in `components/player/`, uses shared `MapViewport`) - map viewport with pan/zoom, dark background (no image yet), shows three placeholder `MilestoneNode` circles at fixed positions
- `CurrentMissionsList` (in `components/player/`) - scrollable full mission list by milestone, not `MissionCard` components
- `BuddyCard` (in `components/player/`) - avatar placeholder, name placeholder, contact placeholder
- `ResourcesSection` (in `components/player/`) - search bar shell, two placeholder `ResourceCard` elements, `ChatPanel` stub below (heading "Ask a question", empty message area, text input)

**1e. AdminCockpitPage shell**  
Tab-based or section-based layout with two distinct top-level views. The navigation between them must be immediately discoverable - a test participant should be able to tell within 30 seconds that the admin view has more than one section.

*Active Session view* (default):
- `TopBar` (same component, different right-side content placeholder)
- `PlayerSelectorDropdown` shell - static dropdown trigger
- `PlayerProfileCard` shell - avatar, name, stats placeholders
- `PendingApprovalsPanel` shell - section header, one placeholder `ApprovalRequestCard` with a "Scan QR" button stub
- `MilestoneMapEditor` shell - same aspect ratio container as viewer, `GridOverlay` visible (static lines)
- `MilestoneSidebarEditor` shell - collapsed/hidden placeholder
- `CurrentMissionsList` shell (admin view)
- `BuddyAssignmentForm` shell - form fields, no wiring
- `ResourcesEditor` shell - table with placeholder rows
- `SaveActions` shell - Save button, Save as Template button

*Pre-Boarding Checklist view* (accessible via tab/button labelled "Pre-Boarding Checklist" or similar):
- `PreBoardingChecklist` (in `components/admin/`) - card with a heading like "Before Anna's first day", a list of `PreBoardingChecklistItem` rows (checkbox + label), placeholder items covering workspace prep, account setup, system access, team intro scheduled. Visually and structurally distinct from the mission editor. This panel must be reachable within 2 taps from the admin cockpit home.

*HR Overview view* (accessible via tab/button labelled "All New Hires" or similar):
- `CrossHireDashboard` (in `components/admin/`) - list or card grid of `HireProgressRow` components. Each row: new hire name, session name, milestone progress bar (% complete), days since last activity, `StalledHireAlert` badge (shown if no progress in N days). Placeholder data: 3 rows representing different progress states (on track / stalled / just started).

**1f. Template Library view** (reachable from Landing Page "Create Session → Load Template" or from a navigation link in AdminCockpitPage):
- `TemplateLibrary` shell - heading "Onboarding Templates", search bar, 2–3 placeholder `TemplateCard` components (template name, milestone count, mission count, "Use Template" button stub)

**1g. FormPage shell**
Full-page layout. Title placeholder. Two example field shells (text input, select) via `FormField`. Wrapped in `FormShell` component (not `DynamicForm`). Submit button.

**1h. QRScannerView shell**  
Full-screen dark background. Camera feed placeholder (a `<div>` with correct dimensions). `ValidationResult` panel placeholder below.

**1i. All shared components - visual shells only**
Every component used across multiple pages must have its full visual structure defined here, even if content is static. Key components (all in `components/shared/` unless noted):
- `MilestoneNode` - circular node with status color variants, liquid-fill progress indicator
- `MapViewport` - shared pan/zoom/pinch viewport with zoom controls; used by both player and admin maps
- `MissionCard` - full card with title, type icon placeholder, XP badge placeholder, tag chips placeholder, status indicator
- `TopBar` - fixed, blur background, responsive
- `BackgroundCanvas` - wrapper for background images with `object-fit: cover`; used as fixed backdrop on player cockpit
- `ValidationDisplay` (in `components/player/`) - full-screen overlay shell with QRDisplay placeholder and PendingApprovalDisplay placeholder
- `TutorialOverlay` (in `components/tutorial/`) - full-screen overlay shell with step indicator, highlight ring placeholder, CTA button
- `TagBadge` - colored chip, one of each variant visible
- `XpBadge` - number + "XP" label, styled
- `RecoveryKeyModal` - modal shown after join/create session
- `SearchBar` - search input with icon
- `AdminQRScannerModal` (in `components/admin/`) - modal overlay with camera feed placeholder, scan status indicator, cancel button. Opened from `ApprovalRequestCard`. Visually matches `QRScannerView` but rendered as a modal, not a full-page route.

**Exit condition:** `deno task dev` running. Every route renders its full shell. Every admin view (active session, pre-boarding checklist, HR overview) is reachable from the admin cockpit. All components are visually consistent with the wireframe. No `px`-based widths, positions, or breakpoint assumptions anywhere. Zero TypeScript errors. Zero logic - no `useState`, no adapter calls, no `useEffect`.

---

## Phase 2 - Identity & Navigation

**One-line description:** A user can join a session as a Player, create a session as a Game Maker, recover their identity, and be silently routed if returning. Route guards enforce role.

**Entry condition:** Phase 0 types + Phase 1 shells in place.

**Deliverables:**

**2a. LandingPage - wired**  
Four flows, each using Phase 1's existing shell elements:
1. **Returning user** - on mount, `useIdentity` check; if valid `mb_identity` with resolvable session, silent redirect to `/session/:id` or `/admin/:id` by role
2. **Join Session** - session code input → `joinSession` use case → stores `LocalIdentity { role: 'player' }` → redirect to `/session/:id`
3. **Create Session** - session name input → adapter `createSession` → stores `LocalIdentity { role: 'gamemaker' }` → redirect to `/admin/:id`
4. **Recover Progress** - recoveryKey + sessionId inputs → `recoverIdentity` use case → redirect to cockpit

**2b. RecoveryKey display**  
Modal overlay shown immediately after `joinSession` or `createSession`. Monospace 8-char token. Copy-to-clipboard button. Explicit dismiss confirmation ("I've saved my recovery key"). Renders over the Phase 1 LandingPage shell - no new visual components needed.

**2c. Route guards**  
`<RequireRole role="player">` and `<RequireRole role="gamemaker">` wrapper components. Read `useIdentity`. If missing or wrong role, redirect to `/`. Wrap the `/session/:id` and `/admin/:id` routes.

**Exit condition:** The full join → recovery-key → cockpit placeholder flow works end-to-end. A returning user (valid localStorage) is silently routed on page load. Wrong-role access redirects to landing. All using Phase 1's visual shells.

---

## Phase 3 - Player Cockpit: Map, Daily Plan & Mission Display

**One-line description:** The Player cockpit is fully populated with real data from the mock adapter. The daily plan is prominent and correct. The map shows milestones at correct positions. Missions are displayed with correct status. No interaction yet.

**Entry condition:** Phase 2 identity working. Mock adapter providing real data.

**Deliverables:**

**3a. Data hooks**  
- `useSession(sessionId)` - fetches Session, Milestones, Missions via adapter
- `usePlayerProgress(playerId)` - fetches ProgressEvents → derives `PlayerProgress` via `computeProgress`
- `useBuddy(playerId)` - fetches BuddyProfile
- `useResources(sessionId)` - fetches Resources filtered by `isVisibleToPlayer: true`

**3b. PlayerCockpitPage - data wired**
Replaces placeholder content with real data. No new component structure - the Phase 1 shells receive real props.
- `TopBar` - real player name, total XP, role from resolved Player record
- `BackgroundCanvas` - `session.bgImageUrl` (empty string for now → falls back to gradient placeholder)
- `DailyPlanView` - calls `getDailyMissions(playerProgress, missions)` use case (Phase 0c). Renders the returned mission rows with title, XP value, and completion status. Shows "Nothing planned for today" empty state if list is empty. This must be the first non-TopBar element the player sees on entering the cockpit - position and visual weight are the primary orientation affordance for New Hire Task 1.
- `MilestoneMapViewer` - uses shared `MapViewport` with pan/zoom; MilestoneNodes positioned at `xPercent`/`yPercent`, status and progress derived from `PlayerProgress.milestoneProgress`
- `YouAreHereMarker` - positioned at fixed coordinates (15, 35). Derivation from first `inProgress` milestone is a future enhancement.
- `CurrentMissionsList` - renders mission rows inline (title, description, tags, XP, status) grouped by milestone - does NOT delegate to `MissionCard` component
- `BuddyCard` - real buddy data or empty state
- `ResourcesSection` - real resources, client-side search

**3c. MilestoneSidebarViewer - wired**
Slide-in from left on MilestoneNode click. Shows real milestone name, XP progress bar, and its missions with status indicators. Tabs for Missions / Resources. Close button + tap-outside-to-close. No mission action yet - click on mission row is a no-op in Phase 3 (wired in Phase 4).

**Exit condition:** Player cockpit shows real data from mock. `DailyPlanView` renders the correct subset of in-progress missions. Map nodes are positioned correctly. Clicking a milestone opens the sidebar with its missions. XP bar reflects mock progress state. All responsive at 390px. Testability check: a new user landing on `/session/:id` can immediately see what they should do today without any instruction.

---

## Phase 4 - Player Cockpit: Mission Interaction, Validation & AI Q&A

**One-line description:** Players can open mission details, complete the full validation flow for all three `validationMethod` types, and ask questions via a mocked AI chat interface.

**Entry condition:** Phase 3 map + sidebar working with real data.

**Deliverables:**

**4a. MissionDetailPopup - wired**  
Opens on MissionCard click for `type='text'` and `type='link'` missions. Uses Phase 1 shell.
- `text` - renders `mission.body` via `marked.parse()` as HTML. "Mark Complete" button at bottom.
- `link` - external URL display + "Open Link" (new tab) + "Mark as Visited" button.
- Dismiss: close button + swipe-down gesture (touch). Does not dismiss on tap-outside.

**4b. ValidationDisplay - all three paths**  
Mounts on "Mark Complete" / "Mark as Visited". Routes by `mission.validationMethod`:

**`selfApprove`:**  
Calls `upsertProgressEvent({ status: 'autoApproved' })` → ValidationDisplay does not mount → MissionCard status updates inline → XP recalculates → `DailyPlanView` re-derives and removes the completed mission.

**`gmApprove`:**  
Calls `upsertProgressEvent({ status: 'pendingApproval' })` → ValidationDisplay mounts showing PendingApprovalDisplay ("Waiting for approval" spinner) → calls `adapter.subscribeProgressEvent(playerId, missionId, cb)` → mock adapter fires the callback after 4s timeout → `status: 'completed'` received → ValidationDisplay dismisses → XP recalculates.

**`qr`:**  
`qrPayload.ts` encodes `{ playerId, missionId, sessionId, xpValue, issuedAt }` with HMAC-SHA256 using `crypto.subtle` (C-16) → No PB write (C-07) → ValidationDisplay mounts showing QRDisplay (QR code rendered via `qrcode` lib) → opens `subscribeProgressEvent` SSE subscription → dismisses when `status: 'completed'` received.

**4c. qrPayload.ts (`src/utils/qrPayload.ts`)**
Single encode/decode point. `encodeQRPayload(input: QRPayloadInput, secret: string): Promise<string>` and `decodeQRPayload(encoded: string, secret: string): Promise<QRPayload>`. Also exports `QRPayloadError` class. Both use `crypto.subtle` HMAC-SHA256. For the mock, session token is a constant string.

**4d. FormPage - wired**
Route `/form/:missionId`. Resolves identity → player PB record, fetches `FormSchema` via `adapter.getFormSchema(missionId)`, fetches `Mission` via `adapter.listMissions(sessionId)`. Renders fields via `FieldSchema[]` through `FormShell` + `FormField`:
- `text` → `<input type="text">`
- `textarea` → `<textarea>`
- `select` → `<select>` with options
- `multiSelect` → chip toggle buttons (comma-joined string value)

Full form state management with `useState<Record<string, string>>` for values, required-field validation. On submit: calls `adapter.upsertProgressEvent(playerRecordId, missionId, { status: 'autoApproved', formResponse })` directly. Navigate back to cockpit on success.

`FormShell` renders: back-to-dashboard button (← Dashboard), mission title, description paragraph, fields, Submit button, and Save for Later button (local-only draft).

**4e. ChatPanel - mock AI responses**  
Wire the `ChatPanel` stub from Phase 1 to deliver testable AI Q&A without a real backend. This is required for New Hire Task 3 (severity 2–3).

Implementation:
- Text input + Send button is functional
- On submit: append user message to local chat history → show typing indicator (0.8–1.2s) → append a mock response
- Mock response strategy: maintain a small dictionary of keyword-matched responses for policy topics likely to appear in testing (home office, vacation, expense policy, first day). For any query that matches no keyword, respond with: "I don't have a specific answer for that, but you can find it in the Resources section below." This teaches the participant that both the chat and the resource section are available paths.
- `useMockChat.ts` hook (in `src/hooks/`) - encapsulates state, keyword matching, and typing delay. Accept `ResourceCard[]` as an optional context list for future real-backend swap (Phase 8).
- The Chat input and response area must be visually present and functional without navigating away from `PlayerCockpitPage`. Discoverable on scroll within `ResourcesSection`.

**Exit condition:** All three validation paths are demonstrable with mock data. QR code renders and encodes correctly. gmApprove auto-resolves after 4s via mock timeout. Form submission writes progress event and navigates back. ChatPanel responds to any text input with either a keyword-matched answer or a graceful redirect. Testability check: New Hire Tasks 1–3 from the usability test plan are completable without facilitator intervention.

---

## Phase 5 - Tutorial Flow

**One-line description:** First-time players go through the non-skippable tutorial sequence before accessing the cockpit freely. The profile form is the first required interaction.

**Entry condition:** Phase 4 validation and FormPage working.

**Deliverables:**

**5a. TutorialOverlay - wired**  
Mounts on `PlayerCockpitPage` when `player.tutorialComplete === false`. Uses Phase 1 shell. Sequential, non-skippable flow:

1. **Welcome** - text intro ("Welcome to MesseBuddy. Here's what you'll do…"), brand message, "Let's start" CTA
2. **Step 1 - Profile** - highlights CurrentMissionsList (highlight ring via CSS outline/box-shadow on the target element) → opens Profile Setup Mission via FormPage route → on return with `profileComplete: true`, back to overlay
3. **Step 2 - Map** - shifts highlight to MilestoneMapViewer → explains milestones and XP progression
4. **Step 3 - Buddy** - shifts highlight to BuddyCard → explains the buddy relationship
5. **Step 4 - Resources** - shifts highlight to ResourcesSection → explains available materials and AI Q&A
6. On step 4 CTA → `adapter.updatePlayer({ tutorialComplete: true })` → overlay unmounts → player has free access

Overlay must allow emergency escape: small "Skip tutorial" text link → confirmation dialog → sets `tutorialComplete: true` and skips.

**5b. Tutorial state persistence**  
`player.tutorialComplete` and `player.profileComplete` are read from the Player record on cockpit mount. On page reload, if `tutorialComplete: false`, overlay re-mounts at the correct step.

**Exit condition:** New player experiences the full four-step tutorial. The profile form opens from step 1 and returns correctly. Skipping works. Reloading mid-tutorial resumes from the correct step. A returning player skips the overlay entirely.

---

## Phase 6 - Admin Cockpit

**One-line description:** The Game Maker can view players, approve pending missions (including via QR scan), configure sessions, manage the pre-boarding checklist, and - for HR - see all new hires across sessions with stalled indicators. Templates can be saved and re-applied.

**Entry condition:** Phases 2–5 complete. Admin route guard working.

**Deliverables:**

**6a. AdminCockpitPage - data wired (Active Session view)**  
Real data from mock adapter populates Phase 1's admin shell:
- `PlayerSelectorDropdown` - lists all players in session; selection updates all player-scoped views
- `PlayerProfileCard` - selected player's name, role, team, XP, milestone progress
- `PendingApprovalsPanel` - lists all `status: 'pendingApproval'` events; each `ApprovalRequestCard` shows player name, mission title, timestamp; **Approve** and **Scan QR** buttons

**6b. MilestoneMapEditor - drag wired**
Uses shared `MapViewport`. Drag `MilestoneNode` to reposition. On drag end: compute `xPercent`/`yPercent` → update local DraftMilestone state. GridOverlay toggle snaps to nearest 10% grid. Changes are batched - not written to adapter until Save.

**6c. MilestoneSidebarEditor - wired**  
Opens on MilestoneNode click. Edit milestone name. Add Mission button → creates `DraftMission`. Mission list → click opens MissionEditor.

**6d. MissionEditor - full form**  
All fields per SPECS.md Admin Cockpit component tree:
- Title, Body (textarea with `marked.parse()` preview toggle)
- Type selector (switching type adjusts visible fields)
- Difficulty (1–5 → `deriveXP` re-runs and previews XP)
- Tags (multi-select chips)
- Suggested due date
- ValidationMethod selector - disabled when `type='form'` (C-06)
- `isInCurrentMissions` toggle
- FormEditor for `type='form'`: add/remove/reorder FieldSchema entries

**6e. Pre-Boarding Checklist - wired**  
`PreBoardingChecklist` component (in `components/admin/`) - wired and reachable from the admin cockpit. This is a supervisor-facing, first-day preparation tool, entirely separate from the milestone/mission editor.

Structure:
- Displayed as a dedicated panel or tab in the admin cockpit, labelled "Pre-Boarding Checklist" or "Before Day 1". Must be reachable within 2 taps from the admin cockpit home screen. Do not bury it in a mission editor sub-panel.
- A list of `PreBoardingChecklistItem` rows: each has a checkbox, a task label, and an optional due-date field
- Default items loaded from mock data covering: workspace prepared, laptop ordered, system access requested, team intro email drafted, buddy assigned, first-week schedule shared. These are static default items, not missions.
- Checkbox state is persisted via `adapter.updateSession()` on a `preBoardingChecks` JSON field (or a standalone field - check SPECS.md and extend if needed)
- "Add item" button → inline text input → adds new `PreBoardingChecklistItem`
- "Mark all done" shortcut button

Data note: if `PreBoardingChecklist` state is not already in SPECS.md schema, extend `Session` with a `preBoardingChecks: PreBoardingCheckItem[]` JSON field. Define `PreBoardingCheckItem` in `src/types/ephemeral.ts`. Do not create a new PB collection for this - it is session-scoped data stored on the Session record.

Testability check: a supervisor testing the app must be able to find this checklist without being told it exists. It should not require scrolling past the entire mission editor to reach.

**6f. Admin QR Scanner - wired**  
Supervisors scanning a player's QR code as part of mission approval. This delivers the "QR scanning step" in the approval flow that the usability test explicitly observes (Supervisor Task 3).

Flow:
1. In `PendingApprovalsPanel`, each `ApprovalRequestCard` has a **Scan QR** button
2. Clicking opens `AdminQRScannerModal` (in `components/admin/`) - modal overlay with camera feed via `CameraFeed` component
3. `CameraFeed` uses `getUserMedia({ video: { facingMode: 'environment' } })` → canvas frame loop → `jsqr` decode → `qrPayload.ts` `decodeQRPayload()`
4. On successful decode: validate `{ playerId, missionId }` match the `ApprovalRequestCard` context → call `upsertProgressEvent({ status: 'completed', validatedBy, validatedAt })` → close modal → card removes from panel → mock subscription fires on player side
5. On decode failure or payload mismatch: show inline error "QR code doesn't match this request" - do not close the modal
6. Cancel button closes the modal without writing anything
7. In mock/development: add a "Simulate Scan" button below the camera feed that fires a correctly-formed mock QR payload for the selected mission. This allows testing the flow without a physical QR code.

Note: `CameraFeed` and `jsqr` decode are first used here in Phase 6. `QRScannerView` (the player-side route) will reuse the same `CameraFeed` component in Phase 8.

**6g. HR Cross-New-Hire Dashboard - wired**  
`CrossHireDashboard` component (in `components/admin/`) - HR's multi-session overview. Reachable from admin cockpit (tab or navigation link labelled "All New Hires").

Structure:
- Header row: total active hires, average progress %, stalled count
- Filterable list of `HireProgressRow` components, one per player across all sessions:
  - New hire name
  - Session name (their onboarding cohort or manager name)
  - Milestone progress bar (% missions completed out of total, derived from `PlayerProgress`)
  - Days since last activity (computed from most recent `ProgressEvent.updatedAt` timestamp)
  - `StalledHireAlert` badge - shown when days since last activity > stale threshold (default 3 days for mock). Badge text: "Stalled · Xd"
- Simple text filter input (client-side, filters by name or session name)
- Sort: default by last activity ascending (most stalled at top)

Data: requires `adapter.listPlayers()` called for multiple sessions and `adapter.listProgressEvents()` per player. For the mock: include at least 3 players from 2 different mock sessions, with varying progress states (one stalled, one on track, one just started). Extend `mockData.ts` accordingly.

**6h. Supporting admin sections - wired**  
- `BuddyAssignmentForm` - select player, fill buddy fields, upsert BuddyProfile
- `ResourcesEditor` - CRUD for Resource records; `isVisibleToPlayer` toggle
- `CurrentMissionsList` (admin) - drag-to-reorder updates `mission.order` in local state

**6i. SaveActions + Template Library - full**  
Save: batches all dirty DraftMission + DraftMilestone state → calls adapter in sequence → clears dirty state → shows success toast.

Save as Template → opens `SaveTemplateModal` → name input + optional description → `exportTemplate` use case → stores result in mock adapter's template store (in-memory `Map<string, TemplateExport>`).

Template Library - wired for browsing and applying:
- `TemplateLibrary` (from Phase 1 shell) - calls `adapter.listTemplates()` (add this method to `AppAdapter` interface and mock implementation)
- Each `TemplateCard` shows: name, description, milestone count, mission count, "Use Template" button
- "Use Template" → `importTemplate` use case → creates all records → routes to `/admin/:newSessionId`
- Landing Page "Create Session → Load Template" link opens `TemplateLibrary` (or navigate to a `/templates` route)

Testability check: HR Task 2 requires a participant to save a template and discover that other managers could use it. The template save flow must produce a visible, browsable result - not just a JSON file download.

**Exit condition:** GM can create a session, add milestones and missions, set validation methods, save, and see the result in a Player cockpit. Pre-boarding checklist is reachable and checkable without facilitator guidance. Admin QR scanner opens from an approval card and successfully validates a mock QR payload via "Simulate Scan". HR dashboard shows multiple new hires with stalled indicators. Templates can be saved and re-applied. Testability check: all nine test scenarios from the Testability Contract are completable against the mock adapter.

---

## Phase 7 - PocketBase Integration (Delivery)

**One-line description:** Replace the mock adapter with the real PocketBase adapter. All data persists across page reloads. Two real devices can complete a session together.

**Entry condition:** Phases 0–6 fully complete and all nine test scenarios confirmed working against mock. Zero TypeScript errors.

**Deliverables:**

**7a. PocketBase collections**  
Provision all collections matching SPECS.md §PocketBase Schema. Document exact field configs in `docs/pb-schema.md`. Collections:
`sessions`, `players`, `milestones`, `missions`, `form_schemas`, `progress_events`, `buddy_profiles`, `resources`

Key field notes:
- `tags`, `skillsConfident`, etc. → PB JSON field
- `form_schemas.fields` → PB JSON field
- `progress_events.formResponse` → PB JSON field
- `sessions.preBoardingChecks` → PB JSON field (added in Phase 6)
- `players.avatarUrl`, `sessions.bgImageUrl` → PB file type
- Composite uniqueness for `(playerId, missionId)` enforced at `upsertProgressEvent` use case level (C-05)

**7b. PocketBase adapter (`src/adapters/pocketbase/`)**  
Implements `AppAdapter`. All raw PB responses parsed into typed app-layer interfaces inside this module only (C-13).

`upsertProgressEvent`: query `progress_events WHERE playerId=? AND missionId=?` → PATCH if found, POST if not.  
`subscribeProgressEvent`: `pb.collection('progress_events').subscribe(recordId, cb)` → returns unsubscribe function.  
`listTemplates`: query a `templates` PB collection (or store exports as Resource records with a special `resourceType`). Decide and document in `docs/pb-schema.md`.

**7c. Provider swap**  
In `AdapterContext` provider: change one line from `mockAdapter` to `pbAdapter(pb)`. Zero component changes.

**7d. Background image upload**  
`BackgroundImageUploader`: file input → `pb.collection('sessions').update(id, formData)` → both cockpit BackgroundCanvas instances re-render.

**7e. SSE for gmApprove**  
`subscribeProgressEvent` now uses real PB SSE. `ValidationDisplay` (Phase 4) already holds no assumption about implementation - no component changes required.

**7f. Session join via URL**  
Game Maker shares a session URL (e.g., `?session=<id>`). Landing Page reads URL param and pre-fills the Join Session flow.

**Exit condition:** Two real devices (phone + laptop) can complete a demonstrable session. Player joins, completes tutorial, completes missions, all three validation types work. Game Maker approves missions - including via physical QR scan - sees XP update on player device in real time. Data persists across page reloads. All mock adapter references are removed or unreachable.

---

## Phase 8 - PWA & Polish (deferred; must be trivial)

If Phases 0–7 were done correctly, Phase 8 is mechanical:
- **PWA:** Add `vite-plugin-pwa` to `vite.config.ts` + manifest JSON. Workbox CacheFirst for static assets, NetworkFirst for API reads.
- **QRScannerView camera (player-side):** The `CameraFeed` component already exists from Phase 6. Wire it into `QRScannerView` - the page shell and `ValidationResult` component already exist from Phase 1. No new camera code; this is a component assembly step.
- **Real AI chatbot:** Replace `useMockChat.ts` with `useChatStream` → SSE fetch to `VITE_LITELLM_URL/chat/completions`, model `policy-assistant`. `ChatPanel` receives no structural change - only the hook it consumes changes. Remove the keyword dictionary; the LLM handles all queries.
- **Accessibility audit:** Run Lighthouse. The component shells built in Phase 1 should already have semantic HTML; fix any contrast, ARIA, or focus-trap issues found.

If any of these feel non-trivial, a prior phase was incomplete.

---

## Agent Briefing Template

Use this exact format when handing a phase to a coding agent:

```
You are implementing Phase N of the MesseBuddy PWA prototype.

SPEC AUTHORITY: ~/Projects/messe-buddy-app/SPECS.md
WIREFRAME AUTHORITY: ~/Projects/MesseBuddy/docs/MesseBuddy_Wireframe.html
IMPLEMENTATION STRATEGY: ~/Projects/messe-buddy-app/plans/prototype-impl-strategy.md
TARGET REPO: ~/Projects/messe-buddy-app/

PHASE N ENTRY CONDITION: [confirm what prior phase delivered]
PHASE N DELIVERABLES: [paste the relevant Phase N section from this document]
DO NOT: [list any tempting anti-patterns for this specific phase]
EXIT CONDITION: [exact verifiable outcome from this document]

Before writing any code: read the relevant sections of SPECS.md. Do not infer data shapes - use the spec's exact interface definitions.
Visual guidance: open and inspect the wireframe HTML file to match layout, colors, and component appearance.

Key invariants from current implementation:
- Maps: both MilestoneMapViewer and MilestoneMapEditor use shared MapViewport (src/components/shared/MapViewport.tsx) for identical pan/zoom behaviour.
- FormPage: wired with identity + adapter; uses FormShell (with description, Save for Later, back nav). No 'completeForm' use case - form submissions go through upsertProgressEvent directly.
- QR payload utilities are at src/utils/qrPayload.ts, not src/lib/.
- ChatPanel is a standalone component in src/components/player/, not part of TopBar.
- CameraFeed is in src/components/qr/ and is shared between AdminQRScannerModal (Phase 6) and QRScannerView (Phase 8).
- PreBoardingChecklist and CrossHireDashboard are in src/components/admin/ and must be reachable within 2 taps of the admin cockpit home screen.
```

---

## Per-Phase Completion Checklist

Before marking any phase done:
- [ ] `deno task build` → zero TypeScript errors
- [ ] Any viewport width → no horizontal scroll, all content accessible, no layout breaks
- [ ] Zero concrete `px` for sizing or positioning in component CSS (exception: `1px` borders only)
- [ ] No `JSON.parse` in any file outside `src/adapters/pocketbase/`
- [ ] No direct `progress_events` writes outside `upsertProgressEvent`
- [ ] No component imports adapter directly (only via `AdapterContext`)
- [ ] All new data shapes come from `src/types/` - no inline object types in components
- [ ] Use case functions have no side effects and no adapter imports
- [ ] Testability: run through the relevant rows of the Testability Contract and confirm each is completable
