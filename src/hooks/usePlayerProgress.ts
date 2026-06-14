import { useEffect, useState } from "react";
import type {
  Milestone,
  Mission,
  PlayerProgress,
  ProgressEvent,
} from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";

export interface UsePlayerProgressResult {
  readonly playerProgress: PlayerProgress | null;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly loading: boolean;
  readonly error: Error | null;
}

// Fetches ProgressEvents and derives PlayerProgress via computeProgress.
export const usePlayerProgress = (
  playerId: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
): UsePlayerProgressResult => {
  const adapter = useAdapter();
  const [progressEvents, setProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const events = await adapter.listProgressEvents(playerId);
        if (!cancelled) {
          setProgressEvents(events);
          if (milestones.length > 0 && missions.length > 0) {
            setPlayerProgress(
              computeProgress(playerId, missions, milestones, events),
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (playerId) {
      void fetch();
    }

    return () => {
      cancelled = true;
    };
  }, [adapter, playerId, milestones, missions]);

  return { playerProgress, progressEvents, loading, error };
};
