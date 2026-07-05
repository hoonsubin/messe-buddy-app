import type { BuddyProfile } from "./domain.ts";

/** Shared buddy draft — wizard “Add new” and Assign Buddy tab. */
export type BuddyProfileDraft = Omit<
  BuddyProfile,
  "id" | "created" | "updated" | "assignedToPlayerId"
>;

export type BuddySelection =
  | { readonly kind: "new"; readonly draft: BuddyProfileDraft }
  | { readonly kind: "existing"; readonly buddyProfileId: string };

export const emptyBuddyProfileDraft = (
  sessionId: string,
): BuddyProfileDraft => ({
  sessionId,
  name: "",
  role: "",
  email: "",
  phone: "",
  tenure: "",
  contactUrl: "",
});

export const isBuddyDraftComplete = (draft: BuddyProfileDraft): boolean =>
  draft.name.trim() !== "" &&
  (draft.email?.trim() ?? "") !== "" &&
  (draft.phone?.trim() ?? "") !== "" &&
  draft.role.trim() !== "";

export const isBuddySelectionValid = (
  value: BuddySelection | null,
): boolean => {
  if (!value) return false;
  if (value.kind === "existing") return value.buddyProfileId !== "";
  return isBuddyDraftComplete(value.draft);
};

export const defaultBuddySelection = (
  sessionId: string,
  options: ReadonlyArray<{ readonly id: string }>,
): BuddySelection =>
  options.length > 0
    ? { kind: "existing", buddyProfileId: options[0].id }
    : { kind: "new", draft: emptyBuddyProfileDraft(sessionId) };

export const buddyDraftToProfileFields = (
  draft: BuddyProfileDraft,
): BuddyProfileDraft => ({
  sessionId: draft.sessionId,
  name: draft.name.trim(),
  role: draft.role.trim(),
  email: draft.email?.trim() ?? "",
  phone: draft.phone?.trim() ?? "",
  tenure: draft.tenure?.trim() || undefined,
  contactUrl: draft.contactUrl?.trim() || undefined,
  quote: draft.quote,
  avatarUrl: draft.avatarUrl,
});
