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
import { getDailyMissions } from "../use-cases/getDailyMissions.ts";
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

// Profile Setup mission ID from mock data — used for tutorial Step 1 routing.
const PROFILE_MISSION_ID = "mission_profile";

// sessionStorage key for tracking tutorial state across form navigation.
const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";

const PlayerCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity } = useIdentity();

  // Resolve player record from identity UID → adapter
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<Error | null>(null);

  // ── Tutorial state ─────────────────────────────────────────────────────
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // On mount, check if tutorial should be shown.
  // Also handles form round-trip: if sessionStorage has a pending tutorial
  // marker, restore the tutorial state and advance past step 1 if profile
  // is now complete.
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
        if (cancelled) return;
        setPlayer(p);

        // Check for pending tutorial form round-trip.
        const formPending = sessionStorage.getItem(TUTORIAL_FORM_KEY);
        if (formPending !== null) {
          sessionStorage.removeItem(TUTORIAL_FORM_KEY);
          // We were on step 1 (Profile) before navigating to the form.
          // If profile is now complete, advance to step 2; otherwise stay.
          if (p?.profileComplete) {
            setShowTutorial(true);
            setTutorialStep(2);
          } else {
            setShowTutorial(true);
            setTutorialStep(1);
          }
        } else if (p && !p.tutorialComplete) {
          setShowTutorial(true);
          setTutorialStep(0);
        }
        // If tutorialComplete === true, showTutorial stays false — no overlay.
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
  const { playerProgress, progressEvents, refresh: refreshProgress } =
    usePlayerProgress(
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

  // Mission detail popup state (text / link missions)
  const [popupMission, setPopupMission] = useState<Mission | null>(null);

  // Derived data
  const dailyMissions = useMemo(
    () =>
      playerProgress
        ? getDailyMissions(playerProgress, missions)
        : [],
    [playerProgress, missions],
  );
  const currentMissions = missions.filter((m) => m.isInCurrentMissions);
  const selectedMilestone = selectedMilestoneId !== null
    ? milestones.find((m) => m.id === selectedMilestoneId) ?? undefined
    : undefined;

  // Compute current player position based on the first in-progress milestone,
  // falling back to the first milestone overall, then to a sensible default.
  const currentMilestone = (() => {
    if (!playerProgress || milestones.length === 0) return null;
    const mpMap = new Map(
      playerProgress.milestoneProgress.map((mp) => [mp.milestoneId, mp]),
    );
    // Prefer the first in-progress milestone.
    for (const ms of milestones) {
      const mp = mpMap.get(ms.id);
      if (mp?.status === "inProgress") return ms;
    }
    // Fall back to the first milestone overall.
    return milestones[0] ?? null;
  })();

  const sidebarMissions = selectedMilestoneId !== null
    ? missions.filter((m) => m.milestoneId === selectedMilestoneId)
    : [];

  const msProgress = selectedMilestoneId !== null && playerProgress !== null
    ? playerProgress.milestoneProgress.find((mp) =>
      mp.milestoneId === selectedMilestoneId
    )
    : undefined;

  // ── Tutorial handlers ──────────────────────────────────────────────────

  // Step forward: if on step 1 (Profile), navigate to the profile form first.
  // For all other steps, advance the tutorial step.
  // For step 4 (Resources, index 4), mark tutorial complete.
  const handleTutorialNext = useCallback(() => {
    if (tutorialStep === 1) {
      // Save current tutorial state before navigating to form.
      sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
      navigate(`/form/${PROFILE_MISSION_ID}`);
      return;
    }

    const nextStep = tutorialStep + 1;
    if (nextStep >= PLACEHOLDER_STEPS.length) {
      // Final step completed — mark tutorial as done.
      if (playerId) {
        adapter.updatePlayer(playerId, { tutorialComplete: true }).catch(
          () => {
            // Silent failure — user can continue anyway
          },
        );
      }
      setShowTutorial(false);
      return;
    }

    setTutorialStep(nextStep);
  }, [tutorialStep, playerId, adapter, navigate]);

  // Skip tutorial — show confirmation dialog first.
  const handleTutorialSkip = useCallback(() => {
    setShowSkipConfirm(true);
  }, []);

  // Confirm skip: persist tutorialComplete and dismiss.
  const handleSkipConfirm = useCallback(() => {
    if (playerId) {
      adapter.updatePlayer(playerId, { tutorialComplete: true }).catch(() => {
        // Silent failure
      });
    }
    setShowSkipConfirm(false);
    setShowTutorial(false);
  }, [playerId, adapter]);

  // Cancel skip: dismiss confirmation.
  const handleSkipCancel = useCallback(() => {
    setShowSkipConfirm(false);
  }, []);

  // ── Mission click handler ──────────────────────────────────────────────
  // Routes to the appropriate view based on mission type and completion status.
  // Completed FORM missions open MissionDetailPopup (shows disabled state) rather
  // than re-opening the form.
  const handleMissionClick = useCallback(
    (missionId: string) => {
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      const progress = progressEvents.find((e) => e.missionId === missionId);
      const isCompleted = progress?.status === "autoApproved" ||
        progress?.status === "completed";

      if (mission.type === MISSION_TYPE.FORM && !isCompleted) {
        // If tutorial is active and we're clicking the profile mission,
        // store tutorial state so we resume on return.
        if (showTutorial && missionId === PROFILE_MISSION_ID) {
          sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
        }
        navigate(`/form/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progressEvents, navigate, showTutorial],
  );

  // Sidebar mission click — same routing logic
  const handleSidebarMissionClick = useCallback(
    (missionId: string) => {
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      const progress = progressEvents.find((e) => e.missionId === missionId);
      const isCompleted = progress?.status === "autoApproved" ||
        progress?.status === "completed";

      if (mission.type === MISSION_TYPE.FORM && !isCompleted) {
        navigate(`/form/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progressEvents, navigate],
  );

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
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />

      {/* ── Skip Confirmation Dialog ─────────────────────────────────── */}
      {showSkipConfirm && (
        <div
          data-testid="tutorial-skip-confirm"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "hsl(var(--color-fg) / 0.4)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-confirm-title"
            style={{
              background: "hsl(var(--color-card))",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-6)",
              maxWidth: "min(90%, 20rem)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <h3
              id="skip-confirm-title"
              style={{
                margin: 0,
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              Skip tutorial?
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-muted-fg))",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              You can always complete the tutorial later from settings.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "var(--space-3)",
              }}
            >
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSkipCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSkipConfirm}
              >
                Skip tutorial
              </button>
            </div>
          </div>
        </div>
      )}

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
          onMissionClick={handleSidebarMissionClick}
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

        {/* Today's missions — primary orientation surface */}
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

          {/* Resources + AI Chat */}
          <section aria-label="Resources">
            <ResourcesChat resources={resources} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default PlayerCockpitPage;
