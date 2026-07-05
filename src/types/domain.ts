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
  readonly mapNodeScale: number;
  readonly gameMakerId: string;
  readonly gmRecoveryKey: string;
  readonly qrSecret?: string;
  readonly preBoardingChecks: ReadonlyArray<PreBoardingCheckItem>;
}

export type ClaimStatus = "invited" | "claimed";

export interface Player extends PBRecord {
  readonly uid?: string;
  readonly recoveryKey?: string;
  readonly sessionId: string;
  readonly inviteToken: string;
  readonly claimStatus: ClaimStatus;
  readonly tutorialComplete: boolean;
  readonly profileComplete: boolean;
  readonly name: string;
  readonly preferredName?: string;
  readonly pronouns?: string;
  readonly avatarUrl?: string;
  readonly jobTitle: string;
  readonly department?: string;
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
  readonly playerId: string;
  readonly name: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly xpThreshold: number;
  readonly order: number;
}

export interface Mission extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly body: string; // markdown
  readonly type: MissionType;
  readonly externalUrl?: string; // only when type = 'link'
  readonly xpValue: number; // set by Game Maker; awarded on validation
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

export interface LibraryResource extends PBRecord {
  readonly resourceKey: string;
  readonly title: string;
  readonly description?: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly tags?: string;
}

export interface MilestoneResource extends PBRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly milestoneId: string;
  readonly libraryResourceId: string;
  readonly isVisibleToPlayer: boolean;
}

/** Resolved row for UI — library fields plus attachment visibility. */
export interface Resource extends LibraryResource {
  readonly isVisibleToPlayer: boolean;
  readonly milestoneId?: string;
  readonly playerId?: string;
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
