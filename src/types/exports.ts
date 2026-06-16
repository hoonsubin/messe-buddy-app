import type {
  BuddyProfile,
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Resource,
  Session,
} from "./domain.ts";

// Template export - structure only, no player data. (C-10)
//
// _milestoneOrder / _missionOrder are import-remapping keys added during export.
// They let importTemplate reconstruct FK references after PB IDs are stripped.
// Consumers reading templates for display purposes can ignore these fields.
export interface TemplateExport {
  readonly exportType: "template";
  readonly exportedAt: string;
  readonly name: string;
  readonly milestones: ReadonlyArray<Omit<Milestone, keyof PBRecord>>;
  readonly missions: ReadonlyArray<
    Omit<Mission, keyof PBRecord> & { readonly _milestoneOrder: number }
  >;
  readonly formSchemas: ReadonlyArray<
    Omit<FormSchema, keyof PBRecord> & { readonly _missionOrder: number }
  >;
  readonly resources: ReadonlyArray<Omit<Resource, keyof PBRecord>>;
}

// Full session export - includes all player runtime data.
export interface FullSessionExport {
  readonly exportType: "full";
  readonly exportedAt: string;
  readonly session: Omit<Session, keyof PBRecord>;
  readonly milestones: ReadonlyArray<Omit<Milestone, keyof PBRecord>>;
  readonly missions: ReadonlyArray<Omit<Mission, keyof PBRecord>>;
  readonly formSchemas: ReadonlyArray<Omit<FormSchema, keyof PBRecord>>;
  readonly resources: ReadonlyArray<Omit<Resource, keyof PBRecord>>;
  readonly players: ReadonlyArray<Omit<Player, keyof PBRecord>>;
  readonly progressEvents: ReadonlyArray<Omit<ProgressEvent, keyof PBRecord>>;
  readonly buddyProfiles: ReadonlyArray<Omit<BuddyProfile, keyof PBRecord>>;
}
