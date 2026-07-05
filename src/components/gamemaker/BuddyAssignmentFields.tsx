import type { BuddyProfileDraft } from "../../types/index.ts";

interface BuddyAssignmentFieldsProps {
  readonly draft: BuddyProfileDraft;
  readonly onDraftChange: (draft: BuddyProfileDraft) => void;
  readonly idPrefix?: string;
  readonly testIdPrefix?: string;
  readonly autoFocus?: boolean;
}

const BuddyAssignmentFields = ({
  draft,
  onDraftChange,
  idPrefix = "buddy",
  testIdPrefix,
  autoFocus,
}: BuddyAssignmentFieldsProps) => {
  const tid = (suffix: string) =>
    testIdPrefix !== undefined ? `${testIdPrefix}-${suffix}` : undefined;

  return (
    <div className="buddy-assignment-fields">
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-name`}>
          Buddy name
        </label>
        <input
          id={`${idPrefix}-name`}
          className="form-input"
          type="text"
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
          placeholder="e.g. Marcus Weber"
          autoFocus={autoFocus}
          {...(tid("name") !== undefined && { "data-testid": tid("name") })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-role`}>
          Role
        </label>
        <input
          id={`${idPrefix}-role`}
          className="form-input"
          type="text"
          value={draft.role}
          onChange={(e) => onDraftChange({ ...draft, role: e.target.value })}
          placeholder="e.g. Senior Product Manager"
          {...(tid("role") !== undefined && { "data-testid": tid("role") })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-email`}>
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          className="form-input"
          type="email"
          value={draft.email ?? ""}
          onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
          placeholder="marcus.weber@messe.de"
          {...(tid("email") !== undefined && { "data-testid": tid("email") })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-phone`}>
          Telephone
        </label>
        <input
          id={`${idPrefix}-phone`}
          className="form-input"
          type="tel"
          value={draft.phone ?? ""}
          onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
          placeholder="+49 89 1234 5678"
          {...(tid("phone") !== undefined && { "data-testid": tid("phone") })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-tenure`}>
          Tenure
        </label>
        <input
          id={`${idPrefix}-tenure`}
          className="form-input"
          type="text"
          value={draft.tenure ?? ""}
          onChange={(e) => onDraftChange({ ...draft, tenure: e.target.value })}
          placeholder="e.g. 4 years at Messe München"
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-contact`}>
          Contact URL
        </label>
        <input
          id={`${idPrefix}-contact`}
          className="form-input"
          type="url"
          value={draft.contactUrl ?? ""}
          onChange={(e) =>
            onDraftChange({ ...draft, contactUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  );
};

export default BuddyAssignmentFields;
