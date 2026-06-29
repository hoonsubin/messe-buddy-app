import type {
  Milestone,
  Mission,
  Player,
  PlayerProgress,
  ProgressEvent,
} from "../../types/index.ts";

export interface HireProgressRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly sessionName: string;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number | null;
  readonly isStalled: boolean;
  /** Sum of earnedXP across all milestones */
  readonly totalXP: number;
  /** Name of the active (in-progress) or next upcoming milestone */
  readonly currentMilestoneName: string;
  /** 1-based position of the current milestone, sorted by milestone.order */
  readonly currentMilestoneIndex: number;
  readonly totalMilestones: number;
}

export interface UseProgressPlayerOptions {
  readonly mode: "player";
  readonly playerId: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
}

export interface UseProgressAdminOptions {
  readonly mode: "admin";
  readonly sid: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly validatorUid?: string;
}

export interface UseProgressCrossHireOptions {
  readonly mode: "crossHire";
  readonly active: boolean;
}

export type UseProgressOptions =
  | UseProgressPlayerOptions
  | UseProgressAdminOptions
  | UseProgressCrossHireOptions;

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
  readonly mode: "admin";
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

export interface UseProgressCrossHireResult {
  readonly mode: "crossHire";
  readonly rows: ReadonlyArray<HireProgressRow>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export type UseProgressResult =
  | UseProgressPlayerResult
  | UseProgressAdminResult
  | UseProgressCrossHireResult;
