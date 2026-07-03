# PocketBase Schema Reference

Auto-provisioned by embedded Go migrations (`server/pb_migrations/`) on first `docker compose up --build`. No manual setup required.

All collections use **public API rules** (C-03 — no auth system). The PWA manages identity via `localStorage.mb_identity` UID — identity is **not** stored in PocketBase.

**Target schema** below includes migration `003_hardening.go` (pending implementation). Collections created by `001`/`002` alone omit `sessions.mapNodeScale`, use `bgImageUrl` as text, and lack the `progress_events` composite unique index.

See also: [`docs/shared-data-access.md`](shared-data-access.md) (hook → collection map), [`plans/production-implementation-plans.md`](../plans/production-implementation-plans.md).

## Collections

### `sessions`

| Field | Type (target) | Required | Notes |
|-------|---------------|----------|-------|
| `name` | text | ✓ | Session display name |
| `bgImageUrl` | **file** (003) / text (001) | | Map background — PB file ref; adapter resolves to browser URL via `pb.files.getURL` (C-13) |
| `mapNodeScale` | number (003) | | 0–1 fraction; default **0.33** on create. Shared admin editor + player map (UX-012) |
| `gameMakerId` | text | ✓ | Raw UID string (not a PB relation) — matches `mb_identity.uid` |
| `preBoardingChecks` | JSON | | `PreBoardingCheckItem[]` |
| `qrSecret` | text | | Auto-generated 64-char hex HMAC secret (Go hook on create, C-16) |

**GM writes:** `bgImageUrl` (file upload), `mapNodeScale`, `preBoardingChecks` via [`useSession`](src/hooks/useSession.ts) gamemaker overload.  
**Player reads:** `name`, `bgImageUrl`, `mapNodeScale`, `qrSecret` (encode only).

### `players`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `uid` | text | ✓ | ✓ | Client-generated UUID (C-03) — links to `mb_identity.uid` |
| `recoveryKey` | text | ✓ | ✓ | 8-char alphanumeric recovery code |
| `sessionId` | text | ✓ | | FK → sessions |
| `tutorialComplete` | bool | | | Tutorial skipped/completed flag |
| `profileComplete` | bool | | | Profile form submitted flag |
| `name` | text | | | Display name |
| `preferredName` | text | | | Name the player prefers |
| `pronouns` | text | | | e.g. "they/them" |
| `avatarUrl` | file | | | Max 5 MB |
| `role` | text | | | Job title |
| `team` | text | | | Team/department |
| `startDate` | text | | | ISO date string |
| `location` | text | | | Office/city |
| `timezone` | text | | | IANA timezone (e.g. "Europe/Berlin") |
| `skillsConfident` | JSON | | | `string[]` |
| `skillsDevelop` | JSON | | | `string[]` |
| `languages` | JSON | | | `string[]` |
| `workStyle` | text | | | e.g. "hybrid" |
| `energizers` | JSON | | | `string[]` |
| `drainers` | JSON | | | `string[]` |

**GM reads:** full list via `useProgressAdmin`. **Player writes:** `updatePlayer` (profile form, tutorial skip).

### `milestones`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `name` | text | ✓ | Display name |
| `xPercent` | number | ✓ | 0–100 (C-08) |
| `yPercent` | number | ✓ | 0–100 (C-08) |
| `xpThreshold` | number | ✓ | Sum of `missions.xpValue` in this milestone (C-04); recomputed on mission save |
| `order` | number | ✓ | Sort order |

**GM CRUD** via `useAdminMilestoneEditor`. **Player read** via `useSession`.

### `missions`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `milestoneId` | text | ✓ | FK → milestones |
| `title` | text | ✓ | Display title |
| `body` | editor | | Markdown content |
| `type` | text | ✓ | `text`, `link`, or `form` |
| `externalUrl` | text | | Only when type = `link` |
| `xpValue` | number | ✓ | **Set directly by GM** — XP awarded on validation |
| `tags` | JSON | | `MissionTag[]` |
| `suggestedDueDate` | text | | ISO date string |
| `order` | number | ✓ | Sort order |
| `isInCurrentMissions` | bool | | Shown on player dashboard |
| `validationMethod` | text | ✓ | `gmApprove`, `selfApprove`, `qr`, or `peerScan` |
| `peerScanTarget` | number | | Required when `validationMethod = peerScan` (min unique scanners) |

> **Migration note:** `difficulty` field is **deprecated** — remove in a future migration once code no longer references it.

**GM CRUD** via `useAdminMissionEditor`. **Player read** via `useSession`; progress via `useProgressPlayer`.

### `form_schemas`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `missionId` | text | ✓ | ✓ | FK → missions |
| `fields` | JSON | | | `JSON.stringify(FieldSchema[])` — parsed by adapter (C-13) |

**GM write** via `useAdminMissionEditor`. **Player read** via `useFormMission`.

### `progress_events`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions (derived on create from player) |
| `playerId` | text | ✓ | FK → players |
| `missionId` | text | ✓ | FK → missions |
| `status` | text | ✓ | `pending`, `pendingApproval`, `completed`, `autoApproved` |
| `validatedBy` | text | | Game Maker UID |
| `validatedAt` | text | | ISO timestamp |
| `formResponse` | JSON | | `JSON.stringify(Record<string, string>)` — parsed by adapter (C-13) |

> **C-05:** One event per `(playerId, missionId)`. Enforced by adapter `upsertProgressEvent` and, after migration 003, DB unique index `idx_player_mission` on `(playerId, missionId)`.

**Player writes:** self-approve, request approval, form submit. **GM writes:** approve/reject, QR confirm on `ValidationPage`. **Peer scans:** insert only via `PeerScanPage`.

### `peer_scans` (planned — C-25)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `missionId` | text | ✓ | FK → missions |
| `playerId` | text | ✓ | Mission owner (FK → players) |
| `scannerDeviceId` | text | ✓ | From `localStorage.mb_scan_device_id` |
| `scannerName` | text | ✓ | Attester display name |
| `formResponse` | JSON | | Optional custom fields |

**Unique index:** `(missionId, playerId, scannerDeviceId)`. GM subscribes via SSE for live hire analytics.

### `buddy_profiles`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `sessionId` | text | ✓ | | FK → sessions |
| `assignedToPlayerId` | text | ✓ | ✓ | FK → players |
| `name` | text | ✓ | | Buddy's display name |
| `role` | text | | | Buddy's job title |
| `tenure` | text | | | e.g. "4 years at Messe München" |
| `avatarUrl` | file | | | Max 5 MB |
| `contactUrl` | text | | | Calendar link or profile URL |
| `quote` | text | | | Personal quote shown on buddy card |
| `email` | text | | | Contact email |
| `phone` | text | | | Contact phone |

**GM write** via `useBuddyProfile`. **Player read** via `useBuddyProfile`.

### `resources`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `title` | text | ✓ | Resource title |
| `description` | text | | Markdown description |
| `type` | text | ✓ | `guide`, `video`, `link`, or `document` |
| `url` | url | ✓ | Resource URL |
| `isVisibleToPlayer` | bool | | Toggle visibility on player dashboard |

**GM CRUD** via `useResources`. **Player read** (filtered) via `useResources`.

### `templates`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `name` | text | ✓ | ✓ | Template display name |
| `data` | JSON | | | Full `TemplateExport` object (C-10) |

**GM only** via `useTemplateLibrary`. `saveTemplate` upserts by `name`.

## Indexes

| Collection | Index | Unique | Columns |
|------------|-------|--------|---------|
| `players` | `idx_uid` | ✓ | `uid` |
| `players` | `idx_recoveryKey` | ✓ | `recoveryKey` |
| `form_schemas` | `idx_missionId` | ✓ | `missionId` |
| `buddy_profiles` | `idx_assignedToPlayerId` | ✓ | `assignedToPlayerId` |
| `templates` | `idx_name` | ✓ | `name` |
| `progress_events` | `idx_player_mission` (003) | ✓ | `playerId`, `missionId` |
| `peer_scans` | `idx_peer_scan_unique` (planned) | ✓ | `missionId`, `playerId`, `scannerDeviceId` |

## API Rules

All collections: `ListRule = ""`, `ViewRule = ""`, `CreateRule = ""`, `UpdateRule = ""`, `DeleteRule = ""`.

The PWA manages access control via [`useIdentity`](src/hooks/useIdentity.ts:16) — players see player views, GameMakers see admin views. PocketBase has no user auth (C-03).

## Migration Files

| File | Status | Purpose |
|------|--------|---------|
| [`001_initial_collections.go`](server/pb_migrations/001_initial_collections.go) | ✅ Shipped | sessions, players, milestones, missions, form_schemas, progress_events, buddy_profiles, resources |
| [`002_templates.go`](server/pb_migrations/002_templates.go) | ✅ Shipped | templates collection |
| [`003_hardening.go`](server/pb_migrations/003_hardening.go) | ❌ Pending | Add `sessions.mapNodeScale`; `sessions.bgImageUrl` TextField → FileField; unique index on `progress_events(playerId, missionId)` |

Auto-migration runs on startup when `PB_AUTO_MIGRATE=true` (the default). Set to `false` after initial deployment.

## JSON & File Field Marshalling (C-13)

All parsing, stringifying, and file-URL resolution happens inside [`src/adapters/pocketbase/parsers.ts`](src/adapters/pocketbase/parsers.ts) — components and hooks never call `JSON.parse` on PB record fields.

| Collection | Field | App type | Notes |
|-----------|-------|----------|-------|
| `form_schemas` | `fields` | [`FieldSchema[]`](src/types/value-objects.ts:5) | |
| `progress_events` | `formResponse` | `Readonly<Record<string, string>>` | |
| `missions` | `tags` | `ReadonlyArray<MissionTag>` | |
| `players` | `skillsConfident`, `skillsDevelop`, `languages`, `energizers`, `drainers` | `ReadonlyArray<string>` | |
| `sessions` | `preBoardingChecks` | `ReadonlyArray<PreBoardingCheckItem>` | |
| `templates` | `data` | [`TemplateExport`](src/types/exports.ts:18) | |
| `players` | `avatarUrl` | `string \| undefined` | FileField → `pb.files.getURL` |
| `buddy_profiles` | `avatarUrl` | `string \| undefined` | FileField → `pb.files.getURL` |
| `sessions` | `bgImageUrl` | `string` | FileField (003) → `pb.files.getURL` |

## Not in PocketBase (client-only)

These types are documented in [`docs/admin-view-data.md`](admin-view-data.md) §6.2 and [`docs/player-view-data.md`](player-view-data.md) §5 — **do not add PB collections for them**:

| Storage | Data |
|---------|------|
| `localStorage.mb_identity` | `CachedIdentity[]` — UID, role, sessionId, recovery key |
| `localStorage.mb_draft_*` | Mission editor drafts (`StoredDraft`) |
| `sessionStorage` | Tutorial step, landing toast |
