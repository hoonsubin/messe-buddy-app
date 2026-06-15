# Debug Mode Rules (Non-Obvious Only)

- **No tests exist in this project**. Running `deno task lint` is the only automated quality gate.
- **mockAdapter simulates GM approval with a 4-second `setTimeout`** ([`mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:79)). Events with `status: "pendingApproval"` auto-transition to `status: "completed"` after 4 seconds with `validatedBy: "uid_gamemaker_peter"`.
- **Mock adapter uses Maps** keyed by descriptive static IDs (e.g., `"player_sofia"`, `"mission_profile"`), not 15-char PB IDs. The composite key for progress events is `` `${playerId}::${missionId}` `` ([`mockAdapter.ts`](src/adapters/mock/mockAdapter.ts:34)).
- **`localStorage` key is `"mb_identity"`** ([`useIdentity.ts`](src/hooks/useIdentity.ts:4)). Clear this to simulate a first-time user or trigger the recovery flow. The `role` field is client-stored and **not** server-validated — any role can be set.
- **The `pocketbase/` adapter directory is empty** — there is no real backend to debug against. All data comes from [`mockData.ts`](src/adapters/mock/mockData.ts).
- **`deno fmt`** only formats `src/` ([`deno.json`](deno.json:16)). Files outside `src/` (config, docker, scripts) are not auto-formatted.
- **Vite build-time env vars**: `VITE_PB_URL` and `VITE_LITELLM_URL` are frozen in the bundle at build time. Runtime env changes won't affect them — you must rebuild.
