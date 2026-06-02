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

[![](https://img.plantuml.biz/plantuml/dsvg/XP91Rzim38Nl_XLSJXsGDYkGOp6a3OeEmp9uSO3k5YWMux2HIKEIc_dVbt8I9ptjHfhM-nwVD0lH-DZM3YoPofjw_Ur-NKxNfN34Vp7xGbowrY8ypAUJ-NGzFtx_dcMHeaFuPJhqS0z55oBMS1fdMOu-2DyqBit7CChxOgJLRpm0resJ3X5AqGeZSGM6GNWZnjlKlKdh6Jju9mDnXv2_Few-dbKhK-F2x7lX5wsXRvBuews9uR0JLUOjLQt700538E4mXfhEbM4BxyQHDL7_EDlGKK_yiuHG6bPYTbpifbODV6gjxPIo69h4NCY67DvkoOUOVAfV4q4zqfPwRT-8LypLUdUmygRS1sYyL6hnIFsRzxOKVdAcVkwIXoMw8SbFHduAyR3V-Bo6GY-BLiZe-oLLjnIB8Nd-iLhb1KnEiIRzgqm_8UOU-zEN4D5IJ0I78GfZc5nWARJ_WQxLX-THxEIGeYht3SNXdePunfhDySuswI0GRoMf5yMpQY-VYrMAQOPizIL_0000)](https://editor.plantuml.com/uml/XP91Rzim38Nl_XLSJXsGDYkGOp6a3OeEmp9uSO3k5YWMux2HIKEIc_dVbt8I9ptjHfhM-nwVD0lH-DZM3YoPofjw_Ur-NKxNfN34Vp7xGbowrY8ypAUJ-NGzFtx_dcMHeaFuPJhqS0z55oBMS1fdMOu-2DyqBit7CChxOgJLRpm0resJ3X5AqGeZSGM6GNWZnjlKlKdh6Jju9mDnXv2_Few-dbKhK-F2x7lX5wsXRvBuews9uR0JLUOjLQt700538E4mXfhEbM4BxyQHDL7_EDlGKK_yiuHG6bPYTbpifbODV6gjxPIo69h4NCY67DvkoOUOVAfV4q4zqfPwRT-8LypLUdUmygRS1sYyL6hnIFsRzxOKVdAcVkwIXoMw8SbFHduAyR3V-Bo6GY-BLiZe-oLLjnIB8Nd-iLhb1KnEiIRzgqm_8UOU-zEN4D5IJ0I78GfZc5nWARJ_WQxLX-THxEIGeYht3SNXdePunfhDySuswI0GRoMf5yMpQY-VYrMAQOPizIL_0000)

### What MesseBuddy Is

MesseBuddy is a **mobile-first Progressive Web App (PWA)** that gamifies the
corporate onboarding experience. It represents an onboarding journey as an
interactive map of office spaces (Milestones), each containing a set of
activities (Missions) a new employee must complete. Progress is tracked via XP
points, and completion is validated through in-person QR code scanning.

**Core value propositions:**

- Customisation by the Game Maker with no developer involvement
- Gamified progression that is non-linear and autonomy-preserving
- Simple offline-first interaction that promotes real human contact over digital
  automation

### What MesseBuddy Is Not

- Not an HRM dashboard or replacement for existing HR tooling
- Not a native mobile app (PWA only)
- Not an SSO or identity management system (prototype scope)
- Not a replacement for company documentation — it links to existing resources

### Design Principle

> Ignoring the cultural context in which an artifact is implemented can cause
> difficulties. Palmquist, A.
> ([2023](https://doi.org/10.1007/s10758-023-09657-7)).

We introduce the QR validation mechanic as the deliberate mechanism that
respects organizational culture: task completion requires physical presence and
human acknowledgement.

## Technology should create conditions for human connection, not replace it.

## Terminology Glossary

This glossary is authoritative.

| Term                 | Definition                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Session**          | One onboarding journey instance. Has a unique ID, a Game Maker, and a set of Players.                                                      |
| **Milestone**        | A top-level grouping on the map — analogous to a hall or room. Contains Missions. Represented as a node on the Milestone Map.              |
| **Mission**          | An individual task item within a Milestone. The atomic unit of work for a Player.                                                          |
| **Player**           | A new employee going through an onboarding journey. Has read-only access to the cockpit.                                                   |
| **Game Maker**       | The admin who configures the session — sets up Milestones, Missions, and validates completions.                                            |
| **XP**               | Experience points earned by completing Missions. Each Milestone has an `xpThreshold` of 100.                                               |
| **QR Validation**    | The in-person flow where a Player generates a QR code and a Game Maker physically scans it to mark the Mission complete.                   |
| **Current Missions** | A curated list of Missions the Game Maker has surfaced to the Player's main view — not all Missions are in this list by default.           |
| **Buddy**            | A company-assigned mentor figure displayed on the Player's cockpit. Not a system user — their info is manually entered by the Game Maker.  |
| **Template**         | A named, portable snapshot of a Session's structure (Milestones, Missions, Resources) with no player data. Used to bootstrap new sessions. |
| **Recovery Key**     | An 8-character alphanumeric token shown to a user on first join, used to restore their identity if localStorage is cleared.                |

---

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

---

## User Roles & Identity Model

### Roles

**Player (new employee)**

- Read-only cockpit; marks Missions complete and generates QR codes for
  in-person validation
- Fills in form-type Missions (profile form, structured data)
- One Player record = one Session

**Game Maker (admin)**

- Full read-write cockpit; creates and edits Milestones and Missions
- Scans QR codes to validate Mission completions
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

> A single user identity is exclusively tied to one session.

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

---

## Application Views & User Interaction

[![](https://img.plantuml.biz/plantuml/dsvg/XLJ1Rjim3BthAuWUrWrBW06x-J2qQRrsXw1UatQx1Qh5kK9aIHNbfC7GVn-Tn8xj9bXEClKU7_b8vOAY3B4g3IWjYo3BnPUl2yAN2csEYvUmM4cZbOpQMH5rD0W_x-6nZS5tuzP2o3ow09cH6mpxZnjPubGk-TkpWCwrbpOo-LgJPzmWEikbjHWUDQvxDtjrd6gYMauId3qGmfKaJ8QtPprgvGb3p88h0XAbA-HOdtu4qK-HJIwLz173bfYvV8bnmbJOXmVezbw8dHKm_dRe61AOoh0aQ7h9NUaDHXJMHGItOdmNdDhSAIIEPN9Zd5Jmrs-p_b0ZA7SvwYDXUtprF9aAto0tcfiParOe3ZcvcauF2SncAL3rH7dGJro01R-tOe6r5mGVZmX-4g8TxQw_pkmuwPr7Iq2xs0XonWO92fjcH9_06OOpvi8OS2sZXCzGD5eFMeaXaid7ffoSSYhAM542vutpwdpKggl9vaqSorQxrkv10lmomkQTKxzkq_iK6bNuS90L1_BG_vjq_YxH7sqOAZguyQ00VDKKjIqWiAT10RyrB7tSy2iqiGbkGII0VwVriylvrMt3MElut3hK6YJGCDIwFUf_2UzcSx0yrPw30gqImuwwcrxleQ_e6ROUi0M1XNjhsqNpgJQNOoE8GHS55rBNMqLiP4-ygDzPtOOqUMLuu0GhBOTCNlaguAZxW7ZXBxW3_ely1m00)](https://editor.plantuml.com/uml/XLJ1Rjim3BthAuWUrWrBW06x-J2qQRrsXw1UatQx1Qh5kK9aIHNbfC7GVn-Tn8xj9bXEClKU7_b8vOAY3B4g3IWjYo3BnPUl2yAN2csEYvUmM4cZbOpQMH5rD0W_x-6nZS5tuzP2o3ow09cH6mpxZnjPubGk-TkpWCwrbpOo-LgJPzmWEikbjHWUDQvxDtjrd6gYMauId3qGmfKaJ8QtPprgvGb3p88h0XAbA-HOdtu4qK-HJIwLz173bfYvV8bnmbJOXmVezbw8dHKm_dRe61AOoh0aQ7h9NUaDHXJMHGItOdmNdDhSAIIEPN9Zd5Jmrs-p_b0ZA7SvwYDXUtprF9aAto0tcfiParOe3ZcvcauF2SncAL3rH7dGJro01R-tOe6r5mGVZmX-4g8TxQw_pkmuwPr7Iq2xs0XonWO92fjcH9_06OOpvi8OS2sZXCzGD5eFMeaXaid7ffoSSYhAM542vutpwdpKggl9vaqSorQxrkv10lmomkQTKxzkq_iK6bNuS90L1_BG_vjq_YxH7sqOAZguyQ00VDKKjIqWiAT10RyrB7tSy2iqiGbkGII0VwVriylvrMt3MElut3hK6YJGCDIwFUf_2UzcSx0yrPw30gqImuwwcrxleQ_e6ROUi0M1XNjhsqNpgJQNOoE8GHS55rBNMqLiP4-ygDzPtOOqUMLuu0GhBOTCNlaguAZxW7ZXBxW3_ely1m00)

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

`TopBar` · `TutorialOverlay` (first login only) · `MilestoneMapViewer` ·
`MilestoneSidebarViewer` · `CurrentMissionsList` · `MissionDetailPopup` ·
`QRDisplay` · `BuddyCard` · `ResourcesSection`

**Tutorial flow (sequential, non-skippable):**

- Step 1 → highlights Current Missions → launches Mission 1 (Profile Setup Form)
- Profile Form submitted (`autoApproved`) → `profileComplete = true`
- Step 2 → explains the Milestone Map · Step 3 → Buddy Card · Step 4 → Resources
- `tutorialComplete = true` → Player has free access

### Mission Type Routing

| Type   | Behaviour                                     | Completion Path                                                    |
| ------ | --------------------------------------------- | ------------------------------------------------------------------ |
| `text` | Opens `MissionDetailPopup` with markdown body | Mark Complete → `QRDisplay` → GM scans → SSE push → done           |
| `link` | Opens external URL in new tab                 | Mark as Visited → `QRDisplay` → GM scans → SSE push → done         |
| `form` | Navigates to `FormPage`                       | Save and Submit → `status: autoApproved` → back to Cockpit (no QR) |

### QR Validation Flow

1. Player marks Mission complete → `QRDisplay` mounts
2. QR encodes: `{ playerId, missionId, sessionId, xpValue }` — client-side, no
   server call
3. `QRDisplay` opens SSE subscription on `progress_events` for
   `(playerId, missionId)`
4. Game Maker opens `QRScannerView`, device camera decodes QR
5. `ScanResult` shows: player name, mission title, XP value
6. Game Maker confirms → `upsertProgressEvent` called → PATCH `progress_events`
   (`status: completed`)
7. Pocketbase SSE push fires → `QRDisplay` receives event → dismisses → XP
   recalculates

> **Trust boundary:** `xpValue` in the QR payload is client-generated and not
> server-verified. For production, re-derive from `missions.xpValue` at scan
> time rather than reading from the QR payload. Acceptable for prototype demo
> context.

SSE is the **only** real-time consumer in the app. Everything else is fetched
once on mount.

### Admin Cockpit

The Game Maker's primary view — read-write. Components in render order:

`TopBar` · `PlayerSelectorDropdown` · `PlayerProfileCard` · `MilestoneMapEditor`
· `MilestoneSidebarEditor` · `CurrentMissionsList` (drag-to-reorder) ·
`BuddyAssignmentForm` · `ResourcesEditor` · `SaveActions`

**Background Image:** Game Maker uploads JPEG/PNG/WEBP → stored in Pocketbase
file storage → `session.bgImageUrl` updated → both Player and Admin
`BackgroundCanvas` instances fetch the same URL.

**GridOverlay:** Toggleable snap-to-grid, visible in edit mode only. Aids
Milestone node placement.

---

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

---

## React Component Architecture

[![](https://img.plantuml.biz/plantuml/dsvg/VLPTRo8t57tdLzpobAW4AZLFLLij4BB9RjZCClHBLHMPiI5kFFRKza3HQlzxZpqVJ80qoiFuu_eUdtlEDU-SPzQNkI8ksSQo_EcxwwSC_oOlZ1RQzxwHEbCb5_JZz7eqlNwQDYi_ztfUUYNeWUs5fU-fNQ6RwgnURsgqPr8B-pGnfURCxY-A7HjGVo5OvYdvRTo_f2yzmbyRVQ6Ovb9liEkX-ahOHlGFGVLefhtTKs6azaDQcD8BHwK34c_e0sO7DBM2UK6fS4uQZ8sbXSZC5diIQpOMyxHMPkU6_SiZ38KAbvgQxAMG7icIxlWy7epubT5gJrifThH6jYfgIEapaj1SAk4ypgSvAu2kj3QGDPSHdXlGvmMOSo7rW2ObvtkQCii70ErCQJDn1YVZkTG7cEFEy7zGxgm4BotCzomFc5u2rFkgsaTeQSQbDtRGW6t75Smn9ZSw1w0Es7hFAMQap0CSeBcjFy_Xr5nOHtolMIwpW3EdjHIAOyxAhT2qsjDjc4YpPv6pF_yQqXtq0jJ4Ic_6HM5HQXuZh_o-49JNJ9z2-iUc6TFGAJ9_NjJVluAVKs3Z37TpICB5LcQ2Cf1dsP1keAp06ufOiBqoZ1FGK06L8OEZS2YuAPK_ufmoezVIvim3Mu1sX2rl2X5LqvztXW6XiAEAw00kVMOMLsw3kqp29m2QUN3NAQu6QCfHuMWBHYkMlMniC2jkfhVCuMQMRJPi1QTBJGAvA4VGAOarlPLc-_F3w2rajTXHBtAmkHADl8OnJKZvaxUb8CPHzPWPN7bhb3lMxPcAjbP2HUllaFGLWjjIgIkNMG4veN2XWg-CUsU2tlopeCTF3tzGpLwQpiYLAyJ98XGjy1BsiA8u1OAMD6NG2xBzuWJ5xv0wAQsWPHguB5KrXJBX-D-J0ONsYuRMTAa1bGKwcs_6issqsj_eScrpirLdk-TOaXxN5lyMnlgbo75p3xF9l3i-xNYhCMU5ZnP8q464dm0grPC1NWisrhCgsAfkwv4rfXGb4qflFa8xIa4w2RF1AfRjw4Fw-AanCAHeA5YI1ywk8jcLFjViR9jJ1WUc47dLDXuwmm1cOj5VSSGukO_Oi8AiSLV3nmzKIjwojFyem92hkBiFyqP5HN_jl5atAv3oYerefrcwf6-31e9L5q8TtgjEgJkbeT5nRH0OuexUc2EVsygsR-tjMgqrovef9yv7TFsGesZeI80sP_Obqgo4Rm9VFoddKT45Rvf2TEZb6x5dKOQ0Ud-dxtR8sp8bEJHQTuDwx-7Pw6pDQkpX8Qdt7LQxaew2RAWvpCS2nv8cu-NqRfGyfilH-zbo40kCjRlbCZav-4YE-9d1tIW-gaUgQw_PaXyJdZGG_1Urjvz4C7Vi1xN6te5p_4Bx3m00)](https://editor.plantuml.com/uml/VLPTRo8t57tdLzpobAW4AZLFLLij4BB9RjZCClHBLHMPiI5kFFRKza3HQlzxZpqVJ80qoiFuu_eUdtlEDU-SPzQNkI8ksSQo_EcxwwSC_oOlZ1RQzxwHEbCb5_JZz7eqlNwQDYi_ztfUUYNeWUs5fU-fNQ6RwgnURsgqPr8B-pGnfURCxY-A7HjGVo5OvYdvRTo_f2yzmbyRVQ6Ovb9liEkX-ahOHlGFGVLefhtTKs6azaDQcD8BHwK34c_e0sO7DBM2UK6fS4uQZ8sbXSZC5diIQpOMyxHMPkU6_SiZ38KAbvgQxAMG7icIxlWy7epubT5gJrifThH6jYfgIEapaj1SAk4ypgSvAu2kj3QGDPSHdXlGvmMOSo7rW2ObvtkQCii70ErCQJDn1YVZkTG7cEFEy7zGxgm4BotCzomFc5u2rFkgsaTeQSQbDtRGW6t75Smn9ZSw1w0Es7hFAMQap0CSeBcjFy_Xr5nOHtolMIwpW3EdjHIAOyxAhT2qsjDjc4YpPv6pF_yQqXtq0jJ4Ic_6HM5HQXuZh_o-49JNJ9z2-iUc6TFGAJ9_NjJVluAVKs3Z37TpICB5LcQ2Cf1dsP1keAp06ufOiBqoZ1FGK06L8OEZS2YuAPK_ufmoezVIvim3Mu1sX2rl2X5LqvztXW6XiAEAw00kVMOMLsw3kqp29m2QUN3NAQu6QCfHuMWBHYkMlMniC2jkfhVCuMQMRJPi1QTBJGAvA4VGAOarlPLc-_F3w2rajTXHBtAmkHADl8OnJKZvaxUb8CPHzPWPN7bhb3lMxPcAjbP2HUllaFGLWjjIgIkNMG4veN2XWg-CUsU2tlopeCTF3tzGpLwQpiYLAyJ98XGjy1BsiA8u1OAMD6NG2xBzuWJ5xv0wAQsWPHguB5KrXJBX-D-J0ONsYuRMTAa1bGKwcs_6issqsj_eScrpirLdk-TOaXxN5lyMnlgbo75p3xF9l3i-xNYhCMU5ZnP8q464dm0grPC1NWisrhCgsAfkwv4rfXGb4qflFa8xIa4w2RF1AfRjw4Fw-AanCAHeA5YI1ywk8jcLFjViR9jJ1WUc47dLDXuwmm1cOj5VSSGukO_Oi8AiSLV3nmzKIjwojFyem92hkBiFyqP5HN_jl5atAv3oYerefrcwf6-31e9L5q8TtgjEgJkbeT5nRH0OuexUc2EVsygsR-tjMgqrovef9yv7TFsGesZeI80sP_Obqgo4Rm9VFoddKT45Rvf2TEZb6x5dKOQ0Ud-dxtR8sp8bEJHQTuDwx-7Pw6pDQkpX8Qdt7LQxaew2RAWvpCS2nv8cu-NqRfGyfilH-zbo40kCjRlbCZav-4YE-9d1tIW-gaUgQw_PaXyJdZGG_1Urjvz4C7Vi1xN6te5p_4Bx3m00)

### Component Class Diagram

[![](https://img.plantuml.biz/plantuml/dsvg/pLdDZjis4BxhANIhssI1NdhPGn77tasShdSLsqaJ1450Irml4qbKICeRemZGX-WJzaawb4IAlzvD0oG9SbXpXiFX_F6RqICk41DjLQO5GJk6gdU__lOkBn7dxt9QDRJ6jNY7M7v31Cv5ot0YY2XnEbF4T2QPqtc_Eqb-Il_zvs_udqwpB5q_FRku61P-jFz9TyjqsZJfNqaA_nxaBMDmenLj1JvDkM2atlKKZZadj5uKzd9JeWDcxchBCLlHSXJnUJZg0jK5_CxG3Wz7dcZ1YxffXINdfAA5emQjPmmZWP_HbjNuCFdvDDrJKYZYCqhgTIzGazJP6zeyHapTj5Vy4bNE0MYF81nUiD9U5bIWybLscjPjjSMiNsIXAsvQGHb1vTKUCpX3dSS5RlYffgxXvvkt-auGIYKMsBhEoU0CoMgVM-DFmhyUsZr6XRRhWn9jiNE9FOAZQ-6f_2gpTkvHsM9zucSZeDTFfwkpURgSPccsMYmNcyNBi-yJsuFcZr7-OSTeMnSpLEyHLrSW5KIOvqHK2YUQjkyXfS-9Rv8bAJ4NaDwN489QgXFc0HD_oZ3BiRInwR13SBLXTCSWM8D4A4gYvRRmWg7T3crbq6qfn1wgTG2L9F_W9iCSsC_gOl99INwO7jIVO_ICtiqkfg_FLkdiQlP7jjZyA3LhS4ZMvUkCvXyQ8epwyKM52OfD2Gx7XNQlou1oGVPuIK8oJ_WDlLK9FBh02vabQbuIV8jrhQaK1VofkLJsRtUBOB3IMhFstXsZpweIDnGA3Ivad1hwAgLUqtRAy5FWM2BsOLJfdd6gn6H3g5xW7QuBdGy2Lt2bVd41F-1EdZNMfC1Rn28MSTsc2Nvb_jHiRa276reMjjP3dNIhSzKxiRDvzvUokCgxipti0d9c_ZQASaavTdDg41NpYBhzh5TfuEONX8lnwb-drXqQA2xmjdvLudegOOWLZdvQlS7LN4ahdEA32oBkNvCsTBShSV2z0-ePoFAg60vnhY7YDdGmi_SM3ghFiK2ap6ZJDiTl5tEsQKGhwGXVjzkA204szIl1yzMSyCPu_CCegGfM6OZpbzO3F2W3YwG0v5FOcdna0xTPg0ZNtBPRWF8d8c6j7xT5SJ0ZeVPIq08ytOh0DI3YUq6edDO2ogkvhevUOGvuBiTy3TKPJA8qO6hzLBCCYG2LN4Bovorc1_lkrwGKiY2kedkxy96x9n_DxMuGzJmsPConB3-OkQNwcBpUxXBSsfvoBs-Qlkim74iV6cUbjImvlkFdLwjbcasVV2TeTjyN_Pooodp8mwaPJXrQI-Jd5GMqnwfgUhGkN-tSkGODvX2hfsaF15MAp0aJ1oznZcMylCivmQLs8CzlS0M2kyLrzyC2r-PbC6FKYwZP3QftU6AnXq3RyrMwdaqlBm6uVNV7HbtzVBNEKLtZ3WKe4u5FO756wsl2AgUi3SGLVj_1DTjjlAFmLg9voILTg9qapmcwQ0RLZA5pZ8jHWJdE0JPDs20ibBTysY529nfka4JjEcBTizPQmxlQpK74ni_to3CmsCkrLc-fIIX2flFbul97G_LZR4oBYjJtnlKQmMV_3zzxoVtPwY_MtNxAvems1RsjRVT9KDRz0KK6dXdzdgXJ_IhLopi2m2nvvWlGd-WS6Emr96YYtwJN03xPPaZZ61mFqsCDvh1lMem-yMDN8WrBeWazmdWmqWtn6ZKR-eGH5_XqlJDmH_gaSP3GMwWfAIh6VcLeCMBMwzadqaMov9VOqgbXU0zrpzq7iTZliygLLbREZ_mmbJTp9ajWFO3VBYpFQTbMiikm1rQtt2qeFI8FG6YxVuj4MGJJ-jrD169tSM7Fwom_As8q85UOCd0KCEXXoPktHvk5IEJ8FWRM_DRVQIfSGuJx2Gb5t1lDK9tZqdxBIfgZSixGjV1RaXu1k2TuZe8cHPOgMwy0p3W2Nu-3ZNmORrzVanoUj8Cgak5vuV1uPNtGUy-NTP8xYzAJJFS8LM575-jMWvGo_64FTudwD64H8ytY1l1rv6P1Ovbut1KfuQ3jZsk90xc51qSr8GcwzN0AzAIlIe1EnA1tfucbI2WDEd8W2JJG3LmlW7QrjOwVwhVvLbCw1GVjwWgILnxlrEIEuxHdLC-aicktRxBrEUmt8zPAzhYGsrkD6PTkCMrZnBlMtjSJnJ3Il-IDqpNx9U44Gly8kf1LQDfrrEDaFDJTH0fMjvrlS0Mbmn_1NC3JvT7CanLnIGjKZg1R8TWZRtoeKef1ceMXJPoxkdgnMLm--O4GRW3poczj9oU_cn_2z9etujOK5oDhWkgXzOBLQSLd-xEhPNQrNcmMLvVVmbw9Fxt_vUHa-28N8zhVqI9S_j3zBaPh7XrX3enlesBTIME4KSy48tGzVOlGtH5PaWI-DtI2d4zYCJxh2rUCoVry4EEplmyOkjdJVyDYtLL3OtANnnnHTt4nVEVq2CDNpCHtIN2VIrVR4syOAQbw61WccpEy9D6JBKdIBsQIs6EGBj3qK2907AS8qMx-6-TnLy7SVjt8v20jt5aVupNQuJ2Rt_xUmMSrCM7UKCu76GEG9Cpem8Cma_54soazO8exKph8PpMnCNQZbuons4N2IskBqqpPkzW6YoHsJzKnMErCWC7lGm9CHWiHEiD7_06k4SJt6UsG31ISk43GAmac45DUj-1HaZo2mjbMvNy0)](https://editor.plantuml.com/uml/pLdDZjis4BxhANIhssI1NdhPGn77tasShdSLsqaJ1450Irml4qbKICeRemZGX-WJzaawb4IAlzvD0oG9SbXpXiFX_F6RqICk41DjLQO5GJk6gdU__lOkBn7dxt9QDRJ6jNY7M7v31Cv5ot0YY2XnEbF4T2QPqtc_Eqb-Il_zvs_udqwpB5q_FRku61P-jFz9TyjqsZJfNqaA_nxaBMDmenLj1JvDkM2atlKKZZadj5uKzd9JeWDcxchBCLlHSXJnUJZg0jK5_CxG3Wz7dcZ1YxffXINdfAA5emQjPmmZWP_HbjNuCFdvDDrJKYZYCqhgTIzGazJP6zeyHapTj5Vy4bNE0MYF81nUiD9U5bIWybLscjPjjSMiNsIXAsvQGHb1vTKUCpX3dSS5RlYffgxXvvkt-auGIYKMsBhEoU0CoMgVM-DFmhyUsZr6XRRhWn9jiNE9FOAZQ-6f_2gpTkvHsM9zucSZeDTFfwkpURgSPccsMYmNcyNBi-yJsuFcZr7-OSTeMnSpLEyHLrSW5KIOvqHK2YUQjkyXfS-9Rv8bAJ4NaDwN489QgXFc0HD_oZ3BiRInwR13SBLXTCSWM8D4A4gYvRRmWg7T3crbq6qfn1wgTG2L9F_W9iCSsC_gOl99INwO7jIVO_ICtiqkfg_FLkdiQlP7jjZyA3LhS4ZMvUkCvXyQ8epwyKM52OfD2Gx7XNQlou1oGVPuIK8oJ_WDlLK9FBh02vabQbuIV8jrhQaK1VofkLJsRtUBOB3IMhFstXsZpweIDnGA3Ivad1hwAgLUqtRAy5FWM2BsOLJfdd6gn6H3g5xW7QuBdGy2Lt2bVd41F-1EdZNMfC1Rn28MSTsc2Nvb_jHiRa276reMjjP3dNIhSzKxiRDvzvUokCgxipti0d9c_ZQASaavTdDg41NpYBhzh5TfuEONX8lnwb-drXqQA2xmjdvLudegOOWLZdvQlS7LN4ahdEA32oBkNvCsTBShSV2z0-ePoFAg60vnhY7YDdGmi_SM3ghFiK2ap6ZJDiTl5tEsQKGhwGXVjzkA204szIl1yzMSyCPu_CCegGfM6OZpbzO3F2W3YwG0v5FOcdna0xTPg0ZNtBPRWF8d8c6j7xT5SJ0ZeVPIq08ytOh0DI3YUq6edDO2ogkvhevUOGvuBiTy3TKPJA8qO6hzLBCCYG2LN4Bovorc1_lkrwGKiY2kedkxy96x9n_DxMuGzJmsPConB3-OkQNwcBpUxXBSsfvoBs-Qlkim74iV6cUbjImvlkFdLwjbcasVV2TeTjyN_Pooodp8mwaPJXrQI-Jd5GMqnwfgUhGkN-tSkGODvX2hfsaF15MAp0aJ1oznZcMylCivmQLs8CzlS0M2kyLrzyC2r-PbC6FKYwZP3QftU6AnXq3RyrMwdaqlBm6uVNV7HbtzVBNEKLtZ3WKe4u5FO756wsl2AgUi3SGLVj_1DTjjlAFmLg9voILTg9qapmcwQ0RLZA5pZ8jHWJdE0JPDs20ibBTysY529nfka4JjEcBTizPQmxlQpK74ni_to3CmsCkrLc-fIIX2flFbul97G_LZR4oBYjJtnlKQmMV_3zzxoVtPwY_MtNxAvems1RsjRVT9KDRz0KK6dXdzdgXJ_IhLopi2m2nvvWlGd-WS6Emr96YYtwJN03xPPaZZ61mFqsCDvh1lMem-yMDN8WrBeWazmdWmqWtn6ZKR-eGH5_XqlJDmH_gaSP3GMwWfAIh6VcLeCMBMwzadqaMov9VOqgbXU0zrpzq7iTZliygLLbREZ_mmbJTp9ajWFO3VBYpFQTbMiikm1rQtt2qeFI8FG6YxVuj4MGJJ-jrD169tSM7Fwom_As8q85UOCd0KCEXXoPktHvk5IEJ8FWRM_DRVQIfSGuJx2Gb5t1lDK9tZqdxBIfgZSixGjV1RaXu1k2TuZe8cHPOgMwy0p3W2Nu-3ZNmORrzVanoUj8Cgak5vuV1uPNtGUy-NTP8xYzAJJFS8LM575-jMWvGo_64FTudwD64H8ytY1l1rv6P1Ovbut1KfuQ3jZsk90xc51qSr8GcwzN0AzAIlIe1EnA1tfucbI2WDEd8W2JJG3LmlW7QrjOwVwhVvLbCw1GVjwWgILnxlrEIEuxHdLC-aicktRxBrEUmt8zPAzhYGsrkD6PTkCMrZnBlMtjSJnJ3Il-IDqpNx9U44Gly8kf1LQDfrrEDaFDJTH0fMjvrlS0Mbmn_1NC3JvT7CanLnIGjKZg1R8TWZRtoeKef1ceMXJPoxkdgnMLm--O4GRW3poczj9oU_cn_2z9etujOK5oDhWkgXzOBLQSLd-xEhPNQrNcmMLvVVmbw9Fxt_vUHa-28N8zhVqI9S_j3zBaPh7XrX3enlesBTIME4KSy48tGzVOlGtH5PaWI-DtI2d4zYCJxh2rUCoVry4EEplmyOkjdJVyDYtLL3OtANnnnHTt4nVEVq2CDNpCHtIN2VIrVR4syOAQbw61WccpEy9D6JBKdIBsQIs6EGBj3qK2907AS8qMx-6-TnLy7SVjt8v20jt5aVupNQuJ2Rt_xUmMSrCM7UKCu76GEG9Cpem8Cma_54soazO8exKph8PpMnCNQZbuons4N2IskBqqpPkzW6YoHsJzKnMErCWC7lGm9CHWiHEiD7_06k4SJt6UsG31ISk43GAmac45DUj-1HaZo2mjbMvNy0)

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
├── QRDisplay                         [full-screen, SSE active]
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

QRScannerView
├── CameraFeed                        [device camera API]
└── ScanResult                        [confirm / reject]
```

---

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
type ProgressStatus = "pending" | "completed" | "autoApproved";
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

---

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

---

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

---

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

| #    | Constraint                                                   | Enforcement                                                       |
| ---- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| C-01 | One user identity per session                                | `players.uid` unique globally                                     |
| C-02 | Progress is always recoverable                               | `recoveryKey` stored in PB, shown once on first join              |
| C-03 | No auth system required                                      | Pocketbase auth collections unused in prototype                   |
| C-04 | `xpThreshold` is always 100 per Milestone                    | Constant; not stored as a variable field                          |
| C-05 | One `ProgressEvent` per `(playerId, missionId)`              | Enforced at `upsertProgressEvent` — the single write path         |
| C-06 | Form missions never generate a QR                            | `autoApproved` status set on submit                               |
| C-07 | SSE subscription is only active in `QRDisplay`               | No other component maintains a live PB subscription               |
| C-08 | Milestone positions are percentage-based                     | `xPercent`/`yPercent` 0–100, never pixels                         |
| C-09 | `MilestoneNode` and `MissionCard` are shared components      | `draggable` and `editable` boolean props; see D-007 for trade-off |
| C-10 | Templates strip all PBRecord IDs on export                   | Import creates fresh records; never reuse IDs across sessions     |
| C-11 | `PlayerProgress` and `MilestoneProgress` are never persisted | Derived at read time by `computeProgress`                         |
| C-12 | No TypeScript enums                                          | Use `const` object + `keyof` union pattern throughout             |
| C-13 | No component calls `JSON.parse` on a PB record field         | All parsing happens inside the PB adapter module                  |
| C-14 | No component writes directly to `progress_events`            | All mutations go through `upsertProgressEvent`                    |

---

## Open Decisions [APPEND-ONLY]

| #     | Question                                                                                                                    | Impact                                       | Target Sprint  |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------- |
| OD-01 | Should `link`-type Missions auto-complete on click, or require "Mark as Visited" + QR flow?                                 | Determines if link missions need `QRDisplay` | Sprint 2       |
| OD-02 | Should difficulty changes retroactively affect earned XP, or should `ProgressEvent` snapshot `xpValue` at validation time?  | Data model + fairness UX                     | Sprint 2       |
| OD-03 | Should `MilestoneNode` fill colour use a gradient (0–100%) or step thresholds (0%, 25%, 50%, 75%, 100%)?                    | Visual design only                           | Sprint 2       |
| OD-04 | Does the `ResourcesSection` support metadata filtering (type, tags) or free-text search only?                               | `SearchBar` complexity                       | Sprint 2       |
| OD-05 | Should the Game Maker be able to create multiple Buddy profiles per session (a pool), or one per player only?               | `BuddyProfile` schema impact                 | Sprint 3       |
| OD-06 | What is the offline behaviour for form submission — queue and sync, or block until online?                                  | Service Worker strategy                      | Sprint 3       |
| OD-07 | In production, should `xpValue` be re-derived from `missions.xpValue` at scan time rather than trusted from the QR payload? | Security; out of scope for prototype         | Post-prototype |
