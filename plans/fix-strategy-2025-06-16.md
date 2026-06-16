# Fix Strategy - `deno check` + `deno task lint` Errors

**Date:** 2025-06-16
**Total issues:** 13 (2 type errors + 10 lint errors + 1 warning)

---

## Inventory

### `deno check` (2 errors)

| # | File | Line | Error | Root Cause |
|---|------|------|-------|------------|
| T1 | [`src/components/admin/MilestoneMapEditor.tsx`](src/components/admin/MilestoneMapEditor.tsx:646) | 646 | `Cannot find name 'onUploadBackground'` | `onUploadBackground` is declared in [`MilestoneMapEditorProps`](src/components/admin/MilestoneMapEditor.tsx:20) but omitted from the destructuring at [line 41](src/components/admin/MilestoneMapEditor.tsx:41) |
| T2 | [`src/config/llm.ts`](src/config/llm.ts:14) | 14 | `Property '__MB_CONFIG__' does not exist on type 'Window & typeof globalThis'` | The global `Window` augmentation in [`src/vite-env.d.ts`](src/vite-env.d.ts:23) is not included in the `deno check` compilation when checking a single entrypoint. No file imports or references it. |

### `deno task lint` (10 errors + 1 warning)

#### Category A: `react-hooks/set-state-in-effect` (5 errors)

| # | File | Line | Call |
|---|------|------|------|
| L1 | [`MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:133) | 133 | `navigateTo("editor", "forward")` |
| L2 | [`MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:195) | 195 | `setStoredDraft(null)` |
| L3 | [`MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:212) | 212 | `setRenameValue(milestone?.name ?? "")` |
| L4 | [`useScrollCollapse.ts`](src/hooks/useScrollCollapse.ts:40) | 40 | `setCollapsed(false)` |
| L5 | [`useTutorial.ts`](src/hooks/useTutorial.ts:75) | 75 | `setInitializedFor(player.id)` |

#### Category B: `no-unused-vars` (3 errors)

| # | File | Line | Symbol |
|---|------|------|--------|
| L6 | [`useAdminMilestoneEditor.ts`](src/hooks/useAdminMilestoneEditor.ts:4) | 4 | `DraftMission` import |
| L7 | [`useChatStream.ts`](src/hooks/useChatStream.ts:177) | 177 | `e` in catch binding |
| L8 | [`useTemplateLibrary.ts`](src/hooks/useTemplateLibrary.ts:43) | 43 | `sid` destructured param |

#### Category C: Declaration order / memoization (2 errors)

| # | File | Line | Error |
|---|------|------|-------|
| L9 | [`AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:212) | 212 | `showToast` used before declaration |
| L10 | [`AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:232) | 232 | React Compiler: Cannot preserve existing memoization |

#### Warning

| # | File | Line | Warning |
|---|------|------|---------|
| W1 | [`AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:214) | 214 | `useCallback` missing dep: `showToast` |

---

## Fix Plan

### T1 - Missing `onUploadBackground` destructuring
**File:** [`src/components/admin/MilestoneMapEditor.tsx`](src/components/admin/MilestoneMapEditor.tsx:41)
**Difficulty:** Trivial
**Approach:** Add `onUploadBackground` to the destructured props block.

```diff
  const {
    bgImageUrl,
    milestones,
    onNodeDrop,
    onAddMilestone,
    onAddMilestoneAt,
    onRename,
    onDelete,
    onMilestoneClick,
+   onUploadBackground,
  } = props;
```

---

### T2 - `Window.__MB_CONFIG__` type not found
**File:** [`src/config/llm.ts`](src/config/llm.ts:14)
**Difficulty:** Easy
**Approach:** Add `/// <reference path="../vite-env.d.ts" />` at the top of [`llm.ts`](src/config/llm.ts:1) so the `deno check` type resolver includes the global `Window` augmentation.

```diff
+ /// <reference path="../vite-env.d.ts" />
+
  // LLM endpoint configuration.
```

**Alternative (if preferred):** Add `"include": ["src"]` to [`deno.json`](deno.json:9) `compilerOptions`, but this changes project-wide config and is higher risk. The `/// <reference>` approach is surgically precise.

---

### L1 - `navigateTo` in effect (MissionBottomSheet:133)
**File:** [`src/components/admin/MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:130)
**Difficulty:** Medium
**Problem:** The effect syncs `view` state to `"editor"` when `activeMissionId` becomes truthy. This is "derived state" being synced in an effect.
**Approach:** Move the navigation into the event handlers that set `activeMissionId`. When a mission is selected from the list, immediately call `navigateTo("editor", "forward")` alongside setting the active ID. Then the effect becomes unnecessary and can be removed entirely.

To do this, find all call sites where `activeMissionId` is set (likely in `AdminMissionsList` or parent callbacks) and add the navigation there.

---

### L2 - `setStoredDraft` in effect (MissionBottomSheet:195)
**File:** [`src/components/admin/MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:193)
**Difficulty:** Medium
**Problem:** Clearing `storedDraft` when `activeMissionId` goes null, and loading it from `localStorage` when it becomes set.
**Approach:** Replace the effect with a combination of:
1. Compute `storedDraft` during render using a lazy pattern - read from `localStorage` when `activeMissionId` changes (the render-phase read is safe since `localStorage` is synchronous).
2. Use [`useMemo`](https://react.dev/reference/react/useMemo) keyed on `[activeMissionId, sessionId]` to compute the draft, or derive it directly in render.

```tsx
const storedDraft = useMemo(() => {
  if (!activeMissionId) return null;
  const found = loadStoredDraft(sessionId, activeMissionId);
  if (found && found.draft.title !== draft?.title) return found;
  return null;
}, [activeMissionId, sessionId, draft?.title]);
```

This eliminates the effect entirely.

---

### L3 - `setRenameValue` syncing props (MissionBottomSheet:212)
**File:** [`src/components/admin/MissionBottomSheet.tsx`](src/components/admin/MissionBottomSheet.tsx:210)
**Difficulty:** Easy
**Approach:** Use the `key` prop pattern. When the `milestone` identity changes, React unmounts and remounts the renaming UI, resetting `useState` naturally.

If the `MissionBottomSheet` is rendered with `key={milestone?.id}`, the internal state (`renameValue`) resets automatically without an effect:

```tsx
// In parent (AdminCockpitPage.tsx):
<MissionBottomSheet key={selectedMilestone?.id} milestone={selectedMilestone} ... />
```

Then remove the effect at lines 211–213. The initial state `useState(milestone?.name ?? "")` handles the first render correctly.

**Alternative:** Use the `key` only on the rename input sub-component rather than the whole sheet, to avoid losing other state.

---

### L4 - `setCollapsed` reset in effect (useScrollCollapse:40)
**File:** [`src/hooks/useScrollCollapse.ts`](src/hooks/useScrollCollapse.ts:38)
**Difficulty:** Medium
**Problem:** This is the classic "reset state when a key changes" anti-pattern. The effect watches `resetKey` and resets collapsed + scroll position.
**Approach:** The hook is a custom hook, so the caller already has the `resetKey`. Instead of an internal effect, **compute** the collapsed value from both the scroll handler refs and the reset key:

Option A - Use a `key` at the call site. The component using `useScrollCollapse` adds `key={resetKey}` to force remount:
```tsx
const collapsed = useScrollCollapse(scrollRef, /* resetKey unused */);
// Parent renders: <Panel key={activeTab} ... />
```

Option B - Track previous `resetKey` in a ref and incorporate it into the scroll handler logic:
```ts
const resetKeyRef = useRef(resetKey);
if (resetKeyRef.current !== resetKey) {
  resetKeyRef.current = resetKey;
  // apply reset side-effects during render via ref
}
```

Option A is simpler and follows React patterns. Remove the `resetKey` parameter from the hook entirely and have callers use `key={resetKey}` on the component that consumes the hook.

---

### L5 - `setInitializedFor` guard in effect (useTutorial:75)
**File:** [`src/hooks/useTutorial.ts`](src/hooks/useTutorial.ts:73)
**Difficulty:** Easy
**Problem:** `initializedFor` is state used only to guard against re-running the effect. This is a `ref` use case.
**Approach:** Replace `useState<string | null>(null)` with `useRef<string | null>(null)`:

```diff
- const [initializedFor, setInitializedFor] = useState<string | null>(null);
+ const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
-   if (!player || player.id === initializedFor) return;
-   setInitializedFor(player.id);
+   if (!player || player.id === initializedForRef.current) return;
+   initializedForRef.current = player.id;
    // ... rest of effect
- }, [player, initializedFor]);
+ }, [player]);
```

No state setter → no lint error. The ref serves the same "run once" gating purpose without triggering re-renders.

---

### L6 - Unused `DraftMission` import
**File:** [`src/hooks/useAdminMilestoneEditor.ts`](src/hooks/useAdminMilestoneEditor.ts:4)
**Difficulty:** Trivial
**Approach:** Remove `DraftMission` from the type import:

```diff
- import type { DraftMilestone, DraftMission, Milestone } from "../types/index.ts";
+ import type { DraftMilestone, Milestone } from "../types/index.ts";
```

---

### L7 - Unused `e` in catch binding
**File:** [`src/hooks/useChatStream.ts`](src/hooks/useChatStream.ts:177)
**Difficulty:** Trivial
**Approach:** Remove the binding since the catch block checks `controller.signal.aborted` instead of inspecting the error:

```diff
- } catch (e) {
+ } catch {
```

---

### L8 - Unused `sid` parameter
**File:** [`src/hooks/useTemplateLibrary.ts`](src/hooks/useTemplateLibrary.ts:43)
**Difficulty:** Trivial
**Approach:** Remove `sid` from the destructuring. Check if it's used elsewhere in the function body first. Based on the lint output, it's flagged at the destructuring site, meaning it's never referenced in the function body. Remove it from the destructured params line.

---

### L9 - `showToast` used before declaration
**File:** [`src/pages/AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:212)
**Difficulty:** Easy
**Approach:** Move the `showToast` definition (currently at [line 232](src/pages/AdminCockpitPage.tsx:232)) above `handleBuddySave` (currently at [line 202](src/pages/AdminCockpitPage.tsx:202)).

```diff
+ const showToast = useCallback((msg: string) => {
+   setSaveToast(msg);
+   setTimeout(() => setSaveToast(null), 3000);
+ }, []);
+
  const handleBuddySave = useCallback(() => {
    // ...
    showToast("Buddy assigned");
- }, [adapter, selectedPlayerId, buddyDraft]);
+ }, [adapter, selectedPlayerId, buddyDraft, showToast]);
```

Note: This also resolves the warning W1 (missing `showToast` dependency).

---

### L10 - React Compiler cannot preserve memoization
**File:** [`src/pages/AdminCockpitPage.tsx`](src/pages/AdminCockpitPage.tsx:232)
**Difficulty:** Easy
**Problem:** The React Compiler is active and conflicts with manual `useCallback` on functions that it can optimize automatically.
**Approach:** Remove the `useCallback` wrapper from `showToast`. The React Compiler will auto-memoize it. `setTimeout` with a stable state setter is safe to have in a non-memoized function since `setSaveToast` is already stable.

```diff
- const showToast = useCallback((msg: string) => {
+ const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
- }, []);
+ };
```

---

## Execution Order

All fixes are independent and can be applied in any order. Recommended grouping:

| Batch | Fixes | Risk | Files Touched |
|-------|-------|------|---------------|
| 1 - Trivial | L6, L7, L8, T1 | None | 4 files |
| 2 - Easy | T2, L5, L9, L10 | Low | 4 files |
| 3 - Medium | L1, L2, L3, L4 | Requires behavior verification | 4 files |

After each batch, re-run `deno check src/main.tsx && deno task lint` to confirm zero errors.
