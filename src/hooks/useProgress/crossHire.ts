import { useCallback, useEffect, useState } from "react";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { MILESTONE_STATUS } from "../../types/index.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import type {
  HireProgressRow,
  UseProgressCrossHireOptions,
  UseProgressCrossHireResult,
} from "./types.ts";

export const useProgressCrossHire = (
  options: Omit<UseProgressCrossHireOptions, "mode">,
): UseProgressCrossHireResult => {
  const { active } = options;
  const adapter = useAdapter();
  const [rows, setRows] = useState<ReadonlyArray<HireProgressRow>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await adapter.listSessions();
        if (cancelled) return;

        const result: HireProgressRow[] = [];

        for (const s of sessions) {
          if (cancelled) return;

          const [sessionPlayers, sessionMilestonesRaw, sessionMissions] =
            await Promise.all([
              adapter.listPlayers(s.id),
              adapter.listMilestones(s.id),
              adapter.listMissions(s.id),
            ]);
          if (cancelled) return;

          // Sort milestones by .order so index-based position is meaningful
          const sessionMilestones = [...sessionMilestonesRaw].sort(
            (a, b) => a.order - b.order,
          );

          for (const p of sessionPlayers) {
            if (cancelled) return;

            const events = await adapter.listProgressEvents(p.id);
            const progress = computeProgress(
              p.id,
              sessionMissions,
              sessionMilestones,
              events,
            );

            const { milestoneProgress, totalXP } = progress;

            const progressPercent = milestoneProgress.length === 0
              ? 0
              : Math.round(
                (milestoneProgress.reduce(
                  (sum, mp) => sum + mp.percentComplete,
                  0,
                ) / milestoneProgress.length) * 100,
              );

            // Current milestone: first in-progress, else first upcoming, else last
            const activeIdx = (() => {
              const inProgress = milestoneProgress.findIndex(
                (mp) => mp.status === MILESTONE_STATUS.IN_PROGRESS,
              );
              if (inProgress >= 0) return inProgress;
              const upcoming = milestoneProgress.findIndex(
                (mp) => mp.status === MILESTONE_STATUS.UPCOMING,
              );
              return upcoming >= 0 ? upcoming : milestoneProgress.length - 1;
            })();

            const currentMilestoneName = sessionMilestones[activeIdx]?.name ??
              "—";

            const lastActivityMs = events.length > 0
              ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
              : null;

            const daysSinceLastActivity = lastActivityMs !== null
              ? Math.floor(
                (Date.now() - lastActivityMs) / (1000 * 60 * 60 * 24),
              )
              : null;

            result.push({
              playerId: p.id,
              playerName: p.name || p.uid || p.id,
              sessionName: s.name,
              progressPercent,
              daysSinceLastActivity,
              isStalled: daysSinceLastActivity !== null &&
                daysSinceLastActivity > 3,
              totalXP,
              currentMilestoneName,
              currentMilestoneIndex: activeIdx + 1,
              totalMilestones: sessionMilestones.length,
            });
          }
        }

        if (!cancelled) setRows(result);
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
  }, [adapter, active, refreshKey]);

  return { mode: "crossHire", rows, loading, error, refresh };
};

export type { HireProgressRow } from "./types.ts";
