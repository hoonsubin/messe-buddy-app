import type { Player } from "../../types/index.ts";

interface PlayerSelectorDropdownProps {
  readonly players: ReadonlyArray<Player>;
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}

const PlayerSelectorDropdown = (props: PlayerSelectorDropdownProps) => (
  <div data-testid="player-selector-dropdown">
    <label htmlFor="player-select" className="form-label">
      Player
    </label>
    <select
      id="player-select"
      className="form-input"
      value={props.selectedId}
      onChange={(e) => props.onSelect(e.target.value)}
    >
      <option value="">Select a player…</option>
      {props.players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name || p.uid}
        </option>
      ))}
    </select>
  </div>
);

export default PlayerSelectorDropdown;
