import { useCallback, useEffect, useState } from "react";
import { useAdapter } from "../../adapters/useAdapter.ts";
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

          const [sessionPlayers, sessionMilestones, sessionMissions] =
            await Promise.all([
              adapter.listPlayers(s.id),
              adapter.listMilestones(s.id),
              adapter.listMissions(s.id),
            ]);
          if (cancelled) return;

          for (const p of sessionPlayers) {
            if (cancelled) return;

            const events = await adapter.listProgressEvents(p.id);
            const progress = computeProgress(
              p.id,
              sessionMissions,
              sessionMilestones,
              events,
            );

            const progressPercent = (() => {
              const { milestoneProgress } = progress;
              if (milestoneProgress.length === 0) return 0;
              const total = milestoneProgress.reduce(
                (sum, mp) => sum + mp.percentComplete,
                0,
              );
              return Math.round((total / milestoneProgress.length) * 100);
            })();

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
