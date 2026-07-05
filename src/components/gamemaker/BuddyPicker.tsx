import type {
  BuddyProfile,
  BuddyProfileDraft,
  BuddySelection,
} from "../../types/index.ts";
import {
  defaultBuddySelection,
  emptyBuddyProfileDraft,
} from "../../types/buddyPicker.ts";
import { cn } from "../../utils/cn.ts";
import SelectCard from "../patterns/SelectCard.tsx";
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
            onClick={() => setMode("existing")}
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
            onClick={() => setMode("new")}
          >
            Add new
          </button>
        </div>
      )}

      {loading && options.length === 0
        ? <p className="oj-buddy-picker__loading">Loading buddies…</p>
        : mode === "existing" && canPickExisting
        ? (
          <div
            className="select-card-list"
            role="radiogroup"
            aria-label="Existing buddy"
          >
            {options.map((profile) => {
              const selected = value?.kind === "existing" &&
                value.buddyProfileId === profile.id;
              const contact = [profile.email, profile.phone].filter(Boolean).join(
                " · ",
              );
              return (
                <SelectCard
                  key={profile.id}
                  selected={selected}
                  testId={`oj-buddy-option-${profile.id}`}
                  title={profile.name}
                  subtitle={profile.role}
                  tertiary={contact || undefined}
                  onSelect={() =>
                    onChange({
                      kind: "existing",
                      buddyProfileId: profile.id,
                    })}
                />
              );
            })}
          </div>
        )
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
