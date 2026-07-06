import type { Player, ProgressEvent } from "../types/index.ts";
import type { ClaimStatus } from "../types/index.ts";

export interface GmPlayerRow {
  readonly playerId: string;
  readonly name: string;
  readonly jobTitle: string;
  readonly claimStatus: ClaimStatus;
  readonly joined: boolean;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number | null;
  readonly isStalled: boolean;
}

export interface GmRosterData {
  readonly players: ReadonlyArray<Player>;
  readonly allProgressEvents: ReadonlyArray<ProgressEvent>;
  readonly rows: ReadonlyArray<GmPlayerRow>;
}
