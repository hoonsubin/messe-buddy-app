import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Player } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { usePlayerProgress } from "../hooks/usePlayerProgress.ts";
import { useBuddy } from "../hooks/useBuddy.ts";
import { useResources } from "../hooks/useResources.ts";
import BackgroundCanvas from "../components/shared/BackgroundCanvas.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneMapViewer from "../components/player/MilestoneMapViewer.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import CurrentMissionsList from "../components/player/CurrentMissionsList.tsx";
import ResourcesSection from "../components/player/ResourcesSection.tsx";
import BuddyCard from "../components/player/BuddyCard.tsx";

const PlayerCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const adapter = useAdapter();
  const { identity } = useIdentity();

  // Resolve player record from identity UID → adapter
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!identity) {
        setPlayerLoading(false);
        return;
      }
      setPlayerLoading(true);
      setPlayerError(null);
      try {
        const p = await adapter.getPlayer(identity.uid);
        if (!cancelled) setPlayer(p);
      } catch (e) {
        if (!cancelled) {
          setPlayerError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setPlayerLoading(false);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [adapter, identity]);

  const playerId = player?.id ?? "";

  // Fetch session data via hooks
  const {
    session,
    milestones,
    missions,
    loading: sessionLoading,
  } = useSession(sessionId ?? "");

  const { buddy } = useBuddy(playerId);
  const { playerProgress, progressEvents } = usePlayerProgress(
    playerId,
    milestones,
    missions,
  );
  const { resources } = useResources(sessionId ?? "");

  // Sidebar state
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null,
  );
  const sidebarOpen = selectedMilestoneId !== null;

  // Derived data
  const currentMissions = missions.filter((m) => m.isInCurrentMissions);
  const selectedMilestone = selectedMilestoneId !== null
    ? milestones.find((m) => m.id === selectedMilestoneId) ?? undefined
    : undefined;

  const sidebarMissions = selectedMilestoneId !== null
    ? missions.filter((m) => m.milestoneId === selectedMilestoneId)
    : [];

  const msProgress = selectedMilestoneId !== null && playerProgress !== null
    ? playerProgress.milestoneProgress.find((mp) =>
      mp.milestoneId === selectedMilestoneId
    )
    : undefined;

  // Loading state
  const isLoading = sessionLoading || playerLoading;

  // Empty identity (should not happen in practice — LandingPage guards this)
  if (!identity) {
    return (
      <div
        data-testid="player-cockpit-page"
        data-page="player-cockpit"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
        }}
      >
        <p>No identity found. Please return to the landing page.</p>
      </div>
    );
  }

  // Player resolution error state
  if (playerError) {
    return (
      <div
        data-testid="player-cockpit-page"
        data-page="player-cockpit"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
        }}
      >
        <p>Could not load player data. Please try again.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="player-cockpit-page"
      data-page="player-cockpit"
      style={{ minHeight: "100dvh" }}
    >
      {/* Background layer */}
      <BackgroundCanvas
        imageUrl={session?.bgImageUrl ?? ""}
        alt="Session background"
      />

      {isLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "hsl(var(--color-bg))",
            color: "hsl(var(--color-muted-fg))",
            fontSize: "var(--text-sm)",
          }}
        >
          Loading your journey…
        </div>
      )}

      <TopBar
        playerName={player?.name ?? ""}
        totalXP={playerProgress?.totalXP ?? 0}
        role={player?.role ?? ""}
      />

      {/* Sidebar overlay */}
      {sidebarOpen && selectedMilestone !== undefined && (
        <MilestoneSidebarViewer
          milestoneId={selectedMilestone.id}
          milestoneName={selectedMilestone.name}
          missions={sidebarMissions}
          progressEvents={progressEvents}
          currentXP={msProgress?.earnedXP ?? 0}
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
            Welcome{player?.name ? `, ${player.name.split(" ")[0]}` : ""}.
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
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <MilestoneMapViewer
              milestones={milestones}
              bgImageUrl={session?.bgImageUrl ?? ""}
              milestoneProgress={playerProgress?.milestoneProgress ?? []}
              playerXPercent={15}
              playerYPercent={35}
              onMilestoneClick={(id) => setSelectedMilestoneId(id)}
            />
          </div>
        </section>

        {/* Current missions */}
        <CurrentMissionsList
          missions={currentMissions}
          progressEvents={progressEvents}
          onMissionClick={() => undefined}
          onMarkComplete={() => undefined}
        />

        {/* Buddy + Resources */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Your Buddy */}
          <section aria-label="Your buddy">
            {buddy
              ? (
                <BuddyCard
                  name={buddy.name}
                  role={buddy.role}
                  {...(buddy.tenure !== undefined && { tenure: buddy.tenure })}
                  {...(buddy.avatarUrl !== undefined &&
                    { avatarUrl: buddy.avatarUrl })}
                  {...(buddy.contactUrl !== undefined &&
                    { contactUrl: buddy.contactUrl })}
                  {...(buddy.quote !== undefined && { quote: buddy.quote })}
                  {...(buddy.email !== undefined && { email: buddy.email })}
                  {...(buddy.phone !== undefined && { phone: buddy.phone })}
                />
              )
              : !isLoading && (
                <div className="card" style={{ padding: "var(--space-6)" }}>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "hsl(var(--color-muted-fg))",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    You'll be assigned a buddy soon.
                  </p>
                </div>
              )}
          </section>

          {/* Resources */}
          <section aria-label="Resources">
            <ResourcesSection
              resources={resources}
              onSearch={() => undefined}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default PlayerCockpitPage;
