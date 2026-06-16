import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Mission, Player } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { usePlayerProgress } from "../hooks/usePlayerProgress.ts";
import { useBuddy } from "../hooks/useBuddy.ts";
import { useResources } from "../hooks/useResources.ts";
import { useTutorial } from "../hooks/useTutorial.ts";
import { getDailyMissions } from "../use-cases/getDailyMissions.ts";
import ConfirmDialog from "../components/shared/ConfirmDialog.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import DailyPlanView from "../components/player/DailyPlanView.tsx";
import MilestoneMapViewer from "../components/player/MilestoneMapViewer.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import MissionDetailPopup from "../components/player/MissionDetailPopup.tsx";
import CurrentMissionsList from "../components/player/CurrentMissionsList.tsx";
import ResourcesChat from "../components/player/ResourcesChat.tsx";
import BuddyCard from "../components/player/BuddyCard.tsx";
import {
  PLACEHOLDER_STEPS,
  TutorialOverlayWithStep,
} from "../components/tutorial/TutorialOverlay.tsx";

// sessionStorage key for tutorial form round-trips — also read inside useTutorial.
const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";

// ── Page ───────────────────────────────────────────────────────────────────────

const PlayerCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity } = useIdentity();

  // ── Player resolution ──────────────────────────────────────────────────────
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

  // ── Session / progress / buddy / resources ─────────────────────────────────
  const {
    session,
    milestones,
    missions,
    loading: sessionLoading,
  } = useSession(sessionId ?? "");

  const { buddy } = useBuddy(playerId);
  const { playerProgress, progressEvents, refresh: refreshProgress } =
    usePlayerProgress(playerId, milestones, missions);
  const { resources } = useResources(sessionId ?? "");

  // ── Tutorial (extracted hook) ──────────────────────────────────────────────
  const {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  } = useTutorial(player, adapter);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null,
  );
  const [popupMission, setPopupMission] = useState<Mission | null>(null);

  // ── Mission click — single handler for both list and sidebar ───────────────
  const handleMissionClick = useCallback(
    (missionId: string, fromTutorial = false) => {
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      const progress = progressEvents.find((e) => e.missionId === missionId);
      const isCompleted = progress?.status === "autoApproved" ||
        progress?.status === "completed";

      if (mission.type === MISSION_TYPE.FORM && !isCompleted) {
        // Store tutorial state before navigating away if tutorial is active
        if (fromTutorial && showTutorial) {
          sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
        }
        navigate(`/form/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progressEvents, navigate, showTutorial],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const dailyMissions = useMemo(
    () => playerProgress ? getDailyMissions(playerProgress, missions) : [],
    [playerProgress, missions],
  );
  const currentMissions = missions.filter((m) => m.isInCurrentMissions);
  const selectedMilestone = selectedMilestoneId !== null
    ? milestones.find((m) => m.id === selectedMilestoneId) ?? undefined
    : undefined;
  const sidebarMissions = selectedMilestoneId !== null
    ? missions.filter((m) => m.milestoneId === selectedMilestoneId)
    : [];
  const msProgress = selectedMilestoneId !== null && playerProgress !== null
    ? playerProgress.milestoneProgress.find(
      (mp) => mp.milestoneId === selectedMilestoneId,
    )
    : undefined;

  const currentMilestone = (() => {
    if (!playerProgress || milestones.length === 0) return null;
    const mpMap = new Map(
      playerProgress.milestoneProgress.map((mp) => [mp.milestoneId, mp]),
    );
    for (const ms of milestones) {
      const mp = mpMap.get(ms.id);
      if (mp?.status === "inProgress") return ms;
    }
    return milestones[0] ?? null;
  })();

  const isLoading = sessionLoading || playerLoading;

  // ── Error / no-identity guards ─────────────────────────────────────────────
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

      {/* ── Tutorial Overlay ─────────────────────────────────────────── */}
      <TutorialOverlayWithStep
        isVisible={showTutorial}
        currentStepIndex={tutorialStep}
        steps={PLACEHOLDER_STEPS}
        playerName={player?.name}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />

      {/* ── Skip Confirmation Dialog ─────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showSkipConfirm}
        title="Skip tutorial?"
        body="You can always complete the tutorial later from settings."
        confirmLabel="Skip tutorial"
        onConfirm={handleSkipConfirm}
        onCancel={handleSkipCancel}
      />

      <TopBar
        playerName={player?.name ?? ""}
        totalXP={playerProgress?.totalXP ?? 0}
        role={player?.role ?? ""}
      />

      {/* Mission detail popup (text / link missions) */}
      {popupMission !== null && player !== null && (
        <MissionDetailPopup
          mission={popupMission}
          playerId={player.id}
          sessionId={sessionId ?? ""}
          progressEvent={progressEvents.find(
            (e) => e.missionId === popupMission.id,
          ) ?? null}
          onClose={() => setPopupMission(null)}
          onValidated={() => {
            setPopupMission(null);
            refreshProgress();
          }}
        />
      )}

      {/* Milestone sidebar overlay */}
      {selectedMilestoneId !== null && selectedMilestone !== undefined && (
        <MilestoneSidebarViewer
          milestoneId={selectedMilestone.id}
          milestoneName={selectedMilestone.name}
          missions={sidebarMissions}
          progressEvents={progressEvents}
          currentXP={msProgress?.earnedXP ?? 0}
          xpThreshold={selectedMilestone.xpThreshold}
          onClose={() => setSelectedMilestoneId(null)}
          onMissionClick={(id) => handleMissionClick(id)}
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

        {/* Today's missions */}
        <DailyPlanView missions={dailyMissions} />

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
              playerXPercent={currentMilestone?.xPercent}
              playerYPercent={currentMilestone?.yPercent}
              onMilestoneClick={(id) => setSelectedMilestoneId(id)}
            />
          </div>
        </section>

        {/* Current missions */}
        <CurrentMissionsList
          missions={currentMissions}
          progressEvents={progressEvents}
          onMissionClick={handleMissionClick}
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

          <section aria-label="Resources">
            <ResourcesChat resources={resources} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default PlayerCockpitPage;
