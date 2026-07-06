import type { ProgressEvent } from "../types/index.ts";

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
