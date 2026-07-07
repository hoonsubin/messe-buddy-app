import { assertEquals } from "jsr:@std/assert@1";
import type { Mission, ProgressEvent } from "../types/index.ts";
import { MISSION_TYPE, VALIDATION_METHOD } from "../types/index.ts";
import { pickFirstIncompleteQrMission } from "./qrMissionPick.ts";

const mission = (
  id: string,
  order: number,
  method: Mission["validationMethod"] = VALIDATION_METHOD.QR,
): Mission => ({
  id,
  order,
  validationMethod: method,
  type: MISSION_TYPE.TEXT,
  title: id,
  body: "",
  milestoneId: "ms1",
  sessionId: "s1",
  playerId: "p1",
  xpValue: 10,
  tags: [],
  isInCurrentMissions: true,
  created: "",
  updated: "",
});

const event = (
  missionId: string,
  status: ProgressEvent["status"],
): ProgressEvent => ({
  id: missionId,
  missionId,
  playerId: "p1",
  sessionId: "s1",
  status,
  created: "",
  updated: "",
});

Deno.test("pickFirstIncompleteQrMission — skips completed, respects order", () => {
  const missions = [
    mission("qr-done", 1),
    mission("qr-next", 2),
    mission("self", 3, VALIDATION_METHOD.SELF_APPROVE),
  ];
  const picked = pickFirstIncompleteQrMission(
    missions,
    [event("qr-done", "completed")],
  );
  assertEquals(picked?.id, "qr-next");
});

Deno.test("pickFirstIncompleteQrMission — all QR done returns undefined", () => {
  const missions = [mission("qr1", 1)];
  const picked = pickFirstIncompleteQrMission(
    missions,
    [event("qr1", "autoApproved")],
  );
  assertEquals(picked, undefined);
});
