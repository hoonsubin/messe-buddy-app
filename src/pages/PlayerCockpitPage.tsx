import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import type { Mission, Player } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { usePlayerProgress } from "../hooks/usePlayerProgress.ts";
import { useBuddy } from "../hooks/useBuddy.ts";
import { useResources } from "../hooks/useResources.ts";
import { useTutorial } from "../hooks/useTutorial.ts";
import ConfirmDialog from "../components/shared/ConfirmDialog.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import AssistantChatCard from "../components/player/AssistantChatCard.tsx";
import MilestoneMapViewer from "../components/player/MilestoneMapViewer.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import MissionDetailPopup from "../components/player/MissionDetailPopup.tsx";
import CurrentMissionsList from "../components/player/CurrentMissionsList.tsx";
import ResourcesSection from "../components/player/ResourcesSection.tsx";
import BuddyCard from "../components/player/BuddyCard.tsx";
import {
  PLACEHOLDER_STEPS,
  TutorialOverlayWithStep,
} from "../components/tutorial/TutorialOverlay.tsx";

// sessionStorage key for tutorial form round-trips - also read inside useTutorial.
const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";

// ── Page ───────────────────────────────────────────────────────────────────────

const PlayerCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { profiles, clearIdentity } = useIdentity();
  const identity = profiles.find(
    (p) => p.sessionId === (sessionId ?? ""),
  ) ?? null;

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
    error: sessionError,
  } = useSession(sessionId ?? "");

  const { buddy } = useBuddy(playerId);
  const {
    playerProgress,
    progressEvents,
    refresh: refreshProgress,
  } = usePlayerProgress(playerId, milestones, missions);
  const { resources } = useResources(sessionId ?? "");

  // ── Override tutorialComplete for demo accounts ────────────────────────
  // Demo accounts always show the tutorial, even if the underlying player
  // mock data has tutorialComplete: true.
  const tutorialPlayer = useMemo(() => {
    if (!player) return null;
    if (identity?.isDemo && player.tutorialComplete) {
      return { ...player, tutorialComplete: false };
    }
    return player;
  }, [player, identity?.isDemo]);

  // ── Tutorial (extracted hook) ──────────────────────────────────────────────
  const {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  } = useTutorial(tutorialPlayer, adapter, sessionId ?? "");

  // ── Session error redirect ─────────────────────────────────────────
  useEffect(() => {
    if (sessionError && !sessionLoading) {
      sessionStorage.setItem("mb_landing_toast", "Session does not exist.");
      navigate("/", { replace: true });
    }
  }, [sessionError, sessionLoading, navigate]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null,
  );
  const [popupMission, setPopupMission] = useState<Mission | null>(null);

  // ── Mission click - single handler for both list and sidebar ───────────────
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
        navigate(`/form/${sessionId}/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progressEvents, navigate, showTutorial],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const currentMissions = missions.filter((m) => m.isInCurrentMissions);
  const selectedMilestone = selectedMilestoneId !== null
    ? (milestones.find((m) => m.id === selectedMilestoneId) ?? undefined)
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

  // Trusted per-user context for the AI assistant: name + assigned buddy only.
  // Wrapped in <APPLICATION_CONTEXT> tags the system prompt recognizes.
  const aiAppContext = (() => {
    const lines: string[] = [];
    const userName = player?.preferredName?.trim() || player?.name?.trim();
    if (userName) lines.push(`User's name: ${userName}.`);
    if (buddy) {
      let line = `Assigned buddy: ${buddy.name}`;
      if (buddy.role) line += `, ${buddy.role}`;
      if (buddy.tenure) line += ` (${buddy.tenure})`;
      const contact = buddy.email ?? buddy.phone ?? buddy.contactUrl;
      if (contact) line += `. Contact: ${contact}`;
      lines.push(`${line}.`);
    }
    if (lines.length === 0) return undefined;
    return (
      "<APPLICATION_CONTEXT>\n" +
      "Trusted facts about the current user (not a policy document):\n" +
      lines.join("\n") +
      "\n</APPLICATION_CONTEXT>"
    );
  })();

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

  if (sessionError && !sessionLoading) return null;

  return (
    <div
      data-testid="player-cockpit-page"
      data-page="player-cockpit"
      style={{
        minHeight: "100dvh",
        paddingTop: "var(--topbar-h)",
      }}
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

      {/* Session toolbar: back-to-landing (demo) or log-out (real session) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
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
            // Clear tutorial sessionStorage so a fresh session restarts the tutorial
            sessionStorage.removeItem("mb_tutorial_step");
            sessionStorage.removeItem("mb_tutorial_form_pending");
            if (identity && !identity.isDemo) {
              clearIdentity();
            }
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      {/* Mission detail popup (text / link missions) */}
      {popupMission !== null && player !== null && (
        <MissionDetailPopup
          mission={popupMission}
          playerId={player.id}
          sessionId={sessionId ?? ""}
          progressEvent={progressEvents.find((e) =>
            e.missionId === popupMission.id
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
      <main className="cockpit-main">
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

        {/* AI policy assistant - collapsible (collapsed by default) */}
        <div className="cockpit-grid">
          <div className="cockpit-col">
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
          </div>

          <div className="cockpit-col">
            {/* Your buddy */}
            <section aria-label="Your buddy">
              {buddy
                ? (
                  <BuddyCard
                    name={buddy.name}
                    role={buddy.role}
                    {...(buddy.tenure !== undefined &&
                      { tenure: buddy.tenure })}
                    {...(buddy.avatarUrl !== undefined && {
                      avatarUrl: buddy.avatarUrl,
                    })}
                    {...(buddy.contactUrl !== undefined && {
                      contactUrl: buddy.contactUrl,
                    })}
                    {...(buddy.quote !== undefined && { quote: buddy.quote })}
                    {...(buddy.email !== undefined && { email: buddy.email })}
                    {...(buddy.phone !== undefined && { phone: buddy.phone })}
                  />
                )
                : (
                  !isLoading && (
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
                  )
                )}
            </section>

            {/* Resources - collapsible search block */}
            <ResourcesSection
              resources={resources}
              onSearch={() => undefined}
            />

            {/* AI policy assistant - collapsible */}
            <AssistantChatCard
              {...(buddy?.name !== undefined && { buddyName: buddy.name })}
              {...(aiAppContext !== undefined && {
                appContext: aiAppContext,
              })}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlayerCockpitPage;
