# Integration Gap Analysis — MesseBuddy

**Status:** Draft v1  
**Scope:** Text/input elements visible from [`AdminHomePage`](../src/pages/AdminHomePage.tsx) and [`PlayerCockpitPage`](../src/pages/PlayerCockpitPage.tsx), evaluated across mock demo session (`sess_mmt2026`) and production PocketBase integration.  
**Verification:** Dev server at `http://localhost:5173/` browsed via Playwright MCP for both `/admin/sess_mmt2026` and `/session/sess_mmt2026`.  

---

## Pre-Reading: Session Distinction

This analysis covers **two distinct data layers** that share the same [`AppAdapter`](../src/adapters/interface.ts) interface:

| Layer | Session ID | Backing Store | Active When |
|-------|-----------|---------------|-------------|
| **Mock demo** | `sess_mmt2026` | [`mockData.ts`](../src/adapters/mock/mockData.ts) module-level `Map`s | `VITE_USE_MOCK_PB=true` (current default) |
| **Production** | Any admin-created session | PocketBase via [`pbAdapter.ts`](../src/adapters/pocketbase/pbAdapter.ts) | `VITE_USE_MOCK_PB=false` |

The mock dataset is a **static seed** with 6 milestones, 33 missions, 2 players, 2 buddy profiles, 7 resources, and 3 pre-seeded templates — all hardcoded to `sess_mmt2026`. Production sessions start empty and are populated by the admin via [`HireDetailPage`](../src/pages/HireDetailPage.tsx).

---

## 1. Input Elements User Types → Storage Analysis

```
Flow: User Input → Handler → Adapter Method → Storage
```

### 1.1 AdminHomePage — NameCaptureModal

| Element | User Action | Handler | Adapter Call | Stored? | Mock Behavior | Production Behavior |
|---------|------------|---------|-------------|---------|---------------|-------------------|
| `<Input>` "e.g. Sofia Chen" | Types hire name | [`handleCreate(name)`](../src/pages/AdminHomePage.tsx:152) | [`adapter.createSession(name, gmUid)`](../src/hooks/useProgress/gmHires.ts:48) | ✅ `Session.name` in PB | Creates in-memory session with random ID | Creates PB session, returns ID |
| — | Submit | `navigate(/admin/${sid}/hire/${newSessionId}?new=1)` | — | ✅ Navigates to new hire detail | Creates hire + redirects | Creates hire + redirects |

### 1.2 PlayerCockpitPage — Mission Interaction

| Element | User Action | Handler | Adapter Call | Stored? | Mock Behavior | Production Behavior |
|---------|------------|---------|-------------|---------|---------------|-------------------|
| Mission "Mark Complete" (`selfApprove`) | Clicks button | [`markSelfComplete(missionId)`](../src/pages/PlayerCockpitPage.tsx:105) | [`upsertProgressEvent(..., { status: "autoApproved" })`](../src/components/player/MissionDetailPopup.tsx:93) | ✅ `ProgressEvent` | Instant `autoApproved` | Instant `autoApproved` |
| Mission "Mark Complete" (`gmApprove`) | Clicks button | [`markPending(missionId)`](../src/pages/PlayerCockpitPage.tsx:106) | [`upsertProgressEvent(..., { status: "pendingApproval" })`](../src/components/player/MissionDetailPopup.tsx:104) | ✅ `ProgressEvent` | Auto-transitions to `completed` after 4s via [`simulateGmApproval()`](../src/adapters/mock/mockAdapter.ts:79) | Stays `pendingApproval` until admin approves/rejects |
| Mission "Show QR" (`qr`) | Shows QR code | [`QRDisplay`](../src/components/player/QRDisplay.tsx) | Player **never writes** for QR missions (C-07) | ❌ Player does not write | QR displays payload; GM scans to write `completed` | QR displays payload; GM scans to write `completed` |
| Form fields | Fills + submits | [`useFormMission`](../src/hooks/useFormMission.ts:82) | [`upsertProgressEvent(..., { status: "autoApproved", formResponse })`](../src/hooks/useFormMission.ts:82) | ✅ `ProgressEvent.formResponse` | Stores in-memory | Stores in PB |

### 1.3 PlayerCockpitPage — Notification / Feedback Only (No Input)

| Element | Appearance | Has Input? | Notes |
|---------|-----------|-----------|-------|
| Resource search | "Open resource search" button → expands search `<input>` | ✅ Client-side filter only — search query **not persisted** anywhere |
| Chat with AI Assistant | Text input in assistant tab | ✅ Messages sent to LiteLLM via [`useChatStream`](../src/hooks/useChatStream.ts) | **Not persisted** — in-memory `messages[]` state lost on page reload |
| Tutorial overlay | "Skip tutorial" / "Let's start" buttons | ✅ Clicking "Skip" → [`updatePlayer({ tutorialComplete: true })`](../src/hooks/useTutorial.ts:120) | ✅ Persisted to `Player.tutorialComplete` |

### 1.4 Findings: Not Stored / Ephemeral

| Input | Where | Why It Matters |
|-------|-------|----------------|
| Chat messages | [`PlayerAssistantView`](../src/pages/player-cockpit/PlayerDashboardView.tsx:147) | User expects conversation history to persist; lost on reload or tab switch |
| Resource search query | [`ResourcesSection`](../src/components/player/ResourcesSection.tsx) | Search state lost on tab switch to "AI Assistant" and back |
| Tutorial step progress | [`sessionStorage: mb_tutorial_step`](../src/hooks/useTutorial.ts:15) | Survives page reload but **not** cleared on tutorial completion (orphan key) |

---

## 2. Domain Data Shapes Not Rendered to User

These fields exist in [`Player`](../src/types/domain.ts:36), [`Mission`](../src/types/domain.ts:83), or [`Session`](../src/types/domain.ts:19) but are **not displayed** in any component rendered from the two audited pages.

### 2.1 Player Fields Not Displayed

| Field | Type | Defined Line | Rendered On | Missing From |
|-------|------|-------------|-------------|-------------|
| `team` | `string` | [domain.ts:48](../src/types/domain.ts:48) | Not displayed | AdminHireCard, PlayerCockpitPage |
| `startDate` | `string` | [domain.ts:49](../src/types/domain.ts:49) | Not displayed | PlayerCockpitPage (TopBar, dashboard header) |
| `location` | `string` | [domain.ts:50](../src/types/domain.ts:50) | Not displayed | PlayerCockpitPage |
| `timezone` | `string` | [domain.ts:51](../src/types/domain.ts:51) | Not displayed | PlayerCockpitPage |
| `skillsConfident` | `string[]` | [domain.ts:52](../src/types/domain.ts:52) | Not displayed | PlayerCockpitPage |
| `skillsDevelop` | `string[]` | [domain.ts:53](../src/types/domain.ts:53) | Not displayed | PlayerCockpitPage |
| `languages` | `string[]` | [domain.ts:54](../src/types/domain.ts:54) | Not displayed | PlayerCockpitPage |
| `workStyle` | `string?` | [domain.ts:55](../src/types/domain.ts:55) | Not displayed | PlayerCockpitPage |
| `energizers` | `string[]?` | [domain.ts:56](../src/types/domain.ts:56) | **Defined but no mock data** | PlayerCockpitPage |
| `drainers` | `string[]?` | [domain.ts:57](../src/types/domain.ts:57) | **Defined but no mock data** | PlayerCockpitPage |
| `department` | `string?` | [domain.ts:47](../src/types/domain.ts:47) | Not displayed | PlayerCockpitPage |
| `preferredName` | `string?` | [domain.ts:43](../src/types/domain.ts:43) | Not used (uses `player.name`) | TopBar uses `name` field |
| `pronouns` | `string?` | [domain.ts:44](../src/types/domain.ts:44) | Not displayed | PlayerCockpitPage |
| `avatarUrl` | `string?` | [domain.ts:45](../src/types/domain.ts:45) | `TopBar` has `avatarUrl` prop ([TopBar.tsx:7](../src/components/shared/TopBar.tsx:7)) but it's **never passed** by either page | [`AdminHomePage.tsx:190-192`](../src/pages/AdminHomePage.tsx:190), [`PlayerCockpitPage.tsx:78-82`](../src/pages/PlayerCockpitPage.tsx:78) |
| `uid` | `string` | [domain.ts:37](../src/types/domain.ts:37) | Not displayed | Both pages |
| `recoveryKey` | `string` | [domain.ts:38](../src/types/domain.ts:38) | Not displayed (shown only on LandingPage) | Both pages |

### 2.2 Mission Fields Not Displayed

| Field | Type | Defined Line | Rendered On | Missing From |
|-------|------|-------------|-------------|-------------|
| `difficulty` | `number` | [domain.ts:90](../src/types/domain.ts:90) | Not displayed | [`MissionCard`](../src/components/shared/MissionCard.tsx), [`MissionDetailPopup`](../src/components/player/MissionDetailPopup.tsx) |
| `suggestedDueDate` | `string?` | [domain.ts:93](../src/types/domain.ts:93) | Not displayed | Both mission rendering components |
| `externalUrl` | `string?` | [domain.ts:89](../src/types/domain.ts:89) | **Defined in mock data** but not surfaced as a clickable link in player card | [`MissionCard`](../src/components/shared/MissionCard.tsx) — only shows on popup |

### 2.3 Session Fields Not Displayed

| Field | Type | Defined Line | Rendered On | Missing From |
|-------|------|-------------|-------------|-------------|
| `gameMakerId` | `string` | [domain.ts:31](../src/types/domain.ts:31) | Not displayed | Both pages |
| `preBoardingChecks` | `PreBoardingCheckItem[]` | [domain.ts:33](../src/types/domain.ts:33) | **Not visible to players** | PlayerCockpitPage (admin sees in HireDetailPage) |

### 2.4 BuddyProfile Fields Not Displayed

| Field | Type | Defined Line | Rendered On | Missing From |
|-------|------|-------------|-------------|-------------|
| `avatarUrl` | `string?` | [domain.ts:67](../src/types/domain.ts:67) | [`BuddyCard`](../src/components/player/BuddyCard.tsx) has `avatarUrl` prop but **never receives it** from `PlayerDashboardView` | [`PlayerDashboardView.tsx:92-100`](../src/pages/player-cockpit/PlayerDashboardView.tsx:92) — only spreads `name`, `role`, `tenure`, `contactUrl`, `quote`, `email`, `phone` |

---

## 3. Misleading / Incorrectly Rendered Content

### 3.1 `mandatory` Tag Is Cosmetic Only

- **What renders:** `TagBadge` with label `"mandatory"` on mission cards (visible in the snapshot as `generic [ref=f1e170]: mandatory`).
- **What should happen (user expectation):** "Mandatory" implies non-optional missions, priority ordering, or blocking progress until completed.
- **What actually happens:** No ordering constraint. No completion requirement. No visual or logic distinction beyond the badge. All missions are equally skippable.
- **Mock data:** 15 of 33 missions have `tags: ["mandatory"]` ([mockData.ts:145](../src/adapters/mock/mockData.ts:145)).
- **Production impact:** Same issue — tags are free-form strings. Nothing enforces their semantics.

### 3.2 Tutorial Text Is Static Placeholder

- **What renders:** `"Hello, Sofia. Welcome to MesseBuddy. Here's what you'll do: complete missions across different office spaces to earn XP..."` (from [`PLACEHOLDER_STEPS`](../src/components/tutorial/TutorialOverlay.tsx)).
- **What should happen:** The tutorial should explain the **actual session content** — which milestones, how many missions, buddy name, resources available.
- **What actually happens:** Static strings regardless of session configuration. The same text appears for every session, every player.
- **Notes:** The tutorial step text is not fetched from adapter; it's a top-level constant in the file.

### 3.3 "Your onboarding journey starts here." Appears on Every Load

- **What renders:** Paragraph under "Welcome, Sofia." at [`PlayerDashboardView.tsx:58`](../src/pages/player-cockpit/PlayerDashboardView.tsx:58).
- **What should happen:** After the player has completed some milestones or missions, this message should change to reflect progress (e.g., "You've completed 3 of 6 milestones").
- **What actually happens:** Static text on every page load, regardless of progress.

### 3.4 "Loading your journey…" Appears During Every Data Fetch

- **What renders:** Loading overlay at [`PlayerCockpitPage.tsx:55`](../src/pages/PlayerCockpitPage.tsx:55).
- **What should happen:** More specific loading states per section (e.g., "Loading milestones…", "Loading missions…").
- **What actually happens:** Generic message that overlaps all content.

### 3.5 XP Bar Shows "0 / 360 XP" — 360 Is Hardcoded

- **What renders:** `0 / 360 XP` total progress at bottom of milestone map (from snapshot: `generic [ref=f1e147]: 0 / 360 XP`).
- **Where it comes from:** The mock dataset sums to 360 XP across all milestones (50 + 15 + 125 + 85 + 35 + 50 = 360 XP thresholds). This is **not** hardcoded in the code; `computeProgress` derives total XP from milestone `xpThreshold` values.
- **Potential issue:** If a production session has different milestone XP thresholds, the total will be correct. But the display never labels *which milestones* contribute what XP — the user only sees a monolithic total.

---

## 4. Mermaid Diagrams — Distinguishing Mock from Production

### Diagram 1: Mock Dataset Architecture (`sess_mmt2026`)

```mermaid
graph TB
    subgraph MockSeed["mockData.ts — Static Seed Data"]
        direction TB
        MS1[MOCK_SESSION\nsess_mmt2026\nname: 'Messe München...'\nmapNodeScale: 0.55]
        MS2[MOCK_MILESTONES × 6\nms_arrive, ms_compliance,...]
        MS3[MOCK_MISSIONS × 33\nmission_m1_profile...\nmission_m6_mentor]
        MS4[MOCK_FORM_SCHEMAS × 1\nmission_m1_profile\nfields: 11]
        MS5[MOCK_PLAYERS × 3\nplayer_alex (Alex Johnson)\nplayer_sofia (Sofia Chen)\nplayer_sarah_k (pending)]
        MS6[MOCK_BUDDY_PROFILES × 2\nbuddy_marcus → player_alex\nbuddy_lena → player_sofia]
        MS7[MOCK_PROGRESS_EVENTS = []\nSofia starts empty]
        MS8[MOCK_RESOURCES × 7\n6 visible, 1 hidden]
        MS9[Templates × 3 (seeded)\n'Engineering Onboarding'\n'Sales Bootcamp'\n'Executive Welcome']
    end

    subgraph MockStorage["In-Memory Maps (mockAdapter.ts)"]
        MM1[sessions.Map]
        MM2[players.Map]
        MM3[milestones.Map]
        MM4[missions.Map]
        MM5[formSchemas.Map]
        MM6[progressEvents.Map]
        MM7[buddyProfiles.Map]
        MM8[resources.Map]
        MM9[templates.Map]
    end

    subgraph RenderedPages["Rendered at localhost:5173"]
        RP1[AdminHomePage\nPeter Tubak · Game Master\n'New Hires' → Alex Johnson (0%)]
        RP2[PlayerCockpitPage\nSofia Chen · Junior Engineer\n'0 XP' · 6 milestones (0%)\n5 current missions · Buddy: Lena\nTutorial: static PLACEHOLDER_STEPS]
    end

    MockSeed -->|Module init seed| MockStorage
    MockStorage -->|useGmHires| RP1
    MockStorage -->|useSession + useProgressPlayer| RP2

    style MockSeed fill:#e8f0fe,stroke:#1a73e8
    style MockStorage fill:#fff9c4,stroke:#f9a825
    style RenderedPages fill:#e8f5e9,stroke:#2e7d32
```

### Diagram 2: Production Architecture (PocketBase)

```mermaid
graph TB
    subgraph PBStorage["PocketBase Collections"]
        direction TB
        PC1[sessions]
        PC2[players]
        PC3[milestones]
        PC4[missions]
        PC5[formSchemas]
        PC6[progressEvents\nSSE subscription]
        PC7[buddyProfiles]
        PC8[resources]
        PC9[templates]
    end

    subgraph Adapter["pbAdapter.ts"]
        PA1[getSession → PC1]
        PA2[listPlayers → PC2]
        PA3[listMilestones → PC3]
        PA4[listMissions → PC4]
        PA5[upsertProgressEvent → PC6]
        PA6[getBuddyProfile → PC7]
        PA7[listResources → PC8]
        PA8[subscribeProgressEvent → SSE on PC6]
    end

    subgraph ProductionFlow["Production Session Lifecycle"]
        PF1[Admin creates session\n→ adapter.createSession(name, gmUid)]
        PF2[Admin populates via HireDetailPage\n→ milestones, missions, forms, resources]
        PF3[Admin sends invite → player joins\n→ adapter.getPlayerByInviteToken(token)]
        PF4[Player sees cockpit\n→ data fetched from PB via adapter]
        PF5[Player completes missions\n→ upsertProgressEvent writes]
        PF6[Admin approves/rejects\n→ manual action required]
    end

    subgraph NotMocked["⚠️ Different from Mock"]
        NM1[No pre-seeded templates\n→ admin must create via HireDetailPage]
        NM2[No pre-assigned buddies\n→ admin assigns via BuddyAssignmentForm]
        NM3[No simulated auto-approve\n→ admin must manually approve gmApprove missions]
        NM4[Invite tokens are one-time real tokens\n→ generated by generateInviteToken()]
        NM5[Players have real UIDs from crypto.randomUUID()\n→ not hardcoded 'uid_sofia_002']
        NM6[Session name from admin input\n→ not hardcoded 'Messe München...']
    end

    PA1 --- PC1
    PA2 --- PC2
    PA3 --- PC3
    PA4 --- PC4
    PA5 --- PC6
    PA6 --- PC7
    PA7 --- PC8

    PF1 --> PA1
    PF2 --> PA3
    PF2 --> PA4
    PF3 --> PC2
    PF4 --> PA1
    PF4 --> PA3
    PF4 --> PA4
    PF5 --> PA5
    PF6 --> PA5

    style PBStorage fill:#f3e5f5,stroke:#7b1fa2
    style Adapter fill:#e8f0fe,stroke:#1a73e8
    style ProductionFlow fill:#e8f5e9,stroke:#2e7d32
    style NotMocked fill:#ffcdd2,stroke:#e53935
```

### Diagram 3: Data Input → Storage (All Inputs Mapped)

```mermaid
graph LR
    subgraph Inputs["User Input Elements"]
        I1["Admin: NameCaptureModal\n<text> hire name"]
        I2["Player: Mission Popup\nclick 'Mark Complete'"]
        I3["Player: Form Fields\n<text>/<select>/<textarea>"]
        I4["Player: Resource Search\n<text> search query"]
        I5["Player: Chat Input\n<text> message"]
        I6["Player: Tutorial\nclick 'Skip' / 'Next'"]
    end

    subgraph Storage["Storage Destination"]
        S1["Session.name ✅ (PB)"]
        S2["ProgressEvent.status ✅ (PB)"]
        S3["ProgressEvent.formResponse ✅ (PB)"]
        S4["Player fields ✅ (PB via updatePlayer)"]
        S5["Player.tutorialComplete ✅ (PB)"]
        S6["NOT PERSISTED ❌ in-memory only"]
        S7["sessionStorage mb_tutorial_step ⚠️"]
    end

    I1 -->|handleCreate(name) → adapter.createSession| S1
    I2 -->|upsertProgressEvent(status=autoApproved/pendingApproval)| S2
    I3 -->|upsertProgressEvent(formResponse) + updatePlayer(profile fields)| S3
    I3 -->|updatePlayer → name, role, department, etc.| S4
    I4 -->|local filter → not persisted| S6
    I5 -->|useChatStream → ephemeral messages[]| S6
    I6 -->|handleSkipConfirm → updatePlayer(tutorialComplete=true)| S5
    I6 -->|handleTutorialNext → sessionStorage| S7

    style Inputs fill:#e8f0fe,stroke:#1a73e8
    style Storage fill:#e8f5e9,stroke:#2e7d32
```

---

## 5. PlantUML Diagrams — Data Shape Flow

### Diagram 1: AdminHomePage Data Shape → Component → Storage

```plantuml
@startuml
title AdminHomePage — Input/Display Element Tracking

rectangle "AdminHomePage" {
    (TopBar) as TB
    (BackButton) as BB
    (HeaderStats) as HS
    (HireCards) as HC
    (NameCaptureModal) as NCM
    (EmptyState) as ES
    (LoadingState) as LS
}

rectangle "GmHireRow Data Shape" {
    (sessionId) as G1
    (sessionName) as G2
    (playerId) as G3
    (name) as G4
    (joined) as G5
    (progressPercent) as G6
    (daysSinceLastActivity) as G7
    (isStalled) as G8
}

rectangle "Components Rendered" {
    (TopBarComponent) as TB_C
    (HireCardComponent) as HC_C
    (NameCaptureModalComponent) as NCM_C
}

TB => TB_C : playerName = identity.name\nrole = "Game Master"
BB => TB_C : isDemo → "Back to Landing"\n!isDemo → "Log Out"

HS ==> HC : joinedCount, avgProgress, stalledCount
HC ==> HC_C : hire.name, hire.progressPercent, hire.isStalled

NCM => NCM_C : "Add a new hire" (static)\n"e.g. Sofia Chen" (static placeholder)

' Grey out unused fields
G7 -[#grey]-> note "Not rendered\non AdminHomePage" as UNUSED1
note bottom of G7 : daysSinceLastActivity is\ncomputed in useGmHires\n(line 108-110) but never\ndisplayed in the card rendering. Only\nused for isStalled derivation.

(avatarUrl) -[#grey]-> note "TopBar has avatarUrl prop\nbut AdminHomePage never passes it" as UNUSED2

@enduml
```

### Diagram 2: PlayerCockpitPage Data Shape → Component → Storage

```plantuml
@startuml
title PlayerCockpitPage — Input/Display Element Tracking

rectangle "PlayerCockpitPage" {
    (TopBar) as PTB
    (Tutorial) as TUT
    (ConfirmDialog) as CD
    (TabBar) as TAB
    (MissionDetailPopup) as MDP
    (MilestoneSidebarViewer) as MSV
    (PlayerDashboardView) as PDV
}

rectangle "PlayerDashboardView Sub-Components" {
    (WelcomeHeader) as WH
    (MilestoneMapViewer) as MMV
    (CurrentMissionsList) as CML
    (BuddyCard) as BC
    (ResourcesSection) as RS
}

rectangle "Domain Data Shapes" {
    (Player) as PLAYER
    (Session) as SESS
    (Milestone) as MS
    (Mission) as MISS
    (ProgressEvent) as PE
    (BuddyProfile) as BP
    (Resource) as RES
}

rectangle "Not Persisted" {
    (ChatMessages) as CM
    (ResourceSearch) as RSS
}

' TopBar
PTB => PLAYER : playerName = player.name (line 79)\ntotalXP = progress.playerProgress?.totalXP (line 80)\nrole = player.role (line 81)

' WelcomeHeader
PDV => WH : "Welcome, {playerName.split(' ')[0]}."\n"Your onboarding journey starts here." (static)

' Milestone Map
PDV => MMV : milestones (6 nodes)\nbgImageUrl (session.bgImageUrl)\nmapNodeScale (session.mapNodeScale)\nmilestoneProgress (from computeProgress)

' Current Missions
PDV => CML : missions.filter(isInCurrentMissions)\nprogressEvents (for completion status)

' Buddy Card
PDV => BC : buddy.name, buddy.role, buddy.tenure\nbuddy.quote, buddy.email, buddy.phone

' Resources
PDV => RS : resources.filter(isVisibleToPlayer)\nsearch query → local filter, NOT persisted

' Not persisted
note right of RS : Search input state lost\non tab switch or page reload
RS => RSS : in-memory state

note right of CM : Chat messages lost\non page reload
(Messages) => CM : in-memory messages[]

' Fields NOT rendered
note right of PLAYER : 11 player fields not displayed:\nteam, startDate, location, timezone,\nskillsConfident, skillsDevelop,\nlanguages, workStyle, department,\npreferredName, pronouns, energizers, drainers
PLAYER -[#grey]-> note "Unused player fields"

note right of MISS : difficulty, suggestedDueDate, externalUrl\nnot shown in MissionCard rendering
MISS -[#grey]-> note "Unused mission fields"

note right of BP : buddy.avatarUrl never passed\nto BuddyCard component
BP -[#grey]-> note "avatarUrl not used"

@enduml
```

### Diagram 3: Invite & Join Flow Differences (Mock vs. Production)

```plantuml
@startuml
title Invite + Join Flow — Mock vs. Production

== MOCK ADAPTER ==
actor "GM" as GM
actor "Player" as PL

GM -> AdminHomePage : Click "Add new hire"
AdminHomePage -> NameCaptureModal : Enter name "Sarah K."
NameCaptureModal -> mockAdapter.createSession("Sarah K.", gmUid) : Creates session
AdminHomePage -> HireDetailPage : Navigate with ?new=1
HireDetailPage -> mockAdapter : CRUD milestones, missions
HireDetailPage -> AdminHomePage : View hires

note right of HireDetailPage : Mock data had player_sarah_k\npre-seeded with inviteToken:"INVITE000001"\n— admin didn't need to create the slot

PL -> LandingPage : Enter code + name
LandingPage -> mockAdapter.joinSession : Creates player_sofia with hardcoded uid
LandingPage -> PlayerCockpitPage : Navigate to /session/sess_mmt2026

== PRODUCTION ==

GM -> AdminHomePage : Click "Add new hire"
AdminHomePage -> NameCaptureModal : Enter name "New Hire"
AdminHomePage -> pbAdapter.createSession(name, gmUid) : Creates PB session row
AdminHomePage -> HireDetailPage : Navigate with ?new=1

HireDetailPage -> HireCustomizeTab : Apply template or manually configure
HireDetailPage -> HireInviteAccordion : Generate invite link + token

note right of HireInviteAccordion : `generateInviteToken()` creates\na one-time token. Admin shares link.\nA pending Player record is created\nwith inviteToken set, uid == "".

PL -> LandingPage : Enter inviteURL → pre-filled session
LandingPage -> pbAdapter.getPlayerByInviteToken(token, sessionId) : Find pending slot
LandingPage -> pbAdapter.updatePlayer(pendingPlayer.id, { uid, recoveryKey, inviteToken: undefined }) : Claim slot
LandingPage -> PlayerCockpitPage : Navigate to /session/:sessionId

note right of PL : production uses getPlayerByInviteToken\nwhich is NOT called in mock flow at all.\nThe mock LandingPage code path for\ninvite tokens is not exercised.

@enduml
```

---

## 6. Complete Gap Register

### 🔴 Critical (Functional Gap — Feature Incomplete)

| # | Gap | File(s) | Effect |
|---|-----|---------|--------|
| G-01 | **Invite token flow not exercised in mock** | [`LandingPage`](../src/pages/LandingPage.tsx), [`joinSession.ts`](../src/use-cases/joinSession.ts:74) | The `adapter.getPlayerByInviteToken` interface method has no UI code path in the mock. Production invite flow untested. |
| G-02 | **`mandatory` tag is cosmetic only** | [`MissionCard.tsx`](../src/components/shared/MissionCard.tsx:36-38) | `TagBadge` renders the label but no ordering, blocking, or enforcement logic exists. User sees "mandatory" and may be misled. |
| G-03 | **No admin review interface for form responses** | [`FormPage.tsx`](../src/pages/FormPage.tsx), [`HireDetailPage.tsx`](../src/pages/HireDetailPage.tsx) | Form submissions via `upsertProgressEvent(formResponse)` are written to PB but admin has no way to view or audit them. |
| G-04 | **No player visibility of pre-boarding checks** | [`PlayerCockpitPage.tsx`](../src/pages/PlayerCockpitPage.tsx), [`usePreBoardingChecklist.ts`](../src/hooks/usePreBoardingChecklist.ts) | Admin sets `preBoardingChecks` on session; player never sees them. |

### 🟡 Moderate (Missing User-Facing Data)

| # | Gap | File(s) | Effect |
|---|-----|---------|--------|
| G-05 | **11 Player profile fields not displayed** | [`PlayerDashboardView.tsx`](../src/pages/player-cockpit/PlayerDashboardView.tsx), [`BuddyCard.tsx`](../src/components/player/BuddyCard.tsx) | `team`, `startDate`, `location`, `timezone`, `skillsConfident`, `skillsDevelop`, `languages`, `workStyle`, `department`, `preferredName`, `pronouns` are stored in PB/mock but invisible to player. |
| G-06 | **`avatarUrl` on TopBar never passed** | [`AdminHomePage.tsx:190`](../src/pages/AdminHomePage.tsx:190), [`PlayerCockpitPage.tsx:78`](../src/pages/PlayerCockpitPage.tsx:78) | `TopBar` accepts `avatarUrl` prop but neither page provides it. Player cannot see their avatar. |
| G-07 | **Buddy `avatarUrl` never passed** | [`PlayerDashboardView.tsx:92-100`](../src/pages/player-cockpit/PlayerDashboardView.tsx:92) | `BuddyCard` has `avatarUrl` prop but it's never spread from `PlayerDashboardView`. |
| G-08 | **Mission `difficulty`, `suggestedDueDate` not shown** | [`MissionCard.tsx`](../src/components/shared/MissionCard.tsx), [`MissionDetailPopup.tsx`](../src/components/player/MissionDetailPopup.tsx) | These fields are stored but the mission card and popup do not display them. |
| G-09 | **`externalUrl` not clickable on mission card** | [`MissionCard.tsx`](../src/components/shared/MissionCard.tsx) | Link-type missions have `externalUrl` stored but mission card shows only title; user must click into popup to find the link. |

### 🟠 Warning (Behavior Differs Mock vs. Production)

| # | Gap | Mock Behavior | Production Behavior |
|---|------|--------------|-------------------|
| G-10 | **gmApprove auto-approve** | 4s simulated timeout → `completed` | Stays `pendingApproval` until admin action |
| G-11 | **Templates** | 3 pre-seeded at module init | None — admin must create via HireDetailPage |
| G-12 | **Buddy assignment** | Pre-seeded per player | Admin must assign via `BuddyAssignmentForm` |
| G-13 | **Session data** | Hardcoded 6 milestones, 33 missions | Empty until admin configures |
| G-14 | **Player UIDs** | Hardcoded `uid_alex_001`, `uid_sofia_002` | Generated via `crypto.randomUUID()` |
| G-15 | **Invite token** | Fixed `"INVITE000001"` | Generated via `generateInviteToken()` |

### 🔵 Informational (Static Text Opportunities)

| # | Issue | What's Shown | What Could Be Shown |
|---|-------|-------------|-------------------|
| G-16 | Tutorial is `PLACEHOLDER_STEPS` | "Welcome to MesseBuddy. Here's what you'll do: complete missions..." | Dynamic text with actual session stats, milestone count, buddy name |
G-17 | "Your onboarding journey starts here." shows on every load | Static text regardless of progress | "You've completed X of Y milestones" or mission count | |
G-18 | "Loading your journey…" generic loading text | Same text for all load states | Section-specific loading text | |
G-19 | "0 XP" in TopBar during initial load | Shows 0 until progress events are fetched | Skeleton loader or numeric placeholder | |

---

## 7. Recommendations by Priority

### 🔴 Immediate (Before Production)

1. **Exercise invite token flow in mock** — Add a test or mock path that calls [`getPlayerByInviteToken`](../src/adapters/interface.ts:35) to validate the join-by-invite code path before PB integration.

2. **Render player profile fields** — The player fills in `preferredName`, `role`, `department`, `location`, `timezone`, `team`, `startDate`, `languages`, `skillsConfident`, `skillsDevelop`, `workStyle` via the profile form mission but sees none of these in their cockpit view. Add a "My Profile" section or expand the TopBar/TabBar to show these.

3. **Add admin review for form submissions** — Admin has no UI to view players' `formResponse` from completed form missions. Add a read-only view in [`HireDetailPage`](../src/pages/HireDetailPage.tsx) or [`PendingApprovalsPanel`](../src/components/admin/PendingApprovalsPanel.tsx).

### 🟡 Next Iteration

4. **Make `mandatory` tag functional** — If `tags: ["mandatory"]` implies ordering, add filtering/sorting in `CurrentMissionsList` or enforce that mandatory missions complete before optional ones unlock.

5. **Show pre-boarding checks to player** — Add a section in [`PlayerDashboardView`](../src/pages/player-cockpit/PlayerDashboardView.tsx) or its sub-components showing the pre-boarding checklist items.

6. **Render `difficulty` and `suggestedDueDate`** — These are visible on admin mission editor but hidden from player. Show via TagBadge or small icon.

### 🔵 Polish

7. **Pass `avatarUrl` to TopBar and BuddyCard** — Both components support it; neither page passes the prop.
8. **Make `externalUrl` clickable on MissionCard** — For `type: "link"` missions, show a direct link rather than requiring popup.
9. **Dynamic tutorial text** — Replace static [`PLACEHOLDER_STEPS`](../src/components/tutorial/TutorialOverlay.tsx) with adapter-derived content.
10. **Persist chat history** — Use `localStorage` or a new PB collection to save AI assistant conversations.
11. **Persist resource search state** — Keep search query in URL search params so it survives tab switches.
12. **Change welcome greeting based on progress** — Show "Welcome back, Sofia." instead of "Your onboarding journey starts here." when progress exists.

---

## 8. Appendix: Field Presence Matrix

Field | Mock Data | Player Rendered | Admin Rendered | Comment |
|-------|-----------|----------------|---------------|---------|
`Player.name` | ✅ | ✅ TopBar | ✅ HireCard | |
`Player.preferredName` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.pronouns` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.role` | ✅ | ✅ TopBar (line 81) | ✅ HireCard (as name) | |
`Player.department` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.team` | ✅ | ❌ | ❌ | Collected in mock data, not form |
`Player.startDate` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.location` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.timezone` | ✅ | ❌ | ❌ | Collected in mock data, not form |
`Player.skillsConfident` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.skillsDevelop` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.languages` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.workStyle` | ✅ | ❌ | ❌ | Collected on form but never shown |
`Player.energizers` | ❌ (no mock) | ❌ | ❌ | Defined in type, no data path |
`Player.drainers` | ❌ (no mock) | ❌ | ❌ | Defined in type, no data path |
`Player.avatarUrl` | ❌ (no mock) | ❌ | ❌ | TopBar has prop but unused |
`Player.inviteToken` | ✅ "INVITE000001" | ❌ (admin-only) | ❌ (not shown in admin UI) | Pending slot concept |
`BuddyProfile.avatarUrl` | ❌ (no mock) | ❌ | ❌ | BuddyCard has prop but unused |
`BuddyProfile.quote` | ✅ | ✅ BuddyCard | ❌ | |
`BuddyProfile.email` | ✅ | ✅ BuddyCard | ❌ | |
`BuddyProfile.phone` | ✅ | ✅ BuddyCard | ❌ | |
`Mission.difficulty` | ✅ (1-5) | ❌ | ✅ MissionBottomSheet | |
`Mission.suggestedDueDate` | ❌ (no mock) | ❌ | ✅ MissionBottomSheet | |
`Mission.externalUrl` | ✅ | ❌ card / ✅ popup | ✅ MissionBottomSheet | Not clickable on card |
`Mission.body` (markdown) | ✅ | ✅ MissionDetailPopup | ✅ MissionBottomSheet | |
`Session.bgImageUrl` | ✅ map-background.jpg | ✅ MilestoneMapViewer | ✅ MilestoneMapEditor | |
`Session.mapNodeScale` | ✅ 0.55 | ✅ MilestoneMapViewer | ✅ MilestoneMapEditor | |
`Session.preBoardingChecks` | ✅ 7 items | ❌ Player never sees | ✅ PreBoardingChecklist | |

---

*Document generated 2026-06-30. Audited pages: [`AdminHomePage.tsx`](../src/pages/AdminHomePage.tsx) (358 lines) and [`PlayerCockpitPage.tsx`](../src/pages/PlayerCockpitPage.tsx) (161 lines) plus all direct child components.*