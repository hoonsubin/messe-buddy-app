# MesseBuddy — Implementation Strategy
> **Scope:** First iteration interactable prototype for user testing, delivered at Phase 7  
> **Target repo:** `~/Projects/messe-buddy-app/`  
> **Spec authority:** `~/Projects/messe-buddy-app/SPECS.md`  
> **Wireframe authority:** `~/Projects/MesseBuddy/docs/MesseBuddy_Wireframe.html`  
> **Last updated:** 2026-06-13

---

## How to Use This Document

This is a **prompt scaffold for a coding agent**. Each phase is one agent session. An agent receiving Phase N can work from it alone — entry conditions carry forward what matters; the agent reads SPECS.md and the wireframe directly for authority on specifics.

Two authorities, two domains:
- **Wireframe** → visual design: fonts, colors, spacing, layout, component appearance, copy text
- **Spec (SPECS.md)** → behavior: data types, use case logic, validation flows, constraints

When they conflict, the spec wins on behavior, the wireframe wins on appearance. The known divergence: the wireframe shows an immediate form on first load; the spec defines a tutorial sequence that *opens* the profile form as Mission 1. The implementation follows the spec.

---

## Principles (apply to every phase, every file)

**Types first.** Never write a component that uses a shape not defined in `src/types/`. If you need `{ id: string; name: string }`, stop — find or define the correct interface from SPECS.md.

**Adapter boundary.** Components never import an adapter directly. They consume `AdapterContext`. The mock and PB adapters implement the same `AppAdapter` interface. Swapping is a one-line change in the context provider.

**No `JSON.parse` in components.** All PocketBase JSON field parsing happens inside `src/adapters/pocketbase/` only. (Constraint C-13.)

**No direct `progress_events` writes from components.** All ProgressEvent mutations go through the `upsertProgressEvent` use case. (Constraint C-14.)

**Mobile-first layout.** The wireframe establishes the design intent; the concrete pixel dimensions of the wireframe are not the target — they are a reference. Every layout and sizing decision uses `rem`, `%`, `clamp()`, `dvh`/`svh`. No concrete `px` for positioning or sizing anywhere in the codebase. The result scales correctly at any viewport width without any viewport-size conditionals. Touch targets ≥ `var(--min-touch)` (44px in rem). Desktop layout is additive — wider viewports simply get more breathing room, not a different layout system.

**One write path.** `upsertProgressEvent` is the single mutation point for all progress state. See C-05.

**Use cases are pure functions.** `deriveXP`, `computeProgress`, `exportTemplate` have no side effects and no adapter calls. They take typed inputs, return typed outputs, and can be tested without a DOM.

---

## Project Structure (established in Phase 0, never restructured)

```
src/
  types/            # All TS interfaces and union types — verbatim from SPECS.md
  use-cases/        # Pure business logic: deriveXP, computeProgress, joinSession, etc.
  adapters/
    interface.ts    # AppAdapter interface — the single contract
    mock/           # Mock implementation: mockData.ts + mockAdapter.ts
    pocketbase/     # Real PB adapter (Phase 7 only)
  hooks/            # React hooks: useIdentity, useSession, usePlayerProgress, useChatStream
  components/
    ui/             # Primitives: Button, Badge, Card, TextInput, Modal, Sheet
    layout/         # TopBar, PageShell, BackgroundCanvas
    milestone/      # MilestoneNode, MilestoneMapViewer, MilestoneMapEditor, GridOverlay
    mission/        # MissionCard, MissionDetailPopup, ValidationDisplay, QRDisplay
    tutorial/       # TutorialOverlay, TutorialStep
    admin/          # PlayerSelectorDropdown, PlayerProfileCard, PendingApprovalsPanel, MissionEditor
    form/           # FormPage fields: FormField, DynamicForm
  pages/
    LandingPage/
    PlayerCockpitPage/
    AdminCockpitPage/
    FormPage/
    QRScannerView/
  styles/
    tokens.css      # All CSS custom properties — derived from wireframe
    reset.css       # Box model reset, base typography
    global.css      # Body, root, scrollbar, selection styles
  lib/
    qrPayload.ts    # Single encode/decode point for QR — see C-16
```

---

## Phase 0 — Invisible Foundation

**One-line description:** Everything the app needs to exist logically, with nothing visible yet.

**Deliverables:**

**0a. TypeScript types (`src/types/`)**  
Transcribe verbatim from SPECS.md — every interface, every union type, every `const` + `keyof` pattern. No shortcuts, no inference. Files:
- `domain.ts` — all `PBRecord`-extending interfaces: Session, Player, Milestone, Mission, FormSchema, ProgressEvent, BuddyProfile, Resource
- `unions.ts` — MissionType, MissionTag, ValidationMethod, ProgressStatus, MilestoneStatus, ResourceType, FieldType, UserRole; all as `const` + `keyof` pattern (C-12: no TypeScript enums)
- `value-objects.ts` — FieldSchema, QRPayload, ScanData, SessionRole, LocalIdentity
- `ephemeral.ts` — MilestoneProgress, PlayerProgress, DraftMission, TemplateRecord
- `exports.ts` — TemplateExport, FullSessionExport
- `index.ts` — re-exports all of the above

**0b. AppAdapter interface (`src/adapters/interface.ts`)**  
The contract both mock and PB adapters must satisfy. Methods:
```
Sessions: getSession, createSession
Players: getPlayer, createPlayer, updatePlayer, getPlayerByRecoveryKey, listPlayers
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
- `deriveXP.ts` — full XP algorithm from SPECS.md §XP Derivation
- `computeProgress.ts` — derives `PlayerProgress` from `ProgressEvent[]` + `Mission[]`
- `joinSession.ts` — generates UID + 8-char recoveryKey, writes `LocalIdentity` to localStorage
- `recoverIdentity.ts` — looks up player by recoveryKey via adapter, restores localStorage
- `exportTemplate.ts` — pure transform: Session + arrays → TemplateExport (strips PB IDs)
- `importTemplate.ts` — takes TemplateExport + adapter, creates all records, returns new sessionId

**0d. Mock data + adapter (`src/adapters/mock/`)**  
`mockData.ts`: one Session, 3 Milestones, 10 Missions (mix of text/link/form; all three `validationMethod` types represented), 2 Players, buddy profiles, form schemas, resources, progress events.  
`mockAdapter.ts`: implements `AppAdapter`; stores state in module-level Maps. `subscribeProgressEvent` uses `setTimeout` to simulate async approval after 4 seconds (for testing gmApprove flow without a real GM).

**0e. Router + context (`src/App.tsx`, `src/main.tsx`)**  
Wire `react-router-dom` v7. Routes:
```
/                   → LandingPage (stub div)
/session/:id        → PlayerCockpitPage (stub div)
/admin/:id          → AdminCockpitPage (stub div)
/form/:missionId    → FormPage (stub div)
/scan               → QRScannerView (stub div)
```
`AdapterContext`: `React.createContext<AppAdapter>` — provided at root with `mockAdapter`. Components consume this; never import adapters directly.

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

## Phase 1 — Visual Shell

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

**1b. Reset + global styles (`src/styles/`)**  
Box model reset. Base font set to `--font-body`. `html { font-size: 16px }`. Body `margin: 0`, `background: var(--color-bg-primary)`. Import Google Fonts matching wireframe.

**1c. LandingPage shell**  
Full-bleed layout. Displays: brand logo/name, tagline copy from wireframe, four action areas (Join Session / Create Session / Recover Progress / Returning User redirect notice). No inputs wired. No onClick handlers. Visual matches wireframe landing screen.

**1d. PlayerCockpitPage shell**  
Scrollable single-column layout. Contains in order, all unstyled with placeholder text:
- `TopBar` — fixed, shows logo, XP bar placeholder, avatar placeholder
- `MilestoneMapViewer` container — correct aspect ratio, dark background (no image yet), shows three placeholder `MilestoneNode` circles at fixed positions
- `CurrentMissionsList` container — horizontal scroll area with two placeholder `MissionCard` elements
- `BuddyCard` container — avatar placeholder, name placeholder, contact placeholder
- `ResourcesSection` container — search bar shell, two placeholder `ResourceCard` elements

**1e. AdminCockpitPage shell**  
Denser layout than player cockpit. Contains in order:
- `TopBar` (same component, different right-side content placeholder)
- `PlayerSelectorDropdown` shell — static dropdown trigger
- `PlayerProfileCard` shell — avatar, name, stats placeholders
- `PendingApprovalsPanel` shell — section header, one placeholder `ApprovalRequestCard`
- `MilestoneMapEditor` shell — same aspect ratio container as viewer, `GridOverlay` visible (static lines)
- `MilestoneSidebarEditor` shell — collapsed/hidden placeholder
- `CurrentMissionsList` shell (admin view)
- `BuddyAssignmentForm` shell — form fields, no wiring
- `ResourcesEditor` shell — table with placeholder rows
- `SaveActions` shell — Save button, Save as Template button

**1f. FormPage shell**  
Full-page layout. Title placeholder. Two example field shells (text input, select). Submit button.

**1g. QRScannerView shell**  
Full-screen dark background. Camera feed placeholder (a `<div>` with correct dimensions). `ValidationResult` panel placeholder below.

**1h. All shared components — visual shells only**  
Every component that will be used across multiple pages must have its full visual structure defined here, even if content is static. Key components:
- `MilestoneNode` — circular node with status color variants (show one of each status in the map shell)
- `MissionCard` — full card with title, type icon placeholder, XP badge placeholder, tag chips placeholder, status indicator
- `TopBar` — fixed, blur background, responsive
- `BackgroundCanvas` — `position: fixed; inset: 0; z-index: 0; object-fit: cover`
- `ValidationDisplay` — full-screen overlay shell with QRDisplay placeholder and PendingApprovalDisplay placeholder
- `TutorialOverlay` — full-screen overlay shell with step indicator, highlight ring placeholder, CTA button
- `TagBadge` — colored chip, one of each variant visible in storybook-style shell
- `XPBadge` — number + "XP" label, styled

**Exit condition:** `deno task dev` running. Every route renders its full shell. All components are visually consistent with the wireframe. The layout must work correctly at any viewport width — no `px`-based widths, positions, or breakpoint assumptions anywhere in the component shells. Zero TypeScript errors. Zero logic — no `useState`, no adapter calls, no `useEffect`.

---

## Phase 2 — Identity & Navigation

**One-line description:** A user can join a session as a Player, create a session as a Game Maker, recover their identity, and be silently routed if returning. Route guards enforce role.

**Entry condition:** Phase 0 types + Phase 1 shells in place.

**Deliverables:**

**2a. LandingPage — wired**  
Four flows, each using Phase 1's existing shell elements:
1. **Returning user** — on mount, `useIdentity` check; if valid `mb_identity` with resolvable session, silent redirect to `/session/:id` or `/admin/:id` by role
2. **Join Session** — session code input → `joinSession` use case → stores `LocalIdentity { role: 'player' }` → redirect to `/session/:id`
3. **Create Session** — session name input → adapter `createSession` → stores `LocalIdentity { role: 'gamemaker' }` → redirect to `/admin/:id`
4. **Recover Progress** — recoveryKey + sessionId inputs → `recoverIdentity` use case → redirect to cockpit

**2b. RecoveryKey display**  
Modal overlay shown immediately after `joinSession` or `createSession`. Monospace 8-char token. Copy-to-clipboard button. Explicit dismiss confirmation ("I've saved my recovery key"). Renders over the Phase 1 LandingPage shell — no new visual components needed.

**2c. Route guards**  
`<RequireRole role="player">` and `<RequireRole role="gamemaker">` wrapper components. Read `useIdentity`. If missing or wrong role, redirect to `/`. Wrap the `/session/:id` and `/admin/:id` routes.

**Exit condition:** The full join → recovery-key → cockpit placeholder flow works end-to-end. A returning user (valid localStorage) is silently routed on page load. Wrong-role access redirects to landing. All using Phase 1's visual shells.

---

## Phase 3 — Player Cockpit: Map & Mission Display

**One-line description:** The Player cockpit is fully populated with real data from the mock adapter. The map shows milestones at their correct positions. Missions are displayed with correct status. No interaction yet.

**Entry condition:** Phase 2 identity working. Mock adapter providing real data.

**Deliverables:**

**3a. Data hooks**  
- `useSession(sessionId)` — fetches Session, Milestones, Missions via adapter
- `usePlayerProgress(playerId)` — fetches ProgressEvents → derives `PlayerProgress` via `computeProgress`
- `useBuddy(playerId)` — fetches BuddyProfile
- `useResources(sessionId)` — fetches Resources filtered by `isVisibleToPlayer: true`

**3b. PlayerCockpitPage — data wired**  
Replaces placeholder content with real data. No new component structure — the Phase 1 shells receive real props.
- `TopBar` — real XP bar from `PlayerProgress.totalXP / (milestones.length * 100)`, player name, avatar
- `BackgroundCanvas` — `session.bgImageUrl` (empty string for now → falls back to gradient)
- `MilestoneMapViewer` — MilestoneNodes positioned at `{ left: m.xPercent%, top: m.yPercent% }`, status derived from `PlayerProgress.milestoneProgress`
- `YouAreHereMarker` — positioned at the first `inProgress` milestone
- `CurrentMissionsList` — missions where `isInCurrentMissions: true`, status from progress events
- `MissionCard` — real mission data: title, type icon, XP, tags, status
- `BuddyCard` — real buddy data or empty state
- `ResourcesSection` — real resources, search filters by title and tags client-side

**3c. MilestoneSidebarViewer — wired**  
Slide-in from right on MilestoneNode click. Shows real milestone name, XP, and its missions as MissionCards. Close button + tap-outside-to-close. No mission action yet — click on MissionCard is a no-op.

**Exit condition:** Player cockpit shows real data from mock. Map nodes are positioned correctly. Clicking a milestone opens the sidebar with its missions. XP bar reflects mock progress state. All responsive at 390px.

---

## Phase 4 — Player Cockpit: Mission Interaction & Validation

**One-line description:** Players can open mission details and complete the full validation flow for all three `validationMethod` types.

**Entry condition:** Phase 3 map + sidebar working with real data.

**Deliverables:**

**4a. MissionDetailPopup — wired**  
Opens on MissionCard click for `type='text'` and `type='link'` missions. Uses Phase 1 shell.
- `text` — renders `mission.body` via `marked.parse()` as HTML. "Mark Complete" button at bottom.
- `link` — external URL display + "Open Link" (new tab) + "Mark as Visited" button.
- Dismiss: close button + swipe-down gesture (touch). Does not dismiss on tap-outside.

**4b. ValidationDisplay — all three paths**  
Mounts on "Mark Complete" / "Mark as Visited". Routes by `mission.validationMethod`:

**`selfApprove`:**  
Calls `upsertProgressEvent({ status: 'autoApproved' })` → ValidationDisplay does not mount → MissionCard status updates inline → XP recalculates.

**`gmApprove`:**  
Calls `upsertProgressEvent({ status: 'pendingApproval' })` → ValidationDisplay mounts showing PendingApprovalDisplay ("Waiting for approval" spinner) → calls `adapter.subscribeProgressEvent(playerId, missionId, cb)` → mock adapter fires the callback after 4s timeout → `status: 'completed'` received → ValidationDisplay dismisses → XP recalculates.

**`qr`:**  
`qrPayload.ts` encodes `{ playerId, missionId, sessionId, xpValue, issuedAt }` with HMAC-SHA256 using `crypto.subtle` (C-16) → No PB write (C-07) → ValidationDisplay mounts showing QRDisplay (QR code rendered via `qrcode` lib) → opens `subscribeProgressEvent` SSE subscription → dismisses when `status: 'completed'` received.

**4c. qrPayload.ts (`src/lib/qrPayload.ts`)**  
Single encode/decode point. `encode(payload: QRPayload, sessionToken: string): Promise<string>` and `decode(raw: string, sessionToken: string): Promise<QRPayload>`. Both use `crypto.subtle` HMAC-SHA256. For the mock, session token is a constant string.

**4d. FormPage — wired**  
Route `/form/:missionId`. Loads FormSchema from adapter. Renders fields via `FieldSchema[]`:
- `text` → `<input type="text">`
- `textarea` → `<textarea>`
- `select` → `<select>` with options
- `multiSelect` → checkbox group

`required` validation before submit. On submit: `completeForm` use case → `upsertProgressEvent({ status: 'autoApproved', formResponse })`. For the Profile Setup Mission: also calls `adapter.updatePlayer` with fields extracted from `formResponse`. Navigate back to cockpit on success.

**Exit condition:** All three validation paths are demonstrable with mock data. QR code renders and encodes correctly. gmApprove auto-resolves after 4s via mock timeout. Form submission updates player profile.

---

## Phase 5 — Tutorial Flow

**One-line description:** First-time players go through the non-skippable tutorial sequence before accessing the cockpit freely. The profile form is the first required interaction.

**Entry condition:** Phase 4 validation and FormPage working.

**Deliverables:**

**5a. TutorialOverlay — wired**  
Mounts on `PlayerCockpitPage` when `player.tutorialComplete === false`. Uses Phase 1 shell. Sequential, non-skippable flow:

1. **Welcome** — text intro ("Welcome to MesseBuddy. Here's what you'll do…"), brand message, "Let's start" CTA
2. **Step 1 — Profile** — highlights CurrentMissionsList (highlight ring via CSS outline/box-shadow on the target element) → opens Profile Setup Mission via FormPage route → on return with `profileComplete: true`, back to overlay
3. **Step 2 — Map** — shifts highlight to MilestoneMapViewer → explains milestones and XP progression
4. **Step 3 — Buddy** — shifts highlight to BuddyCard → explains the buddy relationship
5. **Step 4 — Resources** — shifts highlight to ResourcesSection → explains available materials
6. On step 4 CTA → `adapter.updatePlayer({ tutorialComplete: true })` → overlay unmounts → player has free access

Overlay must allow emergency escape: small "Skip tutorial" text link → confirmation dialog ("You'll miss the intro — are you sure?") → sets `tutorialComplete: true` and skips.

**5b. Tutorial state persistence**  
`player.tutorialComplete` and `player.profileComplete` are read from the Player record on cockpit mount. These are written via `adapter.updatePlayer` at the correct steps. On page reload, if `tutorialComplete: false`, overlay re-mounts at the correct step (track current step in `player` record or in localStorage as ephemeral state).

**Exit condition:** New player (mock data: `tutorialComplete: false`) experiences the full four-step tutorial. The profile form opens from step 1 and returns correctly. Skipping works. Reloading mid-tutorial resumes from the correct step. A returning player (`tutorialComplete: true`) skips the overlay entirely.

---

## Phase 6 — Admin Cockpit

**One-line description:** The Game Maker can view players, approve pending missions, and fully configure the session — milestones, missions, buddy profiles, resources. Templates can be exported and imported.

**Entry condition:** Phases 2–5 complete. Admin route guard working.

**Deliverables:**

**6a. AdminCockpitPage — data wired**  
Real data from mock adapter populates Phase 1's admin shell:
- `PlayerSelectorDropdown` — lists all players in session; selection updates all player-scoped views
- `PlayerProfileCard` — selected player's name, role, team, XP, milestone progress
- `PendingApprovalsPanel` — lists all `status: 'pendingApproval'` events; each ApprovalRequestCard shows player name, mission title, timestamp; **Approve** button → `upsertProgressEvent({ status: 'completed', validatedBy, validatedAt })` → card removes → mock subscription fires on player side

**6b. MilestoneMapEditor — drag wired**  
Drag MilestoneNodes to reposition. On drag end: compute `xPercent = pixelX / containerWidth * 100`, `yPercent = pixelY / containerHeight * 100` → update local DraftMilestone state. GridOverlay toggle snaps to nearest 10% grid point. Changes are batched — not written to adapter until Save.

**6c. MilestoneSidebarEditor — wired**  
Opens on MilestoneNode click. Edit milestone name. Add Mission button → creates `DraftMission` in local state. Mission list shows MissionCards in `editable=true` mode → click opens MissionEditor.

**6d. MissionEditor — full form**  
All fields per SPECS.md Admin Cockpit component tree:
- Title, Body (textarea with `marked.parse()` preview toggle)
- Type selector — switching type adjusts visible fields (`externalUrl` field appears for `link`; FormEditor appears for `form`)
- Difficulty (1–5 selector → `deriveXP` re-runs and previews new XP values for all missions in milestone)
- Tags (multi-select chips)
- Suggested due date
- ValidationMethod selector — disabled when `type='form'` (C-06)
- `isInCurrentMissions` toggle
- FormEditor for `type='form'`: add / remove / reorder FieldSchema entries with label, type, required, placeholder, options

**6e. Supporting admin sections — wired**  
- `BuddyAssignmentForm` — select player, fill buddy fields, upsert BuddyProfile
- `ResourcesEditor` — CRUD for Resource records; `isVisibleToPlayer` toggle
- `CurrentMissionsList` (admin) — drag-to-reorder updates `mission.order` in local state

**6f. SaveActions — full**  
Save: batches all dirty DraftMission + DraftMilestone state → calls adapter in sequence (updateMilestone positions, createMission/updateMission, upsertFormSchema) → clears dirty state → shows success toast.

Save as Template → opens `SaveTemplateModal` → name input → `exportTemplate` use case → downloads JSON.

Landing Page "Create Session → Load Template" flow: file input → JSON parse → `importTemplate` use case → creates all records → stores Game Maker identity → routes to `/admin/:newSessionId`.

**Exit condition:** GM can create a session, add milestones and missions (including form-type), set validation methods, save, and see the result reflected immediately in a Player cockpit opened in another tab (both reading from the same mock adapter instance). Templates can be exported and re-imported to create a new session.

---

## Phase 7 — PocketBase Integration (Delivery)

**One-line description:** Replace the mock adapter with the real PocketBase adapter. All data persists across page reloads. Two real devices can complete a session together.

**Entry condition:** Phases 0–6 fully complete and tested against mock. Zero TypeScript errors.

**Deliverables:**

**7a. PocketBase collections**  
Provision all collections matching SPECS.md §PocketBase Schema. Document exact field configs (field name, type, indexes) in `docs/pb-schema.md`. Collections:
`sessions`, `players`, `milestones`, `missions`, `form_schemas`, `progress_events`, `buddy_profiles`, `resources`

Key field notes:
- `tags`, `skillsConfident`, etc. → PB JSON field
- `form_schemas.fields` → PB JSON field
- `progress_events.formResponse` → PB JSON field
- `players.avatarUrl`, `sessions.bgImageUrl` → PB file type
- Composite uniqueness for `(playerId, missionId)` enforced at `upsertProgressEvent` use case level (C-05)

**7b. PocketBase adapter (`src/adapters/pocketbase/`)**  
Implements `AppAdapter`. All raw PB responses parsed into typed app-layer interfaces inside this module only (C-13). JSON string fields parsed once here; never in components.

`upsertProgressEvent`: query `progress_events WHERE playerId=? AND missionId=?` → PATCH if found, POST if not.  
`subscribeProgressEvent`: `pb.collection('progress_events').subscribe(recordId, cb)` → returns unsubscribe function.  
File URL: `pb.files.getURL(record, filename)` for avatars and background images.

**7c. Provider swap**  
In `AdapterContext` provider (root level): change one line from `mockAdapter` to `pbAdapter(pb)`. Every component, hook, and use case already consumes context — zero component changes.

**7d. Background image upload**  
`BackgroundImageUploader` (already in Phase 6 admin shell): file input → `pb.collection('sessions').update(id, formData)` → `session.bgImageUrl` updates → both cockpit BackgroundCanvas instances re-render.

**7e. SSE for gmApprove**  
`subscribeProgressEvent` now uses real PB SSE. `ValidationDisplay` (Phase 4) already calls the adapter subscription and holds no assumption about implementation — it unsubscribes on unmount. No component changes required.

**7f. Session join via URL**  
Game Maker shares a session URL (e.g., `?session=<id>`). Landing Page reads the URL param and pre-fills the Join Session flow. Alternatively: Game Maker copies session ID from the admin TopBar.

**Exit condition:** Two real devices (phone + laptop) can complete a demonstrable session. Player joins via session code, completes tutorial, completes missions, all three validation types work. Game Maker approves missions, sees XP update on player device in real time. Data persists across page reloads. All mock adapter references are removed or unreachable.

---

## Phase 8 — PWA & Polish (deferred; must be trivial)

If Phases 0–7 were done correctly, Phase 8 is mechanical:
- **PWA:** Add `vite-plugin-pwa` to `vite.config.ts` + manifest JSON. Workbox CacheFirst for static assets, NetworkFirst for API reads.
- **QRScannerView camera:** `getUserMedia({ video: { facingMode: 'environment' } })` → canvas frame → `jsqr` decode → `qrPayload.ts` decode. The page shell and `ValidationResult` component already exist from Phase 1.
- **AI chatbot:** Implement `useChatStream` → SSE fetch to `VITE_LITELLM_URL/chat/completions`, model `policy-assistant`. Chat sheet shell already exists from Phase 1 TopBar.
- **Accessibility audit:** Run Lighthouse. The component shells built in Phase 1 should already have semantic HTML; fix any contrast, ARIA, or focus-trap issues found.

If any of these feel non-trivial, a prior phase was incomplete.

---

## Agent Briefing Template

Use this exact format when handing a phase to a coding agent:

```
You are implementing Phase N of the MesseBuddy PWA prototype.

SPEC AUTHORITY: ~/Projects/MesseBuddy/SPECS.md (copy: ~/Projects/MesseBuddy/SPECS.md)
WIREFRAME AUTHORITY: ~/Projects/MesseBuddy/docs/MesseBuddy_Wireframe.html
IMPLEMENTATION STRATEGY: ~/Projects/messe-buddy-app/plans/prototype-impl-strategy.md
TARGET REPO: ~/Projects/messe-buddy-app/

PHASE N ENTRY CONDITION: [confirm what prior phase delivered]
PHASE N DELIVERABLES: [paste the relevant Phase N section from this document]
DO NOT: [list any tempting anti-patterns for this specific phase]
EXIT CONDITION: [exact verifiable outcome from this document]

Before writing any code: read the relevant sections of SPECS.md. Do not infer data shapes — use the spec's exact interface definitions.
Visual guidance: open and inspect the wireframe HTML file to match layout, colors, and component appearance.
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
- [ ] All new data shapes come from `src/types/` — no inline object types in components
- [ ] Use case functions have no side effects and no adapter imports
