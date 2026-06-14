# Architect Mode Rules (Non-Obvious Only)

- **All architectural constraints are in [`SPECS.md`](../../SPECS.md#design-constraints--invariants)** (C-01 through C-17). These are locked decisions — do not re-open without a Decision Log entry.
- **The [`pocketbase/` adapter directory](../../src/adapters/pocketbase) is empty** — implementing a real PocketBase adapter that satisfies [`AppAdapter`](../../src/adapters/interface.ts:17) is the next major architectural step.
- **The adapter is the single swap point** ([`AdapterContext.tsx`](../../src/adapters/AdapterContext.tsx:13)). Changing from mock to real PB is a one-line change in the provider. All components and use cases consume `AppAdapter` through [`useAdapter()`](../../src/adapters/useAdapter.ts:5).
- **Adapter boundary types** must exist only in the adapter module (C-13). [`FormSchemaRaw`](../../src/types/domain.ts:107) and [`ProgressEventRaw`](../../src/types/domain.ts:112) have JSON-stringified fields. The real PB adapter must parse these → typed interfaces before returning; no component may call `JSON.parse` on a PB record field.
- **XP Derivation** ([`deriveXP.ts`](../../src/use-cases/deriveXP.ts:22)) is algorithmically locked in SPECS.md. Difficulty weights are linear 1:1. Rounding remainder goes to highest-difficulty missions first (then `order` as tiebreaker). `xpThreshold` is always 100 per Milestone (C-04).
- **Template import** uses `_milestoneOrder` and `_missionOrder` to reconstruct FK relationships ([`importTemplate.ts`](../../src/use-cases/importTemplate.ts:23)). Import order: Session → Milestones (by `order`) → Missions (remap `milestoneId`) → FormSchemas (remap `missionId`) → Resources. Any change to export must update import symmetrically.
- **Form missions always `autoApproved`** regardless of `validationMethod` (C-06). The `ValidationDisplay` never mounts for `type: "form"`.
- **Progress is never snapshotted** — `computeProgress` re-derives at read time (C-11). Retroactive difficulty changes affect earned XP (OD-02 resolution).
- **SSE subscription is only held by `ValidationDisplay`** and only when `validationMethod = 'qr'` (C-07). Everything else is fetched once on mount.
- **No auth system is planned for the prototype** (C-03). If adding auth later, the `role` field must be server-validated on every mutation.
