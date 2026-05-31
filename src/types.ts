// ─── Domain types ────────────────────────────────────────────────────────────

export type UserRole = "player" | "gamemaker";
export type MissionType = "text" | "link" | "form";
export type MissionTag = "mandatory" | "needsApproval" | "urgent" | "overdue";
export type ProgressStatus = "pending" | "completed" | "autoApproved";
export type MilestoneStatus =
  | "completed"
  | "inProgress"
  | "upcoming"
  | "locked";
export type ResourceType = "guide" | "video" | "link" | "document";

export interface TutorialStep {
  title: string;
  body: string;
}

export interface Session {
  id: string;
  name: string;
  gameMakerId: string;
}

export interface Milestone {
  id: string;
  sessionId: string;
  name: string;
  subtitle: string;
  xPercent: number; // 0-100, position on map canvas
  yPercent: number; // 0-100
  order: number;
  status: MilestoneStatus;
  earnedXP: number;
  xpThreshold: number;
}

export interface Mission {
  id: string;
  milestoneId: string;
  title: string;
  body: string;
  type: MissionType;
  difficulty: number; // 1–5
  xpValue: number;
  tags: MissionTag[];
  isInCurrentMissions: boolean;
  externalUrl?: string;
  suggestedDueDate?: string;
}

export interface ProgressEvent {
  id: string;
  playerId: string;
  missionId: string;
  status: ProgressStatus;
  validatedAt?: string;
}

export interface Player {
  id: string;
  name: string;
  preferredName?: string;
  jobTitle: string;
  team: string;
  startDate: string;
  location: string;
  totalXP: number;
  profileComplete: boolean;
  tutorialComplete: boolean;
  pronouns?: string;
}

export interface BuddyProfile {
  id: string;
  name: string;
  role: string;
  tenure?: string;
  avatarUrl?: string;
  contactUrl?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  isVisibleToPlayer: boolean;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type NavPage =
  | { name: "landing" }
  | { name: "playerCockpit"; sessionId: string; playerId: string }
  | { name: "adminCockpit"; sessionId: string }
  | { name: "playerList"; sessionId: string }
  | { name: "playerDetail"; sessionId: string; playerId: string }
  | { name: "qrScanner"; sessionId: string }
  | {
    name: "formPage";
    missionId: string;
    sessionId: string;
    playerId: string;
  };

export type Navigate = (page: NavPage) => void;
