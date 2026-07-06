import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { FormSchema, PBRecord, Player } from "../../types/index.ts";
import { USER_ROLE } from "../../types/index.ts";
import { useActiveProfile } from "../useActiveProfile.ts";
import { useDerivedPlayerProgress } from "../useDerivedPlayerProgress.ts";
import { useMutation } from "../useMutation.ts";
import { useQuery } from "../useQuery.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { devBackendTrace } from "../../store/devBackendTrace.ts";
import {
  fetchFormSchema,
  fetchJourney,
  fetchPlayerByUid,
  fetchProgress,
  fetchSessionMeta,
} from "../../store/queryFetchers.ts";
import { queryKeys } from "../../store/queryKeys.ts";
import { useQueryClient } from "../../store/useQueryClient.ts";
import { isOnboardingProfileMission } from "../../utils/onboardingMission.ts";
import type { UseProgressPlayerResult } from "../progressTypes.ts";

export interface UsePlayerFormPageResult {
  readonly status:
    | "no-identity"
    | "loading"
    | "session-error"
    | "form-error"
    | "no-schema"
    | "ready";
  readonly sessionId: string;
  readonly identity: NonNullable<ReturnType<typeof useActiveProfile>>;
  readonly player: Player | null;
  readonly formSchema: FormSchema | null;
  readonly missionTitle: string;
  readonly missionBody: string | undefined;
  readonly initialValues: Record<string, string>;
  readonly progress: UseProgressPlayerResult;
  readonly sessionError: Error | null;
  readonly formError: Error | null;
  readonly refreshSession: () => void;
  readonly submitForm: (values: Record<string, string>) => Promise<void>;
  readonly navigateBack: () => void;
}

export const usePlayerFormPage = (): UsePlayerFormPageResult => {
  const { sessionId: routeSessionId, missionId } = useParams<{
    sessionId: string;
    missionId: string;
  }>();
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
    sessionId && playerId ? queryKeys.journey(sessionId, playerId) : null,
    fetchJourney(sessionId, playerId),
    { enabled: !!sessionId && !!playerId },
  );

  const progressQuery = useQuery(
    playerId ? queryKeys.progress(playerId) : null,
    fetchProgress(playerId),
    { enabled: !!playerId },
  );

  const formSchemaQuery = useQuery(
    missionId ? queryKeys.formSchema(missionId) : null,
    fetchFormSchema(missionId ?? ""),
    { enabled: !!missionId },
  );

  const milestones = journey.data?.milestones ?? [];
  const missions = journey.data?.missions ?? [];
  const mission = missions.find((m) => m.id === missionId) ?? null;
  const isProfileMission = mission !== null &&
    isOnboardingProfileMission(mission);

  const refreshProgress = useCallback(() => {
    if (playerId) client.invalidateQuery(queryKeys.progress(playerId));
  }, [client, playerId]);

  const progress = useDerivedPlayerProgress(
    playerId,
    milestones,
    missions,
    progressQuery.data,
    progressQuery.isInitialLoading,
    progressQuery.error,
    refreshProgress,
  );

  const updatePlayerMutation = useMutation({
    label: "player:update",
    mutationFn: async (patch: Partial<Omit<Player, keyof PBRecord>>) => {
      if (!player) throw new Error("No player loaded");
      return adapter.updatePlayer(player.id, patch);
    },
    invalidateKeys: () =>
      uid ? [queryKeys.playerUid(uid), queryKeys.playerId(playerId)] : [],
  });

  const initialValues = useMemo((): Record<string, string> => {
    if (!isProfileMission || !player) return {};
    return {
      name: player.name ?? "",
      preferredName: player.preferredName ?? "",
      pronouns: player.pronouns ?? "",
      role: player.jobTitle ?? "",
      department: player.department ?? "",
      team: player.team ?? "",
      location: player.location ?? "",
      timezone: player.timezone ?? "",
      workArrangement: player.workStyle ?? "",
      languages: (player.languages ?? []).join(", "),
      skillsConfident: (player.skillsConfident ?? []).join(", "),
      catchUpAreas: (player.skillsDevelop ?? []).join(", "),
    };
  }, [isProfileMission, player]);

  const submitForm = useCallback(
    async (values: Record<string, string>) => {
      if (!player || !missionId) {
        throw new Error("Player or mission not loaded");
      }

      await progress.markAutoApproved(missionId, { formResponse: values });

      if (isProfileMission) {
        const patch: Record<string, unknown> = {
          profileComplete: true,
          tutorialComplete: true,
        };

        if (values.name) patch["name"] = values.name;
        if (values.preferredName !== undefined) {
          patch["preferredName"] = values.preferredName || undefined;
        }
        if (values.pronouns !== undefined) {
          patch["pronouns"] = values.pronouns || undefined;
        }
        if (values.role) patch["jobTitle"] = values.role;
        if (values.department !== undefined) {
          patch["department"] = values.department || undefined;
        }
        if (values.team) patch["team"] = values.team;
        if (values.location) patch["location"] = values.location;
        if (values.timezone) patch["timezone"] = values.timezone;
        if (values.workArrangement) {
          patch["workStyle"] = values.workArrangement;
        }
        if (values.languages) {
          patch["languages"] = values.languages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (values.skillsConfident) {
          patch["skillsConfident"] = values.skillsConfident
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (values.catchUpAreas) {
          patch["skillsDevelop"] = values.catchUpAreas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        await updatePlayerMutation.mutate(
          patch as unknown as Partial<Omit<Player, keyof PBRecord>>,
        );
      }
    },
    [
      isProfileMission,
      missionId,
      player,
      progress,
      updatePlayerMutation,
    ],
  );

  const refreshSession = useCallback(() => {
    client.invalidateQuery([
      queryKeys.sessionMeta(sessionId),
      queryKeys.journey(sessionId, playerId),
      ...(missionId ? [queryKeys.formSchema(missionId)] : []),
    ]);
  }, [client, missionId, playerId, sessionId]);

  const navigateBack = useCallback(() => {
    navigate(`/session/${sessionId}`);
  }, [navigate, sessionId]);

  if (!identity) return { status: "no-identity" } as UsePlayerFormPageResult;

  const sessionLoading = sessionMeta.isInitialLoading ||
    playerQuery.isInitialLoading ||
    journey.isInitialLoading;
  const formLoading = formSchemaQuery.isInitialLoading;

  if (sessionMeta.error && !sessionLoading) {
    return {
      status: "session-error",
      sessionId,
      identity,
      player,
      formSchema: null,
      missionTitle: "",
      missionBody: undefined,
      initialValues: {},
      progress,
      sessionError: sessionMeta.error,
      formError: null,
      refreshSession,
      submitForm,
      navigateBack,
    };
  }

  if (sessionLoading || formLoading) {
    return { status: "loading" } as UsePlayerFormPageResult;
  }

  if (formSchemaQuery.error) {
    return {
      status: "form-error",
      sessionId,
      identity,
      player,
      formSchema: null,
      missionTitle: mission?.title ?? "Form Mission",
      missionBody: mission?.body,
      initialValues,
      progress,
      sessionError: null,
      formError: formSchemaQuery.error,
      refreshSession,
      submitForm,
      navigateBack,
    };
  }

  if (!formSchemaQuery.data) {
    return {
      status: "no-schema",
      sessionId,
      identity,
      player,
      formSchema: null,
      missionTitle: mission?.title ?? "Form Mission",
      missionBody: mission?.body,
      initialValues,
      progress,
      sessionError: null,
      formError: null,
      refreshSession,
      submitForm,
      navigateBack,
    };
  }

  return {
    status: "ready",
    sessionId,
    identity,
    player,
    formSchema: formSchemaQuery.data,
    missionTitle: mission?.title ?? "Form Mission",
    missionBody: mission?.body,
    initialValues,
    progress,
    sessionError: null,
    formError: null,
    refreshSession,
    submitForm,
    navigateBack,
  };
};
