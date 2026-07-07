import assert from "node:assert/strict";
import { createQueryClient } from "./queryClient.ts";
import { buildGmPlayerRow, patchGmRosterFromPlayer } from "./gmRosterPatch.ts";
import { queryKeys } from "./queryKeys.ts";
import type { GmRosterData } from "./gmRosterTypes.ts";
import type { Player } from "../types/index.ts";

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

const invitedPlayer: Player = {
  ...pb("p1"),
  sessionId: "sess_a",
  inviteToken: "tok",
  claimStatus: "invited",
  tutorialComplete: false,
  profileComplete: false,
  name: "Pending Player",
  jobTitle: "",
  team: "",
  startDate: "",
  location: "",
  timezone: "",
  recoveryKey: "REC",
  languages: [],
  skillsConfident: [],
  skillsDevelop: [],
};

const rosterSeed = (): GmRosterData => ({
  players: [invitedPlayer],
  allProgressEvents: [],
  rows: [{
    playerId: "p1",
    name: "Pending Player",
    jobTitle: "",
    claimStatus: "invited",
    joined: false,
    progressPercent: 0,
    daysSinceLastActivity: null,
    isStalled: false,
  }],
});

Deno.test("buildGmPlayerRow returns zero progress for invited player", () => {
  const row = buildGmPlayerRow(invitedPlayer, [], [], []);
  assert.equal(row.joined, false);
  assert.equal(row.progressPercent, 0);
});

Deno.test("patchGmRosterFromPlayer flips invited row to claimed without reload", () => {
  const client = createQueryClient();
  const key = queryKeys.gmRoster("sess_a");
  client.patchQuery(key, () => rosterSeed());

  const claimed: Player = { ...invitedPlayer, claimStatus: "claimed" };
  patchGmRosterFromPlayer(client, "sess_a", claimed);

  const next = client.getQueryState<GmRosterData>(key).data;
  assert.equal(next?.players[0]?.claimStatus, "claimed");
  assert.equal(next?.rows[0]?.joined, true);
  assert.equal(next?.rows[0]?.claimStatus, "claimed");
});
