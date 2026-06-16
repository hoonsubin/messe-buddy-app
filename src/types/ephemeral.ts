import type {
  MilestoneStatus,
  MissionTag,
  MissionType,
  ValidationMethod,
} from "./unions.ts";
import type { FieldSchema } from "./value-objects.ts";

// Pre-boarding checklist item - session-scoped, stored on the Session record.
// Not a separate PB collection.
export interface PreBoardingCheckItem {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly dueDate?: string; // ISO date string or empty
}

// Derived at read time by computeProgress - never persisted. (C-11)

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
export interface DraftMilestone {
  readonly id: string;
  readonly name: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly bgImageUrl?: string;
  readonly isDirty: boolean;
}

// In-progress admin edit; not yet written to PocketBase.
export interface DraftMission {
  readonly milestoneId: string;
  readonly originalId?: string;
  readonly isDirty: boolean;
  readonly title?: string;
  readonly body?: string;
  readonly type?: MissionType;
  readonly externalUrl?: string;
  readonly difficulty?: number;
  readonly xpValue?: number; // direct Fibonacci XP input (1,2,3,5,8,13,21,34)
  readonly tags?: ReadonlyArray<MissionTag>;
  readonly suggestedDueDate?: string;
  readonly validationMethod?: ValidationMethod;
  readonly isInCurrentMissions?: boolean;
  readonly formFields?: ReadonlyArray<FieldSchema>;
}

// IDs stripped on export; used for template JSON. (C-10)
// Alias of TemplateExport without the exportType discriminant - used for
// in-memory display (template list, preview) where the discriminant is already known.
export type TemplateRecord = import("./exports.ts").TemplateExport;
