# MesseBuddy - Project Specification

> **Status:** Pre-implementation baseline · Sprint 3 entry point **Last
> updated:** 2026-06-12 **Authors:** Group 3 - Alisa Diakova · Hoon Kim ·
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
constraints are defined here. Do not infer from external knowledge - use this
document.

**Append-only sections** are marked `[APPEND-ONLY]`. Add new entries; never
delete or edit existing ones.

---

## Product Overview

[![](https://img.plantuml.biz/plantuml/dsvg/RLHDZzCm4BtdLmnxQgMqoqfxH6X3jLgAMWXD4TmgnvusPXCxs4wxuSIFu1VoInWx7ssblTaUUzwRDs_yO1qphgbA498T3AjsR-zs_7x7jNBuug8tKl6o4GZl5lUtY_lTeZj_7qLEkX9XnLeqS0TPQnrMq8UZA4LZjPhKfO_7S9E6nGsjFkC9iAfBtI82rxH29zK1c0AjSisCyBkVkZ4AMpXA1gv0IBydDzCXwu5Lk6RF8V4JhI5iVF94L5B1gT2KMUtbeJ5emQArKYiRGoM75LC2ZgoKWZcwCT2W44o4DCXTsO8s0Vxh1YndQahuKLVcfAAC-A4HeYNCzRZn3DOwboNEzj9OvraJU-Q06Ckz34YcreP0BugTmzOm_coXDlf0X6s0_P76On4i9wbxkaGIAkG5Kz9MVIMaNRA4MfUIjq0XbsitXsNNEkl3alfY52lBTYOmY2zWjLe3owqZy90rj0WcA-cGGjEEkT6DLyZWhmQji-1qwCSehmZ8HX-beCU1J7EeKFch1JdY95r1_SvH2BhhXMQg1Q5vqrsQR9AdwVoixUxnnKsOJFkClgTB67PUu6yrCKPM1Vf9kfp3bnfLiemXKQumkfQSbh-9sXZGdbZRRsU1WvDUKbIYrYJD738igUae-Wg8kdAIit3YGiMzBBxMbxRNwj-VluCxGU6HJZX972e_QpBuAHIvmN8SYYiNVI8UerNZmP6a_DcpjiahIP9T665e2zd0UWDr3WXdmSpUIAIVjuJNxkDscsPmsq-Jvt8nIbTq5YInkveT51wx8dDRfnNQsu5ODwD-fFqBObBxqg-dAeQ6JCV4I74qmEkqBhcCVqXMw9FFofzhwSPX7gSc3YEJ-qTazxtkHgEldfIoDH7109XbZmItUSosh-1TcM_JsJ-akFmbVCtNZl16dlNUHp6zhAi7YXx8R_JLHly1)](https://editor.plantuml.com/uml/RLHDZzCm4BtdLmnxQgMqoqfxH6X3jLgAMWXD4TmgnvusPXCxs4wxuSIFu1VoInWx7ssblTaUUzwRDs_yO1qphgbA498T3AjsR-zs_7x7jNBuug8tKl6o4GZl5lUtY_lTeZj_7qLEkX9XnLeqS0TPQnrMq8UZA4LZjPhKfO_7S9E6nGsjFkC9iAfBtI82rxH29zK1c0AjSisCyBkVkZ4AMpXA1gv0IBydDzCXwu5Lk6RF8V4JhI5iVF94L5B1gT2KMUtbeJ5emQArKYiRGoM75LC2ZgoKWZcwCT2W44o4DCXTsO8s0Vxh1YndQahuKLVcfAAC-A4HeYNCzRZn3DOwboNEzj9OvraJU-Q06Ckz34YcreP0BugTmzOm_coXDlf0X6s0_P76On4i9wbxkaGIAkG5Kz9MVIMaNRA4MfUIjq0XbsitXsNNEkl3alfY52lBTYOmY2zWjLe3owqZy90rj0WcA-cGGjEEkT6DLyZWhmQji-1qwCSehmZ8HX-beCU1J7EeKFch1JdY95r1_SvH2BhhXMQg1Q5vqrsQR9AdwVoixUxnnKsOJFkClgTB67PUu6yrCKPM1Vf9kfp3bnfLiemXKQumkfQSbh-9sXZGdbZRRsU1WvDUKbIYrYJD738igUae-Wg8kdAIit3YGiMzBBxMbxRNwj-VluCxGU6HJZX972e_QpBuAHIvmN8SYYiNVI8UerNZmP6a_DcpjiahIP9T665e2zd0UWDr3WXdmSpUIAIVjuJNxkDscsPmsq-Jvt8nIbTq5YInkveT51wx8dDRfnNQsu5ODwD-fFqBObBxqg-dAeQ6JCV4I74qmEkqBhcCVqXMw9FFofzhwSPX7gSc3YEJ-qTazxtkHgEldfIoDH7109XbZmItUSosh-1TcM_JsJ-akFmbVCtNZl16dlNUHp6zhAi7YXx8R_JLHly1)

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
- Not a replacement for company documentation - it links to existing resources

## Technology should create conditions for human connection, not replace it.

## Terminology Glossary

This glossary is authoritative.

| Term                   | Definition                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Session**            | One onboarding journey instance. Has a unique ID, a Game Maker, and a set of Players.                                                                                                                                                                                                                                    |
| **Milestone**          | A top-level grouping on the map - analogous to a hall or room. Contains Missions. Represented as a node on the Milestone Map.                                                                                                                                                                                            |
| **Mission**            | An individual task item within a Milestone. The atomic unit of work for a Player.                                                                                                                                                                                                                                        |
| **Player**             | A new employee going through an onboarding journey. Has read-only access to the cockpit.                                                                                                                                                                                                                                 |
| **Game Maker**         | The admin who configures the session - sets up Milestones, Missions, and validates completions.                                                                                                                                                                                                                          |
| **XP**                 | Experience points earned by completing Missions. Each Milestone has an `xpThreshold` of 100.                                                                                                                                                                                                                             |
| **Validation Method**  | The mechanism by which a Mission completion is confirmed. One of: `gmApprove` (Game Maker approves directly in admin cockpit), `selfApprove` (Player self-marks, immediately approved), or `qr` (Player generates a QR code, Game Maker physically scans it). Set per Mission by the Game Maker; default is `gmApprove`. |
| **Validation Request** | The transient state after a Player marks a non-`selfApprove` Mission complete. The Mission enters `pendingApproval` status and a `ValidationDisplay` is shown until the Game Maker acts.                                                                                                                                 |
| **Validation**         | An app mechanism that allows the game maker or another player to verify that a mission as been completed. Need for XP distribution.                                                                                                                                                                                      |
| **Current Missions**   | A curated list of Missions the Game Maker has surfaced to the Player's main view - not all Missions are in this list by default.                                                                                                                                                                                         |
| **Buddy**              | A company-assigned mentor figure displayed on the Player's cockpit. Not a system user - their info is manually entered by the Game Maker.                                                                                                                                                                                |
| **Template**           | A named, portable snapshot of a Session's structure (Milestones, Missions, Resources) with no player data. Used to bootstrap new sessions.                                                                                                                                                                               |
| **Recovery Key**       | An 8-character alphanumeric token shown to a user on first join, used to restore their identity if localStorage is cleared.                                                                                                                                                                                              |

## Tech Stack

[![](https://img.plantuml.biz/plantuml/dsvg/ZLPDRnit4BthLqnzab5P2e8Scg0eeZXEui9sPCjfZW9tToInuP8RaYjPBGhqH_GNzfVq3VT3wpY7wY9oPtOuy-RDuxuEKVbObuOAhJPUbQjdprVvYrNkR5JQiX_ze6rkweBfv_CNi_CNg_FEyije57KqJ5Vgm9wUKs-XjqsiqMZ1FZWxheouJEXaaHOdMDtmdhYiZ3imdvnsZXjLyhNwadpVOqrf8_xpejIMPlJX3jwZvI54BbSN3t6izCAxdIxIE_DBwdRoqgSgHC-gfAkhQvelBkdVl_-XZnNR-UM4vZPklQjqZkKVjUVUu3mfUsYtPxahAnLrXaBP5fNJDaxft7F1Dcfb0dmBAbt1XW8RpgDsbXJ2bSgg3HU4j8sER4mvFQZIJ0Vvlt6rBPG_Z0kNDqM_JGj0MLOkC2tPxtJEuUIK_XmHVZt6usglu7_7Ae-q-3m_wJS_qcyu3d_tXugNkTTL5EEroxJXixNs8Gf86yyXw1tJPyveNbNJT1ZoLO50YgXph0B7CAKFAD4mAZM6FbtI6W0rZKor7_j4ti5jIfSDOmAX7PKpEZzGlbKnSv76JKEqtPocbzrwRL0EtTxHJXbTA85F87fSRDYZWXOC-knyImfPPUu1jDYXvBFAr1jjpu2C6CzLlkLlQacvTsVMWINNo3xd2ZRBSO-0vFbhpG65FqcZoeJ3qgBuHWMMKzuxohH53sNJSY_GtSNoNWWteUNoWgewR2Uq1lp8ndcm0izlhwHBA5Xb23L9Q2Wm9_4SA8D5htvwzlBPaopUPkFmLHWbaAGeSlH5cN5HD7HxdE4IHmeEqcvdmuIQQSIYH4P8o79Qz-QM6olUWU9uaDL5SLZXiLI0FOok1cPO0ivo5O1pgPx2XKJNpGbUSdqdzI-R-ayUuTYDoY3R6igWf9nCvLysNkQ4T0cdPjwgbduxmEU_qwXsu11Fy97fHsiUcXuTujQ9ahIM92uPQAcQqMqYP-02iwMuPPckT6ZTgOdGkbKPiFtYGKOLUL40hGr_HpXcGl-PF30iXuI1b7J3rKW8Aes8CkaF85N7RSEEa4H3B6KLqUVV6x6PqhpUbDAgdhcqrt6BNVIQPQGXBxLuaCWwFs0Cx-RlCJEAgiqEKPm_dGfwQxqvApn4mRwYi5VLiSmM0D0LCjXHhGiRA3iG5reoVwHrAGzKHD7L-LQiWcMEIhz7bYuNDAHRDZm94OG4rQ5fdO5G1LjXx80qdIdbXzC2HfrI6o3dnsJ7IPEqyDVPp2allhIfPN8dz6v-6u36RSq0hv3AEWgfs05CKKFpekiXniBmJWqGZkWuwT2sASqb_8LERVyonl2mJD2-pQ2r3zWbAFqr6jsnwQ_GHlO_WN1I-8Vx-yKINCwysmTeucdo7ToY_ySz-II5lMwlh2nDofl6ItHiw9b4i1Cuod4f13H6T2xKMKZtJTiMEMxsw_BZJPB1OOpZV2u-8j3J-KW4RiRjLVGrT-6G_35K7sN0d2Mao8hW1rO-toR1xvjpd8DjRRyaI8HMioEjvZSttmP_z87nhcaNvg6PEO3LzXFTozC4uLEYw3iuH5qmwq00Xhs8uzf6m1djFVOfAIsNabLcu3rKqfRkCzI86piqjc_U6xs6nE2xRlGV)](https://editor.plantuml.com/uml/ZLPDRnit4BthLqnzab5P2e8Scg0eeZXEui9sPCjfZW9tToInuP8RaYjPBGhqH_GNzfVq3VT3wpY7wY9oPtOuy-RDuxuEKVbObuOAhJPUbQjdprVvYrNkR5JQiX_ze6rkweBfv_CNi_CNg_FEyije57KqJ5Vgm9wUKs-XjqsiqMZ1FZWxheouJEXaaHOdMDtmdhYiZ3imdvnsZXjLyhNwadpVOqrf8_xpejIMPlJX3jwZvI54BbSN3t6izCAxdIxIE_DBwdRoqgSgHC-gfAkhQvelBkdVl_-XZnNR-UM4vZPklQjqZkKVjUVUu3mfUsYtPxahAnLrXaBP5fNJDaxft7F1Dcfb0dmBAbt1XW8RpgDsbXJ2bSgg3HU4j8sER4mvFQZIJ0Vvlt6rBPG_Z0kNDqM_JGj0MLOkC2tPxtJEuUIK_XmHVZt6usglu7_7Ae-q-3m_wJS_qcyu3d_tXugNkTTL5EEroxJXixNs8Gf86yyXw1tJPyveNbNJT1ZoLO50YgXph0B7CAKFAD4mAZM6FbtI6W0rZKor7_j4ti5jIfSDOmAX7PKpEZzGlbKnSv76JKEqtPocbzrwRL0EtTxHJXbTA85F87fSRDYZWXOC-knyImfPPUu1jDYXvBFAr1jjpu2C6CzLlkLlQacvTsVMWINNo3xd2ZRBSO-0vFbhpG65FqcZoeJ3qgBuHWMMKzuxohH53sNJSY_GtSNoNWWteUNoWgewR2Uq1lp8ndcm0izlhwHBA5Xb23L9Q2Wm9_4SA8D5htvwzlBPaopUPkFmLHWbaAGeSlH5cN5HD7HxdE4IHmeEqcvdmuIQQSIYH4P8o79Qz-QM6olUWU9uaDL5SLZXiLI0FOok1cPO0ivo5O1pgPx2XKJNpGbUSdqdzI-R-ayUuTYDoY3R6igWf9nCvLysNkQ4T0cdPjwgbduxmEU_qwXsu11Fy97fHsiUcXuTujQ9ahIM92uPQAcQqMqYP-02iwMuPPckT6ZTgOdGkbKPiFtYGKOLUL40hGr_HpXcGl-PF30iXuI1b7J3rKW8Aes8CkaF85N7RSEEa4H3B6KLqUVV6x6PqhpUbDAgdhcqrt6BNVIQPQGXBxLuaCWwFs0Cx-RlCJEAgiqEKPm_dGfwQxqvApn4mRwYi5VLiSmM0D0LCjXHhGiRA3iG5reoVwHrAGzKHD7L-LQiWcMEIhz7bYuNDAHRDZm94OG4rQ5fdO5G1LjXx80qdIdbXzC2HfrI6o3dnsJ7IPEqyDVPp2allhIfPN8dz6v-6u36RSq0hv3AEWgfs05CKKFpekiXniBmJWqGZkWuwT2sASqb_8LERVyonl2mJD2-pQ2r3zWbAFqr6jsnwQ_GHlO_WN1I-8Vx-yKINCwysmTeucdo7ToY_ySz-II5lMwlh2nDofl6ItHiw9b4i1Cuod4f13H6T2xKMKZtJTiMEMxsw_BZJPB1OOpZV2u-8j3J-KW4RiRjLVGrT-6G_35K7sN0d2Mao8hW1rO-toR1xvjpd8DjRRyaI8HMioEjvZSttmP_z87nhcaNvg6PEO3LzXFTozC4uLEYw3iuH5qmwq00Xhs8uzf6m1djFVOfAIsNabLcu3rKqfRkCzI86piqjc_U6xs6nE2xRlGV)

All decisions below are **locked**. Do not re-open without a Decision Log entry.
Rationale for each choice is in the Decision Log (Section 13).

| Layer      | Choice                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Frontend   | React + Vite (PWA via `vite-plugin-pwa` / Workbox)                                                                           |
| Language   | TypeScript strict mode                                                                                                       |
| Backend    | PocketBase - single Go binary providing REST, SSE, file storage, SQLite, and an admin UI                                     |
| AI Gateway | LiteLLM Proxy - internally deployed, OpenAI-compatible `/chat/completions`; provider abstraction layer; RAG via pgvector     |
| Vector DB  | pgvector (PostgreSQL + pgvector extension) - stores embedded company documents; queried by LiteLLM at request time           |
| Hosting    | `docker compose` - three services: `app` (nginx + PocketBase), `litellm` (LiteLLM proxy), `pgvector` (vector store)          |
| Local dev  | `deno task dev` + `./pocketbase serve` on `:8090` + `litellm --config docker/litellm.yaml --port 4000` + pgvector on `:5432` |

## Docker & Deployment

### Service Architecture

```
docker compose up --build
```

| Service    | Image / Build                         | Port(s)                           | Process(es)                      | Persistent data        |
| ---------- | ------------------------------------- | --------------------------------- | -------------------------------- | ---------------------- |
| `app`      | Built from `Dockerfile`               | `:80` (PWA), `:8090` (PocketBase) | nginx + PocketBase (supervisord) | `pb_data` volume       |
| `litellm`  | `ghcr.io/berriai/litellm:main-stable` | `:4000`                           | LiteLLM proxy                    | -                      |
| `pgvector` | `pgvector/pgvector:pg16`              | `:5432`                           | PostgreSQL + pgvector extension  | `pgvector_data` volume |

### Build Pipeline (Dockerfile)

Multi-stage build - Deno never touches the production image:

```
Stage 1 - builder (denoland/deno:2.4.2)
  deno install                    # pre-fetch all npm imports from deno.json
  deno task build                 # tsc + vite build → dist/
  VITE_PB_URL and VITE_LITELLM_URL baked into the JS bundle as build args

Stage 2 - runtime (debian:bookworm-slim)
  nginx         serves dist/ on :80; proxies /api/ and /_/ to PocketBase
  PocketBase    serves REST + SSE on :8090; data stored in /pb_data
  supervisord   manages both processes; logs to stdout/stderr
```

**Key constraint:** `VITE_PB_URL` and `VITE_LITELLM_URL` are Vite build-time
variables - they are frozen into the JS bundle at image build time. For a
non-localhost deployment, pass them as build args:

```sh
docker compose build \
  --build-arg VITE_PB_URL=https://your-domain.com \
  --build-arg VITE_LITELLM_URL=https://your-domain.com:4000
```

### Configuration Files

| File                      | Purpose                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Dockerfile`              | Multi-stage build: Deno build → nginx + PocketBase runtime image                                                                                                   |
| `docker-compose.yml`      | Orchestrates `app`, `litellm`, and `pgvector` services; declares `pb_data` and `pgvector_data` volumes                                                             |
| `docker/nginx.conf`       | Serves PWA; proxies `/api/` and `/_/` to PocketBase; SPA fallback; SSE-compatible proxy config                                                                     |
| `docker/supervisord.conf` | Manages nginx and PocketBase as co-processes inside `app` container                                                                                                |
| `docker/litellm.yaml`     | LiteLLM model list, router, RAG config (pgvector connection + embedding model), and system prompt. **Edit this to change provider, model, or embedded documents.** |
| `.env.example`            | Copy to `.env`; set `OPENAI_API_KEY` (or another provider) and `LITELLM_MASTER_KEY`                                                                                |

### Quick Start

```sh
# 1. Clone and enter the project
cd messe-buddy-app

# 2. Create env file and fill in API key(s)
cp .env.example .env

# 3. Build and start all services
docker compose up --build

# App   → http://localhost
# PocketBase admin → http://localhost:8090/_/
# LiteLLM  → http://localhost:4000
```

### nginx Routing (inside `app` container)

| Path prefix       | Destination             | Notes                                      |
| ----------------- | ----------------------- | ------------------------------------------ |
| `/api/*`, `/_/*`  | `http://127.0.0.1:8090` | PocketBase REST, SSE, and admin UI         |
| `/*` (everything) | `/usr/share/nginx/html` | PWA static files; fallback to `index.html` |

LiteLLM is **not** proxied through nginx - the browser reaches it directly on
`:4000`. `VITE_LITELLM_URL=http://localhost:4000` is baked into the bundle.

### pgvector Data Persistence

pgvector stores its data in a Docker named volume (`pgvector_data`). The volume
is mounted at `/var/lib/postgresql/data` inside the container and survives
container restarts and image rebuilds.

To ingest company documents into the vector store, use LiteLLM's
`/v1/embeddings` endpoint or the LiteLLM batch ingestion CLI. Documents must be
chunked, embedded, and inserted before the chatbot can retrieve them. See
`docker/litellm.yaml` for the configured embedding model and pgvector connection
string.

### PocketBase Data Persistence

PocketBase stores its SQLite database and uploaded files in `/pb_data` inside
the container. This path is declared as a Docker named volume (`pb_data`) in
`docker-compose.yml`. Data survives container restarts and image rebuilds.

To back up: `docker cp $(docker compose ps -q app):/pb_data ./pb_data_backup`

### LiteLLM Configuration (`docker/litellm.yaml`)

The model name `policy-assistant` is the identifier the PWA's `useChatStream`
hook sends in the `model` field. The proxy resolves it to the upstream model
configured in `litellm.yaml`. To change the underlying provider or model, edit
the `litellm_params` block - no PWA code change required.

**RAG pipeline:** LiteLLM queries pgvector for relevant document chunks before
forwarding the request to the upstream provider. Retrieved chunks are injected
into the prompt at the proxy layer. To update the knowledge base, re-embed and
re-ingest the documents - the PWA and its API calls remain unchanged.

The `default_system_prompt` in `litellm.yaml` sets the chatbot's persona and
scope. Retrieved document chunks are appended to this prompt automatically.
Replace the placeholder text with actual Messe München onboarding context.

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

[![](https://img.plantuml.biz/plantuml/dsvg/jLVTJYCt5BwVfpZYeYGIoQxKgqQYMdvIQ2KW9D3j1H8ouvF4YiSUR0yXMY7jLH-WwXFka_JOCvuaGmWiwdA1PZpdn-Sxt_d99-kOSKKcWGisCIox_VZphSNx0bMAjvcmLcXr-y2auCpHO-A4amXdvGVui_u0lqazXrPMI2SwrXdcSB9e9mbBdJOma6o1fdevOHcUiHczv-HRf29dogsOEXOs9_crhuN58sRH0hEmSsqHmjlEkankqRY1qHE3rlOVaCvMnNkR9DPD30uFECiTcg0uqEaCtI6fGdNSaAw_9qaP8NH-VHu8zE2CcPcjKKjrbajqUADQ3XyT42PIg1cuHOu4cT8EGJ-GjKscXiYuXIeptMLcpj1DDRzHJ74mkd24bTFaoXXC7SIC9Cd-FeogbnvCieCyD-GBMXp7Z9BNXltz97dkc0BRX6yFlkGXyj_vNhoKVoHQkSBsO3T7nOMQb6wOt7rADfaXwqleUq3qCml8Av5Rz38MFf_sXts8xk2dfRzagUmjBTFMWvF-rJD3Oo59D5cHwpGkW8_2Ehes47ZQS9yXp797y37fuc4GiWdGtyl-1mTNHwTHOoxSj8QcWKo2aXIKhcHVCtinkWA5SrZ3CI6JBoHl4vL6KohPdSzCX53752IhBhCJRka9ccifhOz_DEh3jw__WaM4Y-FEnr-8gNKbFxlV28b_CRIXxoVM7J62G2WOh0Tk1qoXNBTLbtiFAePZLJoj5P8jcJU9ojU2jvDQ-xsaZGNAT_Tg__nmyIRkbWblK6uBGOlSMuzPRt1oKzRAMwxeeNX0_lQiqvEF6Rxz_K_eHDGgOa2Dxc1HZcD_-7-x0YkShYppjxK4J_WFtuljt8WbjDlRwhc6apEW0UKRj2722lCUK4MM8KrIXtBn1e3l3RJqU4pD7qDjvTE55IcJfDQHEcLhboaxyvOeg6LKKyWAJjEEHhZcL0MNmm5RICquf58GOXt_cOHVo17MZuyv-IXm3-XhWVp0xS4qO-aJwPwU7HpHCN0qddqmDZgBgZHtPgXyfMUOQRFeaZp1gz3DjPa1nIUxT2clxXdMIRLoZ23Wu6SNXIR6Wjr9xFfs1ZxWx-XfGz8X12w7ySXdG2iAcvfPYGY7lCA3sN2FZ4tMv-wo5_NWWlgq5nkbJ2aq0vAzKJx8AGe3Ugu8WmUHOgCRhfeuecV3IAxCXs5pxvP6CdN1P6sZk3TLggwTa647gK-wDBXQ1HstTngkrfLwbPyMkRaqe-2adQpBR52YMr39_36wE8_elAxZ2olGkwJ3AWUkF0LUj-3rcS6b9Sg_ZHVeUhAL4pVO3vquS2JoCGnKuGad2M3QMCFKR7Xj9CFdyPWv1bzW8_zhqdUxNNWA1bzCR4Ms9G-7Q6c7ycEpB4H5mhNrFVXhq7vkSCkiYtTj3ZXluySDkM3z1onfspUQBOjQK7p7ikRrDkzhxztPQio2bGqRsxksjc1BbGQsz_TWFc2xQpUqF-gevnTNO8ixcnfnHzL4Fm5eSUj6rSfjN1vetKEgUw1sflmFaPGkcmi7eJb-WBoGikDqn-2OjARHohcFcD4NaI6C4VaTIsVrc0fxP1ngO_fHs8tnbQqyW5QE3rLMDCd7XeoFUPYxhvVnClY-CTgygKxHIvQRhPzEpR8jj-TFz9z-3oV_0G00)](https://editor.plantuml.com/uml/jLVTJYCt5BwVfpZYeYGIoQxKgqQYMdvIQ2KW9D3j1H8ouvF4YiSUR0yXMY7jLH-WwXFka_JOCvuaGmWiwdA1PZpdn-Sxt_d99-kOSKKcWGisCIox_VZphSNx0bMAjvcmLcXr-y2auCpHO-A4amXdvGVui_u0lqazXrPMI2SwrXdcSB9e9mbBdJOma6o1fdevOHcUiHczv-HRf29dogsOEXOs9_crhuN58sRH0hEmSsqHmjlEkankqRY1qHE3rlOVaCvMnNkR9DPD30uFECiTcg0uqEaCtI6fGdNSaAw_9qaP8NH-VHu8zE2CcPcjKKjrbajqUADQ3XyT42PIg1cuHOu4cT8EGJ-GjKscXiYuXIeptMLcpj1DDRzHJ74mkd24bTFaoXXC7SIC9Cd-FeogbnvCieCyD-GBMXp7Z9BNXltz97dkc0BRX6yFlkGXyj_vNhoKVoHQkSBsO3T7nOMQb6wOt7rADfaXwqleUq3qCml8Av5Rz38MFf_sXts8xk2dfRzagUmjBTFMWvF-rJD3Oo59D5cHwpGkW8_2Ehes47ZQS9yXp797y37fuc4GiWdGtyl-1mTNHwTHOoxSj8QcWKo2aXIKhcHVCtinkWA5SrZ3CI6JBoHl4vL6KohPdSzCX53752IhBhCJRka9ccifhOz_DEh3jw__WaM4Y-FEnr-8gNKbFxlV28b_CRIXxoVM7J62G2WOh0Tk1qoXNBTLbtiFAePZLJoj5P8jcJU9ojU2jvDQ-xsaZGNAT_Tg__nmyIRkbWblK6uBGOlSMuzPRt1oKzRAMwxeeNX0_lQiqvEF6Rxz_K_eHDGgOa2Dxc1HZcD_-7-x0YkShYppjxK4J_WFtuljt8WbjDlRwhc6apEW0UKRj2722lCUK4MM8KrIXtBn1e3l3RJqU4pD7qDjvTE55IcJfDQHEcLhboaxyvOeg6LKKyWAJjEEHhZcL0MNmm5RICquf58GOXt_cOHVo17MZuyv-IXm3-XhWVp0xS4qO-aJwPwU7HpHCN0qddqmDZgBgZHtPgXyfMUOQRFeaZp1gz3DjPa1nIUxT2clxXdMIRLoZ23Wu6SNXIR6Wjr9xFfs1ZxWx-XfGz8X12w7ySXdG2iAcvfPYGY7lCA3sN2FZ4tMv-wo5_NWWlgq5nkbJ2aq0vAzKJx8AGe3Ugu8WmUHOgCRhfeuecV3IAxCXs5pxvP6CdN1P6sZk3TLggwTa647gK-wDBXQ1HstTngkrfLwbPyMkRaqe-2adQpBR52YMr39_36wE8_elAxZ2olGkwJ3AWUkF0LUj-3rcS6b9Sg_ZHVeUhAL4pVO3vquS2JoCGnKuGad2M3QMCFKR7Xj9CFdyPWv1bzW8_zhqdUxNNWA1bzCR4Ms9G-7Q6c7ycEpB4H5mhNrFVXhq7vkSCkiYtTj3ZXluySDkM3z1onfspUQBOjQK7p7ikRrDkzhxztPQio2bGqRsxksjc1BbGQsz_TWFc2xQpUqF-gevnTNO8ixcnfnHzL4Fm5eSUj6rSfjN1vetKEgUw1sflmFaPGkcmi7eJb-WBoGikDqn-2OjARHohcFcD4NaI6C4VaTIsVrc0fxP1ngO_fHs8tnbQqyW5QE3rLMDCd7XeoFUPYxhvVnClY-CTgygKxHIvQRhPzEpR8jj-TFz9z-3oV_0G00)

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

The Player's primary view - read-only. Components in render order:

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

| Type   | Behavior                                      | Completion Path                                                                                             |
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
2. No `ValidationDisplay` shown - cockpit updates inline

**`qr` (alternative - retained for physical co-location contexts)**

1. Player marks Mission complete → `ValidationDisplay` mounts showing QR code
2. QR encodes: `{ playerId, missionId, sessionId, xpValue }` - client-side, no
   server call
3. `ValidationDisplay` opens SSE subscription on `progress_events` for
   `(playerId, missionId)`
4. Game Maker opens `QRScannerView`, device camera decodes QR
5. `ValidationResult` shows: player name, mission title, XP value
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

The Game Maker's primary view - read-write. Components in render order:

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

Use cases are the application's named operations. Business logic belongs here -
not in components, not in PB queries. Each use case is a pure function or a
small module. Components call use cases; use cases call adapters.

We intentionally keep the backend operations lean and small so it can be as
flexible as possible for the users.

| Use case              | Inputs                                | Output                | Side effects                |
| --------------------- | ------------------------------------- | --------------------- | --------------------------- |
| `deriveXP`            | `Mission[]`                           | `number[]` (xpValues) | None - pure function        |
| `computeProgress`     | `ProgressEvent[]`, `Mission[]`        | `PlayerProgress`      | None - pure function        |
| `upsertProgressEvent` | `playerId`, `missionId`, `patch`      | `ProgressEvent`       | PATCH or POST to PB         |
| `validateMission`     | `ScanData`, `gameMakerUid`            | `ProgressEvent`       | Calls `upsertProgressEvent` |
| `completeForm`        | `missionId`, `formResponse`           | `ProgressEvent`       | Calls `upsertProgressEvent` |
| `joinSession`         | `sessionId`                           | `LocalIdentity`       | Writes `localStorage`       |
| `recoverIdentity`     | `recoveryKey`, `sessionId`            | `LocalIdentity`       | Writes `localStorage`       |
| `exportTemplate`      | `Session`, `Milestone[]`, `Mission[]` | `TemplateExport`      | None - pure function        |
| `importTemplate`      | `TemplateExport`                      | `sessionId`           | POST chain to PB            |

> **`upsertProgressEvent` is the single write path for all ProgressEvent
> mutations.** No component or page may PATCH or POST to `progress_events`
> directly. This enforces C-05 (one record per `(playerId, missionId)`) at a
> single point.

## React Component Architecture

[![](https://img.plantuml.biz/plantuml/dsvg/pLdRRkFM5NttL-pweVKWkXHedgONH2FBOsSaMoDgCWcAOd147akiUSiXQOrQ5CX7v0lp9LrxdtCeKfJJfs8I312HF9TzMsjV_4rPALFLQK9HhBP6fP_--FMd4F_ojCWpdLKNlukpCAaZJN-PVZsUVlrfwh_yxUAYYgj4qrmTjA4_KVE5hkrP5nVJFAjKd6dpwKrUPv4oXwjYhmPqkT8gh6ZvSNBvYlvzGVYlsNsLg2oAiorMpUslfThgo-CczpJBAdEW8e-pQaIhlAvqINK9IQgSliLRkhhNUvgbHP8VjAOnJQ8KRqqEaKkTwB3ApQi1vOPMEioViN5fygtHPKcFIRulHvUlJWJRwmHsqIm0xlzuVEeBjypBQfZaMro88tK5BKOKx70iQIzHfbASm_8CgD8g7H3K9N48HQhI8vgk9wnDgIkg2ofC_XX3U4XSFiK5VubKkTlaoaHzOTrg9-po-DGNzgPEakPqN8Qx7dEJqfMLCCb3LSLvDk1hawGSq3utJn3qaEXN8_fGml0tM1_iDCxP6rKKsepeNZt7MyLUWQ3NNb3ACohLipuZSC9nDCt3foAkMEJsytd15uWjiljQfd1sNa2RiiBPj535WAQrCHoRYxWieGoqU5D7qO6cs39029HvRK9TJdUgea9bEh7kMDS8arWbz808mKrzkHM7rL7iIUlnlDHlOLN8zDGL-ix2hAIbbg2dIG6NFAi4Rwmu7OLe5iMGZ2C7yGGp3oCJF-lCwzTyjrfEy7ARfP3NgjNewzRrrUArqDoYZstTVZxZ2l-PVa-9LYRZduNHZnfMvtiuelvNi6mGVuycJu_XqfSBlhtxYFXpOjss7ljIVMm2LRIkyZpvlmZ5vpY1RjpFlZ0hE5QRag83S1M75cEFiKuYlBFEsnpeXby4uKwdwk__6D4jv8RRII4ERKJeI7OEgqEXANNHt1VfHnE4AWFrukRtA_Vxl62J4BPW6qJwEGurXGXGeqPq3LxaY7o_0Y8EIQuYiMAXPB5HUvXMN0w0vu-F2OYU4B0no2jdy-MKwKgu8bImAu1LGWogubJWVyQ6uW1dHFdDuWKxPQ1qiz8gK9VMC-2kOHc2OpDhKEUzrxJEYpVAq3wkTZJFjpbzHG68XpPrLJ6PRLJu10uMaX9sasmsXiAXYGj7UDWmnB53HfYn_5nlqhWYs4_ipi4JiT-MRRvTTC73-zg1UWPj7jl2LPUBrkDtiTvhCxOuVTaUDhQG3E4wo0P5ZtoHmOsKWZGapIbHVMiu8yCpsRE26jT6RMsiWr8rxgAKDrsro2hFaiEhSw9B25eUlLmSdrwIzJekcRCHqrJ2H8dsd3MIYrc8lrQc1cGZ84Da2L57854AOEaeKbyO5tuupDs2-xuxVST2T2IwQGNHyGJYx2KtsbJKL1a8z_ShTnPTkSX7AU6OsnDt8m5EYDCKYl1vKLoonU033XpSukmtEbwyqDKkZyv0v4S0M73ueOeP9itpg2fP3tuTLmTsNPsu8ib2c2Cmwi4PgH9PeRGO0QPP3jWXBo3PxM8ofITzO16rdF9dGlJ48ApIViG7UwH07PKN1vSWtUWVwvZz3iYtxEc1_vBBa9JgfEfupBxgESoPbczuP61wze5gNYHR1BZYm1Oopj83-dx9OjLOjJRnTil0uI97YY1R0UvD35_1qKjaSbszWRFSLGZ5nzYa8jqP5nNT62XTxhvSddlVqyiApIRqnCvmF3cJIqG8fqAJbrv38BY5L6KJ1GWTNWYhv60Js0vfhsz_Nq3Cuur1WGufrjqtFIbRD-bZ4Iv8SM8Ji6GjH6yCLBBfrrRTWBs_aYI7GOBF5UfpUF09_sCMHravLtM6B5XwSh3yPqErslaI7X7G78R4FkIercSITDe-v4XJHrBjABW-gQcyLjhMIkJPrg-xiKaytCL9T0Hs8w6xR0rbHpQ_bwzjja4MogF3-CDgFfQSlgbn0gVixvV8HsgBAZK24N8tC6WZAMqOuhmlxIKjJUoBlg8GQLWMEWIiGrkBIBSHPsKSwQxf0POT619Ye1xEAgYmXjzykNbbud0dse08v_1aym7A8VKcQgCJVEBCtdngAY6vs2aFtmVmCdmlLcmRhmytqwxR9G-sdllggiq6fuQ-AmLHiIFn2YZhz1kZLeMCZEGM8XjzZajkvewV0ntQG9-KJpIvwwnc8GJeV1py8ATnx5Q0WqeuDVVEwVaqz8UmDlvtJpNfMpxSlKQ9XKIPI2PFmMIeDW2iik96uJCxjgZnkuI0hX12bmc-aTQPpmWg83ULy9L2vnZifNonvTwJ5cO2ohbDmFu3FSTAz5tOI_jwT2w0n9tdOr5wc-TFGeMu5gtFGx2cCPjWp2E9H4lLnSGy1q7FvmkcxCy7by7agDTSEx3O2lk3O0POrjcJJO5S6lAnJWCSusqad0edrZXdXwq83kkOo7AdouuIEp2afBmmYQ7OKA32rL92tF67zCjFFxDOpx6S8YmWQMSrUOlGGCci0MLR5M9PMe0IwwqOKi3DzByJIJb_ShnO7MqHqiS06nASmt17CKhoMsOGjT6q3bmr8AyW40YDoOMjYMB6Zpm6L1V8u9L_dZrBg-WeHozyvdHEq0pZ0VqJl1zezydOASfTX9qeGWR0If6RoZFG03LG-xdV_sycaIegQLXQMTUz5FW6hSeciANZnisL9FkmvPPlABX-9tK8ak9I6T-hV1iytFjs2-agb-GZ8J6qHOBKpeyCqdxmIdaGW0LjapTlFR8mDiaPcYplH3PymQsoojlZDTLnr5Zfy4uV1ZwexY8x1k9h_zCQcbrlO9IEDGGcCq3YAuviB6_MNg7mGx_4mFB8M7BKI20Sa2qof5RtHNg-3T1YcnWRMBH1hyO5yFBZH48JNEQ3k6GuXJhcai9obude0G4wkHkM25MOaKi-T1kbHKi7sxnPWfuT0JGy8tjGb8SrXxn7fsmhjiyobgChG0N9mi6Yz200L0RyMrgzFOGG2FD7gSgsDLCv0jboc9T-n9QGNmCBKmizdI8Ne5XeH055030SG_Oqd_qPpbakTk7I4XAhR2kwk2gNHtHxT5SG91srdS8ET2h1vFwddmy2QC5xpetj3zzP0vGSGHBJZPWCFPKTZkAE6Ww4wGsNvToNLjuLJRaT74hK1Pzcdwih5HzDSGa7-oTf7hpT-4G4CbrP3_FaDAjs9Yz0RVZzBwQLCUNGbdCrPm_R0Njfk4yKcle3_VBpJ_X7o_daXzcARkOF7zshtyw_YvLEZYFd5fUso0tgdh0RrEliwuw6isRqQNi6XQpYTdGMTcUqGNVCErrFpkuv6PC6F0hcGCdolLlVEROzLh6p4NQMMtaovFlLjTt1swykxGZGCYcFKvgUp2qw5oZJX-cxvTtwjn8hLgUktKy6DhxYGq6geg5CIhmjJlUrfoNDlECHBQ4-l-FSI2D5rWDVSNcip9FaASxAT9MXWPSncEyVNn3Zj6vsyhl59r_R5UYnodLhMnzFApp9mROJoYAt_6JDCMkzKEcrQZecgTlrUWaqskHtZ9icvQqUll_XY_ECfGQlMIi313f5xWEDbbePj4iCsvSoejGHI0_ZOrQStDzxtl67TmZznYT5PC-XovswgJ6HfLfPicWnFnirm4LSMNJC-dv53pStyxlxsHUtQTUuPp1nEXlJRlBb9zSE0SJLkWT5QqP-kjqFoxuw6Ne1ONwgVUQKCxCipmpIKScW_R5Et9JA7T3VrUBCCtNvcKbKnssJwyNTFVpvThAOqMBo3epwfHtM_IFPI-GP-I6qp7-zVK_tdYLG8OXpwryQo7KPhxkdFn8xdMkr1r_kYDwcqvbJuYTQRjnwCh_oARcxgpVHySQg-gCRhymBAhU2wgIlewjjwlwu1BnKEs_vuv-rMdlRBM0dx8BRoMfsJNVtDwj9i5vzcAu_h6PV8FAQF6C5RlULaf6ybOxlfSkIlcevMKzlnvoBnczdwu4a6iUGhGHc3pxf2JdpbsCP79-qVcobR-2JEaqk_Wi0)](https://editor.plantuml.com/uml/pLdRRkFM5NttL-pweVKWkXHedgONH2FBOsSaMoDgCWcAOd147akiUSiXQOrQ5CX7v0lp9LrxdtCeKfJJfs8I312HF9TzMsjV_4rPALFLQK9HhBP6fP_--FMd4F_ojCWpdLKNlukpCAaZJN-PVZsUVlrfwh_yxUAYYgj4qrmTjA4_KVE5hkrP5nVJFAjKd6dpwKrUPv4oXwjYhmPqkT8gh6ZvSNBvYlvzGVYlsNsLg2oAiorMpUslfThgo-CczpJBAdEW8e-pQaIhlAvqINK9IQgSliLRkhhNUvgbHP8VjAOnJQ8KRqqEaKkTwB3ApQi1vOPMEioViN5fygtHPKcFIRulHvUlJWJRwmHsqIm0xlzuVEeBjypBQfZaMro88tK5BKOKx70iQIzHfbASm_8CgD8g7H3K9N48HQhI8vgk9wnDgIkg2ofC_XX3U4XSFiK5VubKkTlaoaHzOTrg9-po-DGNzgPEakPqN8Qx7dEJqfMLCCb3LSLvDk1hawGSq3utJn3qaEXN8_fGml0tM1_iDCxP6rKKsepeNZt7MyLUWQ3NNb3ACohLipuZSC9nDCt3foAkMEJsytd15uWjiljQfd1sNa2RiiBPj535WAQrCHoRYxWieGoqU5D7qO6cs39029HvRK9TJdUgea9bEh7kMDS8arWbz808mKrzkHM7rL7iIUlnlDHlOLN8zDGL-ix2hAIbbg2dIG6NFAi4Rwmu7OLe5iMGZ2C7yGGp3oCJF-lCwzTyjrfEy7ARfP3NgjNewzRrrUArqDoYZstTVZxZ2l-PVa-9LYRZduNHZnfMvtiuelvNi6mGVuycJu_XqfSBlhtxYFXpOjss7ljIVMm2LRIkyZpvlmZ5vpY1RjpFlZ0hE5QRag83S1M75cEFiKuYlBFEsnpeXby4uKwdwk__6D4jv8RRII4ERKJeI7OEgqEXANNHt1VfHnE4AWFrukRtA_Vxl62J4BPW6qJwEGurXGXGeqPq3LxaY7o_0Y8EIQuYiMAXPB5HUvXMN0w0vu-F2OYU4B0no2jdy-MKwKgu8bImAu1LGWogubJWVyQ6uW1dHFdDuWKxPQ1qiz8gK9VMC-2kOHc2OpDhKEUzrxJEYpVAq3wkTZJFjpbzHG68XpPrLJ6PRLJu10uMaX9sasmsXiAXYGj7UDWmnB53HfYn_5nlqhWYs4_ipi4JiT-MRRvTTC73-zg1UWPj7jl2LPUBrkDtiTvhCxOuVTaUDhQG3E4wo0P5ZtoHmOsKWZGapIbHVMiu8yCpsRE26jT6RMsiWr8rxgAKDrsro2hFaiEhSw9B25eUlLmSdrwIzJekcRCHqrJ2H8dsd3MIYrc8lrQc1cGZ84Da2L57854AOEaeKbyO5tuupDs2-xuxVST2T2IwQGNHyGJYx2KtsbJKL1a8z_ShTnPTkSX7AU6OsnDt8m5EYDCKYl1vKLoonU033XpSukmtEbwyqDKkZyv0v4S0M73ueOeP9itpg2fP3tuTLmTsNPsu8ib2c2Cmwi4PgH9PeRGO0QPP3jWXBo3PxM8ofITzO16rdF9dGlJ48ApIViG7UwH07PKN1vSWtUWVwvZz3iYtxEc1_vBBa9JgfEfupBxgESoPbczuP61wze5gNYHR1BZYm1Oopj83-dx9OjLOjJRnTil0uI97YY1R0UvD35_1qKjaSbszWRFSLGZ5nzYa8jqP5nNT62XTxhvSddlVqyiApIRqnCvmF3cJIqG8fqAJbrv38BY5L6KJ1GWTNWYhv60Js0vfhsz_Nq3Cuur1WGufrjqtFIbRD-bZ4Iv8SM8Ji6GjH6yCLBBfrrRTWBs_aYI7GOBF5UfpUF09_sCMHravLtM6B5XwSh3yPqErslaI7X7G78R4FkIercSITDe-v4XJHrBjABW-gQcyLjhMIkJPrg-xiKaytCL9T0Hs8w6xR0rbHpQ_bwzjja4MogF3-CDgFfQSlgbn0gVixvV8HsgBAZK24N8tC6WZAMqOuhmlxIKjJUoBlg8GQLWMEWIiGrkBIBSHPsKSwQxf0POT619Ye1xEAgYmXjzykNbbud0dse08v_1aym7A8VKcQgCJVEBCtdngAY6vs2aFtmVmCdmlLcmRhmytqwxR9G-sdllggiq6fuQ-AmLHiIFn2YZhz1kZLeMCZEGM8XjzZajkvewV0ntQG9-KJpIvwwnc8GJeV1py8ATnx5Q0WqeuDVVEwVaqz8UmDlvtJpNfMpxSlKQ9XKIPI2PFmMIeDW2iik96uJCxjgZnkuI0hX12bmc-aTQPpmWg83ULy9L2vnZifNonvTwJ5cO2ohbDmFu3FSTAz5tOI_jwT2w0n9tdOr5wc-TFGeMu5gtFGx2cCPjWp2E9H4lLnSGy1q7FvmkcxCy7by7agDTSEx3O2lk3O0POrjcJJO5S6lAnJWCSusqad0edrZXdXwq83kkOo7AdouuIEp2afBmmYQ7OKA32rL92tF67zCjFFxDOpx6S8YmWQMSrUOlGGCci0MLR5M9PMe0IwwqOKi3DzByJIJb_ShnO7MqHqiS06nASmt17CKhoMsOGjT6q3bmr8AyW40YDoOMjYMB6Zpm6L1V8u9L_dZrBg-WeHozyvdHEq0pZ0VqJl1zezydOASfTX9qeGWR0If6RoZFG03LG-xdV_sycaIegQLXQMTUz5FW6hSeciANZnisL9FkmvPPlABX-9tK8ak9I6T-hV1iytFjs2-agb-GZ8J6qHOBKpeyCqdxmIdaGW0LjapTlFR8mDiaPcYplH3PymQsoojlZDTLnr5Zfy4uV1ZwexY8x1k9h_zCQcbrlO9IEDGGcCq3YAuviB6_MNg7mGx_4mFB8M7BKI20Sa2qof5RtHNg-3T1YcnWRMBH1hyO5yFBZH48JNEQ3k6GuXJhcai9obude0G4wkHkM25MOaKi-T1kbHKi7sxnPWfuT0JGy8tjGb8SrXxn7fsmhjiyobgChG0N9mi6Yz200L0RyMrgzFOGG2FD7gSgsDLCv0jboc9T-n9QGNmCBKmizdI8Ne5XeH055030SG_Oqd_qPpbakTk7I4XAhR2kwk2gNHtHxT5SG91srdS8ET2h1vFwddmy2QC5xpetj3zzP0vGSGHBJZPWCFPKTZkAE6Ww4wGsNvToNLjuLJRaT74hK1Pzcdwih5HzDSGa7-oTf7hpT-4G4CbrP3_FaDAjs9Yz0RVZzBwQLCUNGbdCrPm_R0Njfk4yKcle3_VBpJ_X7o_daXzcARkOF7zshtyw_YvLEZYFd5fUso0tgdh0RrEliwuw6isRqQNi6XQpYTdGMTcUqGNVCErrFpkuv6PC6F0hcGCdolLlVEROzLh6p4NQMMtaovFlLjTt1swykxGZGCYcFKvgUp2qw5oZJX-cxvTtwjn8hLgUktKy6DhxYGq6geg5CIhmjJlUrfoNDlECHBQ4-l-FSI2D5rWDVSNcip9FaASxAT9MXWPSncEyVNn3Zj6vsyhl59r_R5UYnodLhMnzFApp9mROJoYAt_6JDCMkzKEcrQZecgTlrUWaqskHtZ9icvQqUll_XY_ECfGQlMIi313f5xWEDbbePj4iCsvSoejGHI0_ZOrQStDzxtl67TmZznYT5PC-XovswgJ6HfLfPicWnFnirm4LSMNJC-dv53pStyxlxsHUtQTUuPp1nEXlJRlBb9zSE0SJLkWT5QqP-kjqFoxuw6Ne1ONwgVUQKCxCipmpIKScW_R5Et9JA7T3VrUBCCtNvcKbKnssJwyNTFVpvThAOqMBo3epwfHtM_IFPI-GP-I6qp7-zVK_tdYLG8OXpwryQo7KPhxkdFn8xdMkr1r_kYDwcqvbJuYTQRjnwCh_oARcxgpVHySQg-gCRhymBAhU2wgIlewjjwlwu1BnKEs_vuv-rMdlRBM0dx8BRoMfsJNVtDwj9i5vzcAu_h6PV8FAQF6C5RlULaf6ybOxlfSkIlcevMKzlnvoBnczdwu4a6iUGhGHc3pxf2JdpbsCP79-qVcobR-2JEaqk_Wi0)

### Component Class Diagram

[![](https://img.plantuml.biz/plantuml/dsvg/pLfVRnit4d_VJq7u9RwBbTxBlHYuGsN9YTLAbY8fJel3mQ1sQMdFg-MMtBKZz0BqG_GJzfFSS9Vayg_iND0aHT5Qd5boE3ESFp_oUrvZLZVx0cKvtZAyl_tRts_J0dD-cz9zHKjIrhUOfRky9cdTC9BKULqGD594D1BCQDnzdIGlq1-__mR_ek5YWLPNbzEf7FZM_atQNQ9XLQ5V4mJ_l4mRnc17IzhKv1pnckNbjgDmmdbEoqbc3rS5FX3cZZQSi2Kj-Ya-ogMckCpWzm9lYLnoe2UUb5LJM_CCzZHpnA3bY15SanzemqfoEFtBENgWUQQ8Fz2yN7KJQf9Q-pqfm9x4M5jAVuttpYhCbBqTgGdUEmeHNZF6hfueh5ytrOBHkxmWhdoh-xpo19Eyfc2qlC3flVSrVl1dXB7Nb4r14ERHciq-hwtHGSx7EQiFvsX3OPEub4Q0MR8XQ5ziI0is0rUWpBRNdoEQMl6AFaxUKtR_nHO4zlrgHuf2hTQURTka6U4fowiQdCgrzUTBPci-RhYNl1sRuWqfl6ErfjK5PazvDNx0uBFlME6uDgrnyTFY79NDVaDOu0JePHhX3hYOFn06QwZrU4qgVgwfA_Zvht_humfHiY2rhP61Z3E2rLwt91zy8wtnzW9dlKSKbXBQeGSCIvUr9_9F2-lB1rmqHA_uqOZLgwlXydACPiC5MYmdiybwSdFvTSAsb5ourfRHfin6k7p0N6qXtyFPy8o8YzhnpSr_85kzpdsLp23My1eorpL4Lpsh4y43Alwm82mbGiUcmGx1qOhHBOCu72H2vAmRxfmnXhTRl15EPmOcuK15xf-nCR1Vbjdf1pNp6JgeFtllwQsxc0v_lboYqNpqusAo_bRIiOh_xNaTqVI-ocipydrApeKyMe31IQRDwpBWjCuVo2mFpJdWE_ge3d1l0izbPhYwoSaZqR5choXWJysbJlzcEmawAoqrQsVTtlkiAB6Z46X89lpKa5S9zJDjXenS0SSCi_jUf6VwgP5zMrUTaYqfCtqUQhA7BNM34_W1U_AqiSepii4ieX7NR9hWH-OFrNe7CkneaTbIopZfHkTzPyHMv-rVIkFgt5q-m5T0NfY_ZQ1SKExbA3bLp29gzwDE9CdDfpcl-wr_dbXFIA2umDewgyJbL9DXbZdoQV6agRcQBNE23ydo-lanQKstsu84ynrGBpCteKCK8o7E5NZScaerUxbGYZucDSwB1QsQwlZkOiOsbUWKY5trKODE_KXmWuiymw8K6kUyCeg0S2Em3qQRgAXoTfBP8ZteHMUatb6OxCOPKQBh2Np9tou_H-8FrOrLEXmN-1SckOqfNg05FXGKmyI_ggNFa5xk3EbeVuRaQcS8g8qe3y_GRe_JZtAYgzbmX7Y-BKc67lDwfpuTy9HMC7PF3g_GDKMhrMNxV-Z6892Y51V5Apd5l2mE21mi4m4MFUv8YLmjet-War_OIS3qIyARGfzwdk8IYbTyZbRohxxsA-zojdTzRqb4QMADla1B9Slc0AOICvM4jSaGtq7HZ7YJfh3BkwP0zEwko4lIgI4ZAQG7jIsv8WArRxU4STHKiFdQYZVeaK5qHpL52qYvfBx07BxNwO2q7Ihqn8o2HXoVaUPQ-qr2r1To_Xxdzc7w91DizvqifBV4HPDb1pEmbS_gOCk6FQyZI6bPGxLWZgkbmVJGUOCbHZkiFO2fmNDDbq5T5Xrhl77E0em0zud-yWJz5vrWVZ_0-Ods2D0yaE13N6QuWCpPBxy23m8reRpqooTVMCNzjBoS2AJdRKFOmIwGe4ElXQ6MqM_Rq2s-Flt5_DmDu1sFtQwbHAH-mdme8JvVvrm2Cx5ZZRjvqqy2pMrzg9oH9c1sOUq5BebgamTxE4sWQj228CswNqg90QbKQgaPmNllCCYiTrf3znUjE_frj1qz9nUUIqgd5UB-echIXXCnRoTMNtQ3A94DMg7ic19UHZSBYM2-MdCHW6ucwylRAVndEftTlbjElqjXdk_IBY-BIaf-qEtW7C9QGz0Vl_qEOGDdNCHtbEwQyfx3EO3ff3pYmBGeJj__l9ulPsWnVFELMjhdTa82ZJ4Re72T44xSSJ16HV_dm6Dt846NpBe6MZbk23GxNYc9lRpEIP7rUN97zZ1nExXgVrYWXBaPmXZreW4uMRabfnPxgDbzkqIhqV3w6XhUhsxOgAbrZXVTKm_rYK6Pn9r4AebTyU0cMTvIH5NYL272I6ATe8b6a3OPVar8rWimRkk9KoOd2yLSFcoJckCDEopG3ksn_Lh6VS1uDhd-ra28tYJ338BLis483JWi_ZyumZjJaGgCctddPTKHdsWaPSLqwaOAezwED9UoDls43vNOIjubWNJDQpFjnW3PU3KPQJVKleuNr1yjN6dL6eAoCQDLHXzBMoYXm_OFUGcXTAZCvqVPRhuZZRSrdwy6Py4WnYIQPVf5C2RW4_2IK8x10HtO4M1H6IFhdTktY2Z9hHdD6ZsC0qHGC5xYQatViDo19mOjPWhS4Noi1v0x3LMY-UnnAWajnRJNiPyA4ucKLH1BfegH1uZRxdTmgBlllAAd5LRS6_ZdNUpCkL40xMqA3uv9QT7i1RfaNrGySlUOT4XC03gnSRk8bqKG0H_LYa0hhL_OLv2MdHKnwf1BGXaO2XWqIEuKdYv85F4SWL_1c0_vweiL0fKcr8hJVCCmEnXfk3taYdpQDGbodZNyi7ltoxA6ZoiAHIY20Wgz0LT7CommMQayb8fRM_X3DUfJt9HG0cayIzf2eXbTx46rN1-1kmrQxyrUkK2OQyHGmQZcMRlRCAj4rrWZNAQaiCkCWgQu63DyL_ieMrUSkG9uLrbIbBO8r7SwddwxuQnRgLqml5o0mpRDJNSl9gxdeBUIBD1hJ_FollybQbLpWHTe1PO0-sG8w8PShz2FX5IkybDnHWtBO7OlCerjca2LUwJpFLxhflB1nTrTdaAPTb0vBdpD9pFgeejPRh2mLtAlaFG5fBk4SjB-X6f89Iz4z89lk4lKgzKMCOBn2eL7TXPKbjdAkrEwW6batY2kQdXt17wrVUugpp9ITeYMF0-lX6m2pHBzrOdL8zbUSjUU2wj9CigwB6l7mt6r8trML6sda7jj9R442SNMbXo8hBhx2smlq09g3HzVrRypi2318HUWy1uoWbZUIVGjntd7g6elfTVskzEDps4N8Z5ih6kMkFsfSM6cCJDR6N4OhhFrgMBewPzIEEb2u2RdEHp88oMhYF_35YBihzb3BV-Hrnr3hhEbGvr2ul9evigAEACPBleShD3p8uLZA4UfP6Ur6sONkfo_Mq-kttn3_MUW8nLlqWQ3VveFnlIOyP1BZnblgFIOzNn9ZvfFZFhFFGnPKTocM1CKLgK7B4J3qFVy-c8-N8w5obiORZIVBUQhoNeol_xJRP2ORyl-EXZqxvqI-t6NJREUOTcaw9kABxcjTcVUgmaXQFSIAaQqtoz5kFp73aynMky08io1Q_FejEuDRuJHkujD_DjPmQTlFYFqy9LNP55zznIXMnT4IMBV5raCyb8cmA9l6vB-ta6DIvJTeLWuVf84tgkqiZjFgc9yrWkf69Fx_2J6PxylCMIpNuyObc-r6tfcuVAOJnnQ_vRlv3o2V0MN-AuL_CwbgyyJxq9DKFM5LfXitaCbYKRuLLHfAvqaiU7WrjWQd0qGtRleACZwXQDIcxfS6DM8Iq5Q6ASxnck0Qn6s48QQX95LmHy0ByCJ-oZT4tmMrXBc3ON686EWo0qpEWLdcCae-ko88QlK9oD6aC_2scBi1kGLOx5ZKCIfRFWcSU6SjWYoElLpL4ZWnOj3rjfcZ7cAJUeuiLSovUl0ZW23ZHG46FmMFxHCtvs7rl2RwG1Nh3yEiFPDQnVE79BHzILku-F5GxFnK3vfjGD9yZqSscPV_0y0)](https://editor.plantuml.com/uml/pLfVRnit4d_VJq7u9RwBbTxBlHYuGsN9YTLAbY8fJel3mQ1sQMdFg-MMtBKZz0BqG_GJzfFSS9Vayg_iND0aHT5Qd5boE3ESFp_oUrvZLZVx0cKvtZAyl_tRts_J0dD-cz9zHKjIrhUOfRky9cdTC9BKULqGD594D1BCQDnzdIGlq1-__mR_ek5YWLPNbzEf7FZM_atQNQ9XLQ5V4mJ_l4mRnc17IzhKv1pnckNbjgDmmdbEoqbc3rS5FX3cZZQSi2Kj-Ya-ogMckCpWzm9lYLnoe2UUb5LJM_CCzZHpnA3bY15SanzemqfoEFtBENgWUQQ8Fz2yN7KJQf9Q-pqfm9x4M5jAVuttpYhCbBqTgGdUEmeHNZF6hfueh5ytrOBHkxmWhdoh-xpo19Eyfc2qlC3flVSrVl1dXB7Nb4r14ERHciq-hwtHGSx7EQiFvsX3OPEub4Q0MR8XQ5ziI0is0rUWpBRNdoEQMl6AFaxUKtR_nHO4zlrgHuf2hTQURTka6U4fowiQdCgrzUTBPci-RhYNl1sRuWqfl6ErfjK5PazvDNx0uBFlME6uDgrnyTFY79NDVaDOu0JePHhX3hYOFn06QwZrU4qgVgwfA_Zvht_humfHiY2rhP61Z3E2rLwt91zy8wtnzW9dlKSKbXBQeGSCIvUr9_9F2-lB1rmqHA_uqOZLgwlXydACPiC5MYmdiybwSdFvTSAsb5ourfRHfin6k7p0N6qXtyFPy8o8YzhnpSr_85kzpdsLp23My1eorpL4Lpsh4y43Alwm82mbGiUcmGx1qOhHBOCu72H2vAmRxfmnXhTRl15EPmOcuK15xf-nCR1Vbjdf1pNp6JgeFtllwQsxc0v_lboYqNpqusAo_bRIiOh_xNaTqVI-ocipydrApeKyMe31IQRDwpBWjCuVo2mFpJdWE_ge3d1l0izbPhYwoSaZqR5choXWJysbJlzcEmawAoqrQsVTtlkiAB6Z46X89lpKa5S9zJDjXenS0SSCi_jUf6VwgP5zMrUTaYqfCtqUQhA7BNM34_W1U_AqiSepii4ieX7NR9hWH-OFrNe7CkneaTbIopZfHkTzPyHMv-rVIkFgt5q-m5T0NfY_ZQ1SKExbA3bLp29gzwDE9CdDfpcl-wr_dbXFIA2umDewgyJbL9DXbZdoQV6agRcQBNE23ydo-lanQKstsu84ynrGBpCteKCK8o7E5NZScaerUxbGYZucDSwB1QsQwlZkOiOsbUWKY5trKODE_KXmWuiymw8K6kUyCeg0S2Em3qQRgAXoTfBP8ZteHMUatb6OxCOPKQBh2Np9tou_H-8FrOrLEXmN-1SckOqfNg05FXGKmyI_ggNFa5xk3EbeVuRaQcS8g8qe3y_GRe_JZtAYgzbmX7Y-BKc67lDwfpuTy9HMC7PF3g_GDKMhrMNxV-Z6892Y51V5Apd5l2mE21mi4m4MFUv8YLmjet-War_OIS3qIyARGfzwdk8IYbTyZbRohxxsA-zojdTzRqb4QMADla1B9Slc0AOICvM4jSaGtq7HZ7YJfh3BkwP0zEwko4lIgI4ZAQG7jIsv8WArRxU4STHKiFdQYZVeaK5qHpL52qYvfBx07BxNwO2q7Ihqn8o2HXoVaUPQ-qr2r1To_Xxdzc7w91DizvqifBV4HPDb1pEmbS_gOCk6FQyZI6bPGxLWZgkbmVJGUOCbHZkiFO2fmNDDbq5T5Xrhl77E0em0zud-yWJz5vrWVZ_0-Ods2D0yaE13N6QuWCpPBxy23m8reRpqooTVMCNzjBoS2AJdRKFOmIwGe4ElXQ6MqM_Rq2s-Flt5_DmDu1sFtQwbHAH-mdme8JvVvrm2Cx5ZZRjvqqy2pMrzg9oH9c1sOUq5BebgamTxE4sWQj228CswNqg90QbKQgaPmNllCCYiTrf3znUjE_frj1qz9nUUIqgd5UB-echIXXCnRoTMNtQ3A94DMg7ic19UHZSBYM2-MdCHW6ucwylRAVndEftTlbjElqjXdk_IBY-BIaf-qEtW7C9QGz0Vl_qEOGDdNCHtbEwQyfx3EO3ff3pYmBGeJj__l9ulPsWnVFELMjhdTa82ZJ4Re72T44xSSJ16HV_dm6Dt846NpBe6MZbk23GxNYc9lRpEIP7rUN97zZ1nExXgVrYWXBaPmXZreW4uMRabfnPxgDbzkqIhqV3w6XhUhsxOgAbrZXVTKm_rYK6Pn9r4AebTyU0cMTvIH5NYL272I6ATe8b6a3OPVar8rWimRkk9KoOd2yLSFcoJckCDEopG3ksn_Lh6VS1uDhd-ra28tYJ338BLis483JWi_ZyumZjJaGgCctddPTKHdsWaPSLqwaOAezwED9UoDls43vNOIjubWNJDQpFjnW3PU3KPQJVKleuNr1yjN6dL6eAoCQDLHXzBMoYXm_OFUGcXTAZCvqVPRhuZZRSrdwy6Py4WnYIQPVf5C2RW4_2IK8x10HtO4M1H6IFhdTktY2Z9hHdD6ZsC0qHGC5xYQatViDo19mOjPWhS4Noi1v0x3LMY-UnnAWajnRJNiPyA4ucKLH1BfegH1uZRxdTmgBlllAAd5LRS6_ZdNUpCkL40xMqA3uv9QT7i1RfaNrGySlUOT4XC03gnSRk8bqKG0H_LYa0hhL_OLv2MdHKnwf1BGXaO2XWqIEuKdYv85F4SWL_1c0_vweiL0fKcr8hJVCCmEnXfk3taYdpQDGbodZNyi7ltoxA6ZoiAHIY20Wgz0LT7CommMQayb8fRM_X3DUfJt9HG0cayIzf2eXbTx46rN1-1kmrQxyrUkK2OQyHGmQZcMRlRCAj4rrWZNAQaiCkCWgQu63DyL_ieMrUSkG9uLrbIbBO8r7SwddwxuQnRgLqml5o0mpRDJNSl9gxdeBUIBD1hJ_FollybQbLpWHTe1PO0-sG8w8PShz2FX5IkybDnHWtBO7OlCerjca2LUwJpFLxhflB1nTrTdaAPTb0vBdpD9pFgeejPRh2mLtAlaFG5fBk4SjB-X6f89Iz4z89lk4lKgzKMCOBn2eL7TXPKbjdAkrEwW6batY2kQdXt17wrVUugpp9ITeYMF0-lX6m2pHBzrOdL8zbUSjUU2wj9CigwB6l7mt6r8trML6sda7jj9R442SNMbXo8hBhx2smlq09g3HzVrRypi2318HUWy1uoWbZUIVGjntd7g6elfTVskzEDps4N8Z5ih6kMkFsfSM6cCJDR6N4OhhFrgMBewPzIEEb2u2RdEHp88oMhYF_35YBihzb3BV-Hrnr3hhEbGvr2ul9evigAEACPBleShD3p8uLZA4UfP6Ur6sONkfo_Mq-kttn3_MUW8nLlqWQ3VveFnlIOyP1BZnblgFIOzNn9ZvfFZFhFFGnPKTocM1CKLgK7B4J3qFVy-c8-N8w5obiORZIVBUQhoNeol_xJRP2ORyl-EXZqxvqI-t6NJREUOTcaw9kABxcjTcVUgmaXQFSIAaQqtoz5kFp73aynMky08io1Q_FejEuDRuJHkujD_DjPmQTlFYFqy9LNP55zznIXMnT4IMBV5raCyb8cmA9l6vB-ta6DIvJTeLWuVf84tgkqiZjFgc9yrWkf69Fx_2J6PxylCMIpNuyObc-r6tfcuVAOJnnQ_vRlv3o2V0MN-AuL_CwbgyyJxq9DKFM5LfXitaCbYKRuLLHfAvqaiU7WrjWQd0qGtRleACZwXQDIcxfS6DM8Iq5Q6ASxnck0Qn6s48QQX95LmHy0ByCJ-oZT4tmMrXBc3ON686EWo0qpEWLdcCae-ko88QlK9oD6aC_2scBi1kGLOx5ZKCIfRFWcSU6SjWYoElLpL4ZWnOj3rjfcZ7cAJUeuiLSovUl0ZW23ZHG46FmMFxHCtvs7rl2RwG1Nh3yEiFPDQnVE79BHzILku-F5GxFnK3vfjGD9yZqSscPV_0y0)

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
behavior.

| Component          | Shared via                  | Key prop              | Trade-off                                                                             |
| ------------------ | --------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `MilestoneNode`    | Both map views              | `draggable: boolean`  | Single component; two actors. Acceptable for prototype. Split if edit behavior grows. |
| `MissionCard`      | Both cockpits + sidebars    | `editable: boolean`   | Same trade-off as above.                                                              |
| `BackgroundCanvas` | Both map views              | `imageUrl: string`    | Pure rendering; no role-specific logic.                                               |
| `TagBadge`         | Mission cards, detail popup | `variant: MissionTag` | -                                                                                     |
| `XPBadge`          | Mission cards               | `value: number`       | -                                                                                     |

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
└── ValidationResult                  [confirm / reject; renders ScanData after offline HMAC decode]
```

## TypeScript Data Model

[![](https://img.plantuml.biz/plantuml/dsvg/pLdlRYEt4V--Jq7eoxKnx2G5cW_2uH1PLcgragrAij6YA0nwToGnsbrkk5oTbQH6Nw507wpFq2VfS4dkajoLSsuRn0V39v73uVpzpGpzTIcfa5MMaeJHhQ3PmnTVFSGfBSk7X4hwaF44qaWocG9P7mjOnO8LabpX7fdNUz4xykz__Xr_oEJcRZvPZjRJsvkLMNiZFn7aLKRch2mPpvKQv8U8u3y9JxB-aB9yNt_OS955V_FfwTQGPpH7et1nhB_b04avAWh13pIjLognXLmpv0SGIGMMrKBmhO2oN4aggzAmAo1FMBvrFtliOfuLAKX8wc-qabnluu9XUqzJXXAXa7EGEvuOnjlC4DRVIaWtxlVlHAjW2gNaENXYLGLURELYkHKz4CcmM4B9An63OzHjnH9zqm4_SD--2O-hJ1d9dF-6GPhqUKHze0AeLG5YlPvLgMGh_Ttmk2j1B7bgMHGfFOBGej0CChe7fN4Rf_UZsTs4t5x-VZ9UlwL0ZLWkGMne3DeigtY7qXkjpbWo9AKKrZ5dANs4r5-IQCTXQrAzAE2xYWd0quySZKHplOnMYc77qmI4puGNAfxA8PcnKZxhdMUqNolS7vSBUamvjU5sfYq-3GJCTFg4ooNqBZyL6CmLYeyUVJJkEqCE5IGZwQ_kCXfxXz-Hw_beVBww7ltcjryHlY6_iXArGhJtDbn_RGxluGW9-SZaZXWY8laUyWjo3u9j66x6ASEWFIyne0cLf8mfqh0CBWoB6uv71UOyYMcQ4cjp1IVaq2JfXMV6yOxAETv7jpPopmGwo3TBp94-bu499IQ6Ib7Vf--8FZ-eK9O1-P4C4CRHYJIN0qFWd9IY0l9nXn10Lgi9YNTLlYy9fXmICTI12i4EwafNvXcJC9lDbwWV8eSLkouIWVErOZQC75sVNHr21HQtgpKQdznFrvE76Vx2onxkbhFFOsJmkK4V5PwMNl2d8zaXBYEIaLeE1PGxWYkau2cBZwGsuPD4AFiMGQFZXXaWQ2TJ2PbLfoUpOfvo4Jf1OUOm156FzmhZf2wLFtUYQCOt27UzhDUgVlix2SHehJgtpB8dkBxRGTKp5LIVAA8EGmlBUkrRplBWkXQH5xVZFqpMboECm_hNBmx52etf8qfAOqdgTeWiBfTeCf6SmkCOurb2i5WLYRVeAJrPhgQhzUHcJTP_NapUG2MAjAR6-UJz-mA40X04e0yVhDvv9yWUjzCC4_jE14cZgkzSLT-fQm1ZpJfWJrnn8gogqEHTKGe16n28lDrKm0OevvKgREugFM1wYexeNI2MDLe5020aPdT0cFAu1llWE1QBxn4a0XPxHDfopFCD5XQ5ybxDTKYku00fB_e8KfflAmTglSsFNEnNyXWg0pc8BViUJTztA14KSxL_3wsuGS0RcpwmnM_hsCigIOuBJVKwzwfYjKMCMFD5BqnslTtdfRmIy4akLcK1izjTjpeqaFuw1Re2FYq0U-Cyw5-ElQjFnNg7VRPgoVmDn1pLevcbLiQNalI4X9bLBDoGtGBno9DZNtlfJ55w-H0C8SFEM6A2xWchIqxJZYSIjjcm6FlwOsYHdaedwTO6PZkVsLofjfW7YBTN5NGJqxUZnl1oceyhn8jS6cPbDwA_mP7GjEBznZvHlpUg3xUoEWtzSmk2PhIQ793Vwppvkax2j2h-5Efv3vBBmDlDnYZeFjM8Z6DVWSQ2JkhOUV1rslI4dmusTxmqHI2C7bRUiv8zfc1nm_MWypYnk9werudPMocsRRrjuCRw1uq71OOA29gwONOYUO4AXCq_BJuHJmgDFYs4kvkdkbe3cMRwdziuwuw9Rdb_MP_-49PSqZJK9Gijr210iFxyMa7LOABiXCDilz5_QevXc4qdfh6n7XfvdXulo0sewT3cHAA6d0MFzo0lQTcCaHZk80cYUg66mfmUsBOP7BMyLu9kP8lzhmaJLbuneJ3MUmVuNv3_rOZ-Nu6tLNqDw5JSC6ruh_BT4WnF1HSzADQOgHDBpnwM1l8-sqSLZKjsr-BKiz_X_-iVoyduTdb5fZVNa-LqFReP_qB3JTICB-z_F3-tBNwmghCsM7GRkc2hCLbdlOzxMqV3Qzqo6EnPmmRFpEHkDVhTsvWJGqExJtSN5n-S5yuXKNaKEGyEQZzyX5LXMaEkpN9Dr3vT6pRkTkSTU4Z2hYpocmrrAdYKRYvkQhWYyXvupTNkwu2YQHvWX_KBLDGjQ2ygsZiIhzRBk_7wJXNivMIc_wXmFLtydmgtLO4ClXoGy_CFPF35nSLd0wVp7nB-CIzFqPdnTKXsz2HDOyOXONcSLWcS97KDUe8d_Xy083h3BAXdngYrUbSfpMjOFuNXR5U-H1kwJhqKqdZ_mXcl9Wr9ehwMKHEWBZL-TDfff8KDZffbBsqhkVeBZ2Eymq7HVuOmCVYofdTpRqXq0nu5aQ_OD-vxFFRijgeektRthM_mE0xb-RR4OXv5tk3hNT8EjbsYVbuzNUlFcmzrXV1xjiQqfmEZyKXmr0KNRJRbQS4EwaLSyAoNtbhBH5lKl9sgtVPF3efJ_NAfEJLKdiMLt_oTG1hzM8UtEFrVeB3xFE-ewXnGWWKFuaFrPm26q5kYW2n7NmO4wepFsNQOV_bh57cPv65carU4Rw8eG89JhdBb_gaZ7OXu-O03Ris9w6kiQrMM_WS0)](https://editor.plantuml.com/uml/pLdlRYEt4V--Jq7eoxKnx2G5cW_2uH1PLcgragrAij6YA0nwToGnsbrkk5oTbQH6Nw507wpFq2VfS4dkajoLSsuRn0V39v73uVpzpGpzTIcfa5MMaeJHhQ3PmnTVFSGfBSk7X4hwaF44qaWocG9P7mjOnO8LabpX7fdNUz4xykz__Xr_oEJcRZvPZjRJsvkLMNiZFn7aLKRch2mPpvKQv8U8u3y9JxB-aB9yNt_OS955V_FfwTQGPpH7et1nhB_b04avAWh13pIjLognXLmpv0SGIGMMrKBmhO2oN4aggzAmAo1FMBvrFtliOfuLAKX8wc-qabnluu9XUqzJXXAXa7EGEvuOnjlC4DRVIaWtxlVlHAjW2gNaENXYLGLURELYkHKz4CcmM4B9An63OzHjnH9zqm4_SD--2O-hJ1d9dF-6GPhqUKHze0AeLG5YlPvLgMGh_Ttmk2j1B7bgMHGfFOBGej0CChe7fN4Rf_UZsTs4t5x-VZ9UlwL0ZLWkGMne3DeigtY7qXkjpbWo9AKKrZ5dANs4r5-IQCTXQrAzAE2xYWd0quySZKHplOnMYc77qmI4puGNAfxA8PcnKZxhdMUqNolS7vSBUamvjU5sfYq-3GJCTFg4ooNqBZyL6CmLYeyUVJJkEqCE5IGZwQ_kCXfxXz-Hw_beVBww7ltcjryHlY6_iXArGhJtDbn_RGxluGW9-SZaZXWY8laUyWjo3u9j66x6ASEWFIyne0cLf8mfqh0CBWoB6uv71UOyYMcQ4cjp1IVaq2JfXMV6yOxAETv7jpPopmGwo3TBp94-bu499IQ6Ib7Vf--8FZ-eK9O1-P4C4CRHYJIN0qFWd9IY0l9nXn10Lgi9YNTLlYy9fXmICTI12i4EwafNvXcJC9lDbwWV8eSLkouIWVErOZQC75sVNHr21HQtgpKQdznFrvE76Vx2onxkbhFFOsJmkK4V5PwMNl2d8zaXBYEIaLeE1PGxWYkau2cBZwGsuPD4AFiMGQFZXXaWQ2TJ2PbLfoUpOfvo4Jf1OUOm156FzmhZf2wLFtUYQCOt27UzhDUgVlix2SHehJgtpB8dkBxRGTKp5LIVAA8EGmlBUkrRplBWkXQH5xVZFqpMboECm_hNBmx52etf8qfAOqdgTeWiBfTeCf6SmkCOurb2i5WLYRVeAJrPhgQhzUHcJTP_NapUG2MAjAR6-UJz-mA40X04e0yVhDvv9yWUjzCC4_jE14cZgkzSLT-fQm1ZpJfWJrnn8gogqEHTKGe16n28lDrKm0OevvKgREugFM1wYexeNI2MDLe5020aPdT0cFAu1llWE1QBxn4a0XPxHDfopFCD5XQ5ybxDTKYku00fB_e8KfflAmTglSsFNEnNyXWg0pc8BViUJTztA14KSxL_3wsuGS0RcpwmnM_hsCigIOuBJVKwzwfYjKMCMFD5BqnslTtdfRmIy4akLcK1izjTjpeqaFuw1Re2FYq0U-Cyw5-ElQjFnNg7VRPgoVmDn1pLevcbLiQNalI4X9bLBDoGtGBno9DZNtlfJ55w-H0C8SFEM6A2xWchIqxJZYSIjjcm6FlwOsYHdaedwTO6PZkVsLofjfW7YBTN5NGJqxUZnl1oceyhn8jS6cPbDwA_mP7GjEBznZvHlpUg3xUoEWtzSmk2PhIQ793Vwppvkax2j2h-5Efv3vBBmDlDnYZeFjM8Z6DVWSQ2JkhOUV1rslI4dmusTxmqHI2C7bRUiv8zfc1nm_MWypYnk9werudPMocsRRrjuCRw1uq71OOA29gwONOYUO4AXCq_BJuHJmgDFYs4kvkdkbe3cMRwdziuwuw9Rdb_MP_-49PSqZJK9Gijr210iFxyMa7LOABiXCDilz5_QevXc4qdfh6n7XfvdXulo0sewT3cHAA6d0MFzo0lQTcCaHZk80cYUg66mfmUsBOP7BMyLu9kP8lzhmaJLbuneJ3MUmVuNv3_rOZ-Nu6tLNqDw5JSC6ruh_BT4WnF1HSzADQOgHDBpnwM1l8-sqSLZKjsr-BKiz_X_-iVoyduTdb5fZVNa-LqFReP_qB3JTICB-z_F3-tBNwmghCsM7GRkc2hCLbdlOzxMqV3Qzqo6EnPmmRFpEHkDVhTsvWJGqExJtSN5n-S5yuXKNaKEGyEQZzyX5LXMaEkpN9Dr3vT6pRkTkSTU4Z2hYpocmrrAdYKRYvkQhWYyXvupTNkwu2YQHvWX_KBLDGjQ2ygsZiIhzRBk_7wJXNivMIc_wXmFLtydmgtLO4ClXoGy_CFPF35nSLd0wVp7nB-CIzFqPdnTKXsz2HDOyOXONcSLWcS97KDUe8d_Xy083h3BAXdngYrUbSfpMjOFuNXR5U-H1kwJhqKqdZ_mXcl9Wr9ehwMKHEWBZL-TDfff8KDZffbBsqhkVeBZ2Eymq7HVuOmCVYofdTpRqXq0nu5aQ_OD-vxFFRijgeektRthM_mE0xb-RR4OXv5tk3hNT8EjbsYVbuzNUlFcmzrXV1xjiQqfmEZyKXmr0KNRJRbQS4EwaLSyAoNtbhBH5lKl9sgtVPF3efJ_NAfEJLKdiMLt_oTG1hzM8UtEFrVeB3xFE-ewXnGWWKFuaFrPm26q5kYW2n7NmO4wepFsNQOV_bh57cPv65carU4Rw8eG89JhdBb_gaZ7OXu-O03Ris9w6kiQrMM_WS0)

### Conventions

- **No TypeScript `enum`** - use `const` object + `keyof` union:
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
- **`strict: true`** throughout - `arr[i]` is `T | undefined`
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
//   pending         - no Player action yet
//   pendingApproval - Player marked complete, awaiting GM action (gmApprove path)
//   completed       - GM confirmed (gmApprove or qr path)
//   autoApproved    - form submit or selfApprove path; no GM action required
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

// QR-strategy specific - only used when mission.validationMethod = 'qr'
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
inside the PB adapter module** - never imported by components or use cases.

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
  readonly role: string; // job title, e.g. "Senior Engineer" - not an access control role; see SessionRole for UserRole
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
| `sessions`        | `gameMakerId`                                       | -                                              |
| `players`         | `uid` (unique), `recoveryKey` (unique), `sessionId` | -                                              |
| `milestones`      | `sessionId`, `order`                                | -                                              |
| `missions`        | `milestoneId`, `sessionId`, `order`                 | -                                              |
| `form_schemas`    | `missionId` (unique)                                | One schema per mission                         |
| `progress_events` | `(playerId, missionId)` composite                   | App-layer uniqueness via `upsertProgressEvent` |
| `buddy_profiles`  | `assignedToPlayerId`                                | -                                              |
| `resources`       | `sessionId`                                         | -                                              |

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
- `PlayerProgress.earnedXP` is computed at **read time** by `computeProgress` -
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

| #    | Constraint                                                                                                                                                                                                                              | Enforcement                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| C-01 | One user identity per session                                                                                                                                                                                                           | `players.uid` unique globally                                                                         |
| C-02 | Progress is always recoverable                                                                                                                                                                                                          | `recoveryKey` stored in PB, shown once on first join                                                  |
| C-03 | No auth system required                                                                                                                                                                                                                 | Pocketbase auth collections unused in prototype                                                       |
| C-04 | `xpThreshold` is always 100 per Milestone                                                                                                                                                                                               | Constant; not stored as a variable field                                                              |
| C-05 | One `ProgressEvent` per `(playerId, missionId)`                                                                                                                                                                                         | Enforced at `upsertProgressEvent` - the single write path                                             |
| C-06 | Form missions always `autoApproved`, regardless of `validationMethod`                                                                                                                                                                   | `autoApproved` status set on submit; `ValidationDisplay` never mounts for `form` type                 |
| C-07 | The `qr` validation path holds no SSE subscription at any point - it is fully offline (HMAC verify → GM confirm → PB write). The `gmApprove` path may use polling or SSE in `ValidationDisplay` while waiting for approval (see OD-09). | Enforced by `ValidationDisplay`: no `pb.collection().subscribe()` call when `validationMethod = 'qr'` |
| C-08 | Milestone positions are percentage-based                                                                                                                                                                                                | `xPercent`/`yPercent` 0–100, never pixels                                                             |
| C-09 | `MilestoneNode` and `MissionCard` are shared components                                                                                                                                                                                 | `draggable` and `editable` boolean props; see D-007 for trade-off                                     |
| C-10 | Templates strip all PBRecord IDs on export                                                                                                                                                                                              | Import creates fresh records; never reuse IDs across sessions                                         |
| C-11 | `PlayerProgress` and `MilestoneProgress` are never persisted                                                                                                                                                                            | Derived at read time by `computeProgress`                                                             |
| C-12 | No TypeScript enums                                                                                                                                                                                                                     | Use `const` object + `keyof` union pattern throughout                                                 |
| C-13 | No component calls `JSON.parse` on a PB record field                                                                                                                                                                                    | All parsing happens inside the PB adapter module                                                      |
| C-14 | No component writes directly to `progress_events`                                                                                                                                                                                       | All mutations go through `upsertProgressEvent`                                                        |
| C-15 | `validationMethod` defaults to `'gmApprove'` for all new Missions                                                                                                                                                                       | Set in `MissionEditor` default state; form missions ignore this field                                 |
| C-16 | QR payloads must include an HMAC-SHA256 signature keyed with the session token. `qrPayload.ts` is the single encode/decode point; no component calls `JSON.stringify` or `JSON.parse` on QR strings directly                            | Enforced by `qrPayload.ts` utility module; `QRDisplay` and `QRScannerView` both call it               |
| C-17 | `ChatThread` and `ChatMessage` are ephemeral client-only state. Chat history is never written to PocketBase and is reset on page navigation                                                                                             | `useChatStream` hook holds state in React; no PB adapter call for chat data                           |

## Open Decisions [APPEND-ONLY]

| #     | Question                                                                                                                                                                                                    | Impact                                                                     | Target Sprint  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- |
| OD-01 | Should `link`-type Missions auto-complete on click, or require "Mark as Visited" + QR flow?                                                                                                                 | Determines if link missions need `QRDisplay`                               | Sprint 2       |
| OD-02 | Should difficulty changes retroactively affect earned XP, or should `ProgressEvent` snapshot `xpValue` at validation time?                                                                                  | Data model + fairness UX                                                   | Sprint 2       |
| OD-03 | Should `MilestoneNode` fill color use a gradient (0–100%) or step thresholds (0%, 25%, 50%, 75%, 100%)?                                                                                                     | Visual design only                                                         | Sprint 2       |
| OD-04 | Does the `ResourcesSection` support metadata filtering (type, tags) or free-text search only?                                                                                                               | `SearchBar` complexity                                                     | Sprint 2       |
| OD-05 | Should the Game Maker be able to create multiple Buddy profiles per session (a pool), or one per player only?                                                                                               | `BuddyProfile` schema impact                                               | Sprint 3       |
| OD-06 | What is the offline behavior for form submission - queue and sync, or block until online?                                                                                                                   | Service Worker strategy                                                    | Sprint 3       |
| OD-07 | In production, should `xpValue` be re-derived from `missions.xpValue` at scan time rather than trusted from the QR payload?                                                                                 | Security; out of scope for prototype; applies only to `qr` method          | Post-prototype |
| OD-08 | Should `validationMethod` be configurable at session level (all missions inherit a session-wide default), or per-mission only?                                                                              | Game Maker UX and template design complexity                               | Sprint 3       |
| OD-09 | For `gmApprove` missions, should `ValidationDisplay` use polling or SSE to detect approval? SSE keeps the existing real-time pattern but extends the subscription scope.                                    | Real-time UX vs. infrastructure simplicity                                 | Sprint 3       |
| OD-10 | Should the Player see the `pendingApproval` state inline (e.g., greyed-out mission card with "Waiting for approval") rather than a full-screen `ValidationDisplay`?                                         | Player UX feedback loop; affects when `ValidationDisplay` dismisses        | Sprint 3       |
| OD-11 | What is the auth mechanism for the LiteLLM proxy? Options: (a) Bearer token hardcoded in env var at build time, (b) session token passed from `LocalIdentity`, (c) unauthenticated (internal network only). | Security posture of the AI gateway; affects `useChatStream` implementation | Sprint 3       |
| OD-12 | Should the QR payload's `issuedAt` expiry tolerance be configurable per session, or a fixed constant (e.g., 5 minutes)?                                                                                     | UX for slow QR scans; security for replayed tokens                         | Sprint 3       |
