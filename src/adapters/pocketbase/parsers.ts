import type PocketBase from "pocketbase";
import type { RecordModel } from "pocketbase";
import type {
  BuddyProfile,
  FormSchema,
  Milestone,
  Mission,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../../types/index.ts";
import type {
  MissionTag,
  MissionType,
  ProgressStatus,
  ResourceType,
  ValidationMethod,
} from "../../types/unions.ts";
import type { FieldSchema } from "../../types/value-objects.ts";
import type { PreBoardingCheckItem } from "../../types/ephemeral.ts";

export const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

export const resolveFileUrl = (
  pb: PocketBase,
  record: RecordModel,
  field: string,
): string | undefined => {
  const filename = record[field];
  if (typeof filename !== "string" || filename === "") return undefined;
  return pb.files.getURL(record, filename);
};

const pbRecord = (raw: RecordModel) => ({
  id: raw.id,
  created: raw.created,
  updated: raw.updated,
});

export const marshalSession = (pb: PocketBase, raw: RecordModel): Session => ({
  ...pbRecord(raw),
  name: String(raw.name ?? ""),
  bgImageUrl: resolveFileUrl(pb, raw, "bgImageUrl") ?? "",
  mapNodeScale: typeof raw.mapNodeScale === "number" ? raw.mapNodeScale : 0.33,
  gameMakerId: String(raw.gameMakerId ?? ""),
  qrSecret: raw.qrSecret ? String(raw.qrSecret) : undefined,
  preBoardingChecks: parseJsonField<ReadonlyArray<PreBoardingCheckItem>>(
    raw.preBoardingChecks,
    [],
  ),
});

export const marshalPlayer = (pb: PocketBase, raw: RecordModel): Player => ({
  ...pbRecord(raw),
  uid: String(raw.uid ?? ""),
  recoveryKey: String(raw.recoveryKey ?? ""),
  sessionId: String(raw.sessionId ?? ""),
  tutorialComplete: Boolean(raw.tutorialComplete),
  profileComplete: Boolean(raw.profileComplete),
  name: String(raw.name ?? ""),
  preferredName: raw.preferredName ? String(raw.preferredName) : undefined,
  pronouns: raw.pronouns ? String(raw.pronouns) : undefined,
  avatarUrl: resolveFileUrl(pb, raw, "avatarUrl"),
  role: String(raw.role ?? ""),
  team: String(raw.team ?? ""),
  startDate: String(raw.startDate ?? ""),
  location: String(raw.location ?? ""),
  timezone: String(raw.timezone ?? ""),
  skillsConfident: parseJsonField<ReadonlyArray<string>>(
    raw.skillsConfident,
    [],
  ),
  skillsDevelop: parseJsonField<ReadonlyArray<string>>(raw.skillsDevelop, []),
  languages: parseJsonField<ReadonlyArray<string>>(raw.languages, []),
  workStyle: raw.workStyle ? String(raw.workStyle) : undefined,
  energizers: parseJsonField<ReadonlyArray<string>>(raw.energizers, []),
  drainers: parseJsonField<ReadonlyArray<string>>(raw.drainers, []),
});

export const marshalMilestone = (raw: RecordModel): Milestone => ({
  ...pbRecord(raw),
  sessionId: String(raw.sessionId ?? ""),
  name: String(raw.name ?? ""),
  xPercent: Number(raw.xPercent ?? 0),
  yPercent: Number(raw.yPercent ?? 0),
  xpThreshold: Number(raw.xpThreshold ?? 100),
  order: Number(raw.order ?? 0),
});

export const marshalMission = (raw: RecordModel): Mission => ({
  ...pbRecord(raw),
  sessionId: String(raw.sessionId ?? ""),
  milestoneId: String(raw.milestoneId ?? ""),
  title: String(raw.title ?? ""),
  body: String(raw.body ?? ""),
  type: String(raw.type ?? "text") as MissionType,
  externalUrl: raw.externalUrl ? String(raw.externalUrl) : undefined,
  difficulty: Number(raw.difficulty ?? 1),
  xpValue: Number(raw.xpValue ?? 0),
  tags: parseJsonField<ReadonlyArray<MissionTag>>(raw.tags, []),
  suggestedDueDate: raw.suggestedDueDate
    ? String(raw.suggestedDueDate)
    : undefined,
  order: Number(raw.order ?? 0),
  isInCurrentMissions: Boolean(raw.isInCurrentMissions),
  validationMethod: String(
    raw.validationMethod ?? "gmApprove",
  ) as ValidationMethod,
});

export const marshalFormSchema = (raw: RecordModel): FormSchema => ({
  ...pbRecord(raw),
  missionId: String(raw.missionId ?? ""),
  fields: parseJsonField<ReadonlyArray<FieldSchema>>(raw.fields, []),
});

export const marshalProgressEvent = (raw: RecordModel): ProgressEvent => ({
  ...pbRecord(raw),
  sessionId: String(raw.sessionId ?? ""),
  playerId: String(raw.playerId ?? ""),
  missionId: String(raw.missionId ?? ""),
  status: String(raw.status ?? "pending") as ProgressStatus,
  validatedBy: raw.validatedBy ? String(raw.validatedBy) : undefined,
  validatedAt: raw.validatedAt ? String(raw.validatedAt) : undefined,
  formResponse: raw.formResponse
    ? parseJsonField<Readonly<Record<string, string>>>(raw.formResponse, {})
    : undefined,
});

export const marshalBuddyProfile = (
  pb: PocketBase,
  raw: RecordModel,
): BuddyProfile => ({
  ...pbRecord(raw),
  sessionId: String(raw.sessionId ?? ""),
  assignedToPlayerId: String(raw.assignedToPlayerId ?? ""),
  name: String(raw.name ?? ""),
  role: String(raw.role ?? ""),
  tenure: raw.tenure ? String(raw.tenure) : undefined,
  avatarUrl: resolveFileUrl(pb, raw, "avatarUrl"),
  contactUrl: raw.contactUrl ? String(raw.contactUrl) : undefined,
  quote: raw.quote ? String(raw.quote) : undefined,
  email: raw.email ? String(raw.email) : undefined,
  phone: raw.phone ? String(raw.phone) : undefined,
});

export const marshalResource = (raw: RecordModel): Resource => ({
  ...pbRecord(raw),
  sessionId: String(raw.sessionId ?? ""),
  title: String(raw.title ?? ""),
  description: raw.description ? String(raw.description) : undefined,
  type: String(raw.type ?? "link") as ResourceType,
  url: String(raw.url ?? ""),
  isVisibleToPlayer: Boolean(raw.isVisibleToPlayer),
});

export const marshalTemplate = (raw: RecordModel): TemplateExport =>
  parseJsonField<TemplateExport>(raw.data, {
    exportType: "template",
    exportedAt: raw.created ?? new Date().toISOString(),
    name: String(raw.name ?? ""),
    milestones: [],
    missions: [],
    formSchemas: [],
    resources: [],
  });
