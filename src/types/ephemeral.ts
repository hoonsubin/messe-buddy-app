import type { MilestoneStatus, MissionType, MissionTag, ValidationMethod } from "./unions.ts";
import type { FieldSchema } from "./value-objects.ts";

// Derived at read time by computeProgress — never persisted. (C-11)

export interface MilestoneProgress {
  readonly milestoneId: string;
  readonly earnedXP: number;
  readonly xpThreshold: number; // always 100
  readonly percentComplete: number; // earnedXP / xpThreshold
  readonly status: MilestoneStatus;
  readonly completedMissionIds: ReadonlyArray<string>;
}

export interface PlayerProgress {
  readonly playerId: string;
  readonly totalXP: number;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly completedMissionIds: ReadonlyArray<string>;
}

// In-progress admin edit; not yet written to PocketBase.
export interface DraftMission {
  readonly milestoneId: string;
  readonly isDirty: boolean;
  readonly title?: string;
  readonly body?: string;
  readonly type?: MissionType;
  readonly externalUrl?: string;
  readonly difficulty?: number;
  readonly tags?: ReadonlyArray<MissionTag>;
  readonly suggestedDueDate?: string;
  readonly validationMethod?: ValidationMethod;
  readonly isInCurrentMissions?: boolean;
  readonly formFields?: ReadonlyArray<FieldSchema>;
}

// IDs stripped on export; used for template JSON. (C-10)
export interface TemplateRecord {
  readonly name: string;
  readonly exportedAt: string;
}
