import { useCallback, useEffect, useState } from "react";
import type { PBRecord, Player } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseResolvedPlayerResult {
  readonly player: Player | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly updatePlayer: (
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ) => Promise<Player>;
}

/** Resolves a client UID to the canonical Player record. */
export const useResolvedPlayer = (
  uid: string | undefined,
): UseResolvedPlayerResult => {
  const adapter = useAdapter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(!!uid);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await adapter.getPlayer(uid);
        if (!cancelled) setPlayer(p);
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
  }, [adapter, uid, refreshKey]);

  const updatePlayer = useCallback(
    async (patch: Partial<Omit<Player, keyof PBRecord>>) => {
      if (!player) throw new Error("No player loaded");
      const updated = await adapter.updatePlayer(player.id, patch);
      setPlayer(updated);
      return updated;
    },
    [adapter, player],
  );

  return { player, loading, error, refresh, updatePlayer };
};
