---
goal: Replace raw base64 QR payloads with URL-based QR codes, add a shared ValidationPage for both built-in and external scanner entry points
version: 1.1
date_created: 2026-06-16
last_updated: 2026-06-17
status: Planned (reassessed — aligned with SPECS.md 2026-06-17)
tags: feature, qr, validation, routing, identity
spec_ref: SPECS.md — QR flow, Routes, Identity storage and resolution
branch_strategy: single branch, commit-by-commit (see §9)
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Replace the current raw-base64 QR code payload with a full URL (`/validate/:sessionId?t=...`). Introduce a shared `ValidationPage` as the **single GM confirmation point** whether the QR is scanned via the built-in scanner (modal or standalone page), pasted in the browser, or opened by an external device camera. The existing `QRPayload` HMAC mechanism in `qrPayload.ts` is preserved; `qrUrl.ts` adds the URL transport wrapper.

**Reassessment notes (2026-06-17):** QR admin state lives in `useAdminPlayers.ts` (not only `AdminCockpitPage`). `RequireRole` already scopes `sessionId`. Ephemeral demo identity works via `useIdentity`. Target scanner route is `/admin/:sessionId/scan` (legacy `/qr/:missionId` deprecated).

## 1. Requirements & Constraints

- **REQ-001**: QR code must encode a full URL, not a raw base64 string
- **REQ-002**: Built-in scanner (`AdminQRScannerModal`, `QRScannerView`) and external camera must converge on the same `ValidationPage`
- **REQ-003**: `ValidationPage` must show milestone name, mission name, player name, and Confirm/Cancel before writing the progress event
- **REQ-004**: Only the Game Maker of the session may access `ValidationPage`; others are redirected (`RequireRole`)
- **REQ-005**: Built-in scanner stays as optional quality-of-life component (generic URL scanner, no mission context)
- **REQ-005a**: Admin cockpit map toolbar exposes a generic **Open scanner** control (QR icon `map-toolbar-btn`) that opens `AdminQRScannerModal` — primary GM entry point for in-app scanning
- **REQ-006**: HMAC signing/verification (`encodeQRPayload`/`decodeQRPayload`) logic in `qrPayload.ts` must remain unchanged
- **REQ-007**: `QRPayload` type interface must remain unchanged (includes `hmac`)
- **REQ-008**: `validatedBy` on confirm must use `identity.uid` from `useIdentity` (supports ephemeral GM)
- **REQ-009**: On confirm, prefer `mission.xpValue` over payload `xpValue` when mission record is available (OD-07 prototype hygiene)
- **REQ-010**: Post-confirm navigation returns GM to `/admin/:sessionId` (or sensible back target)
- **CON-001**: No new adapter methods — existing `AppAdapter` interface is sufficient
- **CON-002**: `Session` type gains optional `qrSecret`; mock sets `qrSecret = sessionId` for encode/decode alignment
- **CON-003**: URL format is `{origin}/validate/{sessionId}?t={base64-encoded-QRPayload}`
- **CON-004**: `parseValidationToken` must accept full URLs and pathname+query (`/validate/...?t=...`)
- **PAT-001**: New page follows existing patterns (`useSession`, `useAdapter`, `useIdentity`)
- **PAT-002**: New route follows `RequireRole` guard from `App.tsx`
- **PAT-003**: QR confirm write lives on `ValidationPage`; remove inline validate from scanner modal

## 2. Implementation Steps

### Implementation Phase 0: Preflight

- GOAL-000: Confirm baseline assumptions before coding

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Verify `RequireRole` checks `identity.sessionId === :sessionId` | ✅ | 2026-06-17 |
| TASK-000a | Confirm QR scanner state is in `useAdminPlayers.ts` | ✅ | 2026-06-17 |
| TASK-000b | Update `SPECS.md` QR flow + identity sections | ✅ | 2026-06-17 |
| TASK-000c | **Decided:** Remove per-card "Scan QR" from `ApprovalRequestCard`; add generic Open scanner (QR icon) on `MilestoneMapEditor` map toolbar → opens `AdminQRScannerModal` | ✅ | 2026-06-17 |
| TASK-000d | Decide: `/admin/:sessionId/scan` replaces `/qr/:missionId` | ✅ (documented in SPECS) | 2026-06-17 |

### Implementation Phase 1: URL Utility & Type Changes

- GOAL-001: Add URL construction/parsing utilities and extend Session type with `qrSecret`

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `qrSecret?: string` to `Session` in [`src/types/domain.ts`](src/types/domain.ts) | | |
| TASK-002 | Create [`src/utils/qrUrl.ts`](src/utils/qrUrl.ts): `buildValidationUrl`, `parseValidationToken` (full URL + path) | | |
| TASK-003 | Set `qrSecret: sessionId` in mock [`createSession`](src/adapters/mock/mockAdapter.ts) | | |
| TASK-004 | Add `qrSecret` to [`MOCK_SESSION`](src/adapters/mock/mockData.ts) / `MOCK_SESSION_2` seed data | | |
| TASK-004a | Update `QRDisplay` signing key: `session.qrSecret ?? sessionId` via `adapter.getSession` | | |

### Implementation Phase 2: ValidationPage

- GOAL-002: Create shared ValidationPage and register route

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create [`src/pages/ValidationPage.tsx`](src/pages/ValidationPage.tsx): read `:sessionId` + `?t=`, fetch session `qrSecret`, `decodeQRPayload`, load player/mission/milestone names, Confirm/Cancel, `upsertProgressEvent` on confirm with `validatedBy: identity.uid` | | |
| TASK-005a | Handle edge cases: invalid/tampered token, session mismatch (URL vs payload), already-completed mission | | |
| TASK-005b | Post-confirm: `navigate(/admin/${sessionId})` | | |
| TASK-006 | Add `/validate/:sessionId` → `RequireRole gamemaker` → `ValidationPage` in [`src/App.tsx`](src/App.tsx) | | |
| TASK-007 | `RequireRole` session scoping — **already implemented**; no change required | ✅ | 2026-06-17 |

### Implementation Phase 3: Update Player-Side QRDisplay

- GOAL-003: QR canvas renders validation URL

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | In [`QRDisplay.tsx`](src/components/player/QRDisplay.tsx), wrap encoded payload with `buildValidationUrl` before `QRCode.toCanvas()` | | |
| TASK-009 | Keep `subscribeProgressEvent` + `onValidated` when status becomes `completed` / `autoApproved` | | |

### Implementation Phase 4: Simplify Admin Scanner + Hook Cleanup

- GOAL-004: Generic scanner modal; remove context-bound inline validation from `useAdminPlayers`

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Remove `QRScannerContext`, `context`, `onValidate` from [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx). Props: `{ isOpen, sessionId, onClose }` | | |
| TASK-011 | `handleDecode`: `parseValidationToken` → `navigate` to validation path; invalid → error state | | |
| TASK-012 | `handleSimulate`: build mock URL via `encodeQRPayload` + `buildValidationUrl` → `handleDecode` | | |
| TASK-013 | Remove context display card from modal render | | |
| TASK-014 | [`useAdminPlayers.ts`](src/hooks/useAdminPlayers.ts): remove `qrScannerContext`, `handleScanQR`, `handleQRValidate`, `closeQRScanner`; keep `completeMission` for approve/reject only | | |
| TASK-014a | [`AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx): local `scannerOpen` state; wire `AdminQRScannerModal`; pass `onOpenScanner` to `MilestoneMapEditor` | | |
| TASK-014b | [`MilestoneMapEditor.tsx`](src/components/admin/MilestoneMapEditor.tsx): add `onOpenScanner` prop + QR icon toolbar button (`MdQrCode2`, `aria-label="Open QR scanner"`, `map-toolbar-btn` style) | | |
| TASK-014c | Remove `onScanQR` from [`ApprovalRequestCard`](src/components/admin/ApprovalRequestCard.tsx), [`PendingApprovalsPanel`](src/components/admin/PendingApprovalsPanel.tsx), and [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx) call site | | |

### Implementation Phase 5: Wire QRScannerView + Route Migration

- GOAL-005: Live camera scanner page under admin session route

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Wire [`QRScannerView`](src/pages/QRScannerView.tsx): live `CameraFeed`, scan state, `parseValidationToken`, `navigate` to `ValidationPage` | | |
| TASK-016 | Start / Stop camera toggle (reuse `AdminQRScannerModal` pattern) | | |
| TASK-015a | Register `/admin/:sessionId/scan` under `RequireRole gamemaker` in [`src/App.tsx`](src/App.tsx) | | |
| TASK-015b | Remove or redirect legacy `/qr/:missionId` route | | |
| TASK-015c | Update [`AGENTS.md`](AGENTS.md) routes table | | |

### Implementation Phase 6: Verification

- GOAL-006: End-to-end verification

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Player QR canvas decodes to valid validation URL | | |
| TASK-018 | Modal scan → `ValidationPage` → confirm writes progress | | |
| TASK-019 | `QRScannerView` scan → same `ValidationPage` flow | | |
| TASK-020 | Paste `/validate/:sid?t=...` in browser; non-GM redirected | | |
| TASK-021 | `gmApprove` and `selfApprove` unaffected | | |
| TASK-022 | `deno task lint` + `deno task build` pass | | |
| TASK-023 | Ephemeral GM demo can confirm on `ValidationPage` without `localStorage` | | |

## 3. Alternatives

- **ALT-001**: Keep modal doing inline validation. Rejected: two UX paths; user wants single `ValidationPage`.
- **ALT-002**: Separate `getQRSecret` adapter method. Rejected: `qrSecret` is a natural `Session` field (matches PB schema).
- **ALT-003**: ValidationPage as modal overlay only. Rejected: external camera opens a URL; full route required.
- **ALT-004**: Keep `/qr/:missionId`. Rejected: unguarded, wrong param semantics; use `/admin/:sessionId/scan`.

## 4. Dependencies

- **DEP-001**: React Router — `useNavigate`, `useParams`, `useSearchParams`
- **DEP-002**: `qrcode` — unchanged
- **DEP-003**: `jsqr` — unchanged
- **DEP-004**: Web Crypto API — unchanged
- **DEP-005**: [`SPECS.md`](SPECS.md) — authoritative QR + identity spec (updated 2026-06-17)

## 5. Files

| File | Action | Description |
|------|--------|-------------|
| [`SPECS.md`](SPECS.md) | Modified | QR URL flow, identity, routes (done) |
| [`src/types/domain.ts`](src/types/domain.ts) | Modify | `qrSecret?: string` on `Session` |
| [`src/utils/qrUrl.ts`](src/utils/qrUrl.ts) | **Create** | URL build/parse |
| [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts) | Modify | `qrSecret` on create |
| [`src/adapters/mock/mockData.ts`](src/adapters/mock/mockData.ts) | Modify | Seed `qrSecret` |
| [`src/pages/ValidationPage.tsx`](src/pages/ValidationPage.tsx) | **Create** | GM confirm page |
| [`src/App.tsx`](src/App.tsx) | Modify | `/validate/:sessionId`, `/admin/:sessionId/scan` |
| [`src/components/player/QRDisplay.tsx`](src/components/player/QRDisplay.tsx) | Modify | URL QR + signing key |
| [`src/components/admin/AdminQRScannerModal.tsx`](src/components/admin/AdminQRScannerModal.tsx) | Modify | Generic scanner |
| [`src/hooks/useAdminPlayers.ts`](src/hooks/useAdminPlayers.ts) | Modify | Remove scanner context |
| [`src/pages/AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx) | Modify | Scanner modal state + toolbar callback |
| [`src/components/admin/MilestoneMapEditor.tsx`](src/components/admin/MilestoneMapEditor.tsx) | Modify | Map toolbar Open scanner button |
| [`src/components/admin/ApprovalRequestCard.tsx`](src/components/admin/ApprovalRequestCard.tsx) | Modify | Remove Scan QR button + `onScanQR` prop |
| [`src/components/admin/PendingApprovalsPanel.tsx`](src/components/admin/PendingApprovalsPanel.tsx) | Modify | Remove `onScanQR` prop |
| [`src/pages/QRScannerView.tsx`](src/pages/QRScannerView.tsx) | Modify | Live camera + navigate |
| [`AGENTS.md`](AGENTS.md) | Modify | Route table |
| [`src/components/layout/RequireRole.tsx`](src/components/layout/RequireRole.tsx) | Inspect only | Already session-scoped |

## 6. Testing

- **TEST-001**: Player QR encodes scannable validation URL
- **TEST-002**: Modal scan navigates to `ValidationPage`
- **TEST-003**: HMAC verify success / tampered token failure
- **TEST-004**: Confirm writes `upsertProgressEvent` with `status: completed`, `validatedBy` set
- **TEST-005**: Non-GM cannot access `/validate/:sessionId`
- **TEST-006**: GM of different session cannot validate (URL `sessionId` vs identity)
- **TEST-007**: `gmApprove` / `selfApprove` regression
- **TEST-008**: Form missions still `autoApproved` (C-06)
- **TEST-009**: Ephemeral GM identity on `ValidationPage` (no `localStorage`)
- **TEST-010**: Already-completed mission shows appropriate UI (no duplicate write)

## 7. Risks & Assumptions

- **RISK-001**: Optional `qrSecret` — mock seed + `createSession` must set it or decode fails. Mitigation: `qrSecret?:` + mock `sessionId` stand-in.
- **RISK-002**: `RequireRole` session scoping — **mitigated** (already implemented).
- **RISK-003**: Encode uses `sessionId`, decode uses `qrSecret` — must use same value in mock. Mitigation: CON-002 + TASK-004a.
- **RISK-004**: Scanner discoverability after removing approval-card Scan QR — **mitigated** by map toolbar Open scanner button (REQ-005a).
- **ASSUMPTION-001**: Mock `qrSecret = sessionId` is sufficient for prototype HMAC.
- **ASSUMPTION-002**: `subscribeProgressEvent` on player fires when `ValidationPage` calls `upsertProgressEvent` (same adapter instance).
- **ASSUMPTION-003**: `useIdentity` ephemeral path satisfies `RequireRole` for demo GM (verified in code).

## 8. Related Specifications / Further Reading

- [SPECS.md — Mission Validation (`qr` path)](SPECS.md)
- [SPECS.md — Identity storage and resolution](SPECS.md)
- [SPECS.md — Routes](SPECS.md)
- [SPECS.md C-07, C-16](SPECS.md)
- [SPECS.md OD-07, OD-12, OD-13, OD-14](SPECS.md) — future data storage / security
- [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts)
- [`src/hooks/ephemeralIdentityStore.ts`](src/hooks/ephemeralIdentityStore.ts)
- [`docs/pb-schema.md`](docs/pb-schema.md) — `sessions.qrSecret`

## 9. Commit-by-commit implementation (single branch)

Work on one feature branch. Each commit should be buildable (`deno task build`).

| # | Commit message (suggested) | Scope | Plan tasks |
|---|---------------------------|-------|------------|
| 1 | `feat(qr): add Session.qrSecret and qrUrl utilities` | `domain.ts` `qrSecret`; `qrUrl.ts` (`buildValidationUrl`, `parseValidationToken`); mock `createSession` + seed data | TASK-001–004 |
| 2 | `feat(qr): add ValidationPage and /validate route` | `ValidationPage.tsx` (decode, confirm card, edge cases, post-confirm nav); `App.tsx` route + `RequireRole` | TASK-005, 005a, 005b, 006 |
| 3 | `feat(qr): encode validation URL in QRDisplay` | `QRDisplay.tsx` — `getSession` for signing key, `buildValidationUrl`, keep subscribe | TASK-004a, 008, 009 |
| 4 | `refactor(qr): generic AdminQRScannerModal navigates to ValidationPage` | Modal: drop context/`onValidate`; `parseValidationToken` + `navigate`; simulate via URL | TASK-010–013 |
| 5 | `refactor(admin): remove QR scanner from pending approvals hook` | `useAdminPlayers.ts` — remove scanner context/handlers; `ApprovalRequestCard` + `PendingApprovalsPanel` — drop `onScanQR` | TASK-014, 014c |
| 6 | `feat(admin): add map toolbar Open scanner button` | `MilestoneMapEditor` QR icon + `onOpenScanner`; `AdminCockpitPage` `scannerOpen` + modal wiring | TASK-014a, 014b, REQ-005a |
| 7 | `feat(qr): wire QRScannerView and /admin/:sessionId/scan route` | Live camera, navigate to ValidationPage; register route; remove `/qr/:missionId`; `AGENTS.md` | TASK-015–016, 015a–c |
| 8 | `chore: verify QR URL validation flow` | Manual E2E per §6; `deno task lint` + `deno task build`; fix regressions | TASK-017–023, TEST-* |

**Dependency order:** 1 → 2 → 3 (player path testable after 3) → 4 → 5 → 6 (admin modal + toolbar) → 7 (standalone scanner page) → 8.

**Smoke after commit 3:** Demo player shows QR → copy URL → paste as GM (after commit 2) to confirm without scanner.

**Smoke after commit 6:** GM toolbar QR button → modal scan → `ValidationPage` → confirm → player XP updates.

