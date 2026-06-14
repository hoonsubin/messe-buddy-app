// All union types and const+keyof patterns from SPECS.md.
// C-12: No TypeScript enums — use const object + keyof union throughout.

export const MISSION_TYPE = {
  TEXT: "text",
  LINK: "link",
  FORM: "form",
} as const;
export type MissionType = (typeof MISSION_TYPE)[keyof typeof MISSION_TYPE];

export const MISSION_TAG = {
  MANDATORY: "mandatory",
  NEEDS_APPROVAL: "needsApproval",
  URGENT: "urgent",
  OVERDUE: "overdue",
} as const;
export type MissionTag = (typeof MISSION_TAG)[keyof typeof MISSION_TAG];

export const VALIDATION_METHOD = {
  GM_APPROVE: "gmApprove",
  SELF_APPROVE: "selfApprove",
  QR: "qr",
} as const;
export type ValidationMethod =
  (typeof VALIDATION_METHOD)[keyof typeof VALIDATION_METHOD];

export const PROGRESS_STATUS = {
  PENDING: "pending",
  PENDING_APPROVAL: "pendingApproval",
  COMPLETED: "completed",
  AUTO_APPROVED: "autoApproved",
} as const;
export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const MILESTONE_STATUS = {
  UPCOMING: "upcoming",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
} as const;
export type MilestoneStatus =
  (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS];

export const RESOURCE_TYPE = {
  GUIDE: "guide",
  VIDEO: "video",
  LINK: "link",
  DOCUMENT: "document",
} as const;
export type ResourceType =
  (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

export const FIELD_TYPE = {
  TEXT: "text",
  TEXTAREA: "textarea",
  SELECT: "select",
  MULTI_SELECT: "multiSelect",
} as const;
export type FieldType = (typeof FIELD_TYPE)[keyof typeof FIELD_TYPE];

export const USER_ROLE = {
  PLAYER: "player",
  GAMEMAKER: "gamemaker",
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
