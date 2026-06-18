# Shared Data Access (Phase A)

C-18-compliant hook layer — pages and components import hooks only; `AppAdapter` is consumed from `src/hooks/` and `src/use-cases/` exclusively.

## Hook registry

| Hook | Adapter surface | Roles |
|------|-----------------|-------|
| `useIdentity` | `localStorage` (`mb_identity`) | both |
| `useActiveProfile` | composes `useIdentity` | both |
| `useResolvedPlayer` | `getPlayer`, `updatePlayer` | player |
| `useSession` | session + milestones + missions; GM: `updateSession`, `uploadBackground`, `updateMapNodeScale` | both |
| `useProgressPlayer` | progress events + mutations + `watchMission` | player |
| `useProgressAdmin` | players, pending approvals, approve/reject | gamemaker |
| `useProgressCrossHire` | cross-session hire dashboard | gamemaker |
| `useWatchMission` | `subscribeProgressEvent` (C-20) | player components |
| `useBuddyProfile` | buddy read / admin draft + upsert | both |
| `useResources` | list + admin CRUD | both |
| `useFormMission` | form schema + submit + profile mirror | player |
| `useValidationConfirm` | QR decode + GM confirm | gamemaker |
| `useQRScanContext` | scanner prefetch + `buildSimulateScanUrl` | gamemaker |
| `usePreBoardingChecklist` | `updateSession.preBoardingChecks` | gamemaker |
| `useTemplateLibrary` | template import/export | gamemaker |
| `useAdminMilestoneEditor` / `useAdminMissionEditor` | milestone/mission CRUD | gamemaker |
| `useTutorial` | `updatePlayer` via callback | player |

## UX baseline

See legacy flow docs (pre-Phase A):

- [`docs/admin-view-data.md`](admin-view-data.md)
- [`docs/player-view-data.md`](player-view-data.md)

## C-18 enforcement

ESLint `no-restricted-imports` blocks `useAdapter` and `AppAdapter` under `src/pages/**` and `src/components/**`.
