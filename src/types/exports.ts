import type {
  BuddyProfile,
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Session,
} from "./domain.ts";

export interface TemplateResourceBinding {
  readonly milestoneOrder: number;
  readonly resourceKey: string;
}

export type TemplateMilestone = Omit<
  Milestone,
  keyof PBRecord | "sessionId" | "playerId"
>;

export type TemplateMission = Omit<
  Mission,
  keyof PBRecord | "sessionId" | "playerId" | "milestoneId"
> & { readonly _milestoneOrder: number };

export type TemplateFormSchema = Omit<
  FormSchema,
  keyof PBRecord | "missionId"
> & { readonly _missionOrder: number };

export interface TemplateExport {
  readonly exportType: "template";
  readonly exportedAt: string;
  readonly name: string;
  readonly tags?: string;
  readonly milestones: ReadonlyArray<TemplateMilestone>;
  readonly missions: ReadonlyArray<TemplateMission>;
  readonly formSchemas: ReadonlyArray<TemplateFormSchema>;
  readonly resourceBindings: ReadonlyArray<TemplateResourceBinding>;
}

export interface FullSessionExport {
  readonly exportType: "full";
  readonly exportedAt: string;
  readonly session: Omit<Session, keyof PBRecord>;
  readonly milestones: ReadonlyArray<Omit<Milestone, keyof PBRecord>>;
  readonly missions: ReadonlyArray<Omit<Mission, keyof PBRecord>>;
  readonly formSchemas: ReadonlyArray<Omit<FormSchema, keyof PBRecord>>;
  readonly libraryResources: ReadonlyArray<Omit<LibraryResource, keyof PBRecord>>;
  readonly milestoneResources: ReadonlyArray<
    Omit<MilestoneResource, keyof PBRecord>
  >;
  readonly players: ReadonlyArray<Omit<Player, keyof PBRecord>>;
  readonly progressEvents: ReadonlyArray<Omit<ProgressEvent, keyof PBRecord>>;
  readonly buddyProfiles: ReadonlyArray<Omit<BuddyProfile, keyof PBRecord>>;
}
