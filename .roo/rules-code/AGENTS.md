# Code Mode Rules (Non-Obvious Only)

- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports. Never mix runtime and type imports in one statement.
- **No TypeScript `enum`** — use `const` object + `keyof` union (C-12). Pattern: `export const FOO = { A: "a" } as const; export type Foo = (typeof FOO)[keyof typeof FOO];`
- **All interface fields are `readonly`**; arrays are `ReadonlyArray<T>`. Mutations go through the adapter, never by direct property assignment.
- **Components never call the adapter directly**. Business logic is in [`src/use-cases/`](src/use-cases/). Components → use cases → adapter.
- **`upsertProgressEvent` is the single write path** for all ProgressEvent mutations (C-05, C-14). No component may write to progress events outside this function.
- **No `JSON.parse` on PB record fields** in components (C-13). [`FormSchemaRaw`](src/types/domain.ts:107) and [`ProgressEventRaw`](src/types/domain.ts:112) exist only inside the adapter, which parses them into typed interfaces before returning to app-layer code.
- **Template export embeds `_milestoneOrder` and `_missionOrder`** ([`exportTemplate.ts`](src/use-cases/exportTemplate.ts:27)). These are import-remapping keys that let [`importTemplate`](src/use-cases/importTemplate.ts:13) reconstruct FK references after PB IDs are stripped.
- **QR encoding/decoding**: Only [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts) touches QR strings (C-16). Components call `encodeQRPayload`/`decodeQRPayload` — never `JSON.stringify`/`JSON.parse` on QR data directly.
- **The PocketBase adapter directory** ([`src/adapters/pocketbase/`](src/adapters/pocketbase)) is empty. Currently only the mock adapter exists.
