---
goal: Replace raw base64 QR payloads with URL-based QR codes, add a shared ValidationPage for both built-in and external scanner entry points
version: 1.0
date_created: 2026-06-16
last_updated: 2026-06-16
status: Planned
tags: feature, qr, validation, routing
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Replace the current raw-base64 QR code payload with a full URL (`/validate/:sessionId?t=...`). Introduce a shared `ValidationPage` that serves as the single confirmation point whether the QR is scanned via the built-in scanner (modal or standalone page) or via an external device camera. The existing `QRPayload` HMAC mechanism is preserved unchanged; only the transport wrapper changes from raw base64 to a URL.

## 1. Requirements & Constraints

- **REQ-001**: QR code must encode a full URL, not a raw base64 string
- **REQ-002**: Both built-in scanner (AdminQRScannerModal, QRScannerView) and external camera must converge on the same `ValidationPage`
- **REQ-003**: `ValidationPage` must show milestone name, mission name, player name, and a confirm button before writing the progress event
- **REQ-004**: Only the Game Maker of the session may access `ValidationPage`; others are redirected
- **REQ-005**: Built-in scanner stays as optional quality-of-life component
- **REQ-006**: HMAC signing/verification (`encodeQRPayload`/`decodeQRPayload`) must remain unchanged
- **REQ-007**: `QRPayload` type interface must remain unchanged
- **CON-001**: No new adapter methods — existing `AppAdapter` interface is sufficient
- **CON-002**: `Session` type gains optional `qrSecret` field; mock sets it to `sessionId`
- **CON-003**: URL format is `{origin}/validate/{sessionId}?t={base64-encoded-QRPayload}`
- **PAT-001**: New page follows existing page component patterns (`useSession`, `useAdapter`, `useIdentity`)
- **PAT-002**: New route follows existing `RequireRole` guard pattern from `App.tsx`

## 2. Implementation Steps

### Implementation Phase 1: URL Utility & Type Changes

- GOAL-001: Add URL construction/parsing utilities and extend Session type with qrSecret

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `qrSecret?: string` field to `Session` interface in [`src/types/domain.ts:19`](src/types/domain.ts:19) | | |
| TASK-002 | Create `src/utils/qrUrl.ts` with `buildValidationUrl(sessionId, encodedPayload): string` and `parseValidationToken(url: string): { sessionId: string; token: string } \| null` | | |
| TASK-003 | Set `qrSecret: sessionId` in mock adapter [`createSession`](src/adapters/mock/mockAdapter.ts:136) | | |
| TASK-004 | Add `qrSecret` to seed data in [`mockData.ts`](src/adapters/mock/mockData.ts) if needed (check if `MOCK_SESSION`/`MOCK_SESSION_2` require it) | | |

### Implementation Phase 2: ValidationPage

- GOAL-002: Create the shared ValidationPage component and register its route

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create [`src/pages/ValidationPage.tsx`](src/pages/ValidationPage.tsx) — reads `:sessionId` and `?t=`, fetches session for `qrSecret`, calls `decodeQRPayload`, fetches player/mission/milestone names, renders confirmation card with Confirm/Cancel buttons, calls `adapter.upsertProgressEvent` on confirm | | |
| TASK-006 | Add route `/validate/:sessionId` → `<RequireRole role={USER_ROLE.GAMEMAKER}><ValidationPage /></RequireRole>` in [`src/App.tsx:11`](src/App.tsx:11) | | |
| TASK-007 | Verify `RequireRole` already checks `identity.sessionId === :sessionId` for admin routes; if not, add session-scoping check to the new route guard | | |

### Implementation Phase 3: Update Player-Side QRDisplay

- GOAL-003: Change QRDisplay to render a URL instead of raw base64 payload

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | In [`src/components/player/QRDisplay.tsx`](src/components/player/QRDisplay.tsx), after calling `encodeQRPayload(...)`, wrap result with `buildValidationUrl(sessionId, encoded)` before passing to `QRCode.toCanvas()` | | |
| TASK-009 | Ensure subscription callback (`onValidated`) still works — QRDisplay subscribes to progress events and fires `onValidated` when status becomes completed. This logic does not change. | | |

### Implementation Phase 4: Simplify AdminQRScannerModal

- GOAL-004: Simplify the scanner modal to be a generic QR scanner that navigates to ValidationPage

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Remove `QRScannerContext` type and `context`/`onValidate` props from [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:22). New props: `{ isOpen, sessionId, onClose }` only | | |
| TASK-011 | In `handleDecode`, replace context-matching logic with `parseValidationToken(encoded)` call. If valid URL → `navigate(url)` (via `useNavigate`). If invalid → show error. | | |
| TASK-012 | Update `handleSimulate` to build a mock URL (call `encodeQRPayload` then `buildValidationUrl`) and feed through `handleDecode` | | |
| TASK-013 | Remove context display section from modal render (the card showing player/mission names) — no longer relevant since scanner is generic | | |
| TASK-014 | Update [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx) call site: remove `qrScannerContext` state, `onValidate` handler, and context-related logic. Modal call simplifies to `<AdminQRScannerModal isOpen={scannerOpen} sessionId={sid} onClose={...} />` | | |

### Implementation Phase 5: Wire QRScannerView

- GOAL-005: Wire the standalone QR scanner page with live camera and navigation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Replace static shell in [`QRScannerView`](src/pages/QRScannerView.tsx) with live `CameraFeed`, active scan state, `parseValidationToken` on decode, and `useNavigate` to ValidationPage | | |
| TASK-016 | Add Start Camera / Stop Camera toggle button (reuse pattern from AdminQRScannerModal) | | |

### Implementation Phase 6: Verification

- GOAL-006: Verify all flows work end-to-end

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Verify player QR display renders scannable URL-based QR code | | |
| TASK-018 | Verify built-in scanner modal scans → navigates → ValidationPage shows correct context → confirm writes progress | | |
| TASK-019 | Verify standalone QRScannerView scans → navigates → same flow | | |
| TASK-020 | Verify external URL entry (paste `/validate/:sid?t=...` in browser) works and is guarded for non-GM users | | |
| TASK-021 | Verify `gmApprove` and `selfApprove` validation methods are unaffected (they don't use QR) | | |
| TASK-022 | Run `deno task lint` and `deno task build` (type check) — fix any type errors | | |

## 3. Alternatives

- **ALT-001**: Keep modal doing inline validation (current behavior) and only expose URL flow for external cameras. Rejected: creates two inconsistent UX paths and the user explicitly wants a single validation view.
- **ALT-002**: Put `qrSecret` in a separate adapter method (`getQRSecret`) rather than on the `Session` type. Rejected: adds unnecessary API surface; the secret is a property of the session record naturally.
- **ALT-003**: Make ValidationPage a modal overlay on AdminCockpitPage rather than a full route. Rejected: external camera scans open a URL, so a full route is necessary. Modal overlay would only work for in-app navigation.

## 4. Dependencies

- **DEP-001**: React Router (`react-router-dom`) — already a dependency; `useNavigate`, `useParams`, `useSearchParams` used in new page
- **DEP-002**: `qrcode` library — already used by QRDisplay; no change
- **DEP-003**: `jsqr` library — already used by CameraFeed; no change
- **DEP-004**: Web Crypto API (`crypto.subtle`) — already used by qrPayload.ts; no change

## 5. Files

| File | Action | Description |
|------|--------|-------------|
| [`src/types/domain.ts`](src/types/domain.ts:19) | Modify | Add `qrSecret?: string` to `Session` interface |
| [`src/utils/qrUrl.ts`](src/utils/qrUrl.ts) | **Create** | URL construction and parsing utilities |
| [`src/adapters/mock/mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:136) | Modify | Set `qrSecret` on session creation |
| [`src/adapters/mock/mockData.ts`](src/adapters/mock/mockData.ts) | Modify (if needed) | Add `qrSecret` to seed sessions |
| [`src/pages/ValidationPage.tsx`](src/pages/ValidationPage.tsx) | **Create** | New validation confirmation page |
| [`src/App.tsx`](src/App.tsx:11) | Modify | Add `/validate/:sessionId` route |
| [`src/components/player/QRDisplay.tsx`](src/components/player/QRDisplay.tsx:15) | Modify | Render URL instead of raw base64 |
| [`src/components/admin/AdminQRScannerModal.tsx`](src/components/admin/AdminQRScannerModal.tsx) | Modify | Simplify to generic scanner |
| [`src/pages/AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx) | Modify | Remove context/props complexity for scanner modal |
| [`src/pages/QRScannerView.tsx`](src/pages/QRScannerView.tsx) | Modify | Wire live camera and navigation |
| [`src/components/layout/RequireRole.tsx`](src/components/layout/RequireRole.tsx) | Inspect | Verify session-scoping behavior |

## 6. Testing

- **TEST-001**: Player QR display — verify canvas renders URL-based QR code that decodes correctly
- **TEST-002**: Built-in scanner modal — verify camera scan of valid URL QR navigates to ValidationPage
- **TEST-003**: ValidationPage — verify HMAC verification succeeds with correct token and fails with tampered token
- **TEST-004**: ValidationPage — verify confirm writes correct `upsertProgressEvent` with `status: 'completed'`
- **TEST-005**: Authorization — verify non-GM cannot access `/validate/:sessionId`
- **TEST-006**: Authorization — verify GM of different session cannot validate (session ID mismatch)
- **TEST-007**: Regression — verify `gmApprove` and `selfApprove` flows are unaffected
- **TEST-008**: Regression — verify form missions continue to auto-approve (C-06)

## 7. Risks & Assumptions

- **RISK-001**: The `Session` type change adds `qrSecret` as optional — existing code that creates `Session` objects (mock data, `createSession`) must be updated or TypeScript will error on missing property. Mitigation: make it optional (`qrSecret?:`) so existing code still compiles; only the validation page reads it.
- **RISK-002**: `RequireRole` currently checks role but may not check that the URL's `:sessionId` matches `identity.sessionId`. Mitigation: inspect `RequireRole` implementation before assuming; add session-scoping if missing.
- **ASSUMPTION-001**: The mock adapter's session secret (`sessionId`) is sufficient for HMAC verification in the validation page flow.
- **ASSUMPTION-002**: `QRDisplay` subscription (`adapter.subscribeProgressEvent`) will fire when `upsertProgressEvent` is called from `ValidationPage` because both run against the same in-memory adapter instance.

## 8. Related Specifications / Further Reading

- [SPECS.md C-07 — QR validation offline](SPECS.md)
- [SPECS.md C-16 — qrPayload.ts is single encode/decode point](SPECS.md)
- [Current `QRPayload` type](src/types/value-objects.ts:17)
- [Current `encodeQRPayload`/`decodeQRPayload`](src/utils/qrPayload.ts:1)
- [Current `AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:1)
- [Current `QRScannerView`](src/pages/QRScannerView.tsx:1)
- [Current route definitions](src/App.tsx:11)
