---
goal: Automated PocketBase Superuser Creation via Environment Variables
version: 1.0
date_created: 2026-06-18
last_updated: 2026-06-18
owner: DevOps
status: Completed
tags: infrastructure, pocketbase, devops, superuser, environment-variables
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines an automated, environment-variable-driven approach for creating the PocketBase superuser account at container startup. Currently, the superuser must be created manually via the Admin UI (`/_/`) on first deploy. This plan eliminates that manual step by wiring `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` environment variables into a Go migration that creates the superuser on first run.

The superuser is **only** for PocketBase Admin UI access (infrastructure management). It is **not** used for application-level authentication (C-03: no auth system).

## 1. Requirements & Constraints

- **REQ-001**: Superuser is created automatically when `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` are both set
- **REQ-002**: When env vars are empty/missing, migration silently skips — zero impact on existing deployments
- **REQ-003**: Migration is idempotent — re-deploying with the same env vars does not error
- **REQ-004**: Only the `_superusers` system collection is touched; no impact on existing 9 custom collections or their public API rules
- **CON-001**: No changes to `Dockerfile`, `docker/entrypoint.sh`, `docker/supervisord.conf`, or `server/main.go` — implementation is self-contained in a new migration file + env var plumbing
- **CON-002**: `.env` file remains gitignored — credentials are never committed
- **CON-003**: Must follow existing Go migration pattern used by migrations `001`–`004` (package `migrations`, `m.Register(upFunc, downFunc)`)
- **PAT-001**: Follow the official PocketBase documented pattern for creating initial superuser in a Go migration (see [pocketbase.io/docs/go-migrations/#creating-initial-superuser](https://pocketbase.io/docs/go-migrations/#creating-initial-superuser))

## 2. Implementation Steps

### Implementation Phase 1: Create the Migration

- GOAL-001: Add a new Go migration that reads `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` from the environment and creates the superuser if both are provided and the superuser does not already exist.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create new file `server/pb_migrations/005_superuser_init.go` | | |
| TASK-002 | Implement `upFunc`: read `os.Getenv("PB_ADMIN_EMAIL")` and `os.Getenv("PB_ADMIN_PASSWORD")`; skip if either is empty; lookup `core.CollectionNameSuperusers` collection; check existence via `app.FindAuthRecordByEmail(core.CollectionNameSuperusers, email)`; if not found, create `core.NewRecord` with `record.Set("email", email)` and `record.Set("password", password)`, then `app.Save(record)`; log success or skip reason via `log.Println` | | |
| TASK-003 | Implement `downFunc`: read email from env; find superuser by email; if found, `app.Delete(record)`; if not found, return nil (silent no-op) | | |

### Implementation Phase 2: Wire Environment Variables

- GOAL-002: Add `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` to `.env.example` and pass them to the `app` service in `docker-compose.yml`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | In `.env.example`, add two new entries under the PocketBase section: `PB_ADMIN_EMAIL=` and `PB_ADMIN_PASSWORD=`, both with empty defaults and a comment explaining they are optional | | |
| TASK-005 | In `docker-compose.yml`, add `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` to the `app` service `environment` block (alongside existing `PB_AUTO_MIGRATE`), referencing `${PB_ADMIN_EMAIL:-}` and `${PB_ADMIN_PASSWORD:-}` | | |

## 3. Alternatives

- **ALT-001 — Event Hook on `OnServe`**: Register an `app.OnServe()` hook in `server/main.go` that reads env vars and upserts the superuser on every server start. **Rejected** because: (a) runs on every start, adding overhead; (b) requires changes to `main.go` which is already clean; (c) migration is the officially documented PocketBase approach and fits the existing project pattern.
- **ALT-002 — CLI command in entrypoint.sh**: Run `pocketbase-server superuser upsert $PB_ADMIN_EMAIL $PB_ADMIN_PASSWORD` before supervisor starts. **Rejected** because: (a) requires exposing the CLI command in the Dockerfile build; (b) password visible in process listing; (c) adds shell complexity where Go code is cleaner.
- **ALT-003 — HTTP API call in entrypoint.sh**: Use `curl` to `POST /api/admins` after server starts. **Rejected** because: (a) tight coupling to server startup timing; (b) requires wait-for-ready loop; (c) introduces a shell dependency on `curl` for a task better handled in Go.

## 4. Dependencies

- **DEP-001**: PocketBase Go SDK (`github.com/pocketbase/pocketbase`) — already available in `server/go.mod`
- **DEP-002**: Existing migration infrastructure in `server/main.go` (`migratecmd.MustRegister`) — already in place, no changes needed
- **DEP-003**: `os` and `log` packages from Go standard library — always available

## 5. Files

- **FILE-001**: `server/pb_migrations/005_superuser_init.go` (NEW) — Go migration with `upFunc`/`downFunc`
- **FILE-002**: `.env.example` (MODIFY) — add `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` entries
- **FILE-003**: `docker-compose.yml` (MODIFY) — add env vars to `app` service `environment` block (line ~249-251)

## 6. Testing

### Manual Verification

- **TEST-001 — Fresh deploy with credentials**: Set `PB_ADMIN_EMAIL=admin@example.com` and `PB_ADMIN_PASSWORD=securepass123` in `.env`, run `docker compose up --build --force-recreate`. Verify: (a) container logs show "superuser created: admin@example.com"; (b) can log in at `https://localhost/_/` with the credentials; (c) Admin UI is accessible.
- **TEST-002 — Fresh deploy without credentials**: Leave `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` empty/unset. Run `docker compose up --build --force-recreate`. Verify: (a) container starts without errors; (b) migration log shows "skipping superuser creation: PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD not set"; (c) Admin UI shows first-time setup form (existing behavior).
- **TEST-003 — Re-deploy with same credentials**: After TEST-001, run `docker compose down && docker compose up`. Verify: (a) migration is not re-applied (already tracked in `_migrations`); (b) existing superuser still works.
- **TEST-004 — Partial configuration**: Set only `PB_ADMIN_EMAIL` but leave `PB_ADMIN_PASSWORD` empty. Deploy fresh. Verify: migration skips; no partial state.
- **TEST-005 — Existing superuser already present**: If another migration or manual creation already made a superuser with the same email, the migration should detect it via `FindAuthRecordByEmail` and skip creation without error.

### Integration Context

- All existing migrations (`001`–`004`) must still run successfully
- All 9 custom collections must still have public API rules after deployment
- The `PB_AUTO_MIGRATE` flow must not be disrupted

## 7. Risks & Assumptions

- **RISK-001 — Password in environment**: `PB_ADMIN_PASSWORD` is stored as plaintext in `.env`. Mitigation: `.env` is in `.gitignore`; Docker Compose env passing is standard practice for local/dev deployments. For production, Docker secrets or a secrets manager should be used instead.
- **RISK-002 — Password rotation**: The migration creates the superuser once. To change the password after creation, the operator must use the Admin UI or delete the `_migrations` table entry for this migration and restart. Mitigation: document this limitation; it's acceptable for a devops-only account.
- **ASSUMPTION-001**: PocketBase v0.39.4 API (`core.CollectionNameSuperusers`, `core.NewRecord`, `app.FindAuthRecordByEmail`) is stable and will not change in a breaking way within the v0.x line.
- **ASSUMPTION-002**: The `_superusers` collection exists by default in PocketBase and does not need to be created by a migration.
- **ASSUMPTION-003**: `PB_AUTO_MIGRATE=true` (current default) will be set when the superuser migration should run. If `PB_AUTO_MIGRATE=false`, the migration won't run and superuser creation is skipped.

## 8. Related Specifications / Further Reading

- [PocketBase Go Migrations — Creating Initial Superuser](https://pocketbase.io/docs/go-migrations/#creating-initial-superuser)
- [`server/main.go`](../server/main.go) — existing migration registration and `qrSecret` hook
- [`server/pb_migrations/001_initial_collections.go`](../server/pb_migrations/001_initial_collections.go) — reference migration pattern
- [SPECS.md — Constraint C-03: No auth system](../SPECS.md)
- [`.env.example`](../.env.example) — current environment variable inventory
- [`docker-compose.yml`](../docker-compose.yml) — current `app` service configuration
