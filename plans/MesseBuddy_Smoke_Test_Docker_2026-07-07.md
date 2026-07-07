# MesseBuddy Smoke Test — Full Docker Stack — 2026-07-07

Distinct from the same-day `MesseBuddy_Smoke_Test_2026-07-07.md` (dev server, `localhost:5173`, no rebuild). This pass targets the **full `docker compose` stack** on a **greenfield build** — fresh volumes, following same-session fixes to certbot/pb-seed, the file-watcher key-alias crash, and the pgvector embedding-dimension mismatch. Tested at 390×844 via Playwright MCP against the user's actual local deployment (not a sandboxed instance).

**Deployment note (not a code bug):** the app was reached at `https://localhost/` (default HTTPS port), not `https://localhost:8700/` as initially assumed. `.env`'s `APP_PORT=8700` only maps to the container's plain-HTTP vhost — per `docker/nginx.conf`, that vhost exists solely to answer ACME HTTP-01 challenges and 301-redirect everything else to HTTPS. Since `APP_HTTPS_PORT` was never set, HTTPS falls back to its default (443). Hitting `:8700` over HTTPS produces a protocol-mismatch TLS error (`SSL received a record that exceeded the maximum permissible length`), not a real outage. Fix is a `.env` decision, not a code change: either browse via 443, or set `APP_HTTPS_PORT=8700` for a single predictable port.

## Results

✅ **Landing page** — loads clean, zero console errors/warnings. Network trace confirms the same-session template-seeding fix is live: `GET .../templates/records?...filter=name='Messe München Onboarding'` → 200, followed by an upsert `PATCH` — the `pb-seed` one-shot job (or the client-side fallback) is correctly finding and syncing the bundled template without a browser having to "discover" it first.

✅ **GM create-workspace flow** — session creation, 3-step invite wizard (player name → buddy assignment → template picker) all completed without error. `POST /api/collections/sessions/records` → 200, realtime subscription (`POST /api/realtime`) connects (204).

✅ **Milestone/mission editor** — selecting the "Messe München Onboarding" template renders all 6 milestones with exact mission counts (7 + 1 + 11 + 7 + 3 + 4 = 33), matching the template's own spec comment. Confirms the seed data survived the embedding-dimension/volume changes made earlier this session intact.

✅ **Invite → join → player dashboard** — QR/join-link flow works end to end; player dashboard shows all 33 missions, correct buddy card (name/role/email/phone from the wizard), and **0 / 360 XP** — exactly matching the template's documented total. Zero console errors throughout.

✅ **Mission detail (profile form)** — "Complete Your Profile" form mission renders all fields (department dropdown, work-arrangement checkboxes, date picker, etc.) correctly.

✅ **Resource search (player side)** — static, non-LLM resource search panel opens and accepts input cleanly. Confirms library-resource seeding is independent of the chat/RAG path below.

✅ **GM resource library tab** — all 7 seeded library resources render with correct tags/links.

✅ **Log out / profile persistence** — logging out returns to landing and correctly lists both roles created this session ("Resume as Claude QA" / GM, "Resume as Test Player" / employee) for one-tap resume.

🚫 **AI Assistant chat — broken.** Sending a suggested prompt ("How many vacation days do I get?") returns a graceful in-UI fallback message, but the underlying request fails:

```
POST /llm/v1/chat/completions → 401
{"error":{"message":"Authentication Error, Invalid proxy server token passed.
Received API Key = sk-...-jgA ... Unable to find token in cache or
LiteLLM_VerificationTokenTable","type":"token_not_found_in_db", ...}}
```

Root cause: `app`'s nginx bakes its `/llm` proxy's `Authorization: Bearer ${KEY}` header exactly once, at container boot (`entrypoint.sh` reads `/runtime/virtual_key` a single time via `envsubst`). `file-watcher` mints an ephemeral key on every one of *its own* bootstraps (by design — see its docstring on avoiding stale keys across `down -v`), and nothing tells an already-running `app` container to re-render its config when that happens. If `file-watcher` rotates the key while `app` stays up, `app` keeps serving a token LiteLLM no longer recognizes.

This is distinct from — and would still occur after — the embedding pipeline finishing ingestion: the 401 happens at LiteLLM's auth layer, before any vector-store search is attempted. Per discussion with the user, this needs a proper structural fix (e.g., `app` polling the runtime key file and re-rendering + reloading nginx on change, similar to the existing periodic cert-reload loop) rather than a quick patch, and is being tracked separately. Not re-verified further this session at the user's request, since embeddings were still mid-ingestion on this greenfield build.

## Recommended priority

1. **Chat 401 (virtual-key sync)** — structural fix needed so `app` and `file-watcher` never disagree about the current key across independent restarts. Candidate approach: have `app`'s supervisord run a small loop that diffs `/runtime/virtual_key` against the currently-rendered config and re-execs `envsubst` + `nginx -s reload` on change (parallel to the existing 12h cert-reload program in `docker/supervisord.conf`).
2. **Port documentation** — clarify in `.env.example` that `APP_PORT` alone does not make the app reachable over plain HTTP for anything but the ACME challenge; either default `APP_HTTPS_PORT` to something predictable or call this out more prominently.

## What worked cleanly

Everything except the AI chat: full GM and player journeys, template/library seeding (validating this session's `pb-seed` fix), realtime GM↔player sync surface (session/player creation propagated correctly), form-mission rendering, resource search, and profile persistence across roles.
