import type { BuddyProfile } from "./domain.ts";

/** Wizard step 2 — new buddy form (UI field names). */
export interface BuddyPickerDraft {
  readonly name: string;
  readonly email: string;
  readonly telephone: string;
  readonly role: string;
}

export type BuddySelection =
  | { readonly kind: "new"; readonly draft: BuddyPickerDraft }
  | { readonly kind: "existing"; readonly buddyProfileId: string };

export const buddyPickerDraftToProfileFields = (
  sessionId: string,
  draft: BuddyPickerDraft,
): Omit<BuddyProfile, "id" | "created" | "updated" | "assignedToPlayerId"> => ({
  sessionId,
  name: draft.name.trim(),
  role: draft.role.trim(),
  email: draft.email.trim(),
  phone: draft.telephone.trim(),
});
