# Admin Dashboard Analysis — Dynamic Data & Integration Report

## 1. Overview: Page Architecture

The admin experience spans four pages—one main cockpit with three tabs and three supplementary pages. Each page serves a distinct role in session management, player oversight, and QR-based validation. All admin routes are guarded by [`RequireRole`](src/components/layout/RequireRole.tsx:13), which redirects to `/` if no stored profile matches the URL session ID and `gamemaker` role.

| # | Page | Route | Role | Purpose |
|---|------|-------|------|---------|
| 1 | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:44) | `/admin/:sessionId` | GameMaker | Central cockpit — 3 tabs for session editing, pre-boarding, and cross-hire oversight |
| 2 | [`QRScannerView`](src/pages/QRScannerView.tsx:15) | `/admin/:sessionId/scan` | GameMaker | Standalone full-page QR scanner, navigates to ValidationPage on scan |
| 3 | [`ValidationPage`](src/pages/ValidationPage.tsx:9) | `/validate/:sessionId?t=<token>` | GameMaker | Decodes QR payload, displays confirmation card, writes `completed` status |
| 4 | [`NotFoundPage`](src/pages/NotFoundPage.tsx:4) | `*` (catch-all) | Public | Error display for unknown routes and unexpected errors |
| 5 | [`LandingPage`](src/pages/LandingPage.tsx:1) | `/join/:sessionId` | Public | Invite prefill with session context |
| 6 | [`FormPage`](src/pages/FormPage.tsx:1) | `/form/:sessionId/:missionId` | Player | Form mission submission |

```mermaid
graph LR
    subgraph GameMaker
        ACP[AdminCockpitPage<br/>/admin/:sessionId]
        QSV[QRScannerView<br/>/admin/:sessionId/scan]
        VP[ValidationPage<br/>/validate/:sessionId?t=]
        NFP[NotFoundPage<br/>* catch-all]
    end

    ACP -->|"Scan" button → modal| QR_Modal
    ACP -->|"Scan" link → navigate| QSV
    QSV -->|decode → navigate| VP
    QR_Modal[AdminQRScannerModal] -->|decode → navigate| VP
    VP -->|confirm → replace| ACP
    ACP -->|session error| LANDING["/" via navigate]
    LANDING -->|redirect| NFP
    NFP -->|"Go home"| LANDING

    style ACP fill:#e8f0fe,stroke:#1a73e8
    style QSV fill:#e8f0fe,stroke:#1a73e8
    style VP fill:#e8f0fe,stroke:#1a73e8
    style NFP fill:#fff3e0,stroke:#ef6c00
```

---

### 1.1 [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:44) — Three Tabs

The main admin page is a single-page application with three tabs, each rendering distinct data views. The page is parameterized by a URL `sessionId` (via React Router's [`useParams`](src/pages/AdminCockpitPage.tsx:45)). The admin identity is resolved via [`useActiveProfile(sid, USER_ROLE.GAMEMAKER)`](src/pages/AdminCockpitPage.tsx:49), which reads from the `mb_identity` key in `localStorage` via [`useIdentity()`](src/hooks/useIdentity.ts:41) and filters to the matching session+role profile.

| Tab | Key | Component(s) |
|-----|-----|-------------|
| Active Session | `activeSession` | Map editor + sidebar with 13+ panels |
| Pre-Boarding Checklist | `preBoarding` | [`PreBoardingChecklist`](src/components/admin/PreBoardingChecklist.tsx:1) |
| All New Hires | `allNewHires` | [`CrossHireDashboard`](src/components/admin/CrossHireDashboard.tsx:39) with cross-session data |

#### Active Session Tab — Component Tree

```mermaid
graph TB
    subgraph AdminCockpitPage["AdminCockpitPage (/admin/:sid)"]
        direction TB
        TB[TopBar]
        TOOL[Session Toolbar<br/>back-to-landing / log-out]

        subgraph Tabs["Tab Navigation"]
            T1["Active Session"]
            T2["Pre-Boarding Checklist"]
            T3["All New Hires"]
        end

        subgraph ActiveSession["Active Session (activeTab === activeSession)"]
            direction LR
            subgraph Map["Map Canvas"]
                MME[MilestoneMapEditor]
                GO[GridOverlay]
                BU[BackgroundImageUploader]
                MN[MilestoneNode × N]
            end

            subgraph Sidebar["Scrollable Sidebar"]
                SIC[SessionInviteCard]
                PSD[PlayerSelectorDropdown]
                PPC[PlayerProfileCard]
                PAP[PendingApprovalsPanel]
                BAF[BuddyAssignmentForm]
                RE[ResourcesEditor]
                TL[TemplateLibrary]
            end
        end

        subgraph PreBoardingTab["Pre-Boarding Tab"]
            PBC[PreBoardingChecklist]
        end

        subgraph AllNewHiresTab["All New Hires Tab"]
            CHD[CrossHireDashboard]
        end

        subgraph Modals["Overlays"]
            QR_MODAL[AdminQRScannerModal]
            MBS[MissionBottomSheet]
            STM[SaveTemplateModal]
            DRB[DraftRestoreBanner]
        end

        subgraph Toast["Floating"]
            TST[Toast]
        end
    end

    T1 --> ActiveSession
    T2 --> PreBoardingTab
    T3 --> AllNewHiresTab
    MME --> BU
    MME --> GO
    MME --> MN
    MBS --> MissionEditor
    MBS --> MissionListView
    MBS --> MissionListItem
    MBS --> MissionTypeSelector
    MBS --> DifficultySelector
    MBS --> TagSelector
    MBS --> ValidationMethodSelector
    MBS --> FormEditor
    MBS --> FormFieldEditor
    MBS --> SaveActions
    QR_MODAL --> CameraFeed
    QR_MODAL --> ValidationResult
    RE --> ResourceCard × N
    TL --> SaveActions

    style AdminCockpitPage fill:#e8f0fe,stroke:#1a73e8
    style ActiveSession fill:#eaf7ea,stroke:#2e7d32
    style PreBoardingTab fill:#fff8e1,stroke:#f9a825
    style AllNewHiresTab fill:#fce4ec,stroke:#c62828
    style Modals fill:#f3e5f5,stroke:#7b1fa2
    style Toast fill:#e1f5fe,stroke:#0288d1
```

**All admin-used components in the Active Session tab:**

| Component | File | Role |
|-----------|------|------|
| [`TopBar`](src/components/shared/TopBar.tsx:1) | `shared/TopBar.tsx` | Header with session name, "Game Master" label |
| [`MilestoneMapEditor`](src/components/admin/MilestoneMapEditor.tsx:1) | `admin/MilestoneMapEditor.tsx` | Drag-repositionable milestone canvas with background image |
| [`GridOverlay`](src/components/admin/GridOverlay.tsx:1) | `admin/GridOverlay.tsx` | Visual grid on the map canvas |
| [`BackgroundImageUploader`](src/components/admin/BackgroundImageUploader.tsx:1) | `admin/BackgroundImageUploader.tsx` | Upload handler for map background |
| [`SessionInviteCard`](src/components/admin/SessionInviteCard.tsx:46) | `admin/SessionInviteCard.tsx` | QR code + join URL generation |
| [`PlayerSelectorDropdown`](src/components/admin/PlayerSelectorDropdown.tsx:1) | `admin/PlayerSelectorDropdown.tsx` | Dropdown to select active player |
| [`PlayerProfileCard`](src/components/admin/PlayerProfileCard.tsx:9) | `admin/PlayerProfileCard.tsx` | Player info + XP + milestone progress |
| [`PendingApprovalsPanel`](src/components/admin/PendingApprovalsPanel.tsx:13) | `admin/PendingApprovalsPanel.tsx` | Approve/reject cards for gmApprove missions |
| [`ApprovalRequestCard`](src/components/admin/ApprovalRequestCard.tsx:10) | `admin/ApprovalRequestCard.tsx` | Single pending approval card with Approve/Reject buttons |
| [`BuddyAssignmentForm`](src/components/admin/BuddyAssignmentForm.tsx:16) | `admin/BuddyAssignmentForm.tsx` | Buddy profile editor per player |
| [`ResourcesEditor`](src/components/admin/ResourcesEditor.tsx:15) | `admin/ResourcesEditor.tsx` | Full CRUD + visibility toggle for resources |
| [`TemplateLibrary`](src/components/shared/TemplateLibrary.tsx:1) | `shared/TemplateLibrary.tsx` | List + load + delete templates |
| [`SaveTemplateModal`](src/components/admin/SaveTemplateModal.tsx:1) | `admin/SaveTemplateModal.tsx` | Modal for naming and saving templates |
| [`MissionBottomSheet`](src/components/admin/MissionBottomSheet.tsx:1) | `admin/MissionBottomSheet.tsx` | Full-screen mission editor bottom sheet |
| [`MissionEditor`](src/components/admin/MissionEditor.tsx:1) | `admin/MissionEditor.tsx` | Mission content editor (title, body, type) |
| [`MissionListView`](src/components/admin/MissionListView.tsx:1) | `admin/MissionListView.tsx` | Ordered list of missions in a milestone |
| [`MissionListItem`](src/components/admin/MissionListItem.tsx:1) | `admin/MissionListItem.tsx` | Single mission card in the list |
| [`SaveActions`](src/components/admin/SaveActions.tsx:1) | `admin/SaveActions.tsx` | Save/discard button bar |
| [`DraftRestoreBanner`](src/components/admin/DraftRestoreBanner.tsx:9) | `admin/DraftRestoreBanner.tsx` | Banner to restore `localStorage`-persisted draft |
| [`MilestoneSidebarEditor`](src/components/admin/MilestoneSidebarEditor.tsx:23) | `admin/MilestoneSidebarEditor.tsx` | Sidebar view for editing milestone name + missions |
| [`RequireRole`](src/components/layout/RequireRole.tsx:13) | `layout/RequireRole.tsx` | Route guard for all admin routes |

**Additional sub-editors used inside [`MissionBottomSheet`](src/components/admin/MissionBottomSheet.tsx:1):**

| Component | File | Role |
|-----------|------|------|
| [`MissionTypeSelector`](src/components/admin/MissionTypeSelector.tsx:1) | `admin/MissionTypeSelector.tsx` | Text/Link/Form type picker |
| [`DifficultySelector`](src/components/admin/DifficultySelector.tsx:1) | `admin/DifficultySelector.tsx` | 1–5 difficulty slider |
| [`TagSelector`](src/components/admin/TagSelector.tsx:1) | `admin/TagSelector.tsx` | Tag picker for mission tags |
| [`ValidationMethodSelector`](src/components/admin/ValidationMethodSelector.tsx:1) | `admin/ValidationMethodSelector.tsx` | Self-approve / GM-approve / QR picker |
| [`FormEditor`](src/components/admin/FormEditor.tsx:1) | `admin/FormEditor.tsx` | Form field schema editor for FORM-type missions |
| [`FormFieldEditor`](src/components/admin/FormFieldEditor.tsx:1) | `admin/FormFieldEditor.tsx` | Individual field editor inside FormEditor |
| [`MarkdownEditor`](src/components/admin/MarkdownEditor.tsx:1) | `admin/MarkdownEditor.tsx` | Markdown body editor |
| [`MissionEditorView`](src/components/admin/MissionEditorView.tsx:1) | `admin/MissionEditorView.tsx` | Combined mission editor view |
| [`AdminMissionsList`](src/components/admin/AdminMissionsList.tsx:1) | `admin/AdminMissionsList.tsx` | Mission list with reorder support |
| [`ConfirmSheet`](src/components/admin/ConfirmSheet.tsx:1) | `admin/ConfirmSheet.tsx` | Confirmation bottom sheet for destructive actions |
| [`TemplateFields`](src/components/admin/TemplateFields.tsx:10) | `admin/TemplateFields.tsx` | Read-only preview of template missions (Phase 1) |

---

### 1.2 [`QRScannerView`](src/pages/QRScannerView.tsx:15) — Standalone Scanner Page

Rendered at `/admin/:sessionId/scan`. Uses [`useActiveProfile(sid, USER_ROLE.GAMEMAKER)`](src/pages/QRScannerView.tsx:19) for identity resolution. A full-page scanner with a [`CameraFeed`](src/components/qr/CameraFeed.tsx) component (start/stop camera toggle), [`ValidationResult`](src/components/qr/ValidationResult.tsx) for feedback, and a back-to-cockpit link.

**Data flow:** On decode, calls [`parseValidationToken()`](src/utils/qrUrl.ts:39) to extract `(sessionId, token)`, then navigates to [`validationPathFromToken()`](src/utils/qrUrl.ts:31) which resolves to `/validate/<sessionId>?t=<token>`.

No adapter calls — the scanner is purely a camera UI that parses QR content and forwards to [`ValidationPage`](src/pages/ValidationPage.tsx:9).

| Component | Key Props | Source |
|-----------|-----------|--------|
| [`TopBar`](src/components/shared/TopBar.tsx:1) | `playerName` (from active profile), `totalXP=0`, `role="Game Master"` | [`useActiveProfile`](src/hooks/useActiveProfile.ts:6) → `identity.name` |
| [`CameraFeed`](src/components/qr/CameraFeed.tsx) | `isActive`, `onDecode`, `onError` | Local state |
| [`ValidationResult`](src/components/qr/ValidationResult.tsx) | `state`, `errorMessage` | Local `scanState` |

---

### 1.3 [`ValidationPage`](src/pages/ValidationPage.tsx:9) — GM Confirmation Page

Rendered via deep link (`/validate/:sessionId?t=<token>`) from either the in-page QR scanner modal or the standalone scanner page. Uses [`useActiveProfile(sid, USER_ROLE.GAMEMAKER)`](src/pages/ValidationPage.tsx:15) for identity.

**Decode & verify logic** has been extracted into a dedicated [`useValidationConfirm`](src/hooks/useValidationConfirm.ts:30) hook:

1. Reads `sessionId` from URL params and `t` from search params ([`line 10-14`](src/pages/ValidationPage.tsx:10))
2. Hook fetches session via internal [`useSession(sid)`](src/hooks/useValidationConfirm.ts:37) — gets `session`, `milestones`, `missions`
3. Decodes token via [`decodeQRPayload(token, secret)`](src/hooks/useValidationConfirm.ts:86) using `session.qrSecret`
4. Verifies decoded `sessionId` matches URL param ([`line 88`](src/hooks/useValidationConfirm.ts:88))
5. Looks up mission/milestone names from fetched data, player name via [`adapter.getPlayerById()`](src/hooks/useValidationConfirm.ts:100)
6. Checks for existing completion via [`adapter.listProgressEvents()`](src/hooks/useValidationConfirm.ts:101)
7. Renders confirmation card with player name, mission title, milestone name, XP value, and "already completed" indicator
8. On confirm, calls [`validation.confirm()`](src/pages/ValidationPage.tsx:25) which internally calls `adapter.upsertProgressEvent()` with `status: "completed"`, then navigates to admin cockpit

| Component | Key Props | Source |
|-----------|-----------|--------|
| [`TopBar`](src/components/shared/TopBar.tsx:1) | `playerName` (from `identity.name`), `totalXP=0`, `role="Game Master"` | [`useActiveProfile`](src/hooks/useActiveProfile.ts:6) |
| [`FetchErrorPanel`](src/components/shared/FetchErrorPanel.tsx:15) | `message`, `onRetry` → `validation.retry()`, `onBack` → `goToAdmin()` | On session error, missing token, or decode failure |

**Error states handled:**

| Condition | Render |
|-----------|--------|
| No `t` param | [`FetchErrorPanel`](src/pages/ValidationPage.tsx:32) with "Missing validation token" message |
| Decode failure (invalid HMAC) | [`FetchErrorPanel`](src/pages/ValidationPage.tsx:119) with error message |
| Wrong session | [`FetchErrorPanel`](src/pages/ValidationPage.tsx:108) with "This QR code belongs to a different session" |
| Confirm save failure | Caught in caller — surfaces via `validation.errorMessage` ([`line 23-29`](src/pages/ValidationPage.tsx:23)) |

---

### 1.4 [`NotFoundPage`](src/pages/NotFoundPage.tsx:4) — Catch-All Error Page

Rendered by React Router for unknown routes (catch-all `*` pattern) or as `errorElement` for unexpected errors. Detects whether the error is a 404 or a generic error via [`useRouteError()`](src/pages/NotFoundPage.tsx:7).

| State | Heading | Message |
|-------|---------|---------|
| 404 or no error | "Page not found" | "This URL doesn't exist in MesseBuddy." |
| Other error | "Something went wrong" | Error status text if available |

A single "Go home" button navigates to `/` via [`navigate("/")`](src/pages/NotFoundPage.tsx:58). No adapter calls or data fetching.

---

## 2. Admin ↔ Player Data Overlap Map

The following table maps every shared data type across admin and player views, with read/write permissions per role. See [Player View Analysis](docs/player-view-data.md) for the player-side details.

| Data Type | Admin Read | Admin Write | Player Read | Player Write | Shared Hook / Component |
|-----------|-----------|-------------|-------------|-------------|------------------------|
| [`Session`](src/types/domain.ts:19) | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✓ — `bgImageUrl`, `mapNodeScale`, `preBoardingChecks` via `updateSession` / `uploadBackground` / `updateMapNodeScale` | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✗ | [`useSession`](src/hooks/useSession.ts:26) |
| [`Milestone`](src/types/domain.ts:72) | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✓ — CRUD via [`useAdminMilestoneEditor`](src/hooks/useAdminMilestoneEditor.ts:48) | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✗ | [`useSession`](src/hooks/useSession.ts:26) |
| [`Mission`](src/types/domain.ts:81) | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✓ — CRUD via [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:71) | ✓ — via [`useSession`](src/hooks/useSession.ts:26) | ✗ | [`useSession`](src/hooks/useSession.ts:26) |
| [`Player`](src/types/domain.ts:36) | ✓ — via [`useProgressAdmin`](src/hooks/useProgress/admin.ts:10) | ✗ (profile fields admin-read only) | ✓ — via [`useActiveProfile`](src/hooks/useActiveProfile.ts:6) + `getPlayer` | ✓ — `updatePlayer` (profile mirror only) | Separate hooks |
| [`ProgressEvent`](src/types/domain.ts:102) | ✓ — via [`useProgressAdmin`](src/hooks/useProgress/admin.ts:10) | ✓ — approve/reject via `upsertProgressEvent` | ✓ — via [`useProgressPlayer`](src/hooks/useProgress/player.ts:1) | ✓ — self-approve, request approval, form submit | Same [`AppAdapter.upsertProgressEvent`](src/adapters/interface.ts:65) |
| [`BuddyProfile`](src/types/domain.ts:59) | ✓ — via [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:56) | ✓ — via hook's `upsertBuddy()` | ✓ — via [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:46) | ✗ | [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:46) |
| [`Resource`](src/types/domain.ts:112) | ✓ — via [`useResources`](src/hooks/useResources.ts:33) (admin mode) | ✓ — CRUD via hook | ✓ — via [`useResources`](src/hooks/useResources.ts:33) (player mode), filtered to `isVisibleToPlayer` | ✗ | [`useResources`](src/hooks/useResources.ts:33) |
| [`FormSchema`](src/types/domain.ts:97) | ✓ — via [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:71) | ✓ — via `upsertFormSchema` | ✓ — via inline `adapter.getFormSchema` ([`FormPage`](src/pages/FormPage.tsx:81)) | ✗ | Same adapter method |
| [`MilestoneProgress`](src/types/ephemeral.ts:20) | ✓ — computed via [`computeProgress`](src/use-cases/computeProgress.ts:1) in [`useProgressAdmin`](src/hooks/useProgress/admin.ts:94) | ✗ (derived) | ✓ — computed via [`computeProgress`](src/use-cases/computeProgress.ts:1) in [`useProgressPlayer`](src/hooks/useProgress/player.ts:1) | ✗ (derived) | [`computeProgress`](src/use-cases/computeProgress.ts:19) |
| [`PlayerProgress`](src/types/ephemeral.ts:29) | ✓ — same compute as above | ✗ (derived) | ✓ — same compute | ✗ (derived) | [`computeProgress`](src/use-cases/computeProgress.ts:19) |
| [`CachedIdentity`](src/types/value-objects.ts:38) | ✓ — via [`useActiveProfile`](src/hooks/useActiveProfile.ts:6) | ✓ — `removeProfile` on logout ([`line 268`](src/pages/AdminCockpitPage.tsx:268)) | ✓ — via [`useActiveProfile`](src/hooks/useActiveProfile.ts:6) | ✓ — via landing flow ([`useLandingFlow`](src/hooks/useLandingFlow.ts:78)) | [`useIdentity`](src/hooks/useIdentity.ts:41) |

---

## 3. Dynamic Data Categories

### A. Session-Level Configuration (Admin-Editable)

**Source:** [`useSession(sid, { role: "gamemaker" })`](src/pages/AdminCockpitPage.tsx:51) — overloaded hook that additionally returns `updateSession`, `uploadBackground`, `updateMapNodeScale` for gamemaker mode. Fetches via `adapter.getSession()` + `adapter.listMilestones()` + `adapter.listMissions()` in parallel ([`line 55-59`](src/hooks/useSession.ts:55)).

| Field | Editable? | How Admin Edits It |
|-------|-----------|-------------------|
| [`Session.name`](src/types/domain.ts:20) | No (display only) | Shown in TopBar as "Game Master" |
| [`Session.bgImageUrl`](src/types/domain.ts:21) | **Yes** | [`handleUploadBackground()`](src/pages/AdminCockpitPage.tsx:130) calls `uploadBackground(file)`, sets local `bgImageUrlOverride` to avoid re-fetching |
| [`Session.mapNodeScale`](src/types/domain.ts:30) | **Yes** | [`handleMapNodeScaleChange()`](src/pages/AdminCockpitPage.tsx:139) calls `updateMapNodeScale(scale)`, passed as prop to [`MilestoneMapEditor`](src/components/admin/MilestoneMapEditor.tsx:1) |
| [`Session.gameMakerId`](src/types/domain.ts:31) | No (display only) | Raw UID string stored at session creation |
| [`Session.qrSecret`](src/types/domain.ts:32) | No (display only) | HMAC key for QR signing ([C-16](SPECS.md:946)); GM verify only |
| [`Session.preBoardingChecks`](src/types/domain.ts:33) | **Yes** | Via [`usePreBoardingChecklist`](src/hooks/usePreBoardingChecklist.ts:18) — toggle, add, mark-all-done → `adapter.updateSession()` |

**Cross-reference:** Players read `name`, `bgImageUrl`, `mapNodeScale`, and `qrSecret` from the same session record (see [Player View §3.B](docs/player-view-data.md:196)).

---

### B. Milestones (Admin-Editable with Draft Pattern)

**Source:** Fetched once by [`useSession()`](src/hooks/useSession.ts:26) via `adapter.listMilestones(sessionId)`.

**Editing mechanism:** The [`useAdminMilestoneEditor`](src/hooks/useAdminMilestoneEditor.ts:48) hook implements a **seed-once draft pattern**:

- **Seed guard:** A [`seeded` ref](src/hooks/useAdminMilestoneEditor.ts:58) ensures server milestones are copied into `draftMilestones` only once ([`line 61-68`](src/hooks/useAdminMilestoneEditor.ts:61)).
- All edits (drag-drop repositioning, rename, add, delete, reset-to-grid) modify only the local `draftMilestones` array and set `isDirty: true` on the changed draft.
- **Reset to grid:** Calls [`gridPositions(N)`](src/utils/mapGrid.ts) to distribute milestones into a 4-column grid, marking all as dirty ([`line 111-121`](src/hooks/useAdminMilestoneEditor.ts:111)).
- The admin must explicitly call [`handleSave()`](src/pages/AdminCockpitPage.tsx:158), which calls `milestoneEditor.saveMilestones(sid, milestones)` — iterates over dirty drafts and calls `adapter.updateMilestone()` or `adapter.createMilestone()`.
- A "Discard" button ([`handleDiscard()`](src/pages/AdminCockpitPage.tsx:187)) resets using [`discardMilestones()`](src/hooks/useAdminMilestoneEditor.ts:156).

**Rendered on:** [`MilestoneMapEditor`](src/components/admin/MilestoneMapEditor.tsx:1) — drag-repositionable canvas nodes with pill-shaped mission count badges.

**Computed pattern — `draftMilestonesAsMilestones`:** The page transforms [`DraftMilestone`](src/types/ephemeral.ts:37) back into a [`Milestone`](src/types/domain.ts:72) shape for the map editor via [`useMemo`](src/pages/AdminCockpitPage.tsx:192):
```
draftMilestones.map(dm => {
  const real = milestones.find(m => m.id === dm.id);
  return { id, name, xPercent, yPercent, order, sessionId, xpThreshold, ... }
})
```
This allows [`MilestoneMapEditor`](src/components/admin/MilestoneMapEditor.tsx:1) (which expects `Milestone[]`) to consume draft state transparently.

**Computed pattern — `missionCounts` pills:** A separate [`useMemo`](src/pages/AdminCockpitPage.tsx:211) reduces missions to a `Record<string, number>` mapping `milestoneId → count`, rendered as numeric badges on milestone nodes.

**Cross-reference:** Players read milestones via the same [`useSession`](src/hooks/useSession.ts:26) hook but never edit them (see [Player View §3.C](docs/player-view-data.md:209)).

---

### C. Missions (Admin-Editable with Draft Pattern + Auto-Save)

**Source:** Fetched once by [`useSession()`](src/hooks/useSession.ts:26) via `adapter.listMissions(sessionId)`.

**Editing mechanism:** The [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:71) hook manages a more complex draft state:

- Missions are edited in the full-screen [`MissionBottomSheet`](src/components/admin/MissionBottomSheet.tsx:1), opened by clicking a milestone on the map.
- **Draft keying:** Drafts are keyed by local ID (not PB mission ID) to support both editing existing missions and creating new ones ([`line 69`](src/hooks/useAdminMissionEditor.ts:69)).
- Supports: title, body (markdown), type (`text`, `link`, `form`), difficulty (1–5), tags, suggested due date, validation method, form field schemas, and `isInCurrentMissions`.
- **XP preview:** [`xpPreview`](src/hooks/useAdminMissionEditor.ts:172) is computed live via [`deriveXP()`](src/use-cases/deriveXP.ts:1). It constructs a synthetic `Mission` from the draft, appends it to existing missions, and reads the last XP value from the Fibonacci sequence.
- **Reorder tracking:** `missionOrderChanges` Map tracks drag-reordered missions separately from content changes ([`line 81`](src/hooks/useAdminMissionEditor.ts:81)).
- **Dirty tracking:** [`draftMissionsAreDirty`](src/hooks/useAdminMissionEditor.ts:182) — true if any draft has `isDirty: true`.
- **Deletion tracking:** `deletedMissionIds` is a `Set` that accumulates IDs to delete on save ([`line 84`](src/hooks/useAdminMissionEditor.ts:84)).

**Draft auto-save (localStorage):** When editing a mission, the editor persists the draft to `localStorage` via [`saveStoredDraft()`](src/utils/draftStorage.ts:32) against the key `mb_draft_<sessionId>_<missionId>`. On re-entry:

1. [`loadStoredDraft()`](src/utils/draftStorage.ts:18) checks for a saved draft
2. If found, [`DraftRestoreBanner`](src/components/admin/DraftRestoreBanner.tsx:9) shows "Unsaved draft from {time}" with "Dismiss" and "Load draft" buttons
3. On `onLoad`, the draft is restored into the editor; on `onDismiss`, the storage entry is cleared via [`clearStoredDraft()`](src/utils/draftStorage.ts:52)

**Persisted data per [`StoredDraft`](src/utils/draftStorage.ts:5):**
| Field | Type | Description |
|-------|------|-------------|
| `draft` | [`DraftMission`](src/types/ephemeral.ts:47) | The in-progress mission draft |
| `missionId` | `string` | The mission ID this draft belongs to |
| `savedAt` | `string` (ISO) | Timestamp of last auto-save |

**Cross-reference:** Players read missions via the same [`useSession`](src/hooks/useSession.ts:26) hook but never edit them (see [Player View §3.D](docs/player-view-data.md:228)).

---

### D. Players & Progress Events (Dynamic, Player-Context Dependent)

**Source:** [`useProgressAdmin({sid, milestones, missions, validatorUid})`](src/hooks/useProgress/admin.ts:10). No `adapter` parameter — the hook uses `useAdapter()` internally. Returns a [`UseProgressAdminResult`](src/hooks/useProgress/types.ts:64) discriminated union.

| Data | How It Changes |
|------|---------------|
| **Player list** | Fetched on mount via `adapter.listPlayers(sid)` ([`line 44`](src/hooks/useProgress/admin.ts:44)) |
| **Auto-select first player** | On initial load, calls `handlePlayerSelect(players[0]!.id)` ([`line 69-71`](src/hooks/useProgress/admin.ts:69)) |
| **All progress events** | Fetched per-player via `Promise.all(players.map(p => adapter.listProgressEvents(p.id)))` ([`line 76-78`](src/hooks/useProgress/admin.ts:76)) |
| **Selected player** | Changes via dropdown in [`PlayerSelectorDropdown`](src/components/admin/PlayerSelectorDropdown.tsx:1) |
| **Player progress** | [`computeProgress(selectedPlayer.id, missions, milestones, playerEvents)`](src/hooks/useProgress/admin.ts:94) — re-derived at read time ([C-11](SPECS.md:946)) |
| **Pending approvals** | Filtered from all progress events where `status === "pendingApproval"` ([`line 107-109`](src/hooks/useProgress/admin.ts:107)) |

**Admin approve/reject actions:**

| Action | Adapter Call | Effect |
|--------|-------------|--------|
| **Approve** | `upsertProgressEvent(playerId, missionId, { status: "completed", validatedBy, validatedAt })` ([`line 111-124`](src/hooks/useProgress/admin.ts:111)) | Sets `completed`, refreshes events for that player |
| **Reject** | `upsertProgressEvent(playerId, missionId, { status: "pending" })` ([`line 129-140`](src/hooks/useProgress/admin.ts:129)) | Resets to pending state, refreshes events |

**Cross-reference:** Players read the same `ProgressEvent` records but can only write `autoApproved` or `pendingApproval` statuses (see [Player View §3.E](docs/player-view-data.md:261)).

---

### E. Pending Approvals (Approve/Reject)

**Rendered in:** [`PendingApprovalsPanel`](src/components/admin/PendingApprovalsPanel.tsx:13) — shows each pending event with player name, mission title, XP value, and approve/reject buttons. Each card is rendered by [`ApprovalRequestCard`](src/components/admin/ApprovalRequestCard.tsx:10).

**Derivation:** `pendingEvents` is a filtered view of `allProgressEvents` ([`line 107-109`](src/hooks/useProgress/admin.ts:107)) — no separate fetch. The filter uses `status === "pendingApproval"`.

**Mock adapter simulation:** In the mock adapter, `pendingApproval` events auto-transition to `completed` after 4 seconds via [`simulateGmApproval()`](src/adapters/mock/mockAdapter.ts:101). The admin UID used for simulated approvals is set via [`setMockAdminUid(uid)`](src/adapters/mock/mockAdapter.ts:95), called from [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:44). In production, the admin must explicitly approve or reject.

---

### F. Buddy Assignment (Player-Context Dependent)

**Source:** Managed by the [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:46) hook with `{ role: "gamemaker" }` — returns a [`UseBuddyProfileAdminResult`](src/hooks/useBuddyProfile.ts:23) with `buddyDraft`, `savedBuddy`, `setBuddyDraft`, `upsertBuddy`, `loading`, `error`, `refresh`.

Called from [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:86-88):
```typescript
const buddyProfile = useBuddyProfile(sid, adminProgress.selectedPlayerId, {
  role: "gamemaker",
});
```

**Editable fields:** `name`, `role`, `tenure`, `contactUrl` — all managed via `setBuddyDraft()` on the hook's returned `buddyDraft` state.

**Save action:** Calls `buddyProfile.upsertBuddy()` ([`line 125`](src/pages/AdminCockpitPage.tsx:125)) which internally calls `adapter.upsertBuddyProfile(selectedPlayerId, buddyDraft)`, then shows a "Buddy assigned" toast.

**Cross-reference:** Players read buddy profiles via [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:46) with `{ role: "player" }` but never edit them (see [Player View §3.F](docs/player-view-data.md:308)).

---

### G. Resources (Admin-Owned Full CRUD)

**Source:** Managed by the overloaded [`useResources`](src/hooks/useResources.ts:33) hook with `{ role: "gamemaker" }` — returns a [`UseResourcesAdminResult`](src/hooks/useResources.ts:13) with `resources`, `addResource`, `deleteResource`, `toggleVisibility`, `loading`, `error`, `refresh`.

Called from [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:90):
```typescript
const adminResources = useResources(sid, { role: "gamemaker" });
```

**Operations:**

| Operation | Adapter Call | Notes |
|-----------|-------------|-------|
| Add | [`adminResources.addResource(data)`](src/hooks/useResources.ts) | Form with title, type (`guide`/`video`/`link`/`document`), URL |
| Delete | [`adminResources.deleteResource(resourceId)`](src/hooks/useResources.ts) | Removed from list and PB |
| Toggle visibility | [`adminResources.toggleVisibility(resourceId, visible)`](src/hooks/useResources.ts) | Checkbox toggle per resource |

**Cross-reference:** Players read the same resources but only those with `isVisibleToPlayer: true` via [`useResources`](src/hooks/useResources.ts:33) with `{ role: "player" }` (see [Player View §3.G](docs/player-view-data.md:318)).

---

### H. Pre-Boarding Checklist (Tab-Specific, Session-Level)

**Source:** [`usePreBoardingChecklist(sid, session)`](src/hooks/usePreBoardingChecklist.ts:18). No `adapter` parameter — the hook uses `useAdapter()` internally.

**Seed mechanism:** On first load, when `session` changes reference, the hook copies `session.preBoardingChecks` into local `items` state ([`line 26-31`](src/hooks/usePreBoardingChecklist.ts:26)).

**Editable operations — all mutate local state then immediately call `adapter.updateSession()`:**

| Operation | Action |
|-----------|--------|
| **Toggle item** | `onToggle(id)` — flips `checked`, persists next array via `adapter.updateSession(sid, { preBoardingChecks: next })` ([`line 33-43`](src/hooks/usePreBoardingChecklist.ts:33)) |
| **Add item** | `onAdd(label)` — creates new [`PreBoardingCheckItem`](src/types/ephemeral.ts:11) with generated UUID, appends to array, persists ([`line 46-59`](src/hooks/usePreBoardingChecklist.ts:46)) |
| **Mark all done** | `onMarkAllDone()` — sets all items to `checked: true`, persists ([`line 62-68`](src/hooks/usePreBoardingChecklist.ts:62)) |

**Rendered in:** [`PreBoardingChecklist`](src/components/admin/PreBoardingChecklist.tsx:1) — only visible when the "Pre-Boarding Checklist" tab is active ([`line 427`](src/pages/AdminCockpitPage.tsx:427)). Players have no access to this tab.

---

### I. Cross-Hire / All New Hires (Cross-Session Data)

**Source:** [`useProgressCrossHire({ active })`](src/hooks/useProgress/crossHire.ts:10) — fetches **all sessions**, then for each session, all players, milestones, missions, and progress events. No `adapter` parameter — uses `useAdapter()` internally.

**Activation guard:** The hook only runs when `active` is `true` ([`line 23`](src/hooks/useProgress/crossHire.ts:23)), i.e. the "All New Hires" tab is selected ([`line 94-96`](src/pages/AdminCockpitPage.tsx:94)). This prevents expensive cross-session queries on initial mount.

**Cancellation pattern:** Uses a `cancelled` boolean flag checked between every async call ([`line 24, 31, 36, 44, 47`](src/hooks/useProgress/crossHire.ts:24)).

**Computed per hire row ([`line 57-85`](src/hooks/useProgress/crossHire.ts:57)):**

| Field | Derivation |
|-------|-----------|
| `progressPercent` | Average of `milestoneProgress.percentComplete` values across all milestones, rounded |
| `daysSinceLastActivity` | `Math.floor((now - max(event.updated)) / msPerDay)` |
| `isStalled` | `true` if `daysSinceLastActivity > 3` |

**Rendered in:** [`CrossHireDashboard`](src/components/admin/CrossHireDashboard.tsx:39) — summary stats (active hires, average progress, stalled count), filterable list with status badges and progress bars.

---

### J. Template Library (Admin-Owned Export/Import)

**Source:** [`useTemplateLibrary({sid, active, session, milestones, missions, resources, gmUid})`](src/hooks/useTemplateLibrary.ts:41). No `adapter` parameter — uses `useAdapter()` internally.

**Activation guard:** Only fetches `adapter.listTemplates()` when the Active Session tab is active ([`line 58-60`](src/hooks/useTemplateLibrary.ts:58)).

**Operations:**

| Operation | Adapter / Action | Details |
|-----------|-----------------|---------|
| **Save as template** | [`exportTemplate()`](src/use-cases/exportTemplate.ts:27) → `adapter.saveTemplate()` → JSON download | Exports milestones, missions (with `_milestoneOrder` keys), formSchemas (with `_missionOrder` keys), and resources — all with PBRecord IDs stripped. Saves to adapter store + downloads as `.json` file ([`line 64-113`](src/hooks/useTemplateLibrary.ts:64)). |
| **Load template** | [`bootstrapFromTemplate()`](src/use-cases/bootstrapFromTemplate.ts:1) → `adapter` batch | Bootstraps a new session from the template, navigates to `/admin/<newSessionId>` ([`line 115-126`](src/hooks/useTemplateLibrary.ts:115)). |
| **Delete template** | `adapter.deleteTemplate(name)` | Removes from adapter store, updates local `templates` state ([`line 128-134`](src/hooks/useTemplateLibrary.ts:128)). |

**Rendered in:** [`TemplateLibrary`](src/components/shared/TemplateLibrary.tsx:1) component + [`SaveTemplateModal`](src/components/admin/SaveTemplateModal.tsx:1). Template data is transformed via [`toTemplateSummaries()`](src/utils/templateSummary.ts:10) to produce [`TemplateSummary`](src/utils/templateSummary.ts:3) objects (id, name, milestoneCount, missionCount) for the list UI.

**Replace target logic:** When `handleExportTemplate(replaceTarget)` is called with a string, it overwrites the existing template of that name instead of creating a new one ([`line 81`](src/hooks/useTemplateLibrary.ts:81)).

---

### K. QR Scanner (Modal + Standalone Page)

There are **two scanner entry points** that both lead to [`ValidationPage`](src/pages/ValidationPage.tsx:9), plus a **simulate path**:

| Entry Point | Component | Route / State | Behavior |
|-------------|-----------|---------------|----------|
| **In-page modal** | [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:20) | Controlled by `scannerOpen` state ([`line 68`](src/pages/AdminCockpitPage.tsx:68)), toggled from map editor "Scan" button | Full-screen modal overlay. On decode, closes modal → navigates to ValidationPage. Uses [`useQRScanContext`](src/hooks/useQRScanContext.ts:17) for data fetching and `buildSimulateScanUrl()`. |
| **Standalone page** | [`QRScannerView`](src/pages/QRScannerView.tsx:15) | `/admin/:sessionId/scan` | Full-page scanner. On decode, navigates to ValidationPage. |
| **Simulate scan** | Inside [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:56) | "Simulate Scan" button in dev | Generates a QR payload for the first player + first QR mission via `scanContext.buildSimulateScanUrl()`, builds URL, feeds to `handleDecode`. |

**QR decode flow (both paths):**

```mermaid
sequenceDiagram
    participant Scanner as AdminQRScannerModal / QRScannerView
    participant Feed as CameraFeed
    participant QR as qrPayload.ts + qrUrl.ts
    participant VP as ValidationPage

    Scanner->>Feed: start camera
    Feed-->>Scanner: scanned: string (URL)
    Scanner->>QR: parseValidationToken(scanned)
    QR-->>Scanner: { sessionId, token } | null

    alt Invalid QR
        Scanner->>Scanner: show ValidationResult(state=invalid)
    else Valid QR
        Scanner->>VP: navigate(validationPathFromToken(sessionId, token))
        VP->>VP: decodeQRPayload(token, session.qrSecret)
        VP->>VP: verify payload.sessionId === route sessionId
        VP->>Adapter: getPlayerById(payload.playerId)
        VP->>Adapter: listProgressEvents(payload.playerId)
        VP-->>VP: render confirmation card
        VP->>Adapter: upsertProgressEvent(status: "completed")
        VP->>AdminCockpitPage: navigate(replace)
    end
```

**Camera lifecycle:** The modal uses `requestAnimationFrame` to delay camera start until after the modal is painted, avoiding `getUserMedia` race conditions ([`line 76-80`](src/components/admin/AdminQRScannerModal.tsx:76)).

---

### L. Session Invite / QR Code (Static but Dynamic by Session)

**Source:** Derived from `sessionId` prop — no adapter call needed.

**Computed value:** `joinUrl = \`${location.origin}/join/${sessionId}\`` ([`line 50`](src/components/admin/SessionInviteCard.tsx:50)).

**QR rendering:** Uses an imported [`renderQRCode()`](src/components/admin/SessionInviteCard.tsx:58) function to render into a container div. Cleanup clears the container on unmount ([`line 53-59`](src/components/admin/SessionInviteCard.tsx:53)).

**Copy URL:** Uses `navigator.clipboard.writeText()` with a `document.execCommand('copy')` fallback. Shows a brief "Copied" state with a green checkmark icon for 2 seconds ([`line 61-76`](src/components/admin/SessionInviteCard.tsx:61)).

**Rendered in:** [`SessionInviteCard`](src/components/admin/SessionInviteCard.tsx:46) — topmost sidebar component in the Active Session tab.

---

### M. Session Toolbar & Logout Flow

**Rendered:** A toolbar below the TopBar showing a back button ([`line 256-276`](src/pages/AdminCockpitPage.tsx:256)).

**Two modes:**

| Mode | Label | Action |
|------|-------|--------|
| Demo session (`identity.isDemo`) | "Back to Landing" | `navigate("/")` — no profile removal |
| Real session | "Log Out" | `removeProfile(identity.uid)` ([`line 268`](src/pages/AdminCockpitPage.tsx:268)) + `navigate("/")` |

The `removeProfile` call removes the identity from `localStorage`, effectively logging out. After logout, the player returns to the landing page with no active identity for that session.

---

## 4. Data Flow Architecture

### 4.1 AdminCockpitPage Hook Hierarchy

```mermaid
graph TB
    subgraph AdminCockpitPage[src/pages/AdminCockpitPage.tsx]
        direction LR
        
        subgraph Identity["Identity Layer"]
            I1[useActiveProfile(sid, GAMEMAKER)]
            I2[identity -> validatorUid]
        end
        
        subgraph SessionLayer["Session Data Layer"]
            S1[useSession(sid, { role: 'gamemaker' })]
            S2[session, milestones[], missions[]]
            S3[uploadBackground / updateMapNodeScale]
            S4[refresh: () => void]
        end
        
        subgraph MilestoneEditor["Milestone Editor"]
            M1[useAdminMilestoneEditor(milestones)]
            M2[draftMilestones[] + dirty tracking]
            M3[saveMilestones / discardMilestones]
        end
        
        subgraph MissionEditor["Mission Editor"]
            Mi1[useAdminMissionEditor(missions)]
            Mi2[draftMissions Map + orderChanges + deletedIds]
            Mi3[xpPreview via deriveXP()]
            Mi4[saveMissions / discardMissions]
            Mi5[draftRestore: localStorage auto-save]
        end
        
        subgraph PlayerLayer["Player Data Layer"]
            P1[useProgressAdmin({sid, milestones, missions, validatorUid})]
            P2[players[], selectedPlayerId]
            P3[selectedPlayerProgress via computeProgress()]
            P4[pendingEvents[] filtered from all progress events]
            P5[handleApprove / handleReject]
        end
        
        subgraph PreBoarding["Pre-Boarding Checklist"]
            PB1[usePreBoardingChecklist(sid, session)]
            PB2[items[], onToggle(), onAdd(), onMarkAllDone()]
        end
        
        subgraph CrossHire["Cross-Hire Data"]
            CH1[useProgressCrossHire({ active: tab === ALL_NEW })]
            CH2[rows[] — cross-session progress data]
            CH3[cancelled flag per row]
        end
        
        subgraph TemplateLibrary["Template Library"]
            TL1[useTemplateLibrary({sid, session, milestones, missions, resources, gmUid})]
            TL2[templates[], handleLoadTemplate(), handleExportTemplate(), handleDeleteTemplate()]
        end

        subgraph Buddy["Buddy Assignment"]
            BP[useBuddyProfile(sid, selectedPlayerId, { role: 'gamemaker' })]
            BD[buddyDraft + upsertBuddy()]
        end

        subgraph Resources["Resources"]
            RS[useResources(sid, { role: 'gamemaker' })]
            RC[addResource / deleteResource / toggleVisibility]
        end
    end
    
    I1 --> I2
    S1 --> S2
    S1 --> S3
    S1 --> S4
    M1 --> M2
    Mi1 --> Mi2
    P1 --> P2
    P1 --> P3
    P1 --> P4
    PB1 --> PB2
    CH1 --> CH2
    TL1 --> TL2
    
    style AdminCockpitPage fill:#e8f0fe,stroke:#1a73e8
```

### 4.2 Full Hook Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    participant Page as AdminCockpitPage
    participant Session as useSession(sid, gamemaker)
    participant Milestones as useAdminMilestoneEditor()
    participant Missions as useAdminMissionEditor()
    participant Players as useProgressAdmin()
    participant CrossHire as useProgressCrossHire()
    participant Toast as Toast component
    participant Adapter as AppAdapter
    
    Page->>Session: mount (sid provided)
    Session->>Adapter: getSession(sessionId) + listMilestones(sid) + listMissions(sid)
    Adapter-->>Session: session, milestones[], missions[]
    Session-->>Page: {session, milestones, missions}
    
    Page->>Milestones: mount with milestones[]
    Note over Milestones: seeded.current = false → seed once
    Milestones->>Milestones: copy to draftMilestones[]
    
    Page->>Missions: mount with missions[]
    
    Page->>Players: mount
    Players->>Adapter: listPlayers(sid)
    Adapter-->>Players: players[]
    Players->>Players: auto-select first player
    
    loop for each player
        Players->>Adapter: listProgressEvents(playerId)
        Adapter-->>Players: progressEvents[]
    end
    
    Note over Page,Adapter: User selects "All New Hires" tab
    Page->>CrossHire: active=true
    CrossHire->>Adapter: listSessions()
    Adapter-->>CrossHire: sessions[]
    
    loop for each session
        CrossHire->>Adapter: listPlayers(sid) + listMilestones(sid) + listMissions(sid)
        loop for each player
            CrossHire->>Adapter: listProgressEvents(playerId)
        end
        CrossHire->>CrossHire: compute derived fields
    end
    CrossHire-->>Page: rows[]
    
    Note over Page,Adapter: User drags milestone on map
    Milestones->>Milestones: update draftMilestones[x].isDirty = true
    Milestones-->>Page: draftMilestonesAreDirty = true
    
    Note over Page,Adapter: User saves
    Page->>Milestones: saveMilestones(sid, adapter, milestones)
    Milestones->>Adapter: updateMilestone / createMilestone (per dirty draft)
    
    Page->>Missions: saveMissions(sid, adapter, missions, xpPreview)
    Missions->>Adapter: updateMission / createMission / deleteMission
    
    Page->>Toast: showToast("All changes saved")
    Toast->>Toast: clear after 3s timeout
```

### 4.3 QR Validation Flow (2 Paths → ValidationPage)

There are exactly two scanner entry points and one simulate path, all converging on [`ValidationPage`](src/pages/ValidationPage.tsx:9):

```mermaid
graph TD
    subgraph AdminCockpit["AdminCockpitPage (/admin/:sid)"]
        SCAN_BTN["Scan button on map toolbar"]
    end

    subgraph QRScannerView["QRScannerView (/admin/:sid/scan)"]
        FULL_PAGE["Standalone full-page scanner"]
    end

    subgraph AdminQRScannerModal["AdminQRScannerModal (modal overlay)"]
        MODAL["Modal scanner with camera"]
        SIMULATE["Simulate Scan button (dev)"]
    end

    subgraph ValidationPage["ValidationPage (/validate/:sid?t=)"]
        DECODE["decodeQRPayload(token, secret)"]
        VERIFY["verify payload.sessionId === sid"]
        LOOKUP["getPlayerById + listProgressEvents"]
        CONFIRM["upsertProgressEvent(status: completed)"]
    end

    SCAN_BTN -->|setScannerOpen(true)| MODAL
    FULL_PAGE -->|navigate on decode| ValidationPage
    MODAL -->|navigate on decode| ValidationPage
    SIMULATE -->|generate fake QR → handleDecode| MODAL
    DECODE --> VERIFY
    VERIFY --> LOOKUP
    LOOKUP --> CONFIRM
    CONFIRM -->|navigate replace| AdminCockpit
```

### 4.4 Draft Save/Discard Flow

```mermaid
sequenceDiagram
    participant Admin as AdminCockpitPage
    participant MilestoneEditor as useAdminMilestoneEditor
    participant MissionEditor as useAdminMissionEditor
    participant Storage as localStorage (draftStorage)
    participant Adapter as AppAdapter

    Note over Admin,Adapter: Initial load
    MilestoneEditor->>MilestoneEditor: seed from server milestones (once via ref)
    MissionEditor->>MissionEditor: seed from server missions (on select)

    Note over Admin,Adapter: Editing in MissionBottomSheet
    MissionEditor->>MissionEditor: handleDraftChange → mark isDirty
    MissionEditor->>Storage: saveStoredDraft(sessionId, missionId, draft)
    
    Note over Admin,Adapter: On page re-entry
    Storage-->>DraftRestoreBanner: loadStoredDraft()
    DraftRestoreBanner-->>Admin: "Unsaved draft from {time}"
    Admin->>MissionEditor: onLoad → restore draft
    Admin->>Storage: onDismiss → clearStoredDraft()

    Note over Admin,Adapter: User clicks Save
    Admin->>Admin: isDirty = milestones OR missions OR orderChanges dirty
    Admin->>MilestoneEditor: saveMilestones(sid, milestones)
    MilestoneEditor->>Adapter: for each dirty draft → updateMilestone or createMilestone
    Admin->>MissionEditor: saveMissions(sid, missions, xpPreview)
    MissionEditor->>Adapter: for each dirty draft → updateMission or createMission
    MissionEditor->>Adapter: for each deletedMissionId → deleteMission
    MissionEditor->>Adapter: for each orderChange → updateMission(order)
    MissionEditor->>Adapter: upsertFormSchema for FORM-type missions
    MilestoneEditor->>MilestoneEditor: clearDirtyMilestones()
    MissionEditor->>MissionEditor: clearDirtyMissions() + clearOrderChanges()
    Admin->>Admin: showToast("All changes saved")

    Note over Admin,Adapter: User clicks Discard
    Admin->>MilestoneEditor: discardMilestones(milestones)
    MilestoneEditor->>MilestoneEditor: reset drafts to server state
    Admin->>MissionEditor: discardMissions()
    MissionEditor->>MissionEditor: reset drafts
```

### 4.5 Approve/Reject Flow

```mermaid
sequenceDiagram
    participant Panel as PendingApprovalsPanel
    participant Players as useProgressAdmin
    participant Adapter as AppAdapter

    Panel->>Players: get pendingEvents (all with status=pendingApproval)
    
    Note over Panel,Adapter: Admin clicks Approve
    Panel->>Players: handleApprove(playerId, missionId)
    Players->>Adapter: upsertProgressEvent(playerId, missionId, { status: "completed", validatedBy, validatedAt })
    Adapter-->>Players: ProgressEvent
    Players->>Adapter: listProgressEvents(playerId) — re-fetch
    Adapter-->>Players: updated events[]
    Players->>Players: merge into allProgressEvents
    Players-->>Panel: pendingEvents updates reactively

    Note over Panel,Adapter: Admin clicks Reject
    Panel->>Players: handleReject(playerId, missionId)
    Players->>Adapter: upsertProgressEvent(playerId, missionId, { status: "pending" })
    Adapter-->>Players: ProgressEvent
    Players->>Adapter: listProgressEvents(playerId) — re-fetch
    Players->>Players: merge into allProgressEvents
```

---

## 5. Error Handling & Refresh Patterns

### 5.1 Per-Section Refresh Mechanics

| Section | Refresh Mechanism | Trigger |
|---------|------------------|---------|
| **Session/milestones/missions** ([`useSession`](src/hooks/useSession.ts:26)) | `refreshKey` counter state — increments → re-runs `useEffect` ([`line 46`](src/hooks/useSession.ts:46)) | Called as `refresh()` from [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:170) save, or from [`ValidationPage`](src/pages/ValidationPage.tsx) retry |
| **Players & progress** ([`useProgressAdmin`](src/hooks/useProgress/admin.ts:10)) | `refreshKey` counter — re-fetches player list and all progress events ([`line 30-58`](src/hooks/useProgress/admin.ts:30)). After approve/reject, re-fetches that player's events and merges ([`line 118-122`](src/hooks/useProgress/admin.ts:118), [`line 134-138`](src/hooks/useProgress/admin.ts:134)). | `refresh()` call or manual approve/reject |
| **Cross-hire data** ([`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:10)) | Full re-fetch when `active` toggles or `refreshKey` increments ([`line 22-100`](src/hooks/useProgress/crossHire.ts:22)). | Tab switch or manual `refresh()` |
| **Resources** ([`useResources`](src/hooks/useResources.ts:33)) | Fetched on mount. After CRUD: optimistically update local state via `.then()` ([`line 53-70`](src/hooks/useResources.ts:53)). | Mount or `refresh()` |
| **Templates** ([`useTemplateLibrary`](src/hooks/useTemplateLibrary.ts:41)) | Fetched every time `active` becomes true (tab switch) ([`line 58-60`](src/hooks/useTemplateLibrary.ts:58)). | Tab activation |
| **Buddy profile** ([`useBuddyProfile`](src/hooks/useBuddyProfile.ts:46)) | Loaded on mount of the hook; refreshes when `refreshKey` increments. Also provides `refresh()` ([`line 1-60`](src/hooks/useBuddyProfile.ts)). | Player dropdown change (via React re-render with new `playerId`) |
| **Pre-boarding checklist** ([`usePreBoardingChecklist`](src/hooks/usePreBoardingChecklist.ts:18)) | Seeded from `session.preBoardingChecks` on session reference change ([`line 26-31`](src/hooks/usePreBoardingChecklist.ts:26)). Mutations update local state + persist immediately. | Session reference change |

### 5.2 Error Handling Strategies

The admin view uses four distinct error handling strategies:

| Strategy | Where Used | Pattern |
|----------|-----------|---------|
| **Full-page error panel** ([`FetchErrorPanel`](src/components/shared/FetchErrorPanel.tsx:15)) | [`ValidationPage`](src/pages/ValidationPage.tsx:32) (missing token), [`ValidationPage`](src/pages/ValidationPage.tsx:108) (wrong session), [`ValidationPage`](src/pages/ValidationPage.tsx:119) (decode error) | Renders a centered error message with "Try again" (calls `retry()`) and optional "Go back" button. Uses `data-testid` and `data-page` attributes for testing. |
| **Inline error text** | [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:24) (camera error, invalid QR) | State variables (`errorMessage`) set on failure, rendered inline in the component body. |
| **Session error → redirect** | [`AdminCockpitPage`](src/pages/AdminCockpitPage.tsx:220) | If `sessionError` is set and not loading, writes to `sessionStorage` and redirects to landing page (`navigate("/", { replace: true })`). Renders `null` to prevent flash ([`line 227`](src/pages/AdminCockpitPage.tsx:227)). |
| **Toast notification** ([`Toast`](src/components/shared/Toast.tsx:23)) | Save success/failure ([`line 171`](src/pages/AdminCockpitPage.tsx:171)) | Fixed-position bottom-center notification. `isError` prop controls text color (red for errors, green for success). Auto-clears after 3 seconds via `setTimeout` ([`line 119`](src/pages/AdminCockpitPage.tsx:119)). |

### 5.3 Toast Notification Patterns

**Pattern used throughout the admin view:**

```
showToast("All changes saved")       // success — green text
showToast("Save failed")             // error — red text (isError: true)
showToast("Buddy assigned")          // success — green text
```

**Implementation** ([`line 118-121`](src/pages/AdminCockpitPage.tsx:118)):

```typescript
const showToast = useCallback((msg: string) => {
  setSaveToast(msg);
  setTimeout(() => setSaveToast(null), 3000);  // auto-clear after 3s
}, []);
```

The [`Toast`](src/components/shared/Toast.tsx:23) component renders a fixed-position `<div>` at `bottom: var(--space-6)` with `z-index: 2000`. It is purely visual — the parent manages the message state and timeout lifecycle.

---

## 6. Key Type Definitions Referenced

### 6.1 Domain Types (persisted in PocketBase)

| Type | File | Line | Description | Admin Usage |
|------|------|------|-------------|-------------|
| [`Session`](src/types/domain.ts:19) | `domain.ts` | 19 | Session config with `name`, `bgImageUrl`, `mapNodeScale`, `gameMakerId`, `qrSecret`, `preBoardingChecks` | Read via `useSession`, write `bgImageUrl`, `mapNodeScale`, and `preBoardingChecks` via gamemaker-mode returned methods |
| [`Player`](src/types/domain.ts:36) | `domain.ts` | 36 | Player profile with `uid`, `recoveryKey`, `name`, `role`, `team`, `startDate`, profile fields | Read via `useProgressAdmin` → `adapter.listPlayers()`. Admin does **not** write player profiles. |
| [`BuddyProfile`](src/types/domain.ts:59) | `domain.ts` | 59 | Buddy assignment with `name`, `role`, `tenure`, `avatarUrl`, `contactUrl`, `quote`, `email`, `phone` | Read/write via `useBuddyProfile` with `{ role: "gamemaker" }` |
| [`Milestone`](src/types/domain.ts:72) | `domain.ts` | 72 | Milestone node with `xPercent`, `yPercent`, `xpThreshold`, `order` | CRUD via `useAdminMilestoneEditor` |
| [`Mission`](src/types/domain.ts:81) | `domain.ts` | 81 | Mission with `title`, `body`, `type`, `externalUrl`, `difficulty`, `xpValue`, `tags`, `order`, `isInCurrentMissions`, `validationMethod` | CRUD via `useAdminMissionEditor` |
| [`ProgressEvent`](src/types/domain.ts:102) | `domain.ts` | 102 | Progress with `status`, `validatedBy`, `validatedAt`, `formResponse` | Read for pending approvals + progress compute; write for approve/reject |
| [`Resource`](src/types/domain.ts:112) | `domain.ts` | 112 | Resource with `title`, `description`, `type`, `url`, `isVisibleToPlayer` | Full CRUD via `useResources` with `{ role: "gamemaker" }` |
| [`FormSchema`](src/types/domain.ts:97) | `domain.ts` | 97 | `fields` array of [`FieldSchema`](src/types/value-objects.ts:5) | Read/write via `useAdminMissionEditor` → `adapter.upsertFormSchema` |
| [`PBRecord`](src/types/domain.ts:13) | `domain.ts` | 13 | Base: `id`, `created`, `updated` | Used as base interface for all persisted types |
| [`FormSchemaRaw`](src/types/domain.ts:123) | `domain.ts` | 123 | Adapter-boundary type: `fields` is a JSON string, not an array | Used **only** inside `src/adapters/pocketbase/` — never imported by components ([C-13](SPECS.md:946)) |
| [`ProgressEventRaw`](src/types/domain.ts:128) | `domain.ts` | 128 | Adapter-boundary type: `formResponse` is a JSON string | Used only inside PocketBase adapter |
| [`SessionRole`](src/types/domain.ts:138) | `domain.ts` | 138 | Role record: `userId`, `sessionId`, `role`, `joinedAt` | Defined but **not yet used** in admin flows — reserved for future auth |

### 6.2 Value Objects (client-only, not persisted)

| Type | File | Line | Description | Admin Usage |
|------|------|------|-------------|-------------|
| [`FieldSchema`](src/types/value-objects.ts:5) | `value-objects.ts` | 5 | Form field with `id`, `label`, `type`, `required`, `placeholder`, `options` | Used in `FormEditor` for building form mission schemas |
| [`QRPayload`](src/types/value-objects.ts:17) | `value-objects.ts` | 17 | QR payload with `playerId`, `missionId`, `sessionId`, `xpValue`, `issuedAt`, `hmac` (HMAC-SHA256) | Decoded by `useValidationConfirm` after scan |
| [`ScanData`](src/types/value-objects.ts:27) | `value-objects.ts` | 27 | Decoded scan data enriched with `playerName`, `missionTitle` | Used by `AdminQRScannerModal` result display |
| [`CachedIdentity`](src/types/value-objects.ts:38) | `value-objects.ts` | 38 | `localStorage` identity: `uid`, `recoveryKey`, `sessionId`, `role`, `name`, `isDemo` | Read by `useActiveProfile`; `role` determines routing; `isDemo` controls logout behavior |

### 6.3 Derived Types (computed at read time per [C-11](SPECS.md:946))

| Type | File | Line | Description | Admin Usage |
[`MilestoneProgress`](src/types/ephemeral.ts:20) | `ephemeral.ts` | 20 | Per-milestone: `earnedXP`, `xpThreshold`, `percentComplete`, `status`, `completedMissionIds` | Displayed in `PlayerProfileCard` progress bars |
[`PlayerProgress`](src/types/ephemeral.ts:29) | `ephemeral.ts` | 29 | Player-level: `totalXP`, `milestoneProgress[]`, `completedMissionIds[]` | `totalXP` shown in `PlayerProfileCard` |

### 6.4 Draft Types (in-progress edits)

| Type | File | Line | Description | Admin Usage |
|------|------|------|-------------|-------------|
[`DraftMilestone`](src/types/ephemeral.ts:37) | `ephemeral.ts` | 37 | In-progress milestone: `id`, `name`, `xPercent`, `yPercent`, `bgImageUrl?`, `isDirty` | Managed by `useAdminMilestoneEditor` |
[`DraftMission`](src/types/ephemeral.ts:47) | `ephemeral.ts` | 47 | In-progress mission: `milestoneId`, `originalId?`, `isDirty`, `title?`, `body?`, `type?`, `difficulty?`, `xpValue?`, `tags?`, `validationMethod?`, `formFields?` | Managed by `useAdminMissionEditor`; persisted to `localStorage` via `draftStorage.ts` |
[`PreBoardingCheckItem`](src/types/ephemeral.ts:11) | `ephemeral.ts` | 11 | Checklist item: `id`, `label`, `checked`, `dueDate?` | Managed by `usePreBoardingChecklist`; stored on `Session.preBoardingChecks` |

### 6.5 Export Types

| Type | File | Line | Description | Admin Usage |
|------|------|------|-------------|-------------|
[`TemplateExport`](src/types/exports.ts:18) | `exports.ts` | 18 | Template structure: milestones, missions (with `_milestoneOrder`), formSchemas (with `_missionOrder`), resources — all PBRecord IDs stripped | Saved/loaded via `useTemplateLibrary` |
[`FullSessionExport`](src/types/exports.ts:33) | `exports.ts` | 33 | Full backup: session, milestones, missions, formSchemas, resources, **players**, **progressEvents**, **buddyProfiles** | Defined but **not yet used** in admin UI — reserved for future full-session backup |
[`TemplateRecord`](src/types/ephemeral.ts:67) | `ephemeral.ts` | 67 | Alias of `TemplateExport` without the `exportType` discriminant | Used in template list renders |

### 6.6 Union Types (const + keyof pattern per [C-12](SPECS.md:946))

| Type | File | Line | Values | Admin Relevance |
|------|------|------|--------|-----------------|
[`MISSION_TYPE`](src/types/unions.ts:4) | `unions.ts` | 4 | `text`, `link`, `form` | Rendered by `MissionTypeSelector` — determines which editor fields to show |
[`VALIDATION_METHOD`](src/types/unions.ts:19) | `unions.ts` | 19 | `gmApprove`, `selfApprove`, `qr` | Selected by `ValidationMethodSelector` — controls player validation flow |
[`PROGRESS_STATUS`](src/types/unions.ts:27) | `unions.ts` | 27 | `pending`, `pendingApproval`, `completed`, `autoApproved` | Filters `pendingApproval` for the pending approvals panel |
[`MILESTONE_STATUS`](src/types/unions.ts:36) | `unions.ts` | 36 | `upcoming`, `inProgress`, `completed` | Used in `PlayerProfileCard` for milestone progress visualization |
[`RESOURCE_TYPE`](src/types/unions.ts:44) | `unions.ts` | 44 | `guide`, `video`, `link`, `document` | Selected in `ResourcesEditor` add form |
[`FIELD_TYPE`](src/types/unions.ts:52) | `unions.ts` | 52 | `text`, `textarea`, `select`, `multiSelect` | Used in `FormFieldEditor` for form mission field types |
[`USER_ROLE`](src/types/unions.ts:60) | `unions.ts` | 60 | `player`, `gamemaker` | Used by `SessionRole` type and `RequireRole` guard; determines landing page routing |

---

## 7. Adapter Interface Summary

The [`AppAdapter`](src/adapters/interface.ts:18) defines the single contract for all data access. The admin page uses these adapter methods:

| Method | Purpose | Called By |
|--------|---------|-----------|
`getSession(sessionId)` | Fetch session config | [`useSession`](src/hooks/useSession.ts:55), [`useQRScanContext`](src/hooks/useQRScanContext.ts:42) |
`listSessions()` | All sessions (for cross-hire view) | [`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:30) |
`createSession(name, uid)` | Create new session from landing page | [`useLandingFlow`](src/hooks/useLandingFlow.ts:82) |
`updateSession(sid, patch)` | Update session fields (bgImageUrl, mapNodeScale, preBoardingChecks) | [`useSession`](src/hooks/useSession.ts:84), [`usePreBoardingChecklist`](src/hooks/usePreBoardingChecklist.ts:39) |
`getPlayer(uid)` | Resolve player by UID | Used by player view only |
`getPlayerById(playerId)` | Lookup player by PB record ID | [`useValidationConfirm`](src/hooks/useValidationConfirm.ts:100) |
`listPlayers(sessionId)` | List all players in a session | [`useProgressAdmin`](src/hooks/useProgress/admin.ts:44), [`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:40), [`useQRScanContext`](src/hooks/useQRScanContext.ts:43) |
`createPlayer(data)` | Create player record | Landing page only |
`updatePlayer(id, patch)` | Update player fields | Player view only (profile mirror) |
`listMilestones(sessionId)` | Milestone list for a session | [`useSession`](src/hooks/useSession.ts:57), [`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:41) |
`createMilestone(data)` / `updateMilestone(id, patch)` / `deleteMilestone(id)` | CRUD milestones | [`useAdminMilestoneEditor`](src/hooks/useAdminMilestoneEditor.ts:142, 132) |
`listMissions(sessionId)` | Mission list for a session | [`useSession`](src/hooks/useSession.ts:58), [`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:42), [`useQRScanContext`](src/hooks/useQRScanContext.ts:44) |
`createMission(data)` / `updateMission(id, patch)` / `deleteMission(id)` | CRUD missions | [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:197) |
`getFormSchema(missionId)` | Fetch form field schema | [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:71) for edit mode; [`useTemplateLibrary`](src/hooks/useTemplateLibrary.ts:74) for export |
`upsertFormSchema(missionId, fields)` | Save form field schema | [`useAdminMissionEditor`](src/hooks/useAdminMissionEditor.ts:71) — called during `saveMissions()` |
`upsertProgressEvent(playerId, missionId, patch)` | Single upsert point ([C-05](SPECS.md:946)) | [`useProgressAdmin`](src/hooks/useProgress/admin.ts:113) (approve), [`useProgressAdmin`](src/hooks/useProgress/admin.ts:131) (reject), [`useValidationConfirm`](src/hooks/useValidationConfirm.ts) (confirm) |
`listProgressEvents(playerId)` | All progress events for a player | [`useProgressAdmin`](src/hooks/useProgress/admin.ts:77), [`useProgressCrossHire`](src/hooks/useProgress/crossHire.ts:49), [`useValidationConfirm`](src/hooks/useValidationConfirm.ts:101) |
`getBuddyProfile(playerId)` / `upsertBuddyProfile(playerId, data)` | Buddy assignment CRUD | [`useBuddyProfile`](src/hooks/useBuddyProfile.ts:56) |
`listResources(sessionId)` / `createResource()` / `updateResource()` / `deleteResource()` | Resource CRUD | [`useResources`](src/hooks/useResources.ts:33) (admin mode) |
`listTemplates()` / `saveTemplate(template)` / `deleteTemplate(name)` | Template library operations | [`useTemplateLibrary`](src/hooks/useTemplateLibrary.ts:60, 91, 130) |
`subscribeProgressEvent(playerId, missionId, cb)` | SSE subscription | Not used by admin code — player-only ([ValidationDisplay](src/components/player/ValidationDisplay.tsx:25)) |

### Adapter Methods NOT Called by Admin Code

| Method | Reason |
|--------|--------|
`getPlayer(uid)` | Admin uses `getPlayerById(playerId)` and `listPlayers(sessionId)` instead |
`createPlayer(data)` / `updatePlayer(id, patch)` | Player creation happens on landing/join; profile updates are player-only |
`getPlayerByRecoveryKey(key)` | Recovery flow is landing-page-only |
`subscribeProgressEvent(...)` | SSE subscription is player-only — admin uses explicit approve/reject |

---

## 8. Summary of Admin Capabilities

### Read-Write Data

| Data | Hook / State | Read | Write |
|------|-------------|------|-------|
Session background image & map scale | `useSession` (gamemaker mode) + `bgImageUrlOverride` state | ✓ | `uploadBackground(file)` / `updateMapNodeScale(scale)` ([`line 130-143`](src/pages/AdminCockpitPage.tsx:130)) |
Milestones (position/name) | `useAdminMilestoneEditor` | ✓ (draft) | `saveMilestones()` → `createMilestone` / `updateMilestone` |
Missions (content/difficulty/order/type/form/validation) | `useAdminMissionEditor` | ✓ (draft) | `saveMissions()` → `createMission` / `updateMission` / `deleteMission` + `upsertFormSchema` |
Resources (CRUD + visibility toggle) | `useResources` (gamemaker mode) | ✓ | `addResource` / `deleteResource` / `toggleVisibility` |
Pre-boarding checklist items | `usePreBoardingChecklist` | ✓ | `onToggle` / `onAdd` / `onMarkAllDone` → `updateSession` |
Buddy assignment per player | `useBuddyProfile` (gamemaker mode) | ✓ | `upsertBuddy()` |
Template library | `useTemplateLibrary` | ✓ | `saveTemplate` / `deleteTemplate` |
Session invite QR code | Derived from `sessionId` | ✓ | N/A (derived) |

### Approve/Reject Operations

| Operation | Adapter Call | Context |
|-----------|-------------|---------|
Approve pending mission | `upsertProgressEvent(status: "completed")` | `PendingApprovalsPanel` via `useProgressAdmin.handleApprove` |
Reject pending mission | `upsertProgressEvent(status: "pending")` | `PendingApprovalsPanel` via `useProgressAdmin.handleReject` |

### Read-Only View

| Data | Component | Source |
|------|-----------|--------|
Player list with profile cards | `PlayerSelectorDropdown` + `PlayerProfileCard` | `useProgressAdmin` → `adapter.listPlayers()` |
Player XP and milestone progress | `PlayerProfileCard` | `computeProgress()` in `useProgressAdmin` |
Cross-session hire progress dashboard | `CrossHireDashboard` | `useProgressCrossHire()` |
Template list | `TemplateLibrary` | `useTemplateLibrary` → `adapter.listTemplates()` |
Session invite QR code/URL | `SessionInviteCard` | Derived from URL params |
