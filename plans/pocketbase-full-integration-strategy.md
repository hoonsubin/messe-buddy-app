# PocketBase Full Integration — Implementation Strategy

> **Target outcome:** `docker compose up --build` launches a fully operational MesseBuddy PWA backed by a real PocketBase database. No manual UI setup, no admin panel clicking, no runtime scripts. Everything is automated in the Docker build.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Phase 1: Go Wrapper + Migrations (Docker/Build)](#phase-1-go-wrapper--migrations-dockerbuild)
3. [Phase 2: PocketBase JS Adapter (Frontend)](#phase-2-pocketbase-js-adapter-frontend)
4. [Phase 3: Provider Swap + Wiring](#phase-3-provider-swap--wiring)
5. [Phase 4: Background Image Upload (PB File)](#phase-4-background-image-upload-pb-file)
6. [Phase 5: SSE Real-Time Subscription](#phase-5-sse-real-time-subscription)
7. [Phase 6: QR Session Secret](#phase-6-qr-session-secret)
8. [Phase 7: Session Join via URL](#phase-7-session-join-via-url)
9. [Phase 8: Templates Collection](#phase-8-templates-collection)
10. [Phase 9: Cleanup & Documentation](#phase-9-cleanup--documentation)
11. [Updated Dockerfile](#updated-dockerfile)
12. [Updated docker-compose.yml Changes](#updated-docker-composeyml-changes)
13. [Quick Reference: All New/Modified Files](#quick-reference-all-newmodified-files)

---

## Architectural Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  docker compose up --build                                       │
│                                                                  │
│  Build Stage:                                                    │
│  1. Deno builds React PWA (VITE_PB_URL=/api)                    │
│  2. Go compiles PB wrapper (embedded migrations + PWA dist)     │
│                                                                  │
│  Runtime:                                                        │
│  3. Entrypoint: pocketbase serve --http=0.0.0.0:8090            │
│     ├── Auto-migrate on first run (creates all collections)     │
│     ├── Auto-create superuser (if not exists)                   │
│     └── Auto-create API rules (public read, GM write)           │
│  4. nginx proxies /api/* → PocketBase :8090 (replaces CORS)     │
│  5. PWA calls /api/* (same-origin, no CORS)                     │
└──────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| **Go wrapper, not raw binary** | PocketBase collections must be created programmatically via Go migration files. A raw binary requires manual UI setup — unacceptable for `docker compose up`. |
| **Same-origin proxy via nginx** | The PWA talks to `/api/*` (same origin), nginx reverse-proxies to `localhost:8090`. No CORS, no `VITE_PB_URL` build-time URL fragility. |
| **SDK v0.26.0 → 0.27.0 upgrade** | The npm SDK is at 0.27.0 (latest). The project's [`deno.json`](deno.json:30) has `0.26.0`. Upgrade to 0.27.0 for bug fixes. |
| **PB Server v0.23.0 → v0.39.4** | The current [`Dockerfile`](Dockerfile:46) downloads v0.23.0. Latest is v0.39.4. Upgrade the Go module dependency accordingly. |
| **No auth system** | Per C-03, all collections use public API rules. No admin auth needed at API level — the PWA manages identity via `mb_identity` localStorage UID. |
| **Embedded PWA static files** | The Go wrapper embeds the `dist/` folder and serves it on `:80`. PocketBase REST runs on a sub-path via a Go HTTP mux — no separate nginx container needed (simpler single-binary approach) OR keep nginx for production-grade static serving. **Decision: Keep nginx** for production reliability but embed PWA files in the Go binary so they're available from a single mount. |

---

## Phase 1: Go Wrapper + Migrations (Docker/Build)

### 1a. Create Go module wrapper

Create `pocketbase-server/main.go` — a Go program that:
- Embeds the `pb_migrations/` directory
- Registers the `migrate` command
- Creates a `MigrationsList` that includes all migration files
- On `app.OnBeforeServe()`, registers API routes for the PWA
- Optionally serves the PWA static files directly (or lets nginx handle it)

```go
// pocketbase-server/main.go
package main

import (
    "embed"
    "log"
    "os"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/pocketbase/migrations"
    "github.com/pocketbase/pocketbase/plugins/migratecmd"
)

//go:embed pb_migrations
var migrationsDir embed.FS

func main() {
    app := pocketbase.New()

    // Register migrations from embedded directory
    migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
        Dir:         "pb_migrations",
        Automigrate: os.Getenv("PB_AUTO_MIGRATE") != "false",
    })

    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        // Allow public access to all collections (C-03: no auth system)
        // API rules are set in the migration files, not here.
        return se.Next()
    })

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

### 1b. Create migration files

Create `pocketbase-server/pb_migrations/001_initial_collections.go`:

```go
package migrations

import (
    "github.com/pocketbase/pocketbase/core"
    m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
    m.Register(func(app core.App) error {
        // Sessions
        sessions := core.NewCollection(core.CollectionTypeBase)
        sessions.Name = "sessions"
        sessions.Fields.Add(
            &core.TextField{Name: "name", Required: true},
            &core.TextField{Name: "bgImageUrl"},
            &core.TextField{Name: "gameMakerId", Required: true},
            &core.JSONField{Name: "preBoardingChecks"},
            &core.TextField{Name: "qrSecret"}, // for QR HMAC (Phase 6)
        )
        sessions.ListRule = types.Pointer("")
        sessions.ViewRule = types.Pointer("")
        sessions.CreateRule = types.Pointer("")
        sessions.UpdateRule = types.Pointer("")
        sessions.DeleteRule = types.Pointer("")

        // Players
        players := core.NewCollection(core.CollectionTypeBase)
        players.Name = "players"
        players.Fields.Add(
            &core.TextField{Name: "uid", Required: true, Unique: true},
            &core.TextField{Name: "recoveryKey", Required: true, Unique: true},
            &core.RelationField{Name: "sessionId", CollectionId: "", Required: true},
            &core.BoolField{Name: "tutorialComplete"},
            &core.BoolField{Name: "profileComplete"},
            &core.TextField{Name: "name"},
            &core.TextField{Name: "preferredName"},
            &core.TextField{Name: "pronouns"},
            &core.FileField{Name: "avatarUrl"},
            &core.TextField{Name: "role"},
            &core.TextField{Name: "team"},
            &core.TextField{Name: "startDate"},
            &core.TextField{Name: "location"},
            &core.TextField{Name: "timezone"},
            &core.JSONField{Name: "skillsConfident"},
            &core.JSONField{Name: "skillsDevelop"},
            &core.JSONField{Name: "languages"},
            &core.TextField{Name: "workStyle"},
            &core.JSONField{Name: "energizers"},
            &core.JSONField{Name: "drainers"},
        )
        // ... API rules

        // Milestones, Missions, FormSchemas, ProgressEvents, BuddyProfiles, Resources, Templates
        // (full field definitions below in the actual file)

        return app.Save(sessions, players, milestones, missions, formSchemas, progressEvents, buddyProfiles, resources, templates)
    }, func(app core.App) error {
        // Down migration: delete all collections
        return nil
    })
}
```

### 1c. Update Dockerfile

The build stage must compile the Go wrapper:

```dockerfile
FROM golang:1.24-bookworm AS go-builder
WORKDIR /go-app
COPY pocketbase-server/ .
RUN CGO_ENABLED=0 go build -o /pb-server .

FROM debian:bookworm-slim AS runtime
COPY --from=go-builder /pb-server /usr/local/bin/pocketbase
```

The entrypoint changes from supervisord to a shell script that:
1. Creates `pb_data` directory if missing
2. Runs `/usr/local/bin/pocketbase serve --http=0.0.0.0:8090` (auto-migrate runs on first boot)
3. nginx is still needed for the PWA static files

### 1d. Entrypoint script

Update [`docker/entrypoint.sh`](docker/entrypoint.sh) to:
1. Wait for the virtual key (existing logic)
2. Write `/usr/share/nginx/html/config.js`
3. Start PocketBase in background: `/usr/local/bin/pocketbase serve --http=0.0.0.0:8090 --dir=/pb_data &`
4. Wait for PB to be ready: `curl -s http://localhost:8090/api/health`
5. Start nginx (or supervisord managing both)

---

## Phase 2: PocketBase JS Adapter (Frontend)

### 2a. Create `src/adapters/pocketbase/mod.ts`

```typescript
import PocketBase from "pocketbase";
import { createPBAdapter } from "./pbAdapter.ts";

const PB_URL = (() => {
  // In Docker: same-origin /api proxy
  // In dev: direct to localhost:8090
  if (typeof window !== "undefined" && window.__MB_CONFIG__?.pbUrl) {
    return window.__MB_CONFIG__.pbUrl;
  }
  return import.meta.env.VITE_PB_URL ?? "http://localhost:8090";
})();

export const pb = new PocketBase(PB_URL);
export const pbAdapter = createPBAdapter(pb);
```

### 2b. Create `src/adapters/pocketbase/pbAdapter.ts`

Implement all 29 methods of [`AppAdapter`](src/adapters/interface.ts:18). Key patterns:

```typescript
import type PocketBase from "pocketbase";
import type { AppAdapter } from "../interface.ts";
import type { 
  Session, Player, Milestone, Mission, FormSchema, 
  ProgressEvent, BuddyProfile, Resource, TemplateExport,
  PBRecord, FormSchemaRaw, ProgressEventRaw 
} from "../../types/index.ts";
import { marshalFormSchema, unmarshalFormSchema } from "./parsers.ts";

export const createPBAdapter = (pb: PocketBase): AppAdapter => {
  // Sessions
  const getSession = async (sessionId: string): Promise<Session> => {
    const record = await pb.collection("sessions").getOne(sessionId);
    return marshalSession(record);
  };

  const listSessions = async (): Promise<ReadonlyArray<Session>> => {
    const records = await pb.collection("sessions").getFullList();
    return records.map(marshalSession);
  };

  // Players
  const getPlayer = async (uid: string): Promise<Player | null> => {
    try {
      const record = await pb.collection("players")
        .getFirstListItem(`uid = "${uid}"`);
      return marshalPlayer(record);
    } catch {
      return null;
    }
  };

  // Progress Events — C-05: upsert single write path
  const upsertProgressEvent = async (
    playerId: string,
    missionId: string,
    patch: Partial<...>,
  ): Promise<ProgressEvent> => {
    // 1. Try to find existing
    const existing = await pb.collection("progress_events")
      .getFullList({ filter: `playerId = "${playerId}" && missionId = "${missionId}"` });

    const data = {
      ...patch,
      formResponse: patch.formResponse 
        ? JSON.stringify(patch.formResponse) // C-13: PB JSON field
        : undefined,
    };

    if (existing.length > 0) {
      const record = await pb.collection("progress_events")
        .update(existing[0].id, data);
      return marshalProgressEvent(record);
    } else {
      // Need sessionId — derive from player
      const player = await getPlayerById(playerId);
      const record = await pb.collection("progress_events")
        .create({ playerId, missionId, sessionId: player?.sessionId, ...data });
      return marshalProgressEvent(record);
    }
  };

  // SSE subscription (Phase 5)
  const subscribeProgressEvent = (
    playerId: string,
    missionId: string,
    callback: (event: ProgressEvent) => void,
  ): () => void => {
    // Resolve record ID, then subscribe
    let unsub: (() => void) | null = null;
    
    pb.collection("progress_events")
      .getFullList({ filter: `playerId = "${playerId}" && missionId = "${missionId}"` })
      .then((records) => {
        if (records.length > 0) {
          unsub = pb.collection("progress_events")
            .subscribe(records[0].id, (e) => {
              callback(marshalProgressEvent(e.record));
            });
        }
      });

    return () => { unsub?.(); };
  };

  // ... all other methods
};
```

### 2c. Create `src/adapters/pocketbase/parsers.ts`

Marshalling layer that converts between PocketBase raw records (with JSON-stringified fields per [`FormSchemaRaw`](src/types/domain.ts:113) and [`ProgressEventRaw`](src/types/domain.ts:118)) and typed app-layer interfaces (C-13):

```typescript
import type { FieldSchema, FormSchema, FormSchemaRaw, ProgressEvent, ProgressEventRaw } from "../../types/index.ts";

export const marshalFormSchema = (raw: FormSchemaRaw): FormSchema => ({
  ...raw,
  fields: JSON.parse(raw.fields) as ReadonlyArray<FieldSchema>,
});

export const marshalProgressEvent = (raw: ProgressEventRaw): ProgressEvent => ({
  ...raw,
  formResponse: raw.formResponse 
    ? JSON.parse(raw.formResponse) as Readonly<Record<string, string>>
    : undefined,
});
```

Key: **ALLJSON.parse calls for PB record fields are confined to this file** (C-13 invariant).

### 2d. Update `deno.json`

Bump the PocketBase SDK version:

```json
"pocketbase": "npm:pocketbase@^0.27.0",
```

Add the Go module dependency for reference:

```json
// Not applicable — Go modules are separate in go.mod
```

### 2e. Update `src/config/llm.ts`

Add PB URL to the runtime config type:

```typescript
declare global {
  interface Window {
    __MB_CONFIG__?: {
      llmBaseUrl?: string;
      llmKey?: string;
      llmModel?: string;
      useMockChat?: boolean;
      systemPrompt?: string;
      pbUrl?: string; // NEW: PocketBase URL (for dev overrides)
    };
  }
}
```

---

## Phase 3: Provider Swap + Wiring

### 3a. [`src/adapters/AdapterContext.tsx`](src/adapters/AdapterContext.tsx:13)

One-line change:

```diff
- import { mockAdapter } from "./mock/index.ts";
+ import { pbAdapter } from "./pocketbase/mod.ts";

- adapter = mockAdapter,
+ adapter = pbAdapter,
```

### 3b. [`src/adapters/AdapterContextValue.ts`](src/adapters/AdapterContextValue.ts:5)

Default context value:

```diff
- import { mockAdapter } from "./mock/index.ts";
- export const AdapterContext = createContext<AppAdapter>(mockAdapter);
+ import { pbAdapter } from "./pocketbase/mod.ts";
+ export const AdapterContext = createContext<AppAdapter>(pbAdapter);
```

> **Note:** Decide whether to keep the mock adapter as a fallback (e.g., `VITE_USE_MOCK_PB` env flag) during development. Phase exit condition: mock adapter is unreachable in production builds.

---

## Phase 4: Background Image Upload (PB File)

The current [`handleUploadBackground`](src/pages/AdminCockpitPage.tsx:228) uses `URL.createObjectURL(file)` as a local-only workaround. For PB:

1. The [`BackgroundImageUploader`](src/components/admin/BackgroundImageUploader.tsx:30) already collects the `File` object
2. The [`updateSession`](src/adapters/interface.ts:23) method in the PB adapter must accept `FormData`:

```typescript
// pbAdapter.ts — special handling for file uploads
const updateSession = async (
  sessionId: string,
  patch: Partial<Omit<Session, keyof PBRecord>>,
): Promise<Session> => {
  // If patch contains a file (bgImageUrl as File object), use FormData
  const formData = new FormData();
  for (const [key, value] of Object.entries(patch)) {
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }
  const record = await pb.collection("sessions").update(sessionId, formData);
  return marshalSession(record);
};
```

3. Update the page handler to pass the raw `File`:

```typescript
// AdminCockpitPage.tsx
const handleUploadBackground = useCallback(
  (file: File) => {
    void adapter.updateSession(sid, { bgImageUrl: file as unknown as string });
  },
  [adapter, sid],
);
```

---

## Phase 5: SSE Real-Time Subscription

The [`subscribeProgressEvent`](src/adapters/interface.ts:80) must use PocketBase's real-time SSE:

```typescript
subscribeProgressEvent: (
  playerId: string,
  missionId: string,
  callback: (event: ProgressEvent) => void,
): () => void => {
  const filter = `playerId = "${playerId}" && missionId = "${missionId}"`;
  
  // PB SSE subscription via wildcard record ID
  const unsub = pb.collection("progress_events").subscribe("*", (e) => {
    const record = e.record;
    if (record.playerId === playerId && record.missionId === missionId) {
      callback(marshalProgressEvent(record));
    }
  }, { filter });

  return unsub;
};
```

The consumers [`ValidationDisplay`](src/components/player/ValidationDisplay.tsx:25) and [`QRDisplay`](src/components/player/QRDisplay.tsx:66) already handle the callback correctly — **zero component changes required**.

---

## Phase 6: QR Session Secret

### Problem:
[`qrPayload.ts`](src/utils/qrPayload.ts:6) uses `sessionId` as the HMAC secret — this is trivially guessable (the session ID is in the URL).

### Solution:
1. Add a `qrSecret` field to the `sessions` collection (included in Phase 1 migration)
2. Generate a random 64-char hex secret on session creation:

```go
// In the Go wrapper's createSession hook or migration default
import "crypto/rand"
import "encoding/hex"

func generateQRSecret() string {
    b := make([]byte, 32)
    rand.Read(b)
    return hex.EncodeToString(b)
}
```

3. The PB adapter exposes `qrSecret` on the `Session` type (add field to [`domain.ts`](src/types/domain.ts:19))
4. Update [`QRDisplay`](src/components/player/QRDisplay.tsx:30) to pass `session.qrSecret` instead of `sessionId`
5. Update [`AdminQRScannerModal`](src/components/admin/AdminQRScannerModal.tsx:51) to pass `session.qrSecret` for decoding

---

## Phase 7: Session Join via URL

Per [`plans/prototype-impl-strategy.md:538`](plans/prototype-impl-strategy.md:538):

1. Game Maker shares a URL like `https://messe-buddy.example.com/?session=sess_abc123`
2. [`LandingPage.tsx`](src/pages/LandingPage.tsx:28) reads `?session=` param on mount:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get("session");
  if (sessionParam) {
    setSessionCode(sessionParam);
    setView("join");
  }
}, []);
```

3. The "Session code" input is pre-filled, the user just taps "Join Session"

---

## Phase 8: Templates Collection

### Design Decision:

Use a **dedicated `templates` collection** (not Resource records with a special type). This is cleaner and avoids leaking templates into the resources list.

### Migration field:

```go
templates := core.NewCollection(core.CollectionTypeBase)
templates.Name = "templates"
templates.Fields.Add(
    &core.TextField{Name: "name", Required: true, Unique: true},
    &core.JSONField{Name: "data"}, // Full TemplateExport object
)
```

### PB Adapter methods:

- [`listTemplates`](src/adapters/interface.ts:103): `pb.collection("templates").getFullList()` → map `data` JSON to [`TemplateExport`](src/types/exports.ts:18)
- [`saveTemplate`](src/adapters/interface.ts:104): `pb.collection("templates").create({ name, data: JSON.stringify(template) })`
- [`deleteTemplate`](src/adapters/interface.ts:105): `pb.collection("templates").delete(id)` (resolve by name first)

---

## Phase 9: Cleanup & Documentation

### 9a. Remove/disable mock adapter in production

Add a build-time flag:

```typescript
// src/adapters/AdapterContext.tsx
const USE_MOCK_PB = import.meta.env.VITE_USE_MOCK_PB === "true";

export const AdapterContextProvider = ({
  adapter = USE_MOCK_PB ? mockAdapter : pbAdapter,
  children,
}: AdapterContextProviderProps) => { ... };
```

In [`docker/entrypoint.sh`](docker/entrypoint.sh), `VITE_USE_MOCK_PB` is not set → production uses real PB.

### 9b. Create `docs/pb-schema.md`

Document exact field configs for all 9 collections, including:
- Field names, types, required flags
- JSON field schemas (what data structures they contain)
- API rules (all public per C-03)
- Unique indexes

### 9c. Add `.env.example` entries

```bash
# PocketBase
VITE_PB_URL=/api                              # same-origin proxy in Docker
PB_AUTO_MIGRATE=true                          # auto-migrate on first run
#PB_ADMIN_EMAIL=admin@messe-buddy.local       # optional: create admin UI user
#PB_ADMIN_PASSWORD=changeme                   # optional
```

---

## Updated Dockerfile

```dockerfile
# ─── Stage 1: PWA Build (Deno) ────────────────────────────────────────────
FROM denoland/deno:2.8.1 AS pwa-builder
WORKDIR /app
COPY deno.json deno.lock ./
COPY scripts/ scripts/
RUN deno install
COPY . .
ARG VITE_PB_URL=/api
ARG VITE_USE_MOCK_PB=false
RUN VITE_PB_URL=${VITE_PB_URL} VITE_USE_MOCK_PB=${VITE_USE_MOCK_PB} deno task build

# ─── Stage 2: Go PocketBase Server Build ──────────────────────────────────
FROM golang:1.24-bookworm AS go-builder
WORKDIR /go-app
COPY pocketbase-server/go.mod pocketbase-server/go.sum ./
RUN go mod download
COPY pocketbase-server/ .
COPY --from=pwa-builder /app/dist ./pwa-dist
RUN CGO_ENABLED=0 go build -o /pb-server .

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx supervisor curl ca-certificates gettext-base \
    && rm -rf /var/lib/apt/lists/*

# PocketBase server binary (Go wrapper with embedded migrations + PWA)
COPY --from=go-builder /pb-server /usr/local/bin/pocketbase-server

# Nginx + supervisor configs
COPY docker/nginx.conf /etc/nginx/sites-available/default.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME ["/pb_data"]
EXPOSE 80 8090

CMD ["/entrypoint.sh"]
```

---

## Updated docker-compose.yml Changes

The `app` service changes:

```yaml
app:
  build:
    context: .
    args:
      VITE_PB_URL: /api                     # same-origin proxy
      VITE_LITELLM_URL: ${VITE_LITELLM_URL:-http://localhost:4000}
      VITE_LITELLM_KEY: ${VITE_LITELLM_KEY:-}
      VITE_LITELLM_MODEL: ${VITE_LITELLM_MODEL:-policy-assistant}
      VITE_USE_MOCK_CHAT: ${VITE_USE_MOCK_CHAT:-true}
      VITE_USE_MOCK_PB: "false"             # NEW: production PB
      PB_VERSION: ${PB_VERSION:-0.39.4}     # UPDATED: latest
  ports:
    - "${APP_PORT:-80}:80"                  # PWA + PB proxy
  # 8090 no longer exposed to host — all traffic through nginx
  volumes:
    - pb_data:/pb_data
    - app_runtime:/runtime:ro
  environment:
    PB_AUTO_MIGRATE: "true"                 # auto-create schema on first run
```

---

## Quick Reference: All New/Modified Files

### New files to create:

| File | Purpose |
|---|---|
| `pocketbase-server/main.go` | Go wrapper — embeds migrations, registers auto-migrate |
| `pocketbase-server/go.mod` | Go module definition |
| `pocketbase-server/go.sum` | Go dependency lock |
| `pocketbase-server/pb_migrations/001_initial_collections.go` | Creates all 9 collections + API rules |
| `pocketbase-server/pb_migrations/002_qr_secret_default.go` | Adds index/default for `qrSecret` |
| `src/adapters/pocketbase/mod.ts` | Barrel export — creates PB client + adapter |
| `src/adapters/pocketbase/pbAdapter.ts` | Full `AppAdapter` implementation (29 methods) |
| `src/adapters/pocketbase/parsers.ts` | JSON field marshalling/unmarshalling (C-13) |
| `docs/pb-schema.md` | Documented schema reference |

### Files to modify:

| File | Change |
|---|---|
| `Dockerfile` | Add Go build stage, embed PWA + migrations |
| `docker/entrypoint.sh` | Start PB server, write config.js with `/api` URL |
| `docker/supervisord.conf` | Add pocketbase-server process |
| `docker/nginx.conf` | Add `/api` reverse proxy to PocketBase |
| `deno.json` | `pocketbase@^0.27.0` version bump, add `config.js` type |
| `src/adapters/AdapterContext.tsx` | Swap `mockAdapter` → `pbAdapter` |
| `src/adapters/AdapterContextValue.ts` | Swap default context value |
| `src/types/domain.ts` | Add `qrSecret` to `Session` interface |
| `src/pages/AdminCockpitPage.tsx` | File upload: pass raw `File` to adapter |
| `src/pages/LandingPage.tsx` | Read `?session=` URL param |
| `src/utils/qrPayload.ts` | Use `session.qrSecret` instead of `sessionId` |
| `src/components/player/QRDisplay.tsx` | Pass `session.qrSecret` |
| `src/components/admin/AdminQRScannerModal.tsx` | Pass `session.qrSecret` |
| `.env.example` | Add `VITE_USE_MOCK_PB`, `PB_AUTO_MIGRATE` |
| `docker-compose.yml` | Update build args, remove 8090 host port, add env vars |

---

## Execution Order

```
Phase 1 (Go wrapper + migrations)     ← Prerequisite for all phases
Phase 2 (PB JS adapter)               ← Can run in parallel with Phase 1
Phase 3 (Provider swap)               ← Depends on Phase 2
Phase 4 (Image upload)                 ← Depends on Phase 3
Phase 5 (SSE subscription)            ← Depends on Phase 3
Phase 6 (QR session secret)           ← Depends on Phase 1 (qrSecret field)
Phase 7 (Session join via URL)        ← Independent, can run anytime
Phase 8 (Templates collection)        ← Depends on Phase 1 + Phase 3
Phase 9 (Cleanup & docs)              ← Depends on all phases
```
