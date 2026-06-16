# PocketBase Schema Reference

Auto-provisioned by embedded Go migrations (`server/pb_migrations/`) on first `docker compose up --build`. No manual setup required.

All collections use **public API rules** (C-03 — no auth system). The PWA manages identity via `localStorage.mb_identity` UID.

## Collections

### `sessions`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | text | ✓ | Session display name |
| `bgImageUrl` | text | | Map background image URL |
| `gameMakerId` | text | ✓ | Raw UID string (not a PB relation) |
| `preBoardingChecks` | JSON | | `PreBoardingCheckItem[]` |
| `qrSecret` | text | | Auto-generated 64-char HMAC secret for QR signing (C-16) |

### `players`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `uid` | text | ✓ | ✓ | Client-generated UUID (C-03) |
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

### `milestones`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `name` | text | ✓ | Display name |
| `xPercent` | number | ✓ | 0–100 (C-08) |
| `yPercent` | number | ✓ | 0–100 (C-08) |
| `xpThreshold` | number | ✓ | Always 100 (C-04) |
| `order` | number | ✓ | Sort order |

### `missions`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `milestoneId` | text | ✓ | FK → milestones |
| `title` | text | ✓ | Display title |
| `body` | editor | | Markdown content |
| `type` | text | ✓ | `text`, `link`, or `form` |
| `externalUrl` | text | | Only when type = `link` |
| `difficulty` | number | ✓ | 1–5 |
| `xpValue` | number | ✓ | Derived at save time by `deriveXP()` |
| `tags` | JSON | | `MissionTag[]` |
| `suggestedDueDate` | text | | ISO date string |
| `order` | number | ✓ | Sort order |
| `isInCurrentMissions` | bool | | Shown on player dashboard |
| `validationMethod` | text | ✓ | `gmApprove`, `selfApprove`, or `qr` |

### `form_schemas`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `missionId` | text | ✓ | ✓ | FK → missions |
| `fields` | JSON | | | `JSON.stringify(FieldSchema[])` — parsed by adapter (C-13) |

### `progress_events`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `playerId` | text | ✓ | FK → players |
| `missionId` | text | ✓ | FK → missions |
| `status` | text | ✓ | `pending`, `pendingApproval`, `completed`, `autoApproved` |
| `validatedBy` | text | | Game Maker UID |
| `validatedAt` | text | | ISO timestamp |
| `formResponse` | JSON | | `JSON.stringify(Record<string, string>)` — parsed by adapter (C-13) |

> **C-05:** Composite uniqueness on `(playerId, missionId)` is enforced at the adapter level (`upsertProgressEvent` queries first, then PATCH or POST).

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

### `resources`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sessionId` | text | ✓ | FK → sessions |
| `title` | text | ✓ | Resource title |
| `description` | text | | Markdown description |
| `type` | text | ✓ | `guide`, `video`, `link`, or `document` |
| `url` | url | ✓ | Resource URL |
| `isVisibleToPlayer` | bool | | Toggle visibility on player dashboard |

### `templates`

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `name` | text | ✓ | ✓ | Template display name |
| `data` | JSON | | | Full `TemplateExport` object (C-10) |

## API Rules

All collections: `ListRule = ""`, `ViewRule = ""`, `CreateRule = ""`, `UpdateRule = ""`, `DeleteRule = ""`.

The PWA manages access control via [`useIdentity`](src/hooks/useIdentity.ts:16) — players see player views, GameMakers see admin views. PocketBase has no user auth (C-03).

## Migration Files

| File | Purpose |
|------|---------|
| [`001_initial_collections.go`](server/pb_migrations/001_initial_collections.go) | Creates sessions, players, milestones, missions, form_schemas, progress_events, buddy_profiles, resources |
| [`002_templates.go`](server/pb_migrations/002_templates.go) | Creates templates collection |

Auto-migration runs on startup when `PB_AUTO_MIGRATE=true` (the default). Set to `false` after initial deployment.

## JSON Field Marshalling (C-13)

Two collections store JSON fields that must be parsed/stringified at the adapter boundary:

| Collection | JSON Field | App Type | Raw Type |
|-----------|-----------|----------|----------|
| `form_schemas` | `fields` | [`FieldSchema[]`](src/types/value-objects.ts:5) | [`FormSchemaRaw`](src/types/domain.ts:113) |
| `progress_events` | `formResponse` | `Readonly<Record<string, string>>` | [`ProgressEventRaw`](src/types/domain.ts:118) |
| `missions` | `tags` | `ReadonlyArray<MissionTag>` | JSON string[] |
| `players` | `skillsConfident…` | `ReadonlyArray<string>` | JSON string[] |
| `sessions` | `preBoardingChecks` | `ReadonlyArray<PreBoardingCheckItem>` | JSON array |
| `templates` | `data` | [`TemplateExport`](src/types/exports.ts:18) | JSON object |

All parsing/stringifying happens inside the adapter ([`src/adapters/pocketbase/parsers.ts`](src/adapters/pocketbase/parsers.ts)) — components never call `JSON.parse` on PB record fields.
