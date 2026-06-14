// Phase 1 shell — logic wired in Phase 4.
import type { Player } from "../../types/index.ts";

interface PlayerProfileCardProps {
  readonly player: Player | null;
}

const PlayerProfileCard = (props: PlayerProfileCardProps) => {
  if (!props.player) return null;
  return (
    <div
      className="card"
      data-testid="player-profile-card"
      data-player-id={props.player.id}
    >
      <p
        style={{
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          margin: 0,
        }}
      >
        {props.player.name || "(No name)"}
      </p>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
          margin: "var(--space-1) 0 0",
        }}
      >
        {props.player.role} · {props.player.team}
      </p>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "hsl(var(--color-muted-fg))",
          margin: "var(--space-1) 0 0",
        }}
      >
        Start date: {props.player.startDate}
      </p>
    </div>
  );
};

export default PlayerProfileCard;
