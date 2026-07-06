import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  BuddyProfile,
  Milestone,
  Mission,
  PBRecord,
  Player,
  Resource,
  Session,
} from "../../types/index.ts";
import { MISSION_TYPE, USER_ROLE } from "../../types/index.ts";
import type { CachedIdentity } from "../../types/index.ts";
import { useActiveProfile } from "../../hooks/useActiveProfile.ts";
import { clearActiveUid, useIdentity } from "../../hooks/useIdentity.ts";
import { useDerivedPlayerProgress } from "../../hooks/useDerivedPlayerProgress.ts";
import { useTutorial } from "../../hooks/useTutorial.ts";
import { useChat } from "../../hooks/useChat.ts";
import type { UseChatWithAvailability } from "../../hooks/useChat.ts";
import { useMutation } from "../../hooks/useMutation.ts";
import { useQuery } from "../../hooks/useQuery.ts";
import { devBackendTrace } from "../../store/devBackendTrace.ts";
import {
  fetchBuddy,
  fetchJourney,
  fetchPlayerByUid,
  fetchPlayerResources,
  fetchProgress,
  fetchSessionMeta,
} from "../../store/queryFetchers.ts";
import { queryKeys } from "../../store/queryKeys.ts";
import { useQueryClient } from "../../store/useQueryClient.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { findOnboardingProfileMission } from "../../utils/onboardingMission.ts";
import {
  TUTORIAL_FORM_KEY,
  TUTORIAL_STEP_KEY,
} from "../../components/tutorial/constants.ts";
import type { UseProgressPlayerResult } from "../progressTypes.ts";

export interface PlayerCockpitPageModel {
  readonly sessionId: string;
  readonly identity: CachedIdentity;
  readonly player: Player;
  readonly isLoading: boolean;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly session: Session | null;
  readonly qrSecret: string | undefined;
  readonly progress: UseProgressPlayerResult;
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
  readonly tutorialNextDisabled: boolean;
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
  | { readonly status: "session-missing"; readonly onRemove: () => void }
  | { readonly status: "session-redirect" }
  | { readonly status: "ready"; readonly model: PlayerCockpitPageModel };

export const usePlayerCockpitPage = (): UsePlayerCockpitPageResult => {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const sessionId = routeSessionId ?? "";
  const navigate = useNavigate();
  const adapter = useAdapter();
  const client = useQueryClient();
  const identity = useActiveProfile(sessionId, USER_ROLE.PLAYER);
  const uid = identity?.uid;

  useEffect(() => {
    if (sessionId) devBackendTrace.setActiveScope(sessionId);
  }, [sessionId]);

  const playerQuery = useQuery(
    uid ? queryKeys.playerUid(uid) : null,
    fetchPlayerByUid(uid ?? ""),
    { enabled: !!uid },
  );

  const player = playerQuery.data ?? null;
  const playerId = player?.id ?? "";

  const sessionMeta = useQuery(
    sessionId ? queryKeys.sessionMeta(sessionId) : null,
    fetchSessionMeta(sessionId),
    { enabled: !!sessionId },
  );

  const journey = useQuery(
    sessionId && playerId
      ? queryKeys.journey(sessionId, playerId)
      : null,
    fetchJourney(sessionId, playerId),
    { enabled: !!sessionId && !!playerId },
  );

  const progressQuery = useQuery(
    playerId ? queryKeys.progress(playerId) : null,
    fetchProgress(playerId),
    { enabled: !!playerId },
  );

  const buddyQuery = useQuery(
    playerId ? queryKeys.buddy(playerId) : null,
    fetchBuddy(playerId),
    { enabled: !!playerId },
  );

  const resourcesQuery = useQuery(
    sessionId && playerId
      ? queryKeys.resources(sessionId, playerId)
      : null,
    fetchPlayerResources(sessionId, playerId, true),
    { enabled: !!sessionId && !!playerId },
  );

  const refreshProgress = useCallback(() => {
    if (playerId) client.invalidateQuery(queryKeys.progress(playerId));
  }, [client, playerId]);

  const milestones = journey.data?.milestones ?? [];
  const missions = journey.data?.missions ?? [];
  const session = sessionMeta.data ?? null;

  const progress = useDerivedPlayerProgress(
    playerId,
    milestones,
    missions,
    progressQuery.data,
    progressQuery.isInitialLoading,
    progressQuery.error,
    refreshProgress,
  );

  const { removeProfile } = useIdentity();

  const updatePlayerMutation = useMutation({
    label: "player:update",
    mutationFn: async (patch: Partial<Omit<Player, keyof PBRecord>>) => {
      if (!player) throw new Error("No player loaded");
      return adapter.updatePlayer(player.id, patch);
    },
    invalidateKeys: () =>
      uid ? [queryKeys.playerUid(uid), queryKeys.playerId(playerId)] : [],
  });

  const updatePlayer = useCallback(
    async (patch: Partial<Omit<Player, keyof PBRecord>>) =>
      updatePlayerMutation.mutate(patch),
    [updatePlayerMutation],
  );

  const handleRemoveStaleProfile = useCallback(() => {
    if (identity) removeProfile(identity.uid);
    clearActiveUid();
    navigate("/", { replace: true });
  }, [identity, removeProfile, navigate]);

  const tutorialPlayer = useMemo(() => {
    if (!player) return null;
    if (identity?.isDemo && player.tutorialComplete) {
      return { ...player, tutorialComplete: false };
    }
    return player;
  }, [player, identity?.isDemo]);

  const onboardingProfileMission = useMemo(
    () => findOnboardingProfileMission(milestones, missions),
    [milestones, missions],
  );

  const missionsReady = !journey.isInitialLoading && !sessionMeta.isInitialLoading;

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
        if (fromTutorial) {
          sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
        }
        navigate(`/form/${sessionId}/${missionId}`);
      } else {
        setPopupMission(mission);
      }
    },
    [missions, progress.progressEvents, navigate, sessionId],
  );

  const {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    tutorialNextDisabled,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  } = useTutorial(tutorialPlayer, updatePlayer, sessionId, {
    onboardingProfileMission,
    missionsReady,
    onLaunchTutorialMission: (id) => handleMissionClick(id, true),
  });

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

  const isLoading = sessionMeta.isInitialLoading || playerQuery.isInitialLoading ||
    journey.isInitialLoading;

  const buddy = buddyQuery.data ?? null;
  const resources = resourcesQuery.data ?? [];

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
    clearActiveUid();
    sessionStorage.removeItem(TUTORIAL_STEP_KEY);
    sessionStorage.removeItem(TUTORIAL_FORM_KEY);
    navigate("/", { replace: true });
  }, [navigate]);

  const checkingSession = sessionMeta.isInitialLoading;
  const sessionMissing = !checkingSession && !!sessionMeta.error;

  if (!identity) return { status: "no-identity" };
  if (playerQuery.error) return { status: "player-error" };
  if (!checkingSession && sessionMissing) {
    return { status: "session-missing", onRemove: handleRemoveStaleProfile };
  }
  if (sessionMeta.error && !sessionMeta.isInitialLoading) {
    return { status: "session-redirect" };
  }
  if (!player) return { status: "session-redirect" };

  return {
    status: "ready",
    model: {
      sessionId,
      identity,
      player,
      isLoading,
      milestones,
      missions,
      session,
      qrSecret: session?.qrSecret ?? sessionId,
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
      tutorialNextDisabled,
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
