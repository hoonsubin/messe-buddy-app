import type { ResourceType } from "./index.ts";

export interface AddResourceInput {
  readonly title: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly isVisibleToPlayer: boolean;
  readonly milestoneId?: string;
  readonly description?: string;
}

export interface LibraryResourceInput {
  readonly title: string;
  readonly url: string;
  readonly description?: string;
  readonly tags: ReadonlyArray<string>;
}

export type LibraryResourcePatch = Partial<LibraryResourceInput>;
