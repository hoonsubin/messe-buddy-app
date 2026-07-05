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

export const isBuddyDraftComplete = (draft: BuddyPickerDraft): boolean =>
  draft.name.trim() !== "" &&
  draft.email.trim() !== "" &&
  draft.telephone.trim() !== "" &&
  draft.role.trim() !== "";

export const isBuddySelectionValid = (
  value: BuddySelection | null,
): boolean => {
  if (!value) return false;
  if (value.kind === "existing") return value.buddyProfileId !== "";
  return isBuddyDraftComplete(value.draft);
};

export const emptyBuddyPickerDraft = (): BuddyPickerDraft => ({
  name: "",
  email: "",
  telephone: "",
  role: "",
});

export const defaultBuddySelection = (
  options: ReadonlyArray<{ readonly id: string }>,
): BuddySelection =>
  options.length > 0
    ? { kind: "existing", buddyProfileId: options[0].id }
    : { kind: "new", draft: emptyBuddyPickerDraft() };

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
