import { useMemo, useState } from "react";
import type { MilestoneProgress } from "../types/index.ts";
import { MILESTONE_STATUS } from "../types/index.ts";
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneMapViewer from "../components/player/MilestoneMapViewer.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import CurrentMissionsList from "../components/player/CurrentMissionsList.tsx";
import ResourcesSection from "../components/player/ResourcesSection.tsx";
import BuddyCard from "../components/player/BuddyCard.tsx";
import {
  MOCK_SESSION,
  MOCK_MILESTONES,
  MOCK_MISSIONS,
  MOCK_PLAYERS,
  MOCK_BUDDY_PROFILES,
  MOCK_PROGRESS_EVENTS,
  MOCK_RESOURCES,
} from "../adapters/mock/mockData.ts";

// Phase 1: hard-wire Sofia (player_sofia) for visual shell preview.
const PLAYER = MOCK_PLAYERS[1]!;
const BUDDY = MOCK_BUDDY_PROFILES[1]!;

const COMPLETED_STATUSES = new Set(["completed", "autoApproved"] as const);

const PlayerCockpitPage = () => {
  // null = sidebar closed; string = milestone ID whose sidebar is open
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const sidebarOpen = selectedMilestoneId !== null;

  const currentMissions = MOCK_MISSIONS.filter((m) => m.isInCurrentMissions);
  const visibleResources = MOCK_RESOURCES.filter((r) => r.isVisibleToPlayer);
  const playerEvents = MOCK_PROGRESS_EVENTS.filter((e) => e.playerId === PLAYER.id);

  // Compute per-milestone progress from missions + progress events.
  const milestoneProgress = useMemo((): ReadonlyArray<MilestoneProgress> => {
    const eventByMission = new Map(playerEvents.map((e) => [e.missionId, e]));

    return MOCK_MILESTONES.map((ms): MilestoneProgress => {
      const msMissions = MOCK_MISSIONS.filter((m) => m.milestoneId === ms.id);
      const completedMissions = msMissions.filter((m) => {
        const ev = eventByMission.get(m.id);
        return ev !== undefined && COMPLETED_STATUSES.has(ev.status as "completed" | "autoApproved");
      });
      const total = msMissions.length;
      const percentComplete = total > 0 ? completedMissions.length / total : 0;
      const earnedXP = Math.round(percentComplete * ms.xpThreshold);

      const status =
        percentComplete >= 1
          ? MILESTONE_STATUS.COMPLETED
          : completedMissions.length > 0
            ? MILESTONE_STATUS.IN_PROGRESS
            : MILESTONE_STATUS.UPCOMING;

      return {
        milestoneId: ms.id,
        status,
        percentComplete,
        earnedXP,
        xpThreshold: ms.xpThreshold,
        completedMissionIds: completedMissions.map((m) => m.id),
      };
    });
  }, [playerEvents]);

  const selectedMilestone = selectedMilestoneId !== null
    ? MOCK_MILESTONES.find((m) => m.id === selectedMilestoneId)
    : undefined;

  const sidebarMissions = selectedMilestoneId !== null
    ? MOCK_MISSIONS.filter((m) => m.milestoneId === selectedMilestoneId)
    : [];

  return (
    <div
      data-testid="player-cockpit-page"
      data-page="player-cockpit"
      style={{
        minHeight: "100dvh",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={PLAYER.name}
        totalXP={83}
        role={PLAYER.role}
      />

      {/* Sidebar overlay */}
      {sidebarOpen && selectedMilestone !== undefined && (
        <MilestoneSidebarViewer
          milestoneId={selectedMilestone.id}
          milestoneName={selectedMilestone.name}
          missions={sidebarMissions}
          progressEvents={playerEvents}
          currentXP={49}
          xpThreshold={selectedMilestone.xpThreshold}
          onClose={() => setSelectedMilestoneId(null)}
          onMissionClick={() => undefined}
        />
      )}

      {/* Scrollable page body */}
      <main
        style={{
          paddingTop: "var(--topbar-h)",
          paddingInline: "var(--space-4)",
          paddingBottom: "var(--space-10)",
          maxWidth: "48rem",
          marginInline: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {/* Welcome header */}
        <header style={{ paddingTop: "var(--space-6)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              margin: "0 0 var(--space-1)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Welcome, {PLAYER.name.split(" ")[0]}.
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              margin: 0,
            }}
          >
            Your onboarding journey starts here.
          </p>
        </header>

        {/* Milestones section */}
        <section aria-label="Milestones">
          <h2 className="section-label">Milestones</h2>
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
            <MilestoneMapViewer
              milestones={MOCK_MILESTONES}
              bgImageUrl={MOCK_SESSION.bgImageUrl}
              milestoneProgress={milestoneProgress}
              playerXPercent={15}
              playerYPercent={35}
              onMilestoneClick={(id) => setSelectedMilestoneId(id)}
            />
          </div>
        </section>

        {/* Current missions */}
        <CurrentMissionsList
          missions={currentMissions}
          progressEvents={playerEvents}
          onMissionClick={() => undefined}
          onMarkComplete={() => undefined}
        />

        {/* Buddy + Resources */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Your Buddy */}
          <section aria-label="Your buddy">
            <h2 className="section-label">Your Buddy</h2>
            <BuddyCard
              name={BUDDY.name}
              role={BUDDY.role}
              {...(BUDDY.tenure !== undefined && { tenure: BUDDY.tenure })}
              {...(BUDDY.avatarUrl !== undefined && { avatarUrl: BUDDY.avatarUrl })}
              {...(BUDDY.contactUrl !== undefined && { contactUrl: BUDDY.contactUrl })}
              {...(BUDDY.quote !== undefined && { quote: BUDDY.quote })}
              {...(BUDDY.email !== undefined && { email: BUDDY.email })}
              {...(BUDDY.phone !== undefined && { phone: BUDDY.phone })}
            />
          </section>

          {/* Resources */}
          <section aria-label="Resources">
            <h2 className="section-label">Resources</h2>
            <ResourcesSection
              resources={visibleResources}
              onSearch={() => undefined}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default PlayerCockpitPage;
