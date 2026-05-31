# Lint Error Resolution Plan

## Overview

`deno lint` reports **40 problems** across **23 checked files**, falling into **3 categories**:

| Category | Rule | Count | Severity |
|---|---|---|---|
| Missing `type` on buttons | `jsx-button-has-type` | ~36 | Error |
| Unused declarations | `no-unused-vars` | 3 | Error |
| URL import instead of bare specifier | `no-import-prefix` | 1 | Error |

---

## Category 1: `jsx-button-has-type` (~36 errors)

**Rule:** All `<button>` elements must have a `type` attribute (`"button"`, `"submit"`, or `"reset"`).

**Root cause:** Every `<button>` in the JSX codebase omits the `type` attribute. Since none of these buttons are inside forms or meant to submit, they should all be `type="button"`.

**Files affected (8 files):**

| File | Button count |
|---|---|
| `src/pages/LandingPage.tsx` | 10 |
| `src/pages/AdminCockpitPage.tsx` | 7 |
| `src/pages/PlayerDetailPage.tsx` | 2 |
| `src/pages/QRScannerPage.tsx` | 2 (there are also buttons at lines 94, 98, 100, 103, 108, 118 — some may not be flagged) |
| `src/components/MilestoneSidebarViewer.tsx` | 2 |
| `src/components/TopBar.tsx` | 2 |
| `src/components/QRDisplay.tsx` | 2 |
| `src/components/MissionDetailPopup.tsx` | 2 |

**Fix pattern:** Add `type="button"` to every `<button>` element that is not a form submit button.

**Before:**
```tsx
<button className="topbar-back" onClick={onBack}>‹</button>
```

**After:**
```tsx
<button type="button" className="topbar-back" onClick={onBack}>‹</button>
```

**Note:** The only `<button>` elements that should NOT get `type="button"` are:
- The form submit button in `FormPage.tsx` line 106 — this is `type="submit"` implicitly, but it's already inside a `<form>` with `onSubmit`. It should get `type="submit"` explicitly.

---

## Category 2: `no-unused-vars` (3 errors)

### 2a. `msPct` in PlayerDetailPage.tsx:67

**Root cause:** The variable `msPct` is computed but never used. The milestone XP progress percentage is not displayed in this view.

**Fix:** Remove the `msPct` declaration entirely, or if keeping for future use, prefix with underscore: `_msPct`.

**Before:**
```tsx
const msPct = ms.xpThreshold > 0 ? Math.round((ms.earnedXP / ms.xpThreshold) * 100) : 0
```

**After (preferred):**
```tsx
// Remove the line entirely
```

### 2b. `useEffect` import in QRDisplay.tsx:1

**Root cause:** `useEffect` is imported from React but never used in the component.

**Fix:** Remove `useEffect` from the import statement.

**Before:**
```tsx
import { useEffect, useState } from 'react'
```

**After:**
```tsx
import { useState } from 'react'
```

### 2c. `isProfile` in FormPage.tsx:19

**Root cause:** `isProfile` is declared but the condition it gates (`missionId === 'msn-profile'`) is never used. The mock data has no mission with id `'msn-profile'`.

**Fix:** Remove the `isProfile` variable declaration.

**Before:**
```tsx
const isProfile    = missionId === 'msn-profile'
```

**After:**
```tsx
// Remove the line entirely
```

---

## Category 3: `no-import-prefix` (1 error)

**File:** `scripts/generate-package-json.ts:12`

**Root cause:** The file imports directly from a URL (`https://deno.land/std@0.208.0/fs/mod.ts`) instead of using a bare specifier defined in `deno.json`.

**Fix:** Add `"@std/fs"` import to `deno.json` imports and update the script to use the bare specifier.

**Step 1 — Update `deno.json` imports:**
```json
{
  "imports": {
    // ... existing imports ...
    "@std/fs": "https://deno.land/std@0.208.0/fs/mod.ts",
  }
}
```

**Step 2 — Update `scripts/generate-package-json.ts`:**
```ts
import { readTextFileSync } from "@std/fs";
```

---

## Implementation Order

1. **Fix `jsx-button-has-type` in `TopBar.tsx`** (2 buttons — quick win)
2. **Fix `jsx-button-has-type` in `MilestoneSidebarViewer.tsx`** (2 buttons)
3. **Fix `jsx-button-has-type` in `MissionDetailPopup.tsx`** (2 buttons)
4. **Fix `jsx-button-has-type` in `QRDisplay.tsx`** (2 buttons)
5. **Fix `jsx-button-has-type` in `PlayerDetailPage.tsx`** (2 buttons)
6. **Fix `jsx-button-has-type` in `QRScannerPage.tsx`** (review + fix buttons)
7. **Fix `jsx-button-has-type` in `AdminCockpitPage.tsx`** (7 buttons)
8. **Fix `jsx-button-has-type` in `LandingPage.tsx`** (10 buttons — the largest file)
9. **Fix `no-unused-vars` — remove `msPct`** in `PlayerDetailPage.tsx`
10. **Fix `no-unused-vars` — remove `useEffect` import** in `QRDisplay.tsx`
11. **Fix `no-unused-vars` — remove `isProfile`** in `FormPage.tsx`
12. **Fix `no-import-prefix`** — add `@std/fs` to `deno.json` and update `scripts/generate-package-json.ts`
13. **Run `deno lint` to verify** all 40 errors are resolved

## Expected Outcome

After applying all fixes:
- `jsx-button-has-type`: 0 errors (all buttons have `type="button"`)
- `no-unused-vars`: 0 errors (unused declarations removed)
- `no-import-prefix`: 0 errors (URL import converted to bare specifier)
- **Total: 0 errors**
