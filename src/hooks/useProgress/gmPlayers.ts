import { useCallback, useEffect, useState } from "react";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { writeAppliedTemplate } from "../../utils/playerDetailStorage.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import {
  createOnboardingJourney as createOnboardingJourneyUseCase,
  type CreateOnboardingJourneyInput,
  type CreateOnboardingJourneyResult,
} from "../../use-cases/createOnboardingJourney.ts";
import type { ClaimStatus } from "../../types/index.ts";

export interface GmPlayerRow {
  readonly playerId: string;
  readonly name: string;
  readonly jobTitle: string;
  readonly claimStatus: ClaimStatus;
  readonly joined: boolean;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number | null;
  readonly isStalled: boolean;
}

export interface UseGmPlayersResult {
  readonly players: ReadonlyArray<GmPlayerRow>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  /** Run the 3-step onboarding wizard use case. */
  readonly createOnboardingJourney: (
    input: CreateOnboardingJourneyInput,
  ) => Promise<CreateOnboardingJourneyResult>;
}

const STALL_DAYS = 3;

export const useGmPlayers = (
  sessionId: string,
  active: boolean,
): UseGmPlayersResult => {
  const adapter = useAdapter();
  const [players, setPlayers] = useState<ReadonlyArray<GmPlayerRow>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createOnboardingJourneyFn = useCallback(
    async (
      input: CreateOnboardingJourneyInput,
    ): Promise<CreateOnboardingJourneyResult> => {
      const result = await createOnboardingJourneyUseCase(
        sessionId,
        adapter,
        input,
      );
      if (result.appliedTemplateName) {
        writeAppliedTemplate(result.playerId, result.appliedTemplateName);
      }
      setRefreshKey((k) => k + 1);
      return result;
    },
    [adapter, sessionId],
  );

  useEffect(() => {
    if (!active || !sessionId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessionPlayers = await adapter.listPlayers(sessionId);
        const rows = await Promise.all(
          sessionPlayers.map(async (p): Promise<GmPlayerRow> => {
            const joined = p.claimStatus === "claimed";
            if (!joined) {
              return {
                playerId: p.id,
                name: p.name,
                jobTitle: p.jobTitle,
                claimStatus: p.claimStatus,
                joined: false,
                progressPercent: 0,
                daysSinceLastActivity: null,
                isStalled: false,
              };
            }

            const [milestones, missions, events] = await Promise.all([
              adapter.listMilestones(sessionId, { playerId: p.id }),
              adapter.listMissions(sessionId, { playerId: p.id }),
              adapter.listProgressEvents(p.id),
            ]);
            const progress = computeProgress(
              p.id,
              missions,
              milestones,
              events,
            );
            const { milestoneProgress } = progress;
            const progressPercent = milestoneProgress.length === 0
              ? 0
              : Math.round(
                (milestoneProgress.reduce(
                  (sum, mp) => sum + mp.percentComplete,
                  0,
                ) /
                  milestoneProgress.length) * 100,
              );
            const lastMs = events.length > 0
              ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
              : null;
            const days = lastMs !== null
              ? Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24))
              : null;

            return {
              playerId: p.id,
              name: p.name,
              jobTitle: p.jobTitle,
              claimStatus: p.claimStatus,
              joined: true,
              progressPercent,
              daysSinceLastActivity: days,
              isStalled: days !== null && days > STALL_DAYS,
            };
          }),
        );

        if (!cancelled) setPlayers(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, sessionId, active, refreshKey]);

  return {
    players,
    loading,
    error,
    refresh,
    createOnboardingJourney: createOnboardingJourneyFn,
  };
};
