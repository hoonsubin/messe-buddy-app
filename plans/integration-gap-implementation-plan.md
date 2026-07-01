---
goal: Implement critical integration gaps from gap analysis while preserving architecture
version: 1.0
date_created: 2026-07-01
owner: architect
status: 'Planned'
tags: [feature, bug, architecture]
---

# Integration Gap Implementation Plan — MesseBuddy

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan addresses the critical and moderate gaps identified in [`plans/integration-gap-analysis.md`](integration-gap-analysis.md), focusing on functional completeness without introducing architectural drift. All changes respect existing constraints from [`SPECS.md`](../SPECS.md#design-constraints--invariants).

## 1. Requirements & Constraints

### Functional Requirements
- **REQ-001**: Exercise `getPlayerByInviteToken` in mock adapter via a UI code path (G-01)
- **REQ-002**: Admin can view form submission responses from completed form missions (G-03)
- **REQ-003**: Player profile fields are visible in cockpit (G-05)
- **REQ-004**: Avatar URLs propagate to TopBar and BuddyCard (G-06, G-07)
- **REQ-005**: Mission `difficulty`, `suggestedDueDate` shown on card (G-08)
- **REQ-006**: Chat messages persist across page reload via localStorage (G-10 equivalent)

### Architectural Constraints (from SPECS.md)
- **CON-03**: No auth system — UID-based, `localStorage` as `mb_identity`, `role` is client-stored only
- **CON-05**: Single upsert point for progress events via [`upsertProgressEvent()`](../src/adapters/interface.ts:76)
- **CON-06**: Form missions always `autoApproved` regardless of `validationMethod`
- **CON-12**: No TypeScript `enum` — use `const` object + `keyof` union pattern
- **CON-13**: No component calls `JSON.parse` on PB fields — parsing inside adapter only
- **CON-16**: [`qrPayload.ts`](../src/utils/qrPayload.ts:1) is single encode/decode point

### Design Constraints (from AGENTS.md)
- UI follows strict layer model: tokens → ui primitives → patterns → domain → pages
- Page files target < 200 lines; extract views when exceeded
- Use `cn()` for conditional BEM modifiers, never inline design styles
- Icons from `react-icons` only

## 2. Implementation Steps

### Milestone 1: Exercise Invite Token Flow in Mock (G-01)

**GOAL-001**: Validate the invite token join path works end-to-end through mock adapter so production PB integration is testable.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `inviteToken` field to mock player seed data in [`mockData.ts`](../src/adapters/mock/mockData.ts) — add a new mock player with `inviteToken: "INVITE_TEST_001"` and `uid: ""` (pending slot pattern) | | |
| TASK-002 | In [`HireInviteAccordion`](../src/pages/hire-detail/HireInviteAccordion.tsx), expose the invite token value in a copyable field so admin can share it during testing | | |
| TASK-003 | Add a "Test Invite Link" button on LandingPage when `VITE_USE_MOCK_PB=true` that navigates to `/join/:sessionId?token=INVITE_TEST_001` — this exercises the auto-claim path in [`useLandingFlow.ts`](../src/hooks/useLandingFlow.ts:130) | | |
| TASK-004 | Verify `claimPlayerSlot()` in [`joinSession.ts`](../src/use-cases/joinSession.ts:74) calls `adapter.getPlayerByInviteToken(token, sessionId)` and then `updatePlayer` with new uid/recoveryKey — confirm mock adapter path works | | |

**Completion Criteria**:
- Mock player with invite token exists in seed data
- Admin can copy an invite link from HireDetailPage
- LandingPage auto-claims the slot when navigating to `/join/:sessionId?token=...`
- Player lands on cockpit page after claim

### Milestone 2: Admin Review for Form Submissions (G-03)

**GOAL-002**: Admin can view player form responses in HireDetailPage analytics tab.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | In [`PendingApprovalsPanel`](../src/components/admin/PendingApprovalsPanel.tsx), add a "Form Responses" sub-section that lists form missions with `formResponse` data, showing player name + mission title + response fields as key-value pairs | | |
| TASK-006 | Filter progress events in analytics tab: separate `pendingApproval` (current panel) from `completed` events that have `formResponse !== undefined` — render the latter in a new "Form Responses" section below pending approvals | | |
| TASK-007 | Create [`FormResponseCard.tsx`](../src/components/admin/FormResponseCard.tsx) component using existing UI primitives (`Card`, `TagBadge`) to display individual form responses with player name, mission title, and response fields in a clean table layout | | |

**Completion Criteria**:
- Form submissions appear in analytics tab when admin selects a player
- Each response shows: player name, mission title, field labels + values
- Uses existing UI primitives (no inline styles)
- Respects C-13: adapter already parses `formResponse` from JSON string to typed object

### Milestone 3: Player Profile Fields in Cockpit (G-05)

**GOAL-003**: Player can see their profile information in the cockpit.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Add a "My Profile" tab to [`PLAYER_TABS`](../src/pages/player-cockpit/constants.ts) — position after "dashboard", before "assistant" | | |
| TASK-009 | Create [`PlayerProfileView.tsx`](../src/components/player/PlayerProfileView.tsx) component that displays: `preferredName`, `pronouns`, `department`, `team`, `location`, `timezone`, `startDate`, `languages`, `skillsConfident`, `skillsDevelop`, `workStyle` — using existing UI primitives (Card, TagBadge for skills) | | |
| TASK-010 | Wire up in [`usePlayerCockpitPage.ts`](../src/pages/player-cockpit/usePlayerCockpitPage.ts): pass `m.player` fields to the new view component when tab === "profile" | | |

**Completion Criteria**:
- New "My Profile" tab renders with player data from `m.player`
- Skills displayed as TagBadges (consistent with mission tags)
- Empty state shown for undefined fields ("Not set")
- Mobile-first layout at 390×844

### Milestone 4: Avatar URL Propagation (G-06, G-07)

**GOAL-004**: Avatar URLs flow from adapter → page → component.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | In [`PlayerCockpitPage.tsx`](../src/pages/PlayerCockpitPage.tsx:78), pass `avatarUrl={m.player.avatarUrl}` to `<TopBar>` component | | |
| TASK-012 | Verify [`BuddyCard`](../src/components/player/BuddyCard.tsx) already accepts `avatarUrl` prop — confirm it renders when passed (check existing code in [`PlayerDashboardView.tsx:96`](../src/pages/player-cockpit/PlayerDashboardView.tsx:96)) | | |
| TASK-013 | In mock data, add `avatarUrl` to at least one player and one buddy profile so the feature is testable | | |

**Completion Criteria**:
- Player avatar visible in TopBar when `m.player.avatarUrl` exists
- Buddy avatar visible in BuddyCard when `buddy.avatarUrl` exists
- Mock data includes test avatars for verification

### Milestone 5: Mission Card Enhancements (G-08, G-09)

**GOAL-005**: Show difficulty and due date on mission cards; make external URLs clickable.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | In [`MissionCard.tsx`](../src/components/shared/MissionCard.tsx), add `difficulty` display using TagBadge with variant derived from difficulty level (e.g., "⭐ 3" for difficulty=3) — use existing XpBadge pattern as reference | | |
| TASK-015 | In [`CurrentMissionsList.tsx`](../src/components/player/CurrentMissionsList.tsx), `suggestedDueDate` is already rendered at line 94-102 — verify it displays correctly and add a visual indicator for overdue dates (compare against today's date) | | |
| TASK-016 | For `type: "link"` missions, render an external link icon next to the title in MissionCard that opens `externalUrl` — use `<a>` with `target="_blank" rel="noopener noreferrer"` and react-icons `MdOpenInNew` | | |

**Completion Criteria**:
- Difficulty shown as small badge on mission card
- Due date displays with overdue indicator (red text) when past due date
- Link-type missions show clickable external link icon directly on card

### Milestone 6: Chat History Persistence (G-10 equivalent)

**GOAL-006**: AI assistant conversations persist across page reloads.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | In [`useChatStream.ts`](../src/hooks/useChatStream.ts), add localStorage persistence: on mount, read `mb_chat_history_<sessionId>` from sessionStorage; on every message change, write to sessionStorage (not localStorage — session-scoped) | | |
| TASK-018 | Add a "Clear history" button in the chat panel header that clears the stored messages and resets state | | |
| TASK-019 | In [`PlayerAssistantView`](../src/pages/player-cockpit/PlayerDashboardView.tsx:124), pass `sessionId` to the chat hook so persistence is session-scoped (not shared across sessions) | | |

**Completion Criteria**:
- Chat messages survive page reload within same session
- Clear history button resets conversation
- Messages scoped per sessionId (different sessions have different histories)
- Uses sessionStorage (session-scoped, not localStorage — aligns with existing `mb_tutorial_step` pattern in [`useTutorial.ts`](../src/hooks/useTutorial.ts:14))

## 3. Alternatives Considered

- **ALT-001**: Persist chat to PB collection instead of sessionStorage
  - *Rejected*: Would require new `chatMessages` collection, adapter methods, and SSE subscription overhead. sessionStorage is sufficient for prototype phase (C-03: no auth). Can migrate later if needed.

- **ALT-002**: Add a dedicated "Form Responses" page in admin routes
  - *Rejected*: Adds routing complexity for a single feature. Analytics tab already has player selection and progress data — form responses belong there contextually.

- **ALT-003**: Use URL search params for resource search state (G-11)
  - *Deferred*: Not in scope for this plan. Can be addressed as a separate polish task.

- **ALT-004**: Replace static tutorial text with dynamic content from adapter
  - *Deferred*: Requires new adapter method or template system. Static placeholder is acceptable for prototype; dynamic version is a polish item (G-16).

## 4. Dependencies

- **DEP-001**: Existing UI primitives — [`Button`](../src/components/ui/), [`Card`](../src/components/ui/), [`TagBadge`](../src/components/shared/TagBadge.tsx) must be available
- **DEP-002**: `react-icons` for icon usage (C-12 compliance: no ASCII symbols or emojis in UI)
- **DEP-003**: Existing adapter interface — no new methods needed; all gaps use existing `AppAdapter` contract
- **DEP-004**: TypeScript strict mode with `verbatimModuleSyntax` — all imports must use `import type` for type-only

## 5. Files Affected

| File | Change Type | Description |
|------|-------------|-------------|
| [`src/adapters/mock/mockData.ts`](../src/adapters/mock/mockData.ts) | Modify | Add invite token to mock player seed; add avatarUrl fields |
| [`src/pages/hire-detail/HireInviteAccordion.tsx`](../src/pages/hire-detail/HireInviteAccordion.tsx) | Modify | Expose invite token for copyable sharing |
| [`src/pages/LandingPage.tsx`](../src/pages/LandingPage.tsx) | Modify | Add test invite link button (mock-only) |
| [`src/components/admin/PendingApprovalsPanel.tsx`](../src/components/admin/PendingApprovalsPanel.tsx) | Modify | Add form responses section below pending approvals |
| `src/components/admin/FormResponseCard.tsx` | **Create** | New component for displaying form submission data |
| [`src/pages/player-cockpit/constants.ts`](../src/pages/player-cockpit/constants.ts) | Modify | Add "profile" tab to PLAYER_TABS |
| `src/components/player/PlayerProfileView.tsx` | **Create** | New component showing player profile fields |
| [`src/pages/player-cockpit/usePlayerCockpitPage.ts`](../src/pages/player-cockpit/usePlayerCockpitPage.ts) | Modify | Wire up profile tab data |
| [`src/pages/PlayerCockpitPage.tsx`](../src/pages/PlayerCockpitPage.tsx) | Modify | Pass avatarUrl to TopBar; pass sessionId to chat |
| [`src/components/shared/MissionCard.tsx`](../src/components/shared/MissionCard.tsx) | Modify | Add difficulty badge, external link icon |
| [`src/hooks/useChatStream.ts`](../src/hooks/useChatStream.ts) | Modify | Add sessionStorage persistence for messages |

## 6. Testing

- **TEST-001**: Playwright MCP screenshot test — navigate to `/admin/sess_mmt2026`, verify invite accordion shows token, click "Test Invite Link" → lands on cockpit
- **TEST-002**: Playwright MCP screenshot test — in analytics tab, select a player with form response, verify FormResponseCard renders with field values
- **TEST-003**: Playwright MCP screenshot test — navigate to `/session/sess_mmt2026`, verify "My Profile" tab shows player fields
- **TEST-004**: Playwright MCP screenshot test — verify TopBar shows avatar when `avatarUrl` is set in mock data
- **TEST-005**: Playwright MCP screenshot test — send message to AI assistant, reload page, verify message persists
- **TEST-006**: Manual verification — mission card shows difficulty badge and external link icon for link-type missions

## 7. Risks & Assumptions

| # | Type | Description |
|---|------|-------------|
| RISK-001 | Scope creep | Adding "My Profile" tab could expand to full profile editing — scope is view-only only |
| RISK-002 | Mock data drift | Adding invite tokens and avatarUrls to mock data must not break existing tests or demo flows |
| RISK-003 | sessionStorage limits | Chat history stored in sessionStorage has ~5MB limit; should add size guard before writing |
| ASSUMPTION-001 | Existing primitives | All new UI uses existing `ui/` primitives — no new BEM classes needed |
| ASSUMPTION-002 | Adapter contract | No new adapter methods required — all gaps use existing interface methods |
| ASSUMPTION-003 | Form responses exist | Mock data has form submissions with `formResponse` field; analytics tab can display them |

## 8. Related Specifications / Further Reading

- [`plans/integration-gap-analysis.md`](integration-gap-analysis.md) — source gap analysis document
- [`SPECS.md`](../SPECS.md:1) — authoritative spec with design constraints C-01 through C-17
- [`design/component-architecture.md`](../design/component-architecture.md) — UI layer model and CSS governance
- [`design/design-tokens.md`](../design/design-tokens.md) — color, type, spacing tokens
- [AGENTS.md](../.roo/rules-architect/AGENTS.md:1) — project rules including React lifecycle patterns
