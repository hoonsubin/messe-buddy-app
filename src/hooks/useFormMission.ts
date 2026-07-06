import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormSchema, Mission, PBRecord, Player } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { isOnboardingProfileMission } from "../utils/onboardingMission.ts";

interface UseFormMissionOptions {
  readonly player: Player | null;
  readonly updatePlayer: (
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ) => Promise<Player>;
  readonly markAutoApproved: (
    missionId: string,
    patch?: Partial<
      Pick<import("../types/index.ts").ProgressEvent, "formResponse">
    >,
  ) => Promise<void>;
}

export interface UseFormMissionResult {
  readonly formSchema: FormSchema | null;
  readonly missionTitle: string;
  readonly missionBody: string | undefined;
  /** Pre-populated initial values for the profile form.
   *  Empty object for all other missions. */
  readonly initialValues: Record<string, string>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly submitForm: (values: Record<string, string>) => Promise<void>;
}

export const useFormMission = (
  _sessionId: string,
  missionId: string | undefined,
  missions: ReadonlyArray<
    Pick<Mission, "id" | "title" | "body" | "tags">
  >,
  options: UseFormMissionOptions,
): UseFormMissionResult => {
  const adapter = useAdapter();
  const { player, updatePlayer, markAutoApproved } = options;
  const mission = missions.find((m) => m.id === missionId) ?? null;
  const isProfileMission = mission !== null &&
    isOnboardingProfileMission(mission);

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(!!missionId);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!missionId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const schema = await adapter.getFormSchema(missionId);
        if (!cancelled) setFormSchema(schema);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, missionId, refreshKey]);

  // ── Profile form pre-population (PLR-1) ────────────────────────────────────
  // When the player opens the onboarding profile mission, pre-fill from their
  // Player record. GM-seeded fields surface here so the player confirms rather
  // than typing everything from scratch.
  const initialValues = useMemo<Record<string, string>>(() => {
    if (!isProfileMission || !player) {
      return {} as Record<string, string>;
    }
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

      await markAutoApproved(missionId, { formResponse: values });

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

        await updatePlayer(
          patch as unknown as Partial<Omit<Player, keyof PBRecord>>,
        );
      }
    },
    [markAutoApproved, isProfileMission, missionId, player, updatePlayer],
  );

  return {
    formSchema,
    missionTitle: mission?.title ?? "Form Mission",
    missionBody: mission?.body,
    initialValues,
    loading,
    error,
    refresh,
    submitForm,
  };
};
