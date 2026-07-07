import type { ProgressEvent } from "../types/index.ts";
import { PROGRESS_STATUS } from "../types/index.ts";

/** Terminal statuses that dismiss QR / pending-approval wait UIs. */
export const isProgressValidated = (status: ProgressEvent["status"]): boolean =>
  status === PROGRESS_STATUS.COMPLETED ||
  status === PROGRESS_STATUS.AUTO_APPROVED;

export const mergeProgressEvent = (
  events: ReadonlyArray<ProgressEvent> | undefined,
  event: ProgressEvent,
): ReadonlyArray<ProgressEvent> => {
  const prev = events ?? [];
  const next = prev.filter(
    (e) => !(e.playerId === event.playerId && e.missionId === event.missionId),
  );
  return [...next, event];
};
