import type {
  Milestone,
  Mission,
  Player,
  PlayerProgress,
  ProgressEvent,
} from "../../types/index.ts";

export interface UseProgressPlayerOptions {
  readonly mode: "player";
  readonly playerId: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
}

export interface UseProgressAdminOptions {
  readonly mode: "gamemaker";
  readonly sid: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly validatorUid?: string;
}

export type UseProgressOptions =
  | UseProgressPlayerOptions
  | UseProgressAdminOptions;

export interface UseProgressPlayerResult {
  readonly mode: "player";
  readonly playerProgress: PlayerProgress | null;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly markPending: (missionId: string) => Promise<void>;
  readonly markSelfComplete: (missionId: string) => Promise<void>;
  readonly markAutoApproved: (
    missionId: string,
    patch?: Partial<
      Pick<ProgressEvent, "formResponse" | "validatedBy" | "validatedAt">
    >,
  ) => Promise<void>;
  readonly watchMission: (
    missionId: string,
    onUpdate: (event: ProgressEvent) => void,
  ) => () => void;
}

export interface UseProgressAdminResult {
  readonly mode: "gamemaker";
  readonly players: ReadonlyArray<Player>;
  readonly selectedPlayerId: string;
  readonly selectedPlayer: Player | null;
  readonly selectedPlayerProgress: PlayerProgress | null;
  readonly selectedPlayerEvents: ReadonlyArray<ProgressEvent>;
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly handlePlayerSelect: (playerId: string) => void;
  readonly handleApprove: (
    playerId: string,
    missionId: string,
  ) => Promise<void>;
  readonly handleReject: (playerId: string, missionId: string) => Promise<void>;
}
