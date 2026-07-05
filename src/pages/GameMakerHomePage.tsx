import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdAdd, MdArrowBack, MdChevronRight } from "react-icons/md";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { clearActiveUid, useIdentity } from "../hooks/useIdentity.ts";
import { useSessionExists } from "../hooks/useSessionExists.ts";
import { useGmPlayers } from "../hooks/useProgress/gmPlayers.ts";
import type { GmPlayerRow } from "../hooks/useProgress/gmPlayers.ts";
import TopBar from "../components/shared/TopBar.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";

const statusOf = (p: GmPlayerRow): { label: string; colorVar: string } => {
  if (!p.joined) {
    return { label: "Not joined yet", colorVar: "--color-muted-fg" };
  }
  if (p.isStalled) return { label: "Stalled", colorVar: "--color-destructive" };
  if (p.progressPercent < 20) {
    return { label: "Just started", colorVar: "--color-muted-fg" };
  }
  if (p.progressPercent >= 100) {
    return { label: "Complete", colorVar: "--color-status-complete" };
  }
  return { label: "On track", colorVar: "--color-status-complete" };
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
      className="card"
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
      style={{
        padding: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-base)",
              color: "hsl(var(--color-fg))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.name}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              color: `hsl(var(${status.colorVar}))`,
              flexShrink: 0,
            }}
          >
            {status.label}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <div
            role="progressbar"
            aria-valuenow={player.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${player.progressPercent}% complete`}
            style={{
              flex: 1,
              height: "0.5rem",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--color-xp-ring-track))",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${player.progressPercent}%`,
                height: "100%",
                borderRadius: "var(--radius-full)",
                background: player.isStalled
                  ? "hsl(var(--color-destructive))"
                  : "hsl(var(--color-status-progress))",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              minWidth: "2.5rem",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
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

const GameMakerHomePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const navigate = useNavigate();
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sid, USER_ROLE.GAMEMAKER);

  const { players, loading, invitePlayer } = useGmPlayers(sid, true);

  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  // useGmPlayers lists players in this workspace — a stale/deleted
  // the GM's own home session directly, which is the only way to tell the
  // two apart.
  const { checking: checkingSession, missing: sessionMissing } =
    useSessionExists(sid);

  const handleRemoveStaleProfile = useCallback(() => {
    if (identity) removeProfile(identity.uid);
    clearActiveUid();
    navigate("/", { replace: true });
  }, [identity, removeProfile, navigate]);

  const handleCreate = useCallback(
    (name: string) => {
      setCreating(true);
      void invitePlayer(name)
        .then((newPlayerId) => {
          setAdding(false);
          setCreating(false);
          navigate(`/gamemaker/${sid}/player/${newPlayerId}?new=1`);
        })
        .catch(() => setCreating(false));
    },
    [invitePlayer, navigate, sid],
  );

  const visiblePlayers = players;
  const joinedCount = players.filter((p) => p.joined).length;
  const joinedPlayers = players.filter((p) => p.joined);
  const avgProgress = joinedCount > 0
    ? Math.round(
      joinedPlayers.reduce((s, p) => s + p.progressPercent, 0) / joinedCount,
    )
    : 0;
  const stalledCount = joinedPlayers.filter((p) => p.isStalled).length;

  return (
    <div
      data-testid="gamemaker-home-page"
      data-page="gamemaker-home"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        paddingTop: "var(--topbar-h)",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <div
        style={{
          display: "flex",
          padding: "var(--space-2) var(--space-4)",
          background: "hsl(var(--color-card))",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
          onClick={() => {
            clearActiveUid();
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      <main
        style={{
          flex: 1,
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "48rem",
          marginInline: "auto",
          width: "100%",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            marginBottom: "var(--space-5)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
              }}
            >
              Players
            </h1>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {joinedCount} active · {avgProgress}% avg progress
              {stalledCount > 0 ? ` · ${stalledCount} stalled` : ""}
              {visiblePlayers.length > joinedCount
                ? ` · ${visiblePlayers.length - joinedCount} pending`
                : ""}
            </p>
          </div>
          {visiblePlayers.length > 0 && (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="add-player-btn"
              style={{ gap: "var(--space-1)", flexShrink: 0 }}
              onClick={() => setAdding(true)}
            >
              <MdAdd size={18} aria-hidden="true" />
              Add player
            </button>
          )}
        </header>

        {checkingSession ? null : sessionMissing
          ? (
            <div
              className="card"
              style={{
                padding: "var(--space-8) var(--space-6)",
                textAlign: "center",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              <p
                style={{
                  margin: "0 0 var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                This session could not be found. It may have been reset or
                removed — this profile is no longer valid.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleRemoveStaleProfile}
              >
                Remove this profile
              </button>
            </div>
          )
          : loading && players.length === 0
          ? (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-muted-fg))",
                textAlign: "center",
                padding: "var(--space-8) 0",
              }}
            >
              Loading players…
            </p>
          )
          : visiblePlayers.length === 0
          ? (
            <div
              className="card"
              style={{
                padding: "var(--space-8) var(--space-6)",
                textAlign: "center",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              <p
                style={{
                  margin: "0 0 var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                No players yet. Add your first one to start their onboarding.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ gap: "var(--space-1)" }}
                onClick={() => setAdding(true)}
              >
                <MdAdd size={18} aria-hidden="true" />
                Add player
              </button>
            </div>
          )
          : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {visiblePlayers.map((player) => (
                <PlayerCard
                  key={player.playerId}
                  player={player}
                  onOpen={() =>
                    navigate(`/gamemaker/${sid}/player/${player.playerId}`)}
                />
              ))}
            </ul>
          )}
      </main>

      {adding && (
        <NameCaptureModal
          onSubmit={handleCreate}
          loading={creating}
          title="Add a player"
          description="Give this onboarding a name (the player's name works well). You'll pick a template and send them an invite next."
          placeholder="e.g. Sofia Chen"
          submitLabel="Create"
          inputLabel="Player name"
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
};

export default GameMakerHomePage;
