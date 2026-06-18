import type {
  MissionTag,
  MissionType,
  ProgressStatus,
  ResourceType,
  UserRole,
  ValidationMethod,
} from "./unions.ts";
import type { FieldSchema } from "./value-objects.ts";
import type { PreBoardingCheckItem } from "./ephemeral.ts";

// Base for all PocketBase-persisted records.
export interface PBRecord {
  readonly id: string;
  readonly created: string;
  readonly updated: string;
}

export interface Session extends PBRecord {
  readonly name: string;
  readonly bgImageUrl: string;
  /** Fraction of the background image covered by the node canvas (0–1).
   *  1    = node canvas fills the background exactly.
   *  0.5  = canvas covers 50% of background width/height (25% of area).
   *  0.33 = nodes occupy the center 1/9 of the background — typical for a
   *         venue floor plan where milestones cluster in one wing.
   *  CSS transform applied to the background: scale(1 / mapNodeScale).
   *  Single source of truth: changing this value propagates to both the admin
   *  editor and the player map view. */
  readonly mapNodeScale: number;
  readonly gameMakerId: string; // raw UID string, not a PB relation
  readonly qrSecret?: string; // HMAC key for QR signing (C-16); GM verify only
  readonly preBoardingChecks: ReadonlyArray<PreBoardingCheckItem>;
}

export interface Player extends PBRecord {
  readonly uid: string; // client-generated UUID, unique index
  readonly recoveryKey: string; // 8-char alphanumeric, unique index
  readonly sessionId: string; // relation → sessions
  readonly tutorialComplete: boolean;
  readonly profileComplete: boolean;
  readonly name: string;
  readonly preferredName?: string;
  readonly pronouns?: string;
  readonly avatarUrl?: string; // PB file ref
  readonly role: string; // job title, e.g. "Senior Engineer"
  readonly team: string;
  readonly startDate: string;
  readonly location: string;
  readonly timezone: string;
  readonly skillsConfident: ReadonlyArray<string>;
  readonly skillsDevelop: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly workStyle?: string;
  readonly energizers?: ReadonlyArray<string>;
  readonly drainers?: ReadonlyArray<string>;
}

export interface BuddyProfile extends PBRecord {
  readonly sessionId: string;
  readonly assignedToPlayerId: string;
  readonly name: string;
  readonly role: string; // job title of the buddy
  readonly tenure?: string;
  readonly avatarUrl?: string;
  readonly contactUrl?: string;
  readonly quote?: string; // short personal quote shown on the buddy card
  readonly email?: string;
  readonly phone?: string;
}

export interface Milestone extends PBRecord {
  readonly sessionId: string;
  readonly name: string;
  readonly xPercent: number; // 0–100, percentage of canvas width (C-08)
  readonly yPercent: number; // 0–100, percentage of canvas height (C-08)
  readonly xpThreshold: number; // always 100; stored for clarity
  readonly order: number;
}

export interface Mission extends PBRecord {
  readonly sessionId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly body: string; // markdown
  readonly type: MissionType;
  readonly externalUrl?: string; // only when type = 'link'
  readonly difficulty: number; // 1–5, set by Game Maker
  readonly xpValue: number; // derived by deriveXP, written on save
  readonly tags: ReadonlyArray<MissionTag>;
  readonly suggestedDueDate?: string;
  readonly order: number;
  readonly isInCurrentMissions: boolean;
  readonly validationMethod: ValidationMethod; // default: 'gmApprove'; ignored when type = 'form'
}

export interface FormSchema extends PBRecord {
  readonly missionId: string;
  readonly fields: ReadonlyArray<FieldSchema>; // parsed from PB JSON field by adapter
}

export interface ProgressEvent extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly missionId: string;
  readonly status: ProgressStatus;
  readonly validatedBy?: string; // Game Maker UID
  readonly validatedAt?: string;
  readonly formResponse?: Readonly<Record<string, string>>; // parsed by adapter
}

export interface Resource extends PBRecord {
  readonly sessionId: string;
  readonly title: string;
  readonly description?: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly isVisibleToPlayer: boolean;
}

// Adapter-boundary raw types - only used inside src/adapters/pocketbase/.
// Never imported by components or use cases. (C-13)
export interface FormSchemaRaw extends PBRecord {
  readonly missionId: string;
  readonly fields: string; // JSON.stringify(FieldSchema[])
}

export interface ProgressEventRaw extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly missionId: string;
  readonly status: ProgressStatus;
  readonly validatedBy?: string;
  readonly validatedAt?: string;
  readonly formResponse?: string; // JSON.stringify(Record<fieldId, value>)
}

export interface SessionRole {
  readonly userId: string;
  readonly sessionId: string;
  readonly role: UserRole;
  readonly joinedAt: string;
}
