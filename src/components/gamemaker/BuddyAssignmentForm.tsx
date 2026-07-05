import { MdPeople } from "react-icons/md";
import type { BuddyProfileDraft, Player } from "../../types/index.ts";
import BuddyAssignmentFields from "./BuddyAssignmentFields.tsx";

interface BuddyAssignmentFormProps {
  readonly players: ReadonlyArray<Player>;
  readonly draft: BuddyProfileDraft;
  readonly selectedPlayerId: string;
  readonly onPlayerChange: (playerId: string) => void;
  readonly onDraftChange: (draft: BuddyProfileDraft) => void;
  readonly onSave: () => void;
  /** Hide the "Assign to player" dropdown when the player is already fixed. */
  readonly showPlayerSelect?: boolean;
}

const BuddyAssignmentForm = (props: BuddyAssignmentFormProps) => (
  <div className="card buddy-assignment-form">
    <header className="buddy-assignment-form__header">
      <MdPeople
        size={18}
        aria-hidden="true"
        className="core-icon-accent"
      />
      <h3 className="buddy-assignment-form__title">Assign Buddy</h3>
    </header>
    <form
      data-testid="buddy-assignment-form"
      className="buddy-assignment-form__body"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave();
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
      <BuddyAssignmentFields
        draft={props.draft}
        onDraftChange={props.onDraftChange}
      />
      <button
        type="submit"
        className="btn btn--primary"
        disabled={!props.selectedPlayerId}
      >
        Save buddy assignment
      </button>
    </form>
  </div>
);

export default BuddyAssignmentForm;
