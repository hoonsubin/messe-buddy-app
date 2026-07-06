import type {
  BuddyProfile,
  BuddyProfileDraft,
  BuddySelection,
} from "../../types/index.ts";
import {
  defaultBuddySelection,
  emptyBuddyProfileDraft,
} from "../../types/buddyPicker.ts";
import { useMemo } from "react";
import { cn } from "../../utils/cn.ts";
import SelectCardList from "../shared/SelectCardList.tsx";
import BuddyAssignmentFields from "./BuddyAssignmentFields.tsx";

type BuddyMode = "existing" | "new";

interface BuddyPickerProps {
  readonly sessionId: string;
  readonly options: ReadonlyArray<BuddyProfile>;
  readonly loading: boolean;
  readonly value: BuddySelection | null;
  readonly onChange: (value: BuddySelection) => void;
}

const BuddyPicker = ({
  sessionId,
  options,
  loading,
  value,
  onChange,
}: BuddyPickerProps) => {
  const mode: BuddyMode = value?.kind === "new" ? "new" : "existing";
  const canPickExisting = options.length > 0;

  const setMode = (next: BuddyMode) => {
    if (next === "existing") {
      onChange(defaultBuddySelection(sessionId, options));
      return;
    }
    onChange({
      kind: "new",
      draft: value?.kind === "new"
        ? value.draft
        : emptyBuddyProfileDraft(sessionId),
    });
  };

  const draft: BuddyProfileDraft = value?.kind === "new"
    ? value.draft
    : emptyBuddyProfileDraft(sessionId);

  const buddyItems = useMemo(
    () =>
      options.map((profile) => {
        const contact = [profile.email, profile.phone].filter(Boolean).join(
          " · ",
        );
        return {
          id: profile.id,
          title: profile.name,
          subtitle: profile.role,
          tertiary: contact || undefined,
          testId: `oj-buddy-option-${profile.id}`,
          selected: value?.kind === "existing" &&
            value.buddyProfileId === profile.id,
          onSelect: () =>
            onChange({
              kind: "existing" as const,
              buddyProfileId: profile.id,
            }),
        };
      }),
    [options, value, onChange],
  );

  return (
    <div className="oj-buddy-picker">
      {canPickExisting && (
        <div className="oj-mode-toggle" role="group" aria-label="Buddy source">
          <button
            type="button"
            className={cn(
              "btn",
              mode === "existing" ? "btn--primary" : "btn--secondary",
            )}
            aria-pressed={mode === "existing"}
            onClick={() =>
              setMode("existing")}
          >
            Existing buddy
          </button>
          <button
            type="button"
            className={cn(
              "btn",
              mode === "new" ? "btn--primary" : "btn--secondary",
            )}
            aria-pressed={mode === "new"}
            onClick={() =>
              setMode("new")}
          >
            Add new
          </button>
        </div>
      )}

      {loading && options.length === 0
        ? <p className="oj-buddy-picker__loading">Loading buddies…</p>
        : mode === "existing" && canPickExisting
        ? <SelectCardList ariaLabel="Existing buddy" items={buddyItems} />
        : (
          <BuddyAssignmentFields
            draft={draft}
            onDraftChange={(next) => onChange({ kind: "new", draft: next })}
            idPrefix="oj-buddy-new"
            testIdPrefix="oj-buddy-new"
            autoFocus={mode === "new"}
          />
        )}
    </div>
  );
};

export default BuddyPicker;
