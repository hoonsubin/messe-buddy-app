# PocketBase Schema Reference

Auto-provisioned by embedded Go migrations (`server/pb_migrations/`) on first
`docker compose up --build`. No manual setup required.

> **Architecture (2026-07-05, D-ARCH-2 … D-NAMING-2):** One `sessions` row per GM
> (`gameMakerId`, `gmRecoveryKey`). Claimable onboarding identities in `players`
> only (no GM `players` row). Per-player journeys via `playerId`. Company-wide
> `templates` + `library_resources`; per-player `milestone_resources` attachments.
> Session ≈ department by convention — no department entity. See
> [`SPECS.md`](../SPECS.md) § Workspace & player model.

All collections use **public API rules** (C-03 — no auth system). The PWA caches
identity in `localStorage.mb_identity` (`UserRole` in cache only — not on
`players` rows).

**Shipped today (001/002):** legacy schema — `players.role` = job title string;
milestones/missions scoped by `sessionId` only; session-scoped `resources`.
**ARCH migrations (pending):** reshape per tables below.

See also: [`plans/production-implementation-plans.md`](../plans/production-implementation-plans.md)
(ARCH task list).

---

## Scope layers

| Layer | Collections | Notes |
| ----- | ----------- | ----- |
| **Company library** | `templates`, `library_resources` | All GMs; any GM may edit (D-ARCH-5) |
| **Workspace** | `sessions`, `players` | One session per GM; `players` = onboarding identities only |
| **Per-player journey** | `milestones`, `missions`, `form_schemas`, `progress_events`, `buddy_profiles`, `milestone_resources` | Scoped by `playerId` |

---

## Collections

### `sessions`

| Field | Type (target) | Required | Notes |
|-------|---------------|----------|-------|
| `name` | text | ✓ | Workspace display name |
| `bgImageUrl` | **file** (003) / text (001) | | Map background — adapter resolves via `pb.files.getURL` (C-13) |
| `mapNodeScale` | number (003) | | 0–1 fraction; default **0.33** on create |
| `gameMakerId` | text | ✓ | GM client UID — matches `CachedIdentity.uid` |
| `gmRecoveryKey` | text | ✓ | GM recovery; shown once on workspace create |
| `preBoardingChecks` | JSON | | `PreBoardingCheckItem[]` |
| `qrSecret` | text | | Auto-generated 64-char hex HMAC secret (C-16) |

**GM writes:** `bgImageUrl`, `mapNodeScale`, `preBoardingChecks` via
[`useSession`](src/hooks/useSession.ts) gamemaker overload.  
**Player reads:** `name`, `bgImageUrl`, `mapNodeScale`, `qrSecret` (encode only).

### `players` *(ARCH-01 target)*

Player onboarding identities only — **no GM rows**, **no `role` field**.

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `uid` | text | | ✓ (sparse) | Set on claim |
| `recoveryKey` | text | | ✓ (sparse) | Set on claim |
| `inviteToken` | text | ✓ | ✓ | Per-player invite permalink |
| `sessionId` | text | ✓ | | FK → sessions |
| `claimStatus` | text | ✓ | | `invited` \| `claimed` |
| `name` | text | | | Display name |
| `jobTitle` | text | | | UI label only |
| … | | | | Profile fields — see SPECS `Player` type |

**Current (001):** `role` = job title string; no `inviteToken`, `claimStatus`, or
`jobTitle`. Legacy `role` migrates to `jobTitle`; drop user-type semantics.

**Adapter:** `invitePlayer`, `claimPlayer`, `getPlayerByInviteToken`.

### `milestones` *(ARCH-02)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions (denormalized) |
| `playerId` | text | ✓ | FK → players — journey owner |
| `name` | text | ✓ | Display name |
| `xPercent` | number | ✓ | 0–100 (C-08) |
| `yPercent` | number | ✓ | 0–100 (C-08) |
| `xpThreshold` | number | ✓ | Sum of `missions.xpValue` (C-04) |
| `order` | number | ✓ | Sort order |

**Current (001):** `sessionId` only — no `playerId`.

### `missions` *(ARCH-02)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions (denormalized) |
| `playerId` | text | ✓ | FK → players |
| `milestoneId` | text | ✓ | FK → milestones |
| `title` | text | ✓ | Display title |
| `body` | editor | | Markdown content |
| `type` | text | ✓ | `text`, `link`, or `form` |
| `externalUrl` | text | | Only when type = `link` |
| `xpValue` | number | ✓ | GM-set; awarded on validation |
| `tags` | JSON | | `MissionTag[]` |
| `suggestedDueDate` | text | | ISO date string |
| `order` | number | ✓ | Sort order |
| `isInCurrentMissions` | bool | | Shown on player dashboard |
| `validationMethod` | text | ✓ | `gmApprove`, `selfApprove`, `qr`, `peerScan` |
| `peerScanTarget` | number | | When `validationMethod = peerScan` |

> **Migration note:** `difficulty` is deprecated — remove when code no longer references it.

### `form_schemas`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `missionId` | text | ✓ | ✓ | FK → missions |
| `fields` | JSON | | | `FieldSchema[]` — parsed by adapter (C-13) |

### `progress_events`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | Denormalized workspace FK |
| `playerId` | text | ✓ | FK → players |
| `missionId` | text | ✓ | FK → missions |
| `status` | text | ✓ | `pending`, `pendingApproval`, `completed`, `autoApproved` |
| `validatedBy` | text | | Game Maker UID |
| `validatedAt` | text | | ISO timestamp |
| `formResponse` | JSON | | Parsed by adapter (C-13) |

> **C-05:** Unique `(playerId, missionId)` via adapter + index `idx_player_mission` (003).

### `peer_scans` (planned — C-25)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `missionId` | text | ✓ | FK → missions |
| `playerId` | text | ✓ | Mission owner |
| `scannerDeviceId` | text | ✓ | `localStorage.mb_scan_device_id` |
| `scannerName` | text | ✓ | Attester display name |
| `formResponse` | JSON | | Optional custom fields |

**Unique index:** `(missionId, playerId, scannerDeviceId)`. GM SSE → player analytics.

### `buddy_profiles`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `sessionId` | text | ✓ | | FK → sessions |
| `assignedToPlayerId` | text | ✓ | ✓ | FK → players |
| `name` | text | ✓ | | Buddy display name |
| `role` | text | | | Buddy job title (not user type) |
| `tenure` | text | | | |
| `avatarUrl` | file | | | Max 5 MB |
| `contactUrl` | text | | | |
| `quote` | text | | | |
| `email` | text | | | |
| `phone` | text | | | |

### `library_resources` *(ARCH-02 — replaces session `resources` catalog)*

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `resourceKey` | text | ✓ | ✓ | Stable slug; referenced in templates |
| `title` | text | ✓ | | |
| `description` | text | | | Markdown |
| `type` | text | ✓ | | `guide`, `video`, `link`, `document` |
| `url` | url | ✓ | | |
| `tags` | text | | | Optional user-only text; not interpreted in prototype |

**Access:** all GMs — `listLibraryResources()`. CRUD on Admin **Resource library** tab.

### `milestone_resources` *(ARCH-02)*

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | Denormalized workspace FK |
| `playerId` | text | ✓ | Denormalized journey owner |
| `milestoneId` | text | ✓ | FK → milestones |
| `libraryResourceId` | text | ✓ | FK → library_resources |
| `isVisibleToPlayer` | bool | | Sidebar visibility |

**Player read:** attachments for current milestone on their `playerId`. Reference
links in library (URL changes propagate).

### `resources` *(legacy — deprecate)*

Session-scoped in **001**. Replaced by `library_resources` +
`milestone_resources`. Remove after ARCH-02 migration and code cutover.

### `templates`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `name` | text | ✓ | ✓ | Template display name |
| `data` | JSON | | | `TemplateExport` — milestones, missions, formSchemas, `resourceBindings` |

**Scope:** company-wide — no `sessionId`. Any GM may edit. `importTemplate(data, playerId)` copies onto one player.

---

## Indexes

| Collection | Index | Unique | Columns |
|------------|-------|--------|---------|
| `sessions` | `idx_gmRecoveryKey` | ✓ | `gmRecoveryKey` |
| `players` | `idx_uid` | ✓ | `uid` |
| `players` | `idx_recoveryKey` | ✓ | `recoveryKey` |
| `players` | `idx_inviteToken` | ✓ | `inviteToken` |
| `milestones` | `idx_playerId` | | `playerId` |
| `missions` | `idx_playerId` | | `playerId` |
| `form_schemas` | `idx_missionId` | ✓ | `missionId` |
| `buddy_profiles` | `idx_assignedToPlayerId` | ✓ | `assignedToPlayerId` |
| `library_resources` | `idx_resourceKey` | ✓ | `resourceKey` |
| `milestone_resources` | `idx_milestoneId` | | `milestoneId` |
| `templates` | `idx_name` | ✓ | `name` |
| `progress_events` | `idx_player_mission` (003) | ✓ | `playerId`, `missionId` |
| `peer_scans` | `idx_peer_scan_unique` (planned) | ✓ | `missionId`, `playerId`, `scannerDeviceId` |

---

## API Rules

All collections: public CRUD rules (C-03). Access control via `useIdentity` and
`RequireRole` in the PWA.

---

## Migration Files

| File | Status | Purpose |
|------|--------|---------|
| [`001_initial_collections.go`](../server/pb_migrations/001_initial_collections.go) | ✅ Shipped | Legacy collections incl. `resources` |
| [`002_templates.go`](../server/pb_migrations/002_templates.go) | ✅ Shipped | `templates` collection |
| [`003_hardening.go`](../server/pb_migrations/003_hardening.go) | ❌ Pending | `mapNodeScale`; `bgImageUrl` → file; `progress_events` unique index |
| **004+ ARCH** | ❌ Pending | `gmRecoveryKey`; reshape `players`; `playerId` FKs; `library_resources`; `milestone_resources` |

Auto-migration runs on startup when `PB_AUTO_MIGRATE=true` (default).

---

## JSON & File Field Marshalling (C-13)

Parsing in [`src/adapters/pocketbase/parsers.ts`](../src/adapters/pocketbase/parsers.ts).

| Collection | Field | App type |
|-----------|-------|----------|
| `form_schemas` | `fields` | `FieldSchema[]` |
| `progress_events` | `formResponse` | `Record<string, string>` |
| `missions` | `tags` | `MissionTag[]` |
| `players` | profile JSON arrays | `string[]` |
| `sessions` | `preBoardingChecks` | `PreBoardingCheckItem[]` |
| `templates` | `data` | `TemplateExport` |
| `players`, `buddy_profiles`, `sessions` | `avatarUrl` / `bgImageUrl` | file URL via `pb.files.getURL` |

---

## Not in PocketBase (client-only)

| Storage | Data |
|---------|------|
| `localStorage.mb_identity` | `CachedIdentity[]` — uid, role (`UserRole`), sessionId, recoveryKey |
| `localStorage.mb_active_uid` | Last-active profile pointer |
| `localStorage.mb_draft_*` | Admin mission editor drafts |
| `sessionStorage` | Tutorial step, landing toast |
