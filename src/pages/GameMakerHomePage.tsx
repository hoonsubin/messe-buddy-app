import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { clearActiveUid, useIdentity } from "../hooks/useIdentity.ts";
import { useSessionExists } from "../hooks/useSessionExists.ts";
import { useGmPlayers } from "../hooks/useProgress/gmPlayers.ts";
import TopBar from "../components/shared/TopBar.tsx";
import RouteTabBar from "../components/shared/RouteTabBar.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";
import GmPlayersTab from "../components/gamemaker/GmPlayersTab.tsx";
import ResourceLibraryTab from "../components/gamemaker/ResourceLibraryTab.tsx";
import {
  GM_HOME_TABS,
  type GmHomeTabKey,
} from "../components/gamemaker/gmHomeConstants.ts";

const GameMakerHomePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const navigate = useNavigate();
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sid, USER_ROLE.GAMEMAKER);

  const { players, loading, invitePlayer } = useGmPlayers(sid, true);
  const { checking: checkingSession, missing: sessionMissing } =
    useSessionExists(sid);

  const [tab, setTab] = useState<GmHomeTabKey>("players");
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const joinedCount = players.filter((p) => p.joined).length;
  const joinedPlayers = players.filter((p) => p.joined);
  const avgProgress = joinedCount > 0
    ? Math.round(
      joinedPlayers.reduce((s, p) => s + p.progressPercent, 0) / joinedCount,
    )
    : 0;
  const stalledCount = joinedPlayers.filter((p) => p.isStalled).length;
  const pendingCount = players.length - joinedCount;

  return (
    <div
      className="gm-home"
      data-testid="gamemaker-home-page"
      data-page="gamemaker-home"
    >
      <TopBar
        playerName={identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <div className="gm-home__back-row">
        <button
          type="button"
          className="btn btn--ghost gm-home__back-btn"
          onClick={() => {
            clearActiveUid();
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} aria-hidden="true" />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      <RouteTabBar
        tabs={GM_HOME_TABS}
        activeKey={tab}
        onChange={(key) => setTab(key as GmHomeTabKey)}
        ariaLabel="Game Maker workspace"
        testIdPrefix="gm-home-tab"
      />

      <main className="gm-home__main">
        {tab === "players"
          ? (
            <GmPlayersTab
              players={players}
              loading={loading}
              checkingSession={checkingSession}
              sessionMissing={sessionMissing}
              joinedCount={joinedCount}
              avgProgress={avgProgress}
              stalledCount={stalledCount}
              pendingCount={pendingCount}
              onAdd={() => setAdding(true)}
              onOpenPlayer={(playerId) =>
                navigate(`/gamemaker/${sid}/player/${playerId}`)}
              onRemoveStaleProfile={handleRemoveStaleProfile}
            />
          )
          : <ResourceLibraryTab active={tab === "library"} />}
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
