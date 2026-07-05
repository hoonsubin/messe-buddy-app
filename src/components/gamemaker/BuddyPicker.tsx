import type {
  BuddyPickerDraft,
  BuddyProfile,
  BuddySelection,
} from "../../types/index.ts";
import {
  defaultBuddySelection,
  emptyBuddyPickerDraft,
} from "../../types/buddyPicker.ts";
import { cn } from "../../utils/cn.ts";
import { Input } from "../ui/Input.tsx";
import OjSelectCard from "./OjSelectCard.tsx";

type BuddyMode = "existing" | "new";

interface BuddyPickerProps {
  readonly options: ReadonlyArray<BuddyProfile>;
  readonly loading: boolean;
  readonly value: BuddySelection | null;
  readonly onChange: (value: BuddySelection) => void;
}

const BuddyPicker = ({
  options,
  loading,
  value,
  onChange,
}: BuddyPickerProps) => {
  const mode: BuddyMode = value?.kind === "new" ? "new" : "existing";
  const canPickExisting = options.length > 0;

  const setMode = (next: BuddyMode) => {
    if (next === "existing") {
      onChange(defaultBuddySelection(options));
      return;
    }
    onChange({
      kind: "new",
      draft: value?.kind === "new" ? value.draft : emptyBuddyPickerDraft(),
    });
  };

  const draft: BuddyPickerDraft = value?.kind === "new"
    ? value.draft
    : emptyBuddyPickerDraft();

  const updateDraft = (patch: Partial<BuddyPickerDraft>) => {
    onChange({ kind: "new", draft: { ...draft, ...patch } });
  };

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
            className="oj-select-list"
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
                <OjSelectCard
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
          <div className="oj-buddy-picker__form">
            <div className="form-field">
              <label className="form-label" htmlFor="oj-buddy-new-name">
                Name
              </label>
              <Input
                id="oj-buddy-new-name"
                type="text"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="e.g. Marcus Weber"
                autoFocus={mode === "new"}
                data-testid="oj-buddy-new-name"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="oj-buddy-new-email">
                Email
              </label>
              <Input
                id="oj-buddy-new-email"
                type="email"
                value={draft.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                placeholder="marcus.weber@messe.de"
                data-testid="oj-buddy-new-email"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="oj-buddy-new-telephone">
                Telephone
              </label>
              <Input
                id="oj-buddy-new-telephone"
                type="tel"
                value={draft.telephone}
                onChange={(e) => updateDraft({ telephone: e.target.value })}
                placeholder="+49 89 1234 5678"
                data-testid="oj-buddy-new-telephone"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="oj-buddy-new-role">
                Role
              </label>
              <Input
                id="oj-buddy-new-role"
                type="text"
                value={draft.role}
                onChange={(e) => updateDraft({ role: e.target.value })}
                placeholder="e.g. Senior Product Manager"
                data-testid="oj-buddy-new-role"
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default BuddyPicker;
