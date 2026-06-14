// Phase 1 shell — player view layout. Data fetching + state wired in Phase 2.
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneMapViewer from "../components/player/MilestoneMapViewer.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import CurrentMissionsList from "../components/player/CurrentMissionsList.tsx";
import ResourcesChat from "../components/player/ResourcesChat.tsx";
import BuddyCard from "../components/player/BuddyCard.tsx";
import { MOCK_SESSION, MOCK_MILESTONES, MOCK_MISSIONS, MOCK_PLAYERS, MOCK_BUDDY_PROFILES, MOCK_PROGRESS_EVENTS, MOCK_RESOURCES } from "../adapters/mock/mockData.ts";

// Phase 1: hard-wire Sofia (player_sofia) for visual shell preview.
const PLAYER = MOCK_PLAYERS[1]!;
const BUDDY = MOCK_BUDDY_PROFILES[1]!;

const PlayerCockpitPage = () => (
  <div
    data-testid="player-cockpit-page"
    data-page="player-cockpit"
    style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100dvh",
      background: "hsl(var(--color-bg))",
    }}
  >
    <TopBar
      playerName={PLAYER.name}
      totalXP={83}
      role={PLAYER.role}
    />

    <main
      style={{
        flex: 1,
        position: "relative",
        paddingTop: "var(--topbar-h)",
        paddingBottom: "var(--ms-strip-h)",
        overflow: "hidden",
      }}
    >
      <MilestoneMapViewer
        milestones={MOCK_MILESTONES}
        bgImageUrl={MOCK_SESSION.bgImageUrl}
        milestoneProgress={[]}
        playerXPercent={15}
        playerYPercent={35}
        onMilestoneClick={() => undefined}
      />

      <MilestoneSidebarViewer
        milestoneId="ms_orientation"
        milestoneName="Orientation"
        missions={MOCK_MISSIONS.filter((m) => m.milestoneId === "ms_orientation")}
        progressEvents={MOCK_PROGRESS_EVENTS.filter((e) => e.playerId === PLAYER.id)}
        currentXP={49}
        xpThreshold={100}
        onClose={() => undefined}
        onMissionClick={() => undefined}
      />
    </main>

    <aside
      style={{
        position: "fixed",
        bottom: "var(--ms-strip-h)",
        right: 0,
        width: "min(100%, 24rem)",
        maxHeight: "60dvh",
        overflowY: "auto",
        zIndex: 10,
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <BuddyCard
        name={BUDDY.name}
        role={BUDDY.role}
        tenure={BUDDY.tenure}
        contactUrl={BUDDY.contactUrl}
      />
      <ResourcesChat
        resources={MOCK_RESOURCES.filter((r) => r.isVisibleToPlayer)}
      />
    </aside>

    <CurrentMissionsList
      missions={MOCK_MISSIONS.filter((m) => m.isInCurrentMissions)}
      progressEvents={MOCK_PROGRESS_EVENTS.filter((e) => e.playerId === PLAYER.id)}
      onMissionClick={() => undefined}
      onMarkComplete={() => undefined}
    />
  </div>
);

export default PlayerCockpitPage;
