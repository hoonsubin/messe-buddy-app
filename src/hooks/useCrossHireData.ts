import { useEffect, useState } from "react";
import type { AppAdapter } from "../adapters/interface.ts";
import type { HireProgressRow } from "../components/admin/CrossHireDashboard.tsx";
import { computeProgress } from "../use-cases/computeProgress.ts";

/**
 * Fetches cross-hire progress data for all sessions.
 * Only runs when `active` is true (i.e. the "All New Hires" tab is selected).
 */
export const useCrossHireData = (
  adapter: AppAdapter,
  active: boolean,
): ReadonlyArray<HireProgressRow> => {
  const [rows, setRows] = useState<ReadonlyArray<HireProgressRow>>([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const fetch = async () => {
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
            ? Math.floor((Date.now() - lastActivityMs) / (1000 * 60 * 60 * 24))
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
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, active]);

  return rows;
};
