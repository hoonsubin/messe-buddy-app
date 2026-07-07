import type { Mission, ProgressEvent } from "../types/index.ts";
import { VALIDATION_METHOD } from "../types/index.ts";
import { isProgressValidated } from "../store/progressEvents.ts";

/** First QR mission not yet completed — matches GM simulate-scan selection. */
export const pickFirstIncompleteQrMission = (
  missions: ReadonlyArray<Mission>,
  progressEvents: ReadonlyArray<ProgressEvent>,
): Mission | undefined =>
  [...missions]
    .filter((m) => m.validationMethod === VALIDATION_METHOD.QR)
    .sort((a, b) => a.order - b.order)
    .find((m) => {
      const ev = progressEvents.find((e) => e.missionId === m.id);
      return ev === undefined || !isProgressValidated(ev.status);
    });
