# Code Mode Rules (Non-Obvious Only)

- **`verbatimModuleSyntax`** is enabled - use `import type` for type-only imports. Never mix runtime and type imports in one statement.
- **No TypeScript `enum`** - use `const` object + `keyof` union (C-12). Pattern: `export const FOO = { A: "a" } as const; export type Foo = (typeof FOO)[keyof typeof FOO];`
- **All interface fields are `readonly`**; arrays are `ReadonlyArray<T>`. Mutations go through the adapter, never by direct property assignment.
- **Components never call the adapter directly**. Business logic is in [`src/use-cases/`](src/use-cases/). Components → use cases → adapter.
- **`upsertProgressEvent` is the single write path** for all ProgressEvent mutations (C-05, C-14). No component may write to progress events outside this function.
- **No `JSON.parse` on PB record fields** in components (C-13). [`FormSchemaRaw`](src/types/domain.ts:107) and [`ProgressEventRaw`](src/types/domain.ts:112) exist only inside the adapter, which parses them into typed interfaces before returning to app-layer code.
- **Template export embeds `_milestoneOrder` and `_missionOrder`** ([`exportTemplate.ts`](src/use-cases/exportTemplate.ts:27)). These are import-remapping keys that let [`importTemplate`](src/use-cases/importTemplate.ts:13) reconstruct FK references after PB IDs are stripped.
- **QR encoding/decoding**: Only [`src/utils/qrPayload.ts`](src/utils/qrPayload.ts) touches QR strings (C-16). Components call `encodeQRPayload`/`decodeQRPayload` - never `JSON.stringify`/`JSON.parse` on QR data directly.
- **The PocketBase adapter directory** ([`src/adapters/pocketbase/`](src/adapters/pocketbase)) is empty. Currently only the mock adapter exists.

---

## Component Implementation Policy

- **Keep components lean.** If a single component file exceeds ~200 lines, extract reusable pieces (types, UI sub-components, hooks) into separate files. A component file should express orchestration logic, not inline hundreds of lines of markup.
- **Prefer extraction over nesting.** When a component has clearly separable concerns — e.g., list view vs. editor view, drag-to-dismiss logic, draft persistence — extract them into dedicated modules under [`src/components/`](src/components/) or [`src/utils/`](src/utils/) as appropriate.
- **Small components are preferred.** Each file should have one clear responsibility. Reference canonical patterns like [`ConfirmSheet`](src/components/admin/ConfirmSheet.tsx), [`DraftRestoreBanner`](src/components/admin/DraftRestoreBanner.tsx), and [`MissionListView`](src/components/admin/MissionListView.tsx) (extracted from [`MissionBottomSheet`](src/components/admin/MissionBottomSheet.tsx)).

---

## Mandatory Smoke Testing After UI Changes

- **Any change to a UI component must be validated with Playwright** before marking the task complete. Use `browser_run_code_unsafe` or `browser_snapshot` to verify that:
  - The component renders without error
  - Core user interactions (click, input, navigation) work
  - No broken layout, missing elements, or console errors
- **Test from a mobile-first viewport** (390×844). Resize to the user's actual viewport if different.
- **Always test the user-facing flow**, not just the implementation detail. For example, verify that a bottom sheet opens, shows content, and closes.
- **Save screenshots to `.playwright-mcp/`** for visual reference.
- **Do not force-click elements** to bypass layout issues. If an element is obscured or outside the viewport, investigate and fix the root cause — this is a legitimate UX bug, not a testing convenience.
