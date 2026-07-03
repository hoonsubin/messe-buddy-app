import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  BuddyProfile,
  Milestone,
  Mission,
  Resource,
} from "../../types/index.ts";
import { MISSION_TYPE, USER_ROLE } from "../../types/index.ts";
import type { CachedIdentity } from "../../types/index.ts";
import { useActiveProfile } from "../../hooks/useActiveProfile.ts";
import { useResolvedPlayer } from "../../hooks/useResolvedPlayer.ts";
import { useSession } from "../../hooks/useSession.ts";
import { useProgressPlayer } from "../../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../../hooks/useBuddyProfile.ts";
import { useResources } from "../../hooks/useResources.ts";
import { useTutorial } from "../../hooks/useTutorial.ts";
import { useChat } from "../../hooks/useChat.ts";
import type { UseChatWithAvailability } from "../../hooks/useChat.ts";
import type { PlayerTabKey } from "./constants.ts";
import { TUTORIAL_FORM_KEY } from "./constants.ts";

export interface PlayerCockpitPageModel {
  readonly sessionId: string;
  readonly identity: CachedIdentity;
  readonly player: NonNullable<ReturnType<typeof useResolvedPlayer>["player"]>;
  readonly isLoading: boolean;
  readonly tab: PlayerTabKey;
  readonly setTab: (tab: PlayerTabKey) => void;
  readonly milestones: ReturnType<typeof useSession>["milestones"];
  readonly missions: ReturnType<typeof useSession>["missions"];
  readonly session: ReturnType<typeof useSession>["session"];
  readonly progress: ReturnType<typeof useProgressPlayer>;
  readonly buddy: BuddyProfile | null;
  readonly resources: ReadonlyArray<Resource>;
  readonly chat: UseChatWithAvailability;
  readonly tutorialStep: number;
  readonly showTutorial: boolean;
  readonly showSkipConfirm: boolean;
  readonly handleTutorialNext: () => void;
  readonly handleTutorialSkip: () => void;
  readonly handleSkipConfirm: () => void;
  readonly handleSkipCancel: () => void;
  readonly selectedMilestoneId: string | null;
  readonly setSelectedMilestoneId: (id: string | null) => void;
  readonly selectedMilestone: Milestone | undefined;
  readonly sidebarMissions: ReadonlyArray<Mission>;
  readonly msProgressEarnedXP: number;
  readonly popupMission: Mission | null;
  readonly setPopupMission: (mission: Mission | null) => void;
  readonly currentMissions: ReadonlyArray<Mission>;
  readonly currentMilestone: Milestone | null;
  readonly handleMissionClick: (
    missionId: string,
    fromTutorial?: boolean,
  ) => void;
  readonly handleLeave: () => void;
}

export type UsePlayerCockpitPageResult =
  | { readonly status: "no-identity" }
  | { readonly status: "player-error" }
  | { readonly status: "session-redirect" }
  | { readonly status: "ready"; readonly model: PlayerCockpitPageModel };

export const usePlayerCockpitPage = (): UsePlayerCockpitPageResult => {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const sessionId = routeSessionId ?? "";
  const navigate = useNavigate();
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
  } = useSession(sessionId);

  const progress = useProgressPlayer({ playerId, milestones, missions });

  const { buddy } = useBuddyProfile(sessionId, playerId, { role: "player" });
  const { resources } = useResources(sessionId, { role: "player" });

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
  } = useTutorial(tutorialPlayer, updatePlayer, sessionId);

  useEffect(() => {
    if (sessionError && !sessionLoading) {
      sessionStorage.setItem("mb_landing_toast", "Session does not exist.");
      navigate("/", { replace: true });
    }
  }, [sessionError, sessionLoading, navigate]);

  const [tab, setTab] = useState<PlayerTabKey>("dashboard");
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
  const msProgressEarnedXP = selectedMilestoneId !== null &&
      progress.playerProgress !== null
    ? progress.playerProgress.milestoneProgress.find(
      (mp) => mp.milestoneId === selectedMilestoneId,
    )?.earnedXP ?? 0
    : 0;

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

  const aiAppContext = useMemo(() => {
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
  }, [player?.preferredName, player?.name, buddy]);

  const chat = useChat(aiAppContext);

  const handleLeave = useCallback(() => {
    sessionStorage.removeItem("mb_tutorial_step");
    sessionStorage.removeItem(TUTORIAL_FORM_KEY);
    navigate("/", { replace: true });
  }, [navigate]);

  if (!identity) return { status: "no-identity" };
  if (playerError) return { status: "player-error" };
  if (sessionError && !sessionLoading) return { status: "session-redirect" };
  if (!player) return { status: "session-redirect" };

  return {
    status: "ready",
    model: {
      sessionId,
      identity,
      player,
      isLoading,
      tab,
      setTab,
      milestones,
      missions,
      session,
      progress,
      buddy,
      resources,
      chat,
      tutorialStep,
      showTutorial,
      showSkipConfirm,
      handleTutorialNext,
      handleTutorialSkip,
      handleSkipConfirm,
      handleSkipCancel,
      selectedMilestoneId,
      setSelectedMilestoneId,
      selectedMilestone,
      sidebarMissions,
      msProgressEarnedXP,
      popupMission,
      setPopupMission,
      currentMissions,
      currentMilestone,
      handleMissionClick,
      handleLeave,
    },
  };
};
