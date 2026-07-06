import type {
  BuddyProfile,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Session,
} from "./domain.ts";
import type { FormSchema } from "./domain.ts";
import type { FieldSchema } from "./value-objects.ts";

/**
 * A mission as it appears inside a portable template file. Nested directly
 * under its milestone — no id, no order (position in the array is the order),
 * no milestoneId (nesting is the relationship). `formFields` is only present
 * when `type: "form"`; every other mission omits the key entirely.
 */
export type TemplateMission =
  & Omit<
    Mission,
    keyof PBRecord | "sessionId" | "playerId" | "milestoneId" | "order"
  >
  & { readonly formFields?: ReadonlyArray<FieldSchema> };

/**
 * A milestone as it appears inside a portable template file. `missions` is
 * the ordered list of missions belonging to it; `resources` is an optional
 * list of shared-library resourceKeys to attach (e.g. "campus_map", "wenet").
 */
export type TemplateMilestone =
  & Omit<Milestone, keyof PBRecord | "sessionId" | "playerId" | "order">
  & {
    readonly missions: ReadonlyArray<TemplateMission>;
    readonly resources?: ReadonlyArray<string>;
  };

/**
 * A hand-authorable, portable onboarding template: a tree of milestones,
 * each carrying its own missions, each form mission carrying its own fields.
 * No numeric cross-references between arrays — nesting expresses every
 * relationship, so importing never has to reconstruct a foreign key.
 */
export interface TemplateExport {
  readonly exportType: "template";
  readonly exportedAt: string;
  readonly name: string;
  readonly tags?: string;
  readonly milestones: ReadonlyArray<TemplateMilestone>;
}

export interface FullSessionExport {
  readonly exportType: "full";
  readonly exportedAt: string;
  readonly session: Omit<Session, keyof PBRecord>;
  readonly milestones: ReadonlyArray<Omit<Milestone, keyof PBRecord>>;
  readonly missions: ReadonlyArray<Omit<Mission, keyof PBRecord>>;
  readonly formSchemas: ReadonlyArray<Omit<FormSchema, keyof PBRecord>>;
  readonly libraryResources: ReadonlyArray<
    Omit<LibraryResource, keyof PBRecord>
  >;
  readonly milestoneResources: ReadonlyArray<
    Omit<MilestoneResource, keyof PBRecord>
  >;
  readonly players: ReadonlyArray<Omit<Player, keyof PBRecord>>;
  readonly progressEvents: ReadonlyArray<Omit<ProgressEvent, keyof PBRecord>>;
  readonly buddyProfiles: ReadonlyArray<Omit<BuddyProfile, keyof PBRecord>>;
}
