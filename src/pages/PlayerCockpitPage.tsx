import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import type { Mission } from "../types/index.ts";
import { MISSION_TYPE, USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useResolvedPlayer } from "../hooks/useResolvedPlayer.ts";
import { useSession } from "../hooks/useSession.ts";
import { useProgressPlayer } from "../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../hooks/useBuddyProfile.ts";
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
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sessionId, USER_ROLE.PLAYER);

  const {
    player,
    loading: playerLoading,
    error: playerError,
    updatePlayer,
  } = useResolvedPlayer(identity?.uid);

  const playerId = player?.id ?? "";

  const {
    session,
    milestones,
    missions,
    loading: sessionLoading,
    error: sessionError,
  } = useSession(sessionId ?? "");

  const progress = useProgressPlayer({
    playerId,
    milestones,
    missions,
  });

  const { buddy } = useBuddyProfile(sessionId ?? "", playerId, {
    role: "player",
  });
  const { resources } = useResources(sessionId ?? "", { role: "player" });

  const tutorialPlayer = useMemo(() => {
    if (!player) return null;
    if (identity?.isDemo && player.tutorialComplete) {
      return { ...player, tutorialComplete: false };
    }
    return player;
  }, [player, identity?.isDemo]);

  const {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  } = useTutorial(tutorialPlayer, updatePlayer, sessionId ?? "");

  useEffect(() => {
    if (sessionError && !sessionLoading) {
      sessionStorage.setItem("mb_landing_toast", "Session does not exist.");
      navigate("/", { replace: true });
    }
  }, [sessionError, sessionLoading, navigate]);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null,
  );
  const [popupMission, setPopupMission] = useState<Mission | null>(null);

  const handleMissionClick = useCallback(
    (missionId: string, fromTutorial = false) => {
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      const event = progress.progressEvents.find((e) =>
        e.missionId === missionId
      );
      const isCompleted = event?.status === "autoApproved" ||
        event?.status === "completed";

      if (mission.type === MISSION_TYPE.FORM && !isCompleted) {
        if (fromTutorial && showTutorial) {
          sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
        }
        navigate(`/form/${sessionId}/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progress.progressEvents, navigate, showTutorial, sessionId],
  );

  const currentMissions = missions.filter((m) => m.isInCurrentMissions);
  const selectedMilestone = selectedMilestoneId !== null
    ? (milestones.find((m) => m.id === selectedMilestoneId) ?? undefined)
    : undefined;
  const sidebarMissions = selectedMilestoneId !== null
    ? missions.filter((m) => m.milestoneId === selectedMilestoneId)
    : [];
  const msProgress = selectedMilestoneId !== null &&
      progress.playerProgress !== null
    ? progress.playerProgress.milestoneProgress.find(
      (mp) => mp.milestoneId === selectedMilestoneId,
    )
    : undefined;

  const currentMilestone = (() => {
    if (!progress.playerProgress || milestones.length === 0) return null;
    const mpMap = new Map(
      progress.playerProgress.milestoneProgress.map((mp) => [
        mp.milestoneId,
        mp,
      ]),
    );
    for (const ms of milestones) {
      const mp = mpMap.get(ms.id);
      if (mp?.status === "inProgress") return ms;
    }
    return milestones[0] ?? null;
  })();

  const isLoading = sessionLoading || playerLoading;

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

      <TutorialOverlayWithStep
        isVisible={showTutorial}
        currentStepIndex={tutorialStep}
        steps={PLACEHOLDER_STEPS}
        playerName={player?.name}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />

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
        totalXP={progress.playerProgress?.totalXP ?? 0}
        role={player?.role ?? ""}
      />

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
            sessionStorage.removeItem("mb_tutorial_step");
            sessionStorage.removeItem("mb_tutorial_form_pending");
            if (identity && !identity.isDemo) {
              removeProfile(identity.uid);
            }
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      {popupMission !== null && player !== null && (
        <MissionDetailPopup
          mission={popupMission}
          playerId={player.id}
          sessionId={sessionId ?? ""}
          progressEvent={progress.progressEvents.find((e) =>
            e.missionId === popupMission.id
          ) ?? null}
          markSelfComplete={() => progress.markSelfComplete(popupMission.id)}
          markPending={() => progress.markPending(popupMission.id)}
          onClose={() => setPopupMission(null)}
          onValidated={() => {
            setPopupMission(null);
            progress.refresh();
          }}
        />
      )}

      {selectedMilestoneId !== null && selectedMilestone !== undefined && (
        <MilestoneSidebarViewer
          milestoneId={selectedMilestone.id}
          milestoneName={selectedMilestone.name}
          missions={sidebarMissions}
          progressEvents={progress.progressEvents}
          currentXP={msProgress?.earnedXP ?? 0}
          xpThreshold={selectedMilestone.xpThreshold}
          onClose={() => setSelectedMilestoneId(null)}
          onMissionClick={(id) => handleMissionClick(id)}
        />
      )}

      <main className="cockpit-main">
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

        <div className="cockpit-grid">
          <div className="cockpit-col">
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
                  mapNodeScale={session?.mapNodeScale ?? 1}
                  milestoneProgress={progress.playerProgress?.milestoneProgress ??
                    []}
                  playerXPercent={currentMilestone?.xPercent}
                  playerYPercent={currentMilestone?.yPercent}
                  onMilestoneClick={(id) => setSelectedMilestoneId(id)}
                />
              </div>
            </section>

            <CurrentMissionsList
              missions={currentMissions}
              progressEvents={progress.progressEvents}
              onMissionClick={handleMissionClick}
              onMarkComplete={() => undefined}
            />
          </div>

          <div className="cockpit-col">
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

            <ResourcesSection
              resources={resources}
              onSearch={() => undefined}
            />

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
