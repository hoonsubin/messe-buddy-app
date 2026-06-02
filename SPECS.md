# MesseBuddy — Project Specification

> **Status:** Pre-implementation baseline · Sprint 3 entry point **Last
> updated:** 2026-06-02 **Authors:** Group 3 — Alisa Diakova · Hoon Kim ·
> Kseniya Tsiabus · Luis Müller **External PO:** Peter Tubak (Messe München)
> **Course:** Management & Digital Technologies II · LMU Munich School of
> Management · Summer Term 2026

---

## How to Use This Document

This specification is the single authoritative reference for the MesseBuddy
prototype iteration 1. It supersedes all prior notes, PDFs, and meeting
summaries. Every architectural decision made before implementation began is
recorded here with its rationale. For the non-technical specifications, refer to
the
[working documentation](https://docs.google.com/document/d/1vYRRWtMpqojfWyCz4hGfwWOtxlNONKiLoZO8EFmIAPI/edit?tab=t.0#heading=h.9no5t7o13xjb)
in Google Drive.

**For new agent sessions:** paste this document as context before asking
implementation questions. All terminology, data shapes, component names, and
constraints are defined here. Do not infer from external knowledge — use this
document.

**Append-only sections** are marked `[APPEND-ONLY]`. Add new entries; never
delete or edit existing ones.

---

## Product Overview

[![](https://img.plantuml.biz/plantuml/dsvg/RP91Rzim38Nl_XLSJYcGDIsGup2q2ueEGpDuSO3s5iWMux2n94-Ka_dVZt9Yrm5weqphlSUFUk2WV6XC1PfKwPNPtjrlYyMsS3RWlv1y8LjKZKRujbpCbuljylpzUv842XN2YshHmpraBGSqS6adIOgUdPtMLUpFO99snKIgttW2D7NbMaGed5GOo9QWB3YRE-LrFBsxnbjiuKWAmXuXVNsStFIgfJAuKeTE-5bgw0vH_54Rid3QEr6sEoeRZmoCpEGipy1GNochuQWgqYh87tqCQS5KaySYL2qutzd_MGCNojw8Vt8USsf44NyqMhVYkHeECS7AvLJXrnrv3Z6rf5S1937jg7FojVDYEXhs5ZPU5GU6shjI0dDd-vPs8VivL2wqBuab9nWizieI6xwDmTPO3R2lqlroP0S4itvIIVB1WflSKE2nkiU_3NBWED7FpIRDO7vPGJGQyR_oMdhiS7u0Hns5ZH3Xu2poVBI1MiOzNiF_t6xiCJoeREzEyMvng2aCcnqGpeJVUSjvl0XaTowgPzcJQA-Viasaze1Mozl_3m00)](https://editor.plantuml.com/uml/RP91Rzim38Nl_XLSJYcGDIsGup2q2ueEGpDuSO3s5iWMux2n94-Ka_dVZt9Yrm5weqphlSUFUk2WV6XC1PfKwPNPtjrlYyMsS3RWlv1y8LjKZKRujbpCbuljylpzUv842XN2YshHmpraBGSqS6adIOgUdPtMLUpFO99snKIgttW2D7NbMaGed5GOo9QWB3YRE-LrFBsxnbjiuKWAmXuXVNsStFIgfJAuKeTE-5bgw0vH_54Rid3QEr6sEoeRZmoCpEGipy1GNochuQWgqYh87tqCQS5KaySYL2qutzd_MGCNojw8Vt8USsf44NyqMhVYkHeECS7AvLJXrnrv3Z6rf5S1937jg7FojVDYEXhs5ZPU5GU6shjI0dDd-vPs8VivL2wqBuab9nWizieI6xwDmTPO3R2lqlroP0S4itvIIVB1WflSKE2nkiU_3NBWED7FpIRDO7vPGJGQyR_oMdhiS7u0Hns5ZH3Xu2poVBI1MiOzNiF_t6xiCJoeREzEyMvng2aCcnqGpeJVUSjvl0XaTowgPzcJQA-Viasaze1Mozl_3m00)

### What MesseBuddy Is

MesseBuddy is a **mobile-first Progressive Web App (PWA)** that gamifies the
corporate onboarding experience. It represents an onboarding journey as an
interactive map of office spaces (Milestones), each containing a set of
activities (Missions) a new employee must complete. Progress is tracked via XP
points, and completion is validated through a configurable validation mechanism
chosen per Mission by the Game Maker.

**Core value propositions:**

- Customization by the Game Maker with no developer involvement
- Gamified progression that is non-linear and autonomy-preserving
- Simple offline-first interaction that promotes real human contact over digital
  automation

### What MesseBuddy Is Not

- Not an HRM dashboard or replacement for existing HR tooling
- Not a native mobile app (PWA only)
- Not an SSO or identity management system (prototype scope)
- Not a replacement for company documentation — it links to existing resources

## Technology should create conditions for human connection, not replace it.

## Terminology Glossary

This glossary is authoritative.

| Term                   | Definition                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Session**            | One onboarding journey instance. Has a unique ID, a Game Maker, and a set of Players.                                                                                                                                                                                                                                    |
| **Milestone**          | A top-level grouping on the map — analogous to a hall or room. Contains Missions. Represented as a node on the Milestone Map.                                                                                                                                                                                            |
| **Mission**            | An individual task item within a Milestone. The atomic unit of work for a Player.                                                                                                                                                                                                                                        |
| **Player**             | A new employee going through an onboarding journey. Has read-only access to the cockpit.                                                                                                                                                                                                                                 |
| **Game Maker**         | The admin who configures the session — sets up Milestones, Missions, and validates completions.                                                                                                                                                                                                                          |
| **XP**                 | Experience points earned by completing Missions. Each Milestone has an `xpThreshold` of 100.                                                                                                                                                                                                                             |
| **Validation Method**  | The mechanism by which a Mission completion is confirmed. One of: `gmApprove` (Game Maker approves directly in admin cockpit), `selfApprove` (Player self-marks, immediately approved), or `qr` (Player generates a QR code, Game Maker physically scans it). Set per Mission by the Game Maker; default is `gmApprove`. |
| **Validation Request** | The transient state after a Player marks a non-`selfApprove` Mission complete. The Mission enters `pendingApproval` status and a `ValidationDisplay` is shown until the Game Maker acts.                                                                                                                                 |
| **Validation**      | An app mechanism that allows the game maker or another player to verify that a mission as been completed. Need for XP distribution.                                                                                                                           |
| **Current Missions**   | A curated list of Missions the Game Maker has surfaced to the Player's main view — not all Missions are in this list by default.                                                                                                                                                                                         |
| **Buddy**              | A company-assigned mentor figure displayed on the Player's cockpit. Not a system user — their info is manually entered by the Game Maker.                                                                                                                                                                                |
| **Template**           | A named, portable snapshot of a Session's structure (Milestones, Missions, Resources) with no player data. Used to bootstrap new sessions.                                                                                                                                                                               |
| **Recovery Key**       | An 8-character alphanumeric token shown to a user on first join, used to restore their identity if localStorage is cleared.                                                                                                                                                                                              |

## Tech Stack

[![](https://img.plantuml.biz/plantuml/dsvg/ZLJ1Kjim4BtxAxOvXMb868P3s-bq28427KBJE9IZHxOsGOCj6KbEckdqt_ia9o503yqbA-tJxjktkpvrNbZVL2L99HPMLDdHSLQSP8NHNYZDDdcdT54sakdpw6GmEib6My-N9F7AbqmtOisMZcddeVCsLf9Cs3gZktKP83tgJABHWNNBA-AgBisQkNEm1Iv4nMFn6B6Ni2aU0dueAwLfG5TJe9DqxJnNsPbfj1HstPMcQ1-TH-EPIkU0VYU4t-wcMwy4W5CMXQV9_R2pExoddyep_cRhcjF2gje7vzZagkJ3kR8E3wnPM7PEBPdkEQTXNVSfPRjaIS8HrFIgWENOkpvT2IrBTYJAakwkQMuivSO_K2i3mKlFLP8rmFPHtak-RWKI8OKgaDFOZI31oiqlIB84wyEwR1PA7wAuu1o9ue5VqOdfpNnU8YerZljqhJtRWcluDFiL0fBbfuQT_mUDEW_z2_BwC-4uPBaqb2iD_SC1oYoLHDBfHJgZuUIwHsbwGNNZ7deqXu9WOwnOCEv_t0IXfV0YHwXU549e4h774Cfe-lJXwEFH6nRdUTSzbNWS98bHGkgBAcSfqG6yViamHSgWG-YOqQv7xIJ2gC08X3H7U-VUj3VZ9MkFYxoHSftXEbI0CvocWMOm8MULEUXSYRToWUYypM03rw-X_hIjl_D2Hwg4ngNSOzjWAqGe9nV5uyA66ITL0UIYKFLcU9QGpyRCVv9aokLkoze1lqFH8UZLR3P9CIMvDIiN5Y9YznRjV-0H4mTntDAbF3Rzh4M5TkyZuwnivu0AZB_3MeLnS4tkucP1xsswmRVq-ssSbcqCFD-r6Rif7GYjBCwHeWfZgqMvXzxNUgFY05t7MhhMz-fTSifQuglt5m00)](https://editor.plantuml.com/uml/ZLJ1Kjim4BtxAxOvXMb868P3s-bq28427KBJE9IZHxOsGOCj6KbEckdqt_ia9o503yqbA-tJxjktkpvrNbZVL2L99HPMLDdHSLQSP8NHNYZDDdcdT54sakdpw6GmEib6My-N9F7AbqmtOisMZcddeVCsLf9Cs3gZktKP83tgJABHWNNBA-AgBisQkNEm1Iv4nMFn6B6Ni2aU0dueAwLfG5TJe9DqxJnNsPbfj1HstPMcQ1-TH-EPIkU0VYU4t-wcMwy4W5CMXQV9_R2pExoddyep_cRhcjF2gje7vzZagkJ3kR8E3wnPM7PEBPdkEQTXNVSfPRjaIS8HrFIgWENOkpvT2IrBTYJAakwkQMuivSO_K2i3mKlFLP8rmFPHtak-RWKI8OKgaDFOZI31oiqlIB84wyEwR1PA7wAuu1o9ue5VqOdfpNnU8YerZljqhJtRWcluDFiL0fBbfuQT_mUDEW_z2_BwC-4uPBaqb2iD_SC1oYoLHDBfHJgZuUIwHsbwGNNZ7deqXu9WOwnOCEv_t0IXfV0YHwXU549e4h774Cfe-lJXwEFH6nRdUTSzbNWS98bHGkgBAcSfqG6yViamHSgWG-YOqQv7xIJ2gC08X3H7U-VUj3VZ9MkFYxoHSftXEbI0CvocWMOm8MULEUXSYRToWUYypM03rw-X_hIjl_D2Hwg4ngNSOzjWAqGe9nV5uyA66ITL0UIYKFLcU9QGpyRCVv9aokLkoze1lqFH8UZLR3P9CIMvDIiN5Y9YznRjV-0H4mTntDAbF3Rzh4M5TkyZuwnivu0AZB_3MeLnS4tkucP1xsswmRVq-ssSbcqCFD-r6Rif7GYjBCwHeWfZgqMvXzxNUgFY05t7MhhMz-fTSifQuglt5m00)

All decisions below are **locked**. Do not re-open without a Decision Log entry.
Rationale for each choice is in the Decision Log (Section 13).

| Layer     | Choice                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| Frontend  | React + Vite (PWA via `vite-plugin-pwa` / Workbox)                                       |
| Language  | TypeScript strict mode                                                                   |
| Backend   | Pocketbase — single Go binary providing REST, SSE, file storage, SQLite, and an admin UI |
| Hosting   | Everything bundled into a single Docker container                                        |
| Local dev | `vite dev` + `./pocketbase serve` on `localhost:8090`                                    |

## User Roles & Identity Model

### Roles

**Player (new employee)**

- Read-only cockpit; marks Missions complete and submits validation requests
- Fills in form-type Missions (profile form, structured data)
- One Player record = one Session

**Game Maker (admin)**

- Full read-write cockpit; creates and edits Milestones and Missions
- Approves Mission completions (directly via admin cockpit, or other methods)
- Configures the `validationMethod` per Mission
- Manages Buddy profiles, session templates, and background images

### No SSO in Prototype

There is no authentication system. Identity is UID-based.

- **Player UID:** client-generated UUID on first join, stored in `localStorage`
- **Game Maker UID:** client-generated UUID on session creation, stored in
  `localStorage` and in `sessions.gameMakerId`
- **No Pocketbase auth collections are used**

### LocalStorage Identity Shape

```ts
interface LocalIdentity {
  uid: string; // client-generated UUID
  recoveryKey: string; // 8-char alphanumeric, also in players.recoveryKey
  sessionId: string; // PB record ID of the session
  role: UserRole; // 'player' | 'gamemaker'
}
```

Key: `localStorage.getItem('mb_identity')`

> **Trust boundary:** The `role` field is client-stored and not
> server-validated. The prototype assumes a trusted demo context. For
> production, role must be verified server-side on every mutation.

### Session Constraint

> A single user identity is exclusively tied to one session. This is to avoid
> implementation and deployment complexities during early development and
> testing phase. The final user session management mechanism may change.

Joining a new session requires generating a new UID and completing the tutorial
flow from scratch.

### Identity Recovery

When `localStorage` is cleared (new device, browser reset):

1. User opens Landing Page → clicks **"Recover my progress"**
2. Enters their `recoveryKey` (8-char token)
3. App queries Pocketbase:
   `players WHERE recoveryKey = input AND sessionId = <from URL or manual input>`
4. On match: `LocalIdentity` is reconstructed and written back to `localStorage`
5. User is routed to their cockpit

The `recoveryKey` is displayed **once** on first join with a copy button.

**Game Maker recovery:** same flow but queries
`players WHERE recoveryKey = input AND uid = sessions.gameMakerId`. Role is
restored as `'gamemaker'`.

### Returning User (localStorage Valid)

On every app load, if `mb_identity` exists in `localStorage` and the referenced
`sessionId` resolves in Pocketbase, the user is silently routed to their cockpit
without any interaction.

## Application Views & User Interaction

### System Interaction

[![](https://img.plantuml.biz/plantuml/dsvg/vLRRRXit47tdLmpyKCk0vGReKmMuY2-gKw2ALSj9KC20C5cE9S9SaY6vbeKYG9_w0KM_C5_IuMftTLkvgf670jKJTtUkPyuSwdM8w6EHQv0A9nxpyQllne4-5MGo6kSg16ND-16raXZvAAAAcc2m-03lcm_mexOpwEI5ZgeReiT8a_cH49X5ws6eSKw-UhZ2d0RumC-ESwjCEJHn9TIb2exjrxuMWIumK00CSF0k49HF1-isBf2FGsyddaBeFnA_MpNljLciXnYUdqbqaNpfEBJP0yLpTeNgzOPryrs8HOVG_M6x4UZ10Fr3Q53BREuqHRepdKXF4HWJhSm3nBaZXipOI60VELfRg1j26Q2QpCboCWEAKoll31e9tXQHiOgMKtbFMOHw8aASdiAeUkZ193zppdCkw4YwHnxU4PoU2h6Tc1jhmxS7lxcoyv_aSLrKEZAjOX5wSEZ8I6KcYpIe3p-BjZ0SVGbz3vX-VWwkCXbJiWdmuKt_fWzrElXccKyidLEavTXwSDM_tGfqhpIRYXMxxaO1zAH2vBA1mRDUfWbHxYB3XphMBqkZ881_k_CFpsultjGUCnMd3JGRo0ZIx61iPVjFOQz7js1e1ciu2WwvOtXjL1fDUMKFFg0gMxtd9h4gvg2iCX7KMQr3wdyqwiENt_-2G0JNbzrNtpDJcqtUgcz4pB-wjPka9o5U84EW30pN6mz3DAJNOpNhteEAuLGjJsU5P4lcJMhdTqeUYSRxfQIj5rGU7ZVvvVbyB-uk1hv1kMS8MhWKlPxw1YVRfhQeSiMFr2F9_QVEfzGpVFdZprA9M2hgXZRK8P2-h_NXwwe25j5MaUL-af08_-s_nNRcrHBQvsNrhOMh0V05bGJQCs6LVmceAi-9Rz98Uhu7m9yyT31faU5m37BQBpUT1vMXPjUkjbcPPo7AppVGDvcLpFbVReOurnRvAjWn16gEJuuZ5VGPCgqOocvGadS-oKAA0w7us4qDM9EqfHMBzQLdYM2Va7draIirMyBRQIbeKqRQUhjchKmLZJ8qXlnxHRFZEvEncqUGL3SERj7v3gBkrfGKzn8Z_gU4v7zn2JO0VRthRmy9JKHrHPX2YGL3yQ9TRzllvtTqPK5SAJGgmFNRdt-5AMdULrdu17USKbA6-YyRipfEJvZkwwcIhoiy7QykxuaGhna4_Zyl_WO0)](https://editor.plantuml.com/uml/vLRRRXit47tdLmpyKCk0vGReKmMuY2-gKw2ALSj9KC20C5cE9S9SaY6vbeKYG9_w0KM_C5_IuMftTLkvgf670jKJTtUkPyuSwdM8w6EHQv0A9nxpyQllne4-5MGo6kSg16ND-16raXZvAAAAcc2m-03lcm_mexOpwEI5ZgeReiT8a_cH49X5ws6eSKw-UhZ2d0RumC-ESwjCEJHn9TIb2exjrxuMWIumK00CSF0k49HF1-isBf2FGsyddaBeFnA_MpNljLciXnYUdqbqaNpfEBJP0yLpTeNgzOPryrs8HOVG_M6x4UZ10Fr3Q53BREuqHRepdKXF4HWJhSm3nBaZXipOI60VELfRg1j26Q2QpCboCWEAKoll31e9tXQHiOgMKtbFMOHw8aASdiAeUkZ193zppdCkw4YwHnxU4PoU2h6Tc1jhmxS7lxcoyv_aSLrKEZAjOX5wSEZ8I6KcYpIe3p-BjZ0SVGbz3vX-VWwkCXbJiWdmuKt_fWzrElXccKyidLEavTXwSDM_tGfqhpIRYXMxxaO1zAH2vBA1mRDUfWbHxYB3XphMBqkZ881_k_CFpsultjGUCnMd3JGRo0ZIx61iPVjFOQz7js1e1ciu2WwvOtXjL1fDUMKFFg0gMxtd9h4gvg2iCX7KMQr3wdyqwiENt_-2G0JNbzrNtpDJcqtUgcz4pB-wjPka9o5U84EW30pN6mz3DAJNOpNhteEAuLGjJsU5P4lcJMhdTqeUYSRxfQIj5rGU7ZVvvVbyB-uk1hv1kMS8MhWKlPxw1YVRfhQeSiMFr2F9_QVEfzGpVFdZprA9M2hgXZRK8P2-h_NXwwe25j5MaUL-af08_-s_nNRcrHBQvsNrhOMh0V05bGJQCs6LVmceAi-9Rz98Uhu7m9yyT31faU5m37BQBpUT1vMXPjUkjbcPPo7AppVGDvcLpFbVReOurnRvAjWn16gEJuuZ5VGPCgqOocvGadS-oKAA0w7us4qDM9EqfHMBzQLdYM2Va7draIirMyBRQIbeKqRQUhjchKmLZJ8qXlnxHRFZEvEncqUGL3SERj7v3gBkrfGKzn8Z_gU4v7zn2JO0VRthRmy9JKHrHPX2YGL3yQ9TRzllvtTqPK5SAJGgmFNRdt-5AMdULrdu17USKbA6-YyRipfEJvZkwwcIhoiy7QykxuaGhna4_Zyl_WO0)

### Entry Points (Landing Page)

| Path                 | Condition              | Destination                                |
| -------------------- | ---------------------- | ------------------------------------------ |
| **Restore**          | `localStorage` valid   | Silent redirect to Player or Admin Cockpit |
| **Join Session**     | Player, first time     | Identity Gate → Player Cockpit             |
| **Create Session**   | Game Maker             | Session Setup → Admin Cockpit              |
| **Recover Progress** | `localStorage` missing | Recovery Gate → Restore → Cockpit          |

**Session Setup** allows: create blank session, or load from Template (JSON
import).

### Player Cockpit

The Player's primary view — read-only. Components in render order:

- `TopBar`
- `TutorialOverlay` (first login only)
- `MilestoneMapViewer` ·
- `MilestoneSidebarViewer`
- `CurrentMissionsList`
- `MissionDetailPopup`
- `BuddyCard`
- `ResourcesSection`

**Tutorial flow (sequential, non-skippable):**

- Step 1 → highlights Current Missions → launches Mission 1 (Profile Setup Form)
- Profile Form submitted (`autoApproved`) → `profileComplete = true`
- Step 2 → explains the Milestone Map · Step 3 → Buddy Card · Step 4 → Resources
- `tutorialComplete = true` → Player has free access

### Mission Type Routing

| Type   | Behaviour                                     | Completion Path                                                                                             |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `text` | Opens `MissionDetailPopup` with markdown body | Mark Complete → `ValidationDisplay` → completion path per `validationMethod` (see below)                    |
| `link` | Opens external URL in new tab                 | Mark as Visited → `ValidationDisplay` → completion path per `validationMethod` (see below)                  |
| `form` | Navigates to `FormPage`                       | Save and Submit → `status: autoApproved` → back to Cockpit (no validation gate; ignores `validationMethod`) |

### Mission Validation

When a Player marks a non-`form` Mission complete, `ValidationDisplay` mounts
and routes to one of three strategies based on `mission.validationMethod`:

**`gmApprove` (default)**

1. Player marks Mission complete → `ValidationDisplay` mounts showing a "Waiting
   for approval" state
2. `upsertProgressEvent` called → `status: pendingApproval`
3. `ValidationDisplay` polls `progress_events` for `(playerId, missionId)` (or
   holds SSE subscription)
4. Game Maker sees the pending request in `PendingApprovalsPanel` (Admin
   Cockpit)
5. Game Maker clicks Approve → `upsertProgressEvent` → `status: completed`
6. `ValidationDisplay` receives update → dismisses → XP recalculates

**`selfApprove`**

1. Player marks Mission complete → `upsertProgressEvent` called immediately with
   `status: autoApproved`
2. No `ValidationDisplay` shown — cockpit updates inline

**`qr` (alternative — retained for physical co-location contexts)**

1. Player marks Mission complete → `ValidationDisplay` mounts showing QR code
2. QR encodes: `{ playerId, missionId, sessionId, xpValue }` — client-side, no
   server call
3. `ValidationDisplay` opens SSE subscription on `progress_events` for
   `(playerId, missionId)`
4. Game Maker opens `QRScannerView`, device camera decodes QR
5. `ScanResult` shows: player name, mission title, XP value
6. Game Maker confirms → `upsertProgressEvent` → `status: completed`
7. PocketBase SSE push fires → `ValidationDisplay` receives event → dismisses →
   XP recalculates

> **Trust boundary (qr only):** `xpValue` in the QR payload is client-generated
> and not server-verified. For production, re-derive from `missions.xpValue` at
> scan time. Acceptable for prototype demo context. See OD-07.

SSE subscription is only held by `ValidationDisplay`, and only when
`validationMethod = 'qr'`. All other validation paths use polling or a one-time
fetch. Everything else in the app is fetched once on mount.

### Admin Cockpit

The Game Maker's primary view — read-write. Components in render order:

- `TopBar`
- `PlayerSelectorDropdown`
- `PlayerProfileCard`
- `MilestoneMapEditor`
- `MilestoneSidebarEditor`
- `CurrentMissionsList` (drag-to-reorder)
- `BuddyAssignmentForm`
- `ResourcesEditor`
- `SaveActions`

**Background Image:** Game Maker uploads JPEG/PNG/WEBP → stored in Pocketbase
file storage → `session.bgImageUrl` updated → both Player and Admin
`BackgroundCanvas` instances fetch the same URL.

**GridOverlay:** Toggleable snap-to-grid, visible in edit mode only. Aids
Milestone node placement.

## Use Cases

Use cases are the application's named operations. Business logic belongs here —
not in components, not in PB queries. Each use case is a pure function or a
small module. Components call use cases; use cases call adapters.

We intentionally keep the backend operations lean and small so it can be as
flexible as possible for the users.

| Use case              | Inputs                                | Output                | Side effects                |
| --------------------- | ------------------------------------- | --------------------- | --------------------------- |
| `deriveXP`            | `Mission[]`                           | `number[]` (xpValues) | None — pure function        |
| `computeProgress`     | `ProgressEvent[]`, `Mission[]`        | `PlayerProgress`      | None — pure function        |
| `upsertProgressEvent` | `playerId`, `missionId`, `patch`      | `ProgressEvent`       | PATCH or POST to PB         |
| `validateMission`     | `ScanData`, `gameMakerUid`            | `ProgressEvent`       | Calls `upsertProgressEvent` |
| `completeForm`        | `missionId`, `formResponse`           | `ProgressEvent`       | Calls `upsertProgressEvent` |
| `joinSession`         | `sessionId`                           | `LocalIdentity`       | Writes `localStorage`       |
| `recoverIdentity`     | `recoveryKey`, `sessionId`            | `LocalIdentity`       | Writes `localStorage`       |
| `exportTemplate`      | `Session`, `Milestone[]`, `Mission[]` | `TemplateExport`      | None — pure function        |
| `importTemplate`      | `TemplateExport`                      | `sessionId`           | POST chain to PB            |

> **`upsertProgressEvent` is the single write path for all ProgressEvent
> mutations.** No component or page may PATCH or POST to `progress_events`
> directly. This enforces C-05 (one record per `(playerId, missionId)`) at a
> single point.

## React Component Architecture

[![](https://img.plantuml.biz/plantuml/dsvg/VLPTRo8t57tdLzpoiebAe5BtgUfMImZPP3Sq4w3RIbKLcR41DvxnnFP0KTN_tcFF1yCmsIWFsEDhdtlkkSV-Q1qpBayKSSasXYNFFxn_Zl6laqod8dMzxsGQgvmB-ddoVZHv_pofllpIwpdfbA07TX26VgJw2zqKU_Lw4vqw9bDXdgzrdd9c3XVPdWseFnSiTXJzFkvVqhyzmbyTVQ5OocMwmQg7ubV4Dg9_32f7qzIP0sLQfcv8SvqxOIctGE8qVSRiW2P6C2Te8QoL6cDjQ2vYlSEQoEYDmJojbTxROV-oXI5JFgc9ZbyowN1Or1ntuy68N-bK7MWdnPxMEAs86j9YYqDe9fMm3llJZ6L0bnlZoPh90CyEw2jJaZE7mOsq7i60hdFE3pHXXW-0tUhSnA83BkE9J8zenutXDy3kZGGzDTfFBF7GNZpY-wBebY8HIa3ZB3DwnnHcM2hKu3GRcdBfj1bKoTJZ0lyOaviq0T965kMQysI09V4u0VEs_DcLGCg5iSGFAKjax1D8Q2s5ufWpSYTIMXterayiugr8s9z_3UaEUW9gOhdJHKA2XyWhTyW49MKbpY6zcaNCKkWO9p_DozzVGTmvi76Ct2mEuM8dOq4nM3LiI8zU6H1al6KhDCr-2uIxkk0puRQQqmTwzshU3Ua6ClNiFyqfOmUb6IT0fmoI1HnB7W68p9LhLOvYdQwbISAcFezM8abLjI31_gmnzEa8CogguZDPR9a1FtLmatOq7RAA7OXkA245Q4eWXz1ZZ5OiVjaOt_cW8TqnYymCssm20p8bWRCeGT0vusKj2kNtPyVHMyZAba5noKAmIbHQ78PZ_94VdCa5CGw9X9F1bJCQacwf_mpCxhmn-sVDwa6S8BhDbRgoiH4dbQQDzwIcEvJU1TjwcjVxbtrNjLqzZpYP983lT-7IUfx0imKTsBjaRTWM5YneCIMRhm17PW765fr1mQw25Aqps75pg2HuxeYdW6nf0_seQ_wCYy81cL9ra_dwj_O429yLYur6KeK5Gp8DTREYQT5SqeZO0VpQw0Ivc0u9uJAOW1WOQ_ytAoZyzbYYt0XQBhpmSbLCGTDGyX_HWFp5Xt9KzyE0yWntYgl6qrqmiP9VKKgi25F22MzO0_eRrqzzwvZYohddY9GE9HJ_PDgufK04jXYWditnEV6hCMUP2zuJmTE5kqOcL4vwz7KkWUb2_AlolWrAyxn7rxIu-O8-L0gSHinuZp9iJvyNZxzMpecsrkIza7kghq85YbvViywBHsbik81X57xzq1XwCDS6PSSMu-W-OCCNd1fMLNpyHBdaDKk7Bm8CsOAxUp-lLIZjVut7nCqAf9om4QnfkbZIzrxetlRcGXqV4WqbD4f3etPj4EZZMfT_opDDOO5lhMtQLcqyQpI6w8xeyfO4nOFB0-ACcPT0jnSNNQGwlGetNTL5b-Mcfm-0RiHqmIlp3KxuLcnd1ZwWS_rRlj2YgNjLep2jbgABJL9UqRW2tRO2sxY9lnNyQawYZa-AHb2pPyjrnw_DhWizKoLod0yQ3AgBnil9tIXwN2n7dwRBGT0Wljqjbz7PngsEmOk0sr5uYRKQeupiq4Su-CpGyP-LBlKiTk6PKD4GVFwoNqJvxlY8Sk3H_py0)](https://editor.plantuml.com/uml/VLPTRo8t57tdLzpoiebAe5BtgUfMImZPP3Sq4w3RIbKLcR41DvxnnFP0KTN_tcFF1yCmsIWFsEDhdtlkkSV-Q1qpBayKSSasXYNFFxn_Zl6laqod8dMzxsGQgvmB-ddoVZHv_pofllpIwpdfbA07TX26VgJw2zqKU_Lw4vqw9bDXdgzrdd9c3XVPdWseFnSiTXJzFkvVqhyzmbyTVQ5OocMwmQg7ubV4Dg9_32f7qzIP0sLQfcv8SvqxOIctGE8qVSRiW2P6C2Te8QoL6cDjQ2vYlSEQoEYDmJojbTxROV-oXI5JFgc9ZbyowN1Or1ntuy68N-bK7MWdnPxMEAs86j9YYqDe9fMm3llJZ6L0bnlZoPh90CyEw2jJaZE7mOsq7i60hdFE3pHXXW-0tUhSnA83BkE9J8zenutXDy3kZGGzDTfFBF7GNZpY-wBebY8HIa3ZB3DwnnHcM2hKu3GRcdBfj1bKoTJZ0lyOaviq0T965kMQysI09V4u0VEs_DcLGCg5iSGFAKjax1D8Q2s5ufWpSYTIMXterayiugr8s9z_3UaEUW9gOhdJHKA2XyWhTyW49MKbpY6zcaNCKkWO9p_DozzVGTmvi76Ct2mEuM8dOq4nM3LiI8zU6H1al6KhDCr-2uIxkk0puRQQqmTwzshU3Ua6ClNiFyqfOmUb6IT0fmoI1HnB7W68p9LhLOvYdQwbISAcFezM8abLjI31_gmnzEa8CogguZDPR9a1FtLmatOq7RAA7OXkA245Q4eWXz1ZZ5OiVjaOt_cW8TqnYymCssm20p8bWRCeGT0vusKj2kNtPyVHMyZAba5noKAmIbHQ78PZ_94VdCa5CGw9X9F1bJCQacwf_mpCxhmn-sVDwa6S8BhDbRgoiH4dbQQDzwIcEvJU1TjwcjVxbtrNjLqzZpYP983lT-7IUfx0imKTsBjaRTWM5YneCIMRhm17PW765fr1mQw25Aqps75pg2HuxeYdW6nf0_seQ_wCYy81cL9ra_dwj_O429yLYur6KeK5Gp8DTREYQT5SqeZO0VpQw0Ivc0u9uJAOW1WOQ_ytAoZyzbYYt0XQBhpmSbLCGTDGyX_HWFp5Xt9KzyE0yWntYgl6qrqmiP9VKKgi25F22MzO0_eRrqzzwvZYohddY9GE9HJ_PDgufK04jXYWditnEV6hCMUP2zuJmTE5kqOcL4vwz7KkWUb2_AlolWrAyxn7rxIu-O8-L0gSHinuZp9iJvyNZxzMpecsrkIza7kghq85YbvViywBHsbik81X57xzq1XwCDS6PSSMu-W-OCCNd1fMLNpyHBdaDKk7Bm8CsOAxUp-lLIZjVut7nCqAf9om4QnfkbZIzrxetlRcGXqV4WqbD4f3etPj4EZZMfT_opDDOO5lhMtQLcqyQpI6w8xeyfO4nOFB0-ACcPT0jnSNNQGwlGetNTL5b-Mcfm-0RiHqmIlp3KxuLcnd1ZwWS_rRlj2YgNjLep2jbgABJL9UqRW2tRO2sxY9lnNyQawYZa-AHb2pPyjrnw_DhWizKoLod0yQ3AgBnil9tIXwN2n7dwRBGT0Wljqjbz7PngsEmOk0sr5uYRKQeupiq4Su-CpGyP-LBlKiTk6PKD4GVFwoNqJvxlY8Sk3H_py0)

### Component Class Diagram

[![](https://img.plantuml.biz/plantuml/dsvg/pLfVRnit4d_VJx78IzHhLDpBlHYuGnNPJjHQzaPIVIsA8g1sQOdDxd93ScKBXm3t8UuJzfDqkBlayg_iN8eaXXyapd0ud1aEvpVKzrmW9jggJ0k2TWnLR__-ZxTvYJX_czEgeJMknLl4yZqHE1SjmuaWeiJfN17JkMHEp_lPIV8y_UD__uN_T9PbwVhrnTNLCF2r_IVTBjDPqwJ_ILBu-pPl6OCThMWhy5dA1IFrhgTmp3cXzQAmXviI7J5pHrkEsOgMeuWFmr9Ng2xWUuPsU5XogWKlwgOLbfnfHGj73LhF6KO2_q1RLkFZv9kpz419eOW_K5AlUu6QfDRUqEObOcgdlUBNg78MG0S4uV0JA-rXGGKgVyxEqhgjjfZrWooqnKqhA2Eel3bW1ckezRZ03J_Jr3Ly_VKtlIS8fH8BR6rdEZX3ijhhrlX1-Dj3kvUeq7RzjaHRx6pYW63fMdWg_vnPCm-eRB5UyOCHqElNizN5URgSPMcsMYmNcyNjnPU9xK7pboX_jsEqhOivgW-8gosG2YBCSo8gXHDDsz_XI5yItoHBKc8ku7XVGmXggKwO1qpya66MOsbZqs77u6Z3w8v1i0Q9a9H4ostX1KEx7ThAeDjIY3rKwm0gIVxEFGpdm7vH5vC79Vb5UbGVn-WPlPjTpNwvMANpc_cFsMBpjUIimI5PTrxdD7_N467aZuzAJ91iId0uBhHxNGQK2tB0InAIEULxUgyEyEW2BsIMgBab-1xhN5Cf2lXJSwdJlzqjWi5AQytQUtUCFYjBx2aa6bp8E3NqLKhzGjiPmw-1OudOkr6b9yQf4fCDeNg5TxWkz7aGk88jzOCB-09xygon9WNU8XQnYEisJV0pyqEpsOCEUreMjjP3ddIpSzKxiRDvzqbPN9sxYmFC0d9cVZUISaavTi_K82hc4RNxUQ_ImCsl21VZrZzDhKSqK5pWRNshnFLKmX0h7FsqUeEhkP9MECa75qGyFITjw6vNuk1z1zGBaELbCHpYN4F4RUXWPkyk75G_nmAHCgDDsvpUNSpPfX6jGqVukjrMH0YmgPy9Rb592YIa1eGtHX4GhfQgOBQ9gZf8nuMjqa4lkiHYJq7OhJEYLDS2VCtVh3v5uuVcrYeTJYlydWtSPeeb_D-8s5QLuy_Jcxeyfk3iGYQxz7wFwzJTSVhFzDbxzcnCMhWhDg6yPHHudPqDUzZ8MjxDl16DFrMvNTNhWaSTNxP5SJIFN-tbFQlAx4O4hW66FAbkpMaju4upnzNIAyoXYCunNyEL27eg3PWQFzCiG_Q1wrFYe3SjPaVRRNUa57Blg-ZSxipAsPFtvdJtvFOyTfsUOvdpCNEzT4fUxo-9AEmWSpTlcbxueI2EZJFIMfOSYwVBczKopMQllb0z_DGowfAoogoUmaacVEffBSjjBnEZ0rPNbKVhagHzYEv0WtE8rREqhxxLqJedJ1pjW_L8cfLxkIIur0xa-HvN8BWRN7TVB4HZRWOpHhs8ckzHlSCJYprKARzPfUlvxFeQgkKlxjYegz-irZcgQzoLNif4u1COdDFwZh3AoMy3SOL_xsfasssye_1MGYZ99LsedIJN2Rfe3jcCeKkCYr61Svn3hJfXWx3GkUMphWntec6F95JI4UkkjTOQFeRnuwa_SeCDzdAjrLjg4egGsVboSVsrGQanDcP5HUedWoaDcxB_3rHvXpjoG_CCrRZKtkk9ZvJ3muqwSLFMYzGhKiBU-uY97yQ6MQVl2iFTmuLvX_nb8QVszLZ8cUXutJc2idD6cuBUrxPIqeRT1x0atDVwObRkyzDzB-y4VB3a-MPm5WmYPLdoqy-2b85FWcHf78FZHNggFQASKOp1xNj4bcoMHBE62wEP29RdDMesz1KZ3iYQTfqVu8wW_B4DrbkeAIagHhGz0EIOzNhsYNIHl3jBREdKC7o02yIT1uUwd-ULmvsoillfdtUvCwSl2jO3yEY2ofoMRIKnijrklUVkCUdnP000sjs7I9H5S8sFpIC0iOiBkzji-LaHem6vmfI1eu11j_f-_Uqar8r4ZaJXCEOthXn8x1eY335bJUVkQ8xg79TsKL3I770LGtV21zHzAUMku3aA8BPCLRPUWNhj10uuNRNbm-FCtHt9eJOugYGPxdOFAJdhWzwh0woLt4wgxiExIwWCExfOOpPIol27ETmbwjM4HOoqEZO0L28x2nhB13QkIBTl494RR2yOdezq8Sm0Ufw-9aK1QBc3p4EiV2Trat1P8eLdLhLlHycTBFEvLUuRTK5HTEFXWzcJFkbOTYA6lNQQM8g43cT73XnDZMC2smk06MtXqwlwhJEhvp03M-_g2bAANDwvAJgEivvHNTxAhjsyoTRdi6-oMAUWB_kvFTNe6-iEWcsCU5EYz_L4COpqZxbvzKroIpY10tcYvf6vSTOrJCRNfX1uZQJHRZhVu0eIcj_Ml88BrQEPAolYaXQe736L0YWdAezG_XQ3DAjUDM7CwkQdpUBwrLS4O0AGHhvVJwV_CX-NzPZtRAGfBWJI1DKYqGCMa8w_byrlbjdDUh5Pt5n_3dib_elOtwRJuPKxHhJVfYDS_aFMOupM6q-4EV0a4XNhTkyZZ5wVFV4xxv9FTxKZz72ZEBAexjX6w6vRDKa23uET8EVjEiPdFKN7cDntlXYV_P1dw6O_qnbkwBOQUizoUSotf2xOXXyaU8JXvmQ9x-VWF9UkfYTU0rjITGCvJ3RxlacYkw6IfA_X9B5RPrtqwaPMW3Xsdg8TeC-S7BgqwFPuZFGGf8MR2ATu3UGVOGirU99msqVo1pehOS5-2-4HFWi8Xdb36Ih862YWmenECHDcCWeAErSC5T2ZkIB8PpK2Okm67e-nsDd7onSMfvaB7cCRB9BOkBHZi21XWC77SW4c0uQ5rl1HKu0h1eG2h2CwwREAGpBA-yIjSBsqP5QOAa2ikYz9leSJr5Rbdm00)](https://editor.plantuml.com/uml/pLfVRnit4d_VJx78IzHhLDpBlHYuGnNPJjHQzaPIVIsA8g1sQOdDxd93ScKBXm3t8UuJzfDqkBlayg_iN8eaXXyapd0ud1aEvpVKzrmW9jggJ0k2TWnLR__-ZxTvYJX_czEgeJMknLl4yZqHE1SjmuaWeiJfN17JkMHEp_lPIV8y_UD__uN_T9PbwVhrnTNLCF2r_IVTBjDPqwJ_ILBu-pPl6OCThMWhy5dA1IFrhgTmp3cXzQAmXviI7J5pHrkEsOgMeuWFmr9Ng2xWUuPsU5XogWKlwgOLbfnfHGj73LhF6KO2_q1RLkFZv9kpz419eOW_K5AlUu6QfDRUqEObOcgdlUBNg78MG0S4uV0JA-rXGGKgVyxEqhgjjfZrWooqnKqhA2Eel3bW1ckezRZ03J_Jr3Ly_VKtlIS8fH8BR6rdEZX3ijhhrlX1-Dj3kvUeq7RzjaHRx6pYW63fMdWg_vnPCm-eRB5UyOCHqElNizN5URgSPMcsMYmNcyNjnPU9xK7pboX_jsEqhOivgW-8gosG2YBCSo8gXHDDsz_XI5yItoHBKc8ku7XVGmXggKwO1qpya66MOsbZqs77u6Z3w8v1i0Q9a9H4ostX1KEx7ThAeDjIY3rKwm0gIVxEFGpdm7vH5vC79Vb5UbGVn-WPlPjTpNwvMANpc_cFsMBpjUIimI5PTrxdD7_N467aZuzAJ91iId0uBhHxNGQK2tB0InAIEULxUgyEyEW2BsIMgBab-1xhN5Cf2lXJSwdJlzqjWi5AQytQUtUCFYjBx2aa6bp8E3NqLKhzGjiPmw-1OudOkr6b9yQf4fCDeNg5TxWkz7aGk88jzOCB-09xygon9WNU8XQnYEisJV0pyqEpsOCEUreMjjP3ddIpSzKxiRDvzqbPN9sxYmFC0d9cVZUISaavTi_K82hc4RNxUQ_ImCsl21VZrZzDhKSqK5pWRNshnFLKmX0h7FsqUeEhkP9MECa75qGyFITjw6vNuk1z1zGBaELbCHpYN4F4RUXWPkyk75G_nmAHCgDDsvpUNSpPfX6jGqVukjrMH0YmgPy9Rb592YIa1eGtHX4GhfQgOBQ9gZf8nuMjqa4lkiHYJq7OhJEYLDS2VCtVh3v5uuVcrYeTJYlydWtSPeeb_D-8s5QLuy_Jcxeyfk3iGYQxz7wFwzJTSVhFzDbxzcnCMhWhDg6yPHHudPqDUzZ8MjxDl16DFrMvNTNhWaSTNxP5SJIFN-tbFQlAx4O4hW66FAbkpMaju4upnzNIAyoXYCunNyEL27eg3PWQFzCiG_Q1wrFYe3SjPaVRRNUa57Blg-ZSxipAsPFtvdJtvFOyTfsUOvdpCNEzT4fUxo-9AEmWSpTlcbxueI2EZJFIMfOSYwVBczKopMQllb0z_DGowfAoogoUmaacVEffBSjjBnEZ0rPNbKVhagHzYEv0WtE8rREqhxxLqJedJ1pjW_L8cfLxkIIur0xa-HvN8BWRN7TVB4HZRWOpHhs8ckzHlSCJYprKARzPfUlvxFeQgkKlxjYegz-irZcgQzoLNif4u1COdDFwZh3AoMy3SOL_xsfasssye_1MGYZ99LsedIJN2Rfe3jcCeKkCYr61Svn3hJfXWx3GkUMphWntec6F95JI4UkkjTOQFeRnuwa_SeCDzdAjrLjg4egGsVboSVsrGQanDcP5HUedWoaDcxB_3rHvXpjoG_CCrRZKtkk9ZvJ3muqwSLFMYzGhKiBU-uY97yQ6MQVl2iFTmuLvX_nb8QVszLZ8cUXutJc2idD6cuBUrxPIqeRT1x0atDVwObRkyzDzB-y4VB3a-MPm5WmYPLdoqy-2b85FWcHf78FZHNggFQASKOp1xNj4bcoMHBE62wEP29RdDMesz1KZ3iYQTfqVu8wW_B4DrbkeAIagHhGz0EIOzNhsYNIHl3jBREdKC7o02yIT1uUwd-ULmvsoillfdtUvCwSl2jO3yEY2ofoMRIKnijrklUVkCUdnP000sjs7I9H5S8sFpIC0iOiBkzji-LaHem6vmfI1eu11j_f-_Uqar8r4ZaJXCEOthXn8x1eY335bJUVkQ8xg79TsKL3I770LGtV21zHzAUMku3aA8BPCLRPUWNhj10uuNRNbm-FCtHt9eJOugYGPxdOFAJdhWzwh0woLt4wgxiExIwWCExfOOpPIol27ETmbwjM4HOoqEZO0L28x2nhB13QkIBTl494RR2yOdezq8Sm0Ufw-9aK1QBc3p4EiV2Trat1P8eLdLhLlHycTBFEvLUuRTK5HTEFXWzcJFkbOTYA6lNQQM8g43cT73XnDZMC2smk06MtXqwlwhJEhvp03M-_g2bAANDwvAJgEivvHNTxAhjsyoTRdi6-oMAUWB_kvFTNe6-iEWcsCU5EYz_L4COpqZxbvzKroIpY10tcYvf6vSTOrJCRNfX1uZQJHRZhVu0eIcj_Ml88BrQEPAolYaXQe736L0YWdAezG_XQ3DAjUDM7CwkQdpUBwrLS4O0AGHhvVJwV_CX-NzPZtRAGfBWJI1DKYqGCMa8w_byrlbjdDUh5Pt5n_3dib_elOtwRJuPKxHhJVfYDS_aFMOupM6q-4EV0a4XNhTkyZZ5wVFV4xxv9FTxKZz72ZEBAexjX6w6vRDKa23uET8EVjEiPdFKN7cDntlXYV_P1dw6O_qnbkwBOQUizoUSotf2xOXXyaU8JXvmQ9x-VWF9UkfYTU0rjITGCvJ3RxlacYkw6IfA_X9B5RPrtqwaPMW3Xsdg8TeC-S7BgqwFPuZFGGf8MR2ATu3UGVOGirU99msqVo1pehOS5-2-4HFWi8Xdb36Ih862YWmenECHDcCWeAErSC5T2ZkIB8PpK2Okm67e-nsDd7onSMfvaB7cCRB9BOkBHZi21XWC77SW4c0uQ5rl1HKu0h1eG2h2CwwREAGpBA-yIjSBsqP5QOAa2ikYz9leSJr5Rbdm00)

### Pages (top-level routes)

```
App
├── LandingPage
├── PlayerCockpitPage
├── AdminCockpitPage
├── FormPage
└── QRScannerView
```

### Shared Component Contracts

These components are used in both cockpits. A boolean prop gates role-specific
behaviour.

| Component          | Shared via                  | Key prop              | Trade-off                                                                              |
| ------------------ | --------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `MilestoneNode`    | Both map views              | `draggable: boolean`  | Single component; two actors. Acceptable for prototype. Split if edit behaviour grows. |
| `MissionCard`      | Both cockpits + sidebars    | `editable: boolean`   | Same trade-off as above.                                                               |
| `BackgroundCanvas` | Both map views              | `imageUrl: string`    | Pure rendering; no role-specific logic.                                                |
| `TagBadge`         | Mission cards, detail popup | `variant: MissionTag` | —                                                                                      |
| `XPBadge`          | Mission cards               | `value: number`       | —                                                                                      |

### Player Cockpit Component Tree

```
PlayerCockpitPage
├── TopBar
├── TutorialOverlay                   [first login only]
├── MilestoneMapViewer
│   ├── BackgroundCanvas
│   ├── MilestoneNode ×N              [draggable=false]
│   ├── YouAreHereMarker
│   └── ProgressLegend
├── MilestoneSidebarViewer            [overlay on milestone click]
│   └── MissionCard ×N                [editable=false]
├── CurrentMissionsList
│   └── MissionCard ×N                [editable=false]
├── MissionDetailPopup                [on mission click, text/link types]
├── ValidationDisplay                 [full-screen, mounts on Mark Complete]
│   ├── QRDisplay                     [only when validationMethod = 'qr'; SSE active]
│   └── PendingApprovalDisplay        [only when validationMethod = 'gmApprove']
├── BuddyCard
└── ResourcesSection
    ├── SearchBar
    └── ResourceCard ×N
```

### Admin Cockpit Component Tree

```
AdminCockpitPage
├── TopBar
├── PlayerSelectorDropdown
├── PlayerProfileCard
├── PendingApprovalsPanel             [shows missions in pendingApproval state across all players]
│   └── ApprovalRequestCard ×N
├── MilestoneMapEditor
│   ├── BackgroundImageUploader
│   ├── BackgroundCanvas
│   ├── GridOverlay
│   └── MilestoneNode ×N              [draggable=true]
├── MilestoneSidebarEditor
│   ├── MissionCard ×N                [editable=true]
│   └── MissionEditor
│       ├── MarkdownEditor
│       ├── DifficultySelector
│       ├── TagSelector
│       ├── MissionTypeSelector
│       ├── ValidationMethodSelector  [gmApprove | selfApprove | qr]
│       └── FormEditor                [when type = 'form']
│           └── FormFieldEditor ×N
├── CurrentMissionsList               [drag-to-reorder]
├── BuddyAssignmentForm
├── ResourcesEditor
└── SaveActions
    └── SaveTemplateModal
```

### Supporting Pages

```
FormPage
└── FormField ×N                      [driven by FieldSchema[]]

QRScannerView                         [only reachable when validationMethod = 'qr']
├── CameraFeed                        [device camera API]
└── ScanResult                        [confirm / reject]
```

## TypeScript Data Model

[![](https://img.plantuml.biz/plantuml/dsvg/pLXVRzis47_Nfo3oCg11WlPb3qOHD77SrLkIUhPJR4y1BPqTBXIfaLGQTskmhp1W7soVOPzaHr6KA4hEcc5T4mI9T3oUxk_lZdob3LMcp3d96Dqecbyz__egvLJhgumQUfNB37XYcE50bji25gbYXI6dk4REgxNaA_BN7x_XBvbSN9vFviVBwTkBHKrx8hy9Y38dvqnh9eKrW_oI4FmnS6Ug1yx4JVMmbYfFFdRvwQPcpwb0fqYrhTu4GAQFYqB9MyehIgas89n0UGigAy6BcYcvKQ3rmb1JwbfS0I9ZObCzfp8lE1Z8gZTQ6kaa8w7HXeCsKa17HbdWJY-42V-TI6OjOWvQbYg5m0ERacLGFTtYW-mw8vDfcLkBwlsl6V1io7tsWIgWrOi63gcZvoKtRE7UQncN6jHSSY-Yu7GBogb2SyZf3Rvz39BgtV7PvOIyFVbsCbu-fQnAc32WrZG5vvP5UetQrrRjisn4j54-CFkShe1tIGRzE6fTweWAVYwP0jozakWaAXmPlPJ2jUGPgAuGMHZCK3qYPqoRUxToZ_vhbVj-FgDRBcdcLNCUdqOAvYxNOxA6GV9TyOxo4jN7YAxgyEsZX1AoOzDGGpNE04iZcnh8lHu3Baabbv61kahsKPpz7TcBb8eAa3wtXKxm1URfeEYbHSdkIWOfWcJbb9hSKTnzEoY7_LBtDT-XefBsQxwU7EqdoKJqkRQKPc_7tqsM9yUB2Qd-VF4QicL4LwWfJGsfcWwPdSpHPIhRLKWfeeo1Y5WMMOVOCNeoNqmNoyd5aYn_d4sU08Gapj8w-EJbomAKnl95e3qwydQBNfAjDjESRk1IHKLZOVFSmkOqT43jpIfXTtnYHrgLiSlxgXGArg0GflgbW3rBoD8YKaYbjrYUggUwo-0EA0BDUm2W35PtnCXbIYtqHTjP3XyG928HDunpFPPYZIrEc0Wi0vPJk0KkYo46JiMcHFV7K5ijlfVgPc6siJ4WG6tO1tJzqAPCKQpLuJNquXe1RrmtyBOR-C2Ub5csdJcknuKNTxCDOiHIpWPXiX_jeIY9Ki4dXJYLmc1rXtHlGmFfZpEWh-3T372e4QOBrjj1wbsnlCO1oVRIxW9YZcskJUloEZvKf3iqpBrXyOBfDuYLpBP3Sq4mgzR9T8TTGr3Uyt36rckMug2rZIqTw626Rdp2jTEjhu5oW_cDE7fQGh_Wklwf6_vKZ4l40M5gORgVgQzneAvdes4dxkZBQpiOULs32Uk-1RTwrftSehp7HUXn4q8zWdHdUBU6ap-hUiz95CLc8UZ5pYxq1yxX1JeBUYNX1_J7MJEGLYw9mdc_1lSuUvX-npHRSV1u44OmEDhDtapisUxigJJHjeysCEBZWyw30bC55ELXckqeIg0AuV27sIVYHE5GfONcS77Nj5f3ONqSE_Tvrf_RmxRzi3t3AMoaeJos9Oyzr210HBz_hAAdYgvDYv6FSJlJfqnPpEeSTFvNXFnNOEXDNm8w2HVgSNNG-7whWhj2gW5KQDpKYyrz1viYVU_zgT7LkL_rTN_VdOJ__7q-6R-TdvBfnPl9VBeylXX_eKD0qepvBtyzEF2ZS4HrLH0Hmy4dMcfSrgCFIM_xKlpPiAr4QzwnqQKNkLmSV_CqpbEneyExYSF3e-0APqHi7IN1mToknxTCDaqh2FDLxfZQYxHQJBSPMwReogiHrFGuozIvaQf5XQTYozFS68s87KMJFk0_gFZWKN2nd5-EbvUseSqdP-xAyirqzXyrDcy2sNknHmuEZiZUyyF3Ptl1n3iYyhtGk_ZgOzk8NDETF8qRHuI9b9SPx6GD7Rf39lwF00s3KHFidMZIUhrlb9Cr8jMipuH-Y3SE7Nu6J_yt3-pfz9WHoUohJffy3BdnCHWtaHVMUCJIWxojvlP-Dr0-a63vds7Pxxse-CDQ6X4te2PHvblnJVXMsu7LrXJhr_wwZmrknyEes6XYP99q3doTZxG7kZxJiAo1gUxpraE5-DsPfd7jxiHe8X9j3S75kSr6Mh5RoCXQoNoGttkhphQakJEqg-qTgPLKtTWvIGrNn-CsRjsLI1jtIOLVwUHk1wMQJ2PodIHHxUroJkYKVzhIAyg7DmHmqkn8Nc5dA7F-Dm00)](https://editor.plantuml.com/uml/pLXVRzis47_Nfo3oCg11WlPb3qOHD77SrLkIUhPJR4y1BPqTBXIfaLGQTskmhp1W7soVOPzaHr6KA4hEcc5T4mI9T3oUxk_lZdob3LMcp3d96Dqecbyz__egvLJhgumQUfNB37XYcE50bji25gbYXI6dk4REgxNaA_BN7x_XBvbSN9vFviVBwTkBHKrx8hy9Y38dvqnh9eKrW_oI4FmnS6Ug1yx4JVMmbYfFFdRvwQPcpwb0fqYrhTu4GAQFYqB9MyehIgas89n0UGigAy6BcYcvKQ3rmb1JwbfS0I9ZObCzfp8lE1Z8gZTQ6kaa8w7HXeCsKa17HbdWJY-42V-TI6OjOWvQbYg5m0ERacLGFTtYW-mw8vDfcLkBwlsl6V1io7tsWIgWrOi63gcZvoKtRE7UQncN6jHSSY-Yu7GBogb2SyZf3Rvz39BgtV7PvOIyFVbsCbu-fQnAc32WrZG5vvP5UetQrrRjisn4j54-CFkShe1tIGRzE6fTweWAVYwP0jozakWaAXmPlPJ2jUGPgAuGMHZCK3qYPqoRUxToZ_vhbVj-FgDRBcdcLNCUdqOAvYxNOxA6GV9TyOxo4jN7YAxgyEsZX1AoOzDGGpNE04iZcnh8lHu3Baabbv61kahsKPpz7TcBb8eAa3wtXKxm1URfeEYbHSdkIWOfWcJbb9hSKTnzEoY7_LBtDT-XefBsQxwU7EqdoKJqkRQKPc_7tqsM9yUB2Qd-VF4QicL4LwWfJGsfcWwPdSpHPIhRLKWfeeo1Y5WMMOVOCNeoNqmNoyd5aYn_d4sU08Gapj8w-EJbomAKnl95e3qwydQBNfAjDjESRk1IHKLZOVFSmkOqT43jpIfXTtnYHrgLiSlxgXGArg0GflgbW3rBoD8YKaYbjrYUggUwo-0EA0BDUm2W35PtnCXbIYtqHTjP3XyG928HDunpFPPYZIrEc0Wi0vPJk0KkYo46JiMcHFV7K5ijlfVgPc6siJ4WG6tO1tJzqAPCKQpLuJNquXe1RrmtyBOR-C2Ub5csdJcknuKNTxCDOiHIpWPXiX_jeIY9Ki4dXJYLmc1rXtHlGmFfZpEWh-3T372e4QOBrjj1wbsnlCO1oVRIxW9YZcskJUloEZvKf3iqpBrXyOBfDuYLpBP3Sq4mgzR9T8TTGr3Uyt36rckMug2rZIqTw626Rdp2jTEjhu5oW_cDE7fQGh_Wklwf6_vKZ4l40M5gORgVgQzneAvdes4dxkZBQpiOULs32Uk-1RTwrftSehp7HUXn4q8zWdHdUBU6ap-hUiz95CLc8UZ5pYxq1yxX1JeBUYNX1_J7MJEGLYw9mdc_1lSuUvX-npHRSV1u44OmEDhDtapisUxigJJHjeysCEBZWyw30bC55ELXckqeIg0AuV27sIVYHE5GfONcS77Nj5f3ONqSE_Tvrf_RmxRzi3t3AMoaeJos9Oyzr210HBz_hAAdYgvDYv6FSJlJfqnPpEeSTFvNXFnNOEXDNm8w2HVgSNNG-7whWhj2gW5KQDpKYyrz1viYVU_zgT7LkL_rTN_VdOJ__7q-6R-TdvBfnPl9VBeylXX_eKD0qepvBtyzEF2ZS4HrLH0Hmy4dMcfSrgCFIM_xKlpPiAr4QzwnqQKNkLmSV_CqpbEneyExYSF3e-0APqHi7IN1mToknxTCDaqh2FDLxfZQYxHQJBSPMwReogiHrFGuozIvaQf5XQTYozFS68s87KMJFk0_gFZWKN2nd5-EbvUseSqdP-xAyirqzXyrDcy2sNknHmuEZiZUyyF3Ptl1n3iYyhtGk_ZgOzk8NDETF8qRHuI9b9SPx6GD7Rf39lwF00s3KHFidMZIUhrlb9Cr8jMipuH-Y3SE7Nu6J_yt3-pfz9WHoUohJffy3BdnCHWtaHVMUCJIWxojvlP-Dr0-a63vds7Pxxse-CDQ6X4te2PHvblnJVXMsu7LrXJhr_wwZmrknyEes6XYP99q3doTZxG7kZxJiAo1gUxpraE5-DsPfd7jxiHe8X9j3S75kSr6Mh5RoCXQoNoGttkhphQakJEqg-qTgPLKtTWvIGrNn-CsRjsLI1jtIOLVwUHk1wMQJ2PodIHHxUroJkYKVzhIAyg7DmHmqkn8Nc5dA7F-Dm00)

### Conventions

- **No TypeScript `enum`** — use `const` object + `keyof` union:
  ```ts
  export const MISSION_TYPE = {
    TEXT: "text",
    LINK: "link",
    FORM: "form",
  } as const;
  export type MissionType = typeof MISSION_TYPE[keyof typeof MISSION_TYPE];
  ```
- **Optional fields** typed as `T | undefined`, never assumed present without a
  guard
- **`strict: true`** throughout — `arr[i]` is `T | undefined`
- **Immutability:** all interface fields are `readonly`; collections are
  `ReadonlyArray<T>`
- **`interface`** for object contracts; **`type`** for unions, intersections,
  aliases
- **Adapter boundary rule:** raw PB responses (with JSON string fields) are
  mapped to typed app-layer interfaces inside the PB adapter module. No
  component ever calls `JSON.parse` on a record field.

### Union Types

```ts
type MissionType = "text" | "link" | "form";
type MissionTag = "mandatory" | "needsApproval" | "urgent" | "overdue";
type ValidationMethod = "gmApprove" | "selfApprove" | "qr"; // per-mission; form missions ignore this
type ProgressStatus =
  | "pending"
  | "pendingApproval"
  | "completed"
  | "autoApproved";
//   pending         — no Player action yet
//   pendingApproval — Player marked complete, awaiting GM action (gmApprove path)
//   completed       — GM confirmed (gmApprove or qr path)
//   autoApproved    — form submit or selfApprove path; no GM action required
type MilestoneStatus = "upcoming" | "inProgress" | "completed";
type ResourceType = "guide" | "video" | "link" | "document";
type FieldType = "text" | "textarea" | "select" | "multiSelect";
type UserRole = "player" | "gamemaker";
```

### Value Objects (client-only, never persisted)

```ts
interface FieldSchema {
  readonly id: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly options?: ReadonlyArray<string>; // select / multiSelect only
}

// QR-strategy specific — only used when mission.validationMethod = 'qr'
interface QRPayload {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly xpValue: number;
  readonly issuedAt: number; // Unix ms timestamp
}

interface ScanData {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly xpValue: number;
  readonly playerName: string;
  readonly missionTitle: string;
  readonly decodedAt: string;
}

interface SessionRole {
  readonly userId: string;
  readonly sessionId: string;
  readonly role: UserRole;
  readonly joinedAt: string;
}
```

### Pocketbase Base

```ts
interface PBRecord {
  readonly id: string;
  readonly created: string;
  readonly updated: string;
}
```

All persistent types extend `PBRecord`.

### Adapter Boundary Types

Raw shapes as returned by the PB SDK (JSON string fields). These exist **only
inside the PB adapter module** — never imported by components or use cases.

```ts
interface FormSchemaRaw extends PBRecord {
  readonly missionId: string;
  readonly fields: string; // JSON.stringify(FieldSchema[])
}

interface ProgressEventRaw extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly missionId: string;
  readonly status: ProgressStatus;
  readonly validatedBy?: string;
  readonly validatedAt?: string;
  readonly formResponse?: string; // JSON.stringify(Record<fieldId, value>)
}
```

The adapter parses these into the typed app-layer interfaces below before
returning them. One parse point; zero scattered `JSON.parse` calls.

### Persistent Types (app-layer, post-adapter)

```ts
interface Session extends PBRecord {
  readonly name: string;
  readonly bgImageUrl: string;
  readonly gameMakerId: string; // raw UID string, not a PB relation
}

interface Player extends PBRecord {
  readonly uid: string; // client-generated UUID, unique index
  readonly recoveryKey: string; // 8-char alphanumeric, unique index
  readonly sessionId: string; // relation → sessions
  readonly tutorialComplete: boolean;
  readonly profileComplete: boolean;
  readonly name: string;
  readonly preferredName?: string;
  readonly pronouns?: string;
  readonly avatarUrl?: string; // PB file ref
  readonly jobTitle: string; // e.g. "Senior Engineer" — not an access role
  readonly team: string;
  readonly startDate: string;
  readonly location: string;
  readonly timezone: string;
  readonly skillsConfident: ReadonlyArray<string>;
  readonly skillsDevelop: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly workStyle?: string;
  readonly energizers?: ReadonlyArray<string>;
  readonly drainers?: ReadonlyArray<string>;
}

interface BuddyProfile extends PBRecord {
  readonly sessionId: string;
  readonly assignedToPlayerId: string;
  readonly name: string;
  readonly role: string; // job title of the buddy
  readonly tenure?: string;
  readonly avatarUrl?: string;
  readonly contactUrl?: string;
}

interface Milestone extends PBRecord {
  readonly sessionId: string;
  readonly name: string;
  readonly xPercent: number; // 0–100, percentage of canvas width
  readonly yPercent: number; // 0–100, percentage of canvas height
  readonly xpThreshold: number; // always 100; stored for clarity
  readonly order: number;
}

interface Mission extends PBRecord {
  readonly sessionId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly body: string; // markdown
  readonly type: MissionType;
  readonly externalUrl?: string; // only when type = 'link'
  readonly difficulty: number; // 1–5, set by Game Maker
  readonly xpValue: number; // derived by deriveXP, written on save
  readonly tags: ReadonlyArray<MissionTag>;
  readonly suggestedDueDate?: string;
  readonly order: number;
  readonly isInCurrentMissions: boolean;
  readonly validationMethod: ValidationMethod; // default: 'gmApprove'; ignored when type = 'form'
}

interface FormSchema extends PBRecord {
  readonly missionId: string;
  readonly fields: ReadonlyArray<FieldSchema>; // parsed from PB JSON field by adapter
}

interface ProgressEvent extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly missionId: string;
  readonly status: ProgressStatus;
  readonly validatedBy?: string; // Game Maker UID
  readonly validatedAt?: string;
  readonly formResponse?: Readonly<Record<string, string>>; // parsed by adapter
}

interface Resource extends PBRecord {
  readonly sessionId: string;
  readonly title: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly isVisibleToPlayer: boolean;
}
```

### Ephemeral Types (client-only, never persisted)

```ts
// Derived by computeProgress use case
interface MilestoneProgress {
  readonly milestoneId: string;
  readonly earnedXP: number;
  readonly xpThreshold: number; // always 100
  readonly percentComplete: number; // earnedXP / xpThreshold
  readonly status: MilestoneStatus;
  readonly completedMissionIds: ReadonlyArray<string>;
}

interface PlayerProgress {
  readonly playerId: string;
  readonly totalXP: number;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly completedMissionIds: ReadonlyArray<string>;
}

// In-progress admin edit; not yet written to PB
interface DraftMission {
  readonly milestoneId: string;
  readonly isDirty: boolean;
  readonly title?: string;
  readonly body?: string;
  readonly type?: MissionType;
  readonly externalUrl?: string;
  readonly difficulty?: number;
  readonly tags?: ReadonlyArray<MissionTag>;
  readonly suggestedDueDate?: string;
}

// IDs stripped on export; used for template JSON
interface TemplateRecord {
  readonly name: string;
  readonly exportedAt: string;
  readonly milestones: ReadonlyArray<Omit<Milestone, keyof PBRecord>>;
  readonly missions: ReadonlyArray<Omit<Mission, keyof PBRecord>>;
  readonly formSchemas: ReadonlyArray<Omit<FormSchema, keyof PBRecord>>;
  readonly resources: ReadonlyArray<Omit<Resource, keyof PBRecord>>;
}
```

## Pocketbase Schema

### Collection Index

| Collection        | Key indexes                                         | Constraints                                    |
| ----------------- | --------------------------------------------------- | ---------------------------------------------- |
| `sessions`        | `gameMakerId`                                       | —                                              |
| `players`         | `uid` (unique), `recoveryKey` (unique), `sessionId` | —                                              |
| `milestones`      | `sessionId`, `order`                                | —                                              |
| `missions`        | `milestoneId`, `sessionId`, `order`                 | —                                              |
| `form_schemas`    | `missionId` (unique)                                | One schema per mission                         |
| `progress_events` | `(playerId, missionId)` composite                   | App-layer uniqueness via `upsertProgressEvent` |
| `buddy_profiles`  | `assignedToPlayerId`                                | —                                              |
| `resources`       | `sessionId`                                         | —                                              |

### Field Type Notes

- Array fields (`tags`, `skillsConfident`, etc.) → Pocketbase `JSON` field;
  parsed in the adapter
- `form_schemas.fields` → Pocketbase `JSON` field; parsed into `FieldSchema[]`
  by the adapter with a type guard
- `progress_events.formResponse` → Pocketbase `JSON` field; parsed into
  `Record<string, string>` by the adapter
- File fields → Pocketbase file type; SDK returns full URL

### ProgressEvent Upsert

There is one `ProgressEvent` per `(playerId, missionId)` pair. **All writes go
through `upsertProgressEvent`:**

```
upsertProgressEvent(playerId, missionId, patch):
  existing = query progress_events WHERE playerId = ? AND missionId = ?
  IF existing → PATCH existing.id WITH patch
  ELSE        → POST new record WITH { playerId, missionId, ...patch }
```

PB does not natively support composite unique indexes. The upsert function is
the single enforcement point for C-05.

## XP Derivation Algorithm

### Governing Constraints

- `xpThreshold` = **100 per Milestone**, fixed constant
- `xpValue` per Mission is derived at **save time** by `deriveXP` and stored in
  `missions.xpValue`
- `PlayerProgress.earnedXP` is computed at **read time** by `computeProgress` —
  retroactive difficulty changes affect earned XP
- Rounding remainder distributed to highest-difficulty Missions first (then
  `mission.order` as tiebreaker)

### Difficulty Weight Mapping

Linear 1:1 mapping. Transparent, explainable, appropriate for prototype scale.

```
difficulty 1 → weight 1  ·  difficulty 2 → weight 2  ·  difficulty 3 → weight 3
difficulty 4 → weight 4  ·  difficulty 5 → weight 5
```

### Algorithm (pseudocode)

```
CONSTANTS:
  XP_THRESHOLD = 100
  WEIGHT_MAP   = { 1:1, 2:2, 3:3, 4:4, 5:5 }

FUNCTION deriveXP(missions: Mission[]) → xpValues: number[]

  IF missions.length === 0 → RETURN []

  weights     = missions.map(m → WEIGHT_MAP[m.difficulty])
  totalWeight = sum(weights)

  xpValues = weights.map(w → floor(XP_THRESHOLD × w / totalWeight))

  remainder = XP_THRESHOLD − sum(xpValues)
  sortedIdx = indices sorted by (weights[i] DESC, missions[i].order ASC)
  FOR i = 0 TO remainder − 1
    xpValues[sortedIdx[i]] += 1

  RETURN xpValues   // invariant: sum(xpValues) === XP_THRESHOLD
```

### Recomputation Triggers

Recompute all `xpValue` fields for a Milestone and batch-PATCH to Pocketbase
whenever:

- A Mission's `difficulty` changes
- A Mission is added to or deleted from a Milestone

Recomputation runs on **Game Maker save**, not live while editing.

### Worked Example

20 Missions: 1× difficulty-5, 19× difficulty-1:

```
totalWeight = 5 + 19 = 24
hard:  floor(100 × 5/24) = 20 → +1 from remainder = 21
easy:  floor(100 × 1/24) = 4  → 3 get +1 from remainder = 5; 16 remain at 4
sum: 21 + 3×5 + 16×4 = 100 ✓
```

### Session-Level XP

```
totalXP        = sum of earnedXP across all Milestones
maxPossibleXP  = numberOfMilestones × 100
overallPercent = totalXP / maxPossibleXP
```

Used in `TopBar` and Game Maker's player overview.

## Session Export / Import

### Template Export (structure only, no player data)

```ts
interface TemplateExport {
  exportType: "template";
  exportedAt: string;
  name: string;
  milestones: Array<Omit<Milestone, keyof PBRecord>>;
  missions: Array<Omit<Mission, keyof PBRecord>>;
  formSchemas: Array<Omit<FormSchema, keyof PBRecord>>;
  resources: Array<Omit<Resource, keyof PBRecord>>;
}
```

**Import process:**

1. Create new `Session` record → get new `sessionId`
2. Insert Milestones in `order` sequence → collect `oldId → newId` map
3. Insert Missions, remapping `milestoneId` via the id map
4. Insert FormSchemas, remapping `missionId` via the id map
5. Insert Resources with new `sessionId`

### Full Session Export (includes player runtime data)

```ts
interface FullSessionExport {
  exportType: "full";
  exportedAt: string;
  session: Omit<Session, keyof PBRecord>;
  milestones: Array<Omit<Milestone, keyof PBRecord>>;
  missions: Array<Omit<Mission, keyof PBRecord>>;
  formSchemas: Array<Omit<FormSchema, keyof PBRecord>>;
  resources: Array<Omit<Resource, keyof PBRecord>>;
  players: Array<Omit<Player, keyof PBRecord>>; // uid + recoveryKey preserved
  progressEvents: Array<Omit<ProgressEvent, keyof PBRecord>>;
  buddyProfiles: Array<Omit<BuddyProfile, keyof PBRecord>>;
}
```

**Import process:** same as template, plus:

- Insert Players preserving `uid` and `recoveryKey` verbatim (enables identity
  recovery post-migration)
- Insert ProgressEvents remapping `playerId` and `missionId` via id maps
- Insert BuddyProfiles remapping `assignedToPlayerId`

---

## Design Constraints & Invariants

| #    | Constraint                                                                                      | Enforcement                                                                           |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| C-01 | One user identity per session                                                                   | `players.uid` unique globally                                                         |
| C-02 | Progress is always recoverable                                                                  | `recoveryKey` stored in PB, shown once on first join                                  |
| C-03 | No auth system required                                                                         | Pocketbase auth collections unused in prototype                                       |
| C-04 | `xpThreshold` is always 100 per Milestone                                                       | Constant; not stored as a variable field                                              |
| C-05 | One `ProgressEvent` per `(playerId, missionId)`                                                 | Enforced at `upsertProgressEvent` — the single write path                             |
| C-06 | Form missions always `autoApproved`, regardless of `validationMethod`                           | `autoApproved` status set on submit; `ValidationDisplay` never mounts for `form` type |
| C-07 | SSE subscription is only active in `ValidationDisplay`, and only when `validationMethod = 'qr'` | No other component maintains a live PB subscription                                   |
| C-08 | Milestone positions are percentage-based                                                        | `xPercent`/`yPercent` 0–100, never pixels                                             |
| C-09 | `MilestoneNode` and `MissionCard` are shared components                                         | `draggable` and `editable` boolean props; see D-007 for trade-off                     |
| C-10 | Templates strip all PBRecord IDs on export                                                      | Import creates fresh records; never reuse IDs across sessions                         |
| C-11 | `PlayerProgress` and `MilestoneProgress` are never persisted                                    | Derived at read time by `computeProgress`                                             |
| C-12 | No TypeScript enums                                                                             | Use `const` object + `keyof` union pattern throughout                                 |
| C-13 | No component calls `JSON.parse` on a PB record field                                            | All parsing happens inside the PB adapter module                                      |
| C-14 | No component writes directly to `progress_events`                                               | All mutations go through `upsertProgressEvent`                                        |
| C-15 | `validationMethod` defaults to `'gmApprove'` for all new Missions                               | Set in `MissionEditor` default state; form missions ignore this field                 |

## Open Decisions [APPEND-ONLY]

| #     | Question                                                                                                                                                                 | Impact                                                              | Target Sprint  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------- |
| OD-01 | Should `link`-type Missions auto-complete on click, or require "Mark as Visited" + QR flow?                                                                              | Determines if link missions need `QRDisplay`                        | Sprint 2       |
| OD-02 | Should difficulty changes retroactively affect earned XP, or should `ProgressEvent` snapshot `xpValue` at validation time?                                               | Data model + fairness UX                                            | Sprint 2       |
| OD-03 | Should `MilestoneNode` fill color use a gradient (0–100%) or step thresholds (0%, 25%, 50%, 75%, 100%)?                                                                  | Visual design only                                                  | Sprint 2       |
| OD-04 | Does the `ResourcesSection` support metadata filtering (type, tags) or free-text search only?                                                                            | `SearchBar` complexity                                              | Sprint 2       |
| OD-05 | Should the Game Maker be able to create multiple Buddy profiles per session (a pool), or one per player only?                                                            | `BuddyProfile` schema impact                                        | Sprint 3       |
| OD-06 | What is the offline behaviour for form submission — queue and sync, or block until online?                                                                               | Service Worker strategy                                             | Sprint 3       |
| OD-07 | In production, should `xpValue` be re-derived from `missions.xpValue` at scan time rather than trusted from the QR payload?                                              | Security; out of scope for prototype; applies only to `qr` method   | Post-prototype |
| OD-08 | Should `validationMethod` be configurable at session level (all missions inherit a session-wide default), or per-mission only?                                           | Game Maker UX and template design complexity                        | Sprint 3       |
| OD-09 | For `gmApprove` missions, should `ValidationDisplay` use polling or SSE to detect approval? SSE keeps the existing real-time pattern but extends the subscription scope. | Real-time UX vs. infrastructure simplicity                          | Sprint 3       |
| OD-10 | Should the Player see the `pendingApproval` state inline (e.g., greyed-out mission card with "Waiting for approval") rather than a full-screen `ValidationDisplay`?      | Player UX feedback loop; affects when `ValidationDisplay` dismisses | Sprint 3       |
