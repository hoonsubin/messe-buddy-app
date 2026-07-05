import { MdAdd, MdChevronRight } from "react-icons/md";
import type { GmPlayerRow } from "../../hooks/useProgress/gmPlayers.ts";

const statusOf = (p: GmPlayerRow): { label: string; className: string } => {
  if (!p.joined) {
    return { label: "Not joined yet", className: "gm-home__status--muted" };
  }
  if (p.isStalled) {
    return { label: "Stalled", className: "gm-home__status--stalled" };
  }
  if (p.progressPercent < 20) {
    return { label: "Just started", className: "gm-home__status--muted" };
  }
  if (p.progressPercent >= 100) {
    return { label: "Complete", className: "gm-home__status--complete" };
  }
  return { label: "On track", className: "gm-home__status--complete" };
};

const PlayerCard = (
  { player, onOpen }: {
    readonly player: GmPlayerRow;
    readonly onOpen: () => void;
  },
) => {
  const status = statusOf(player);
  return (
    <li
      className="card gm-home__player-card"
      role="button"
      tabIndex={0}
      data-testid="gm-player-card"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="gm-home__player-card-main">
        <div className="gm-home__player-card-head">
          <span className="gm-home__player-name">{player.name}</span>
          <span className={`gm-home__status ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className="gm-home__player-progress">
          <div
            className={`progress-bar gm-home__progress-bar${
              player.isStalled ? " gm-home__progress-bar--stalled" : ""
            }`}
            role="progressbar"
            aria-valuenow={player.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${player.progressPercent}% complete`}
          >
            <div
              className="progress-bar__fill"
              style={{ width: `${player.progressPercent}%` }}
            />
          </div>
          <span className="gm-home__progress-pct">
            {player.progressPercent}%
          </span>
        </div>
      </div>
      <MdChevronRight
        size={22}
        aria-hidden="true"
        className="core-icon-muted"
      />
    </li>
  );
};

interface GmPlayersTabProps {
  readonly players: ReadonlyArray<GmPlayerRow>;
  readonly loading: boolean;
  readonly checkingSession: boolean;
  readonly sessionMissing: boolean;
  readonly joinedCount: number;
  readonly avgProgress: number;
  readonly stalledCount: number;
  readonly pendingCount: number;
  readonly onAdd: () => void;
  readonly onOpenPlayer: (playerId: string) => void;
  readonly onRemoveStaleProfile: () => void;
}

const GmPlayersTab = ({
  players,
  loading,
  checkingSession,
  sessionMissing,
  joinedCount,
  avgProgress,
  stalledCount,
  pendingCount,
  onAdd,
  onOpenPlayer,
  onRemoveStaleProfile,
}: GmPlayersTabProps) => (
  <div className="gm-home__tab-panel" data-testid="gm-players-tab">
    <header className="gm-home__header">
      <div>
        <h1 className="gm-home__title">Players</h1>
        <p className="gm-home__subtitle">
          {joinedCount} active · {avgProgress}% avg progress
          {stalledCount > 0 ? ` · ${stalledCount} stalled` : ""}
          {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
        </p>
      </div>
      {players.length > 0 && (
        <button
          type="button"
          className="btn btn--primary gm-home__header-btn"
          data-testid="new-onboarding-journey-btn"
          onClick={onAdd}
        >
          <MdAdd size={18} aria-hidden="true" />
          New onboarding journey
        </button>
      )}
    </header>

    {checkingSession
      ? null
      : sessionMissing
      ? (
        <div className="card gm-home__empty">
          <p className="gm-home__empty-text">
            This session could not be found. It may have been reset or removed —
            this profile is no longer valid.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRemoveStaleProfile}
          >
            Remove this profile
          </button>
        </div>
      )
      : loading && players.length === 0
      ? <p className="gm-home__loading">Loading players…</p>
      : players.length === 0
      ? (
        <div className="card gm-home__empty">
          <p className="gm-home__empty-text">
            No players yet. Start your first onboarding journey to invite someone.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="new-onboarding-journey-btn"
            onClick={onAdd}
          >
            <MdAdd size={18} aria-hidden="true" />
            New onboarding journey
          </button>
        </div>
      )
      : (
        <ul className="gm-home__player-list">
          {players.map((player) => (
            <PlayerCard
              key={player.playerId}
              player={player}
              onOpen={() => onOpenPlayer(player.playerId)}
            />
          ))}
        </ul>
      )}
  </div>
);

export default GmPlayersTab;
