// Phase 1 shell - logic wired in Phase 4.
import { MdPeople } from "react-icons/md";
import type { BuddyProfile, PBRecord, Player } from "../../types/index.ts";

interface BuddyAssignmentFormProps {
  readonly players: ReadonlyArray<Player>;
  readonly draft: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">;
  readonly selectedPlayerId: string;
  readonly onPlayerChange: (playerId: string) => void;
  readonly onDraftChange: (
    draft: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">,
  ) => void;
  readonly onSave: () => void;
  /** Hide the "Assign to player" dropdown when the player is already fixed. */
  readonly showPlayerSelect?: boolean;
}

const BuddyAssignmentForm = (props: BuddyAssignmentFormProps) => (
  <div
    className="card"
    style={{
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
    }}
  >
    <header
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      <MdPeople
        size={18}
        aria-hidden="true"
        style={{ color: "hsl(var(--color-accent))", flexShrink: 0 }}
      />
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-fg))",
        }}
      >
        Assign Buddy
      </h3>
    </header>
    <form
      data-testid="buddy-assignment-form"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {(props.showPlayerSelect ?? true) && (
        <div className="form-field">
          <label className="form-label" htmlFor="buddy-player-select">
            Assign to player
          </label>
          <select
            id="buddy-player-select"
            className="form-input"
            value={props.selectedPlayerId}
            onChange={(e) => props.onPlayerChange(e.target.value)}
          >
            <option value="">- select player -</option>
            {props.players.map((p) => (
              <option key={p.id} value={p.id}>{p.name || p.id}</option>
            ))}
          </select>
        </div>
      )}
      <div className="form-field">
        <label className="form-label" htmlFor="buddy-name">Buddy name</label>
        <input
          id="buddy-name"
          className="form-input"
          type="text"
          value={props.draft.name}
          onChange={(e) =>
            props.onDraftChange({ ...props.draft, name: e.target.value })}
          placeholder="e.g. Marcus Weber"
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="buddy-role">Role</label>
        <input
          id="buddy-role"
          className="form-input"
          type="text"
          value={props.draft.role}
          onChange={(e) =>
            props.onDraftChange({ ...props.draft, role: e.target.value })}
          placeholder="e.g. Senior Product Manager"
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="buddy-tenure">Tenure</label>
        <input
          id="buddy-tenure"
          className="form-input"
          type="text"
          value={props.draft.tenure}
          onChange={(e) =>
            props.onDraftChange({ ...props.draft, tenure: e.target.value })}
          placeholder="e.g. 4 years at Messe München"
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="buddy-contact">
          Contact URL
        </label>
        <input
          id="buddy-contact"
          className="form-input"
          type="url"
          value={props.draft.contactUrl}
          onChange={(e) =>
            props.onDraftChange({ ...props.draft, contactUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <button type="submit" className="btn btn--primary">
        Save buddy assignment
      </button>
    </form>
  </div>
);

export default BuddyAssignmentForm;
