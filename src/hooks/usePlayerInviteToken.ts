import { useEffect, useMemo, useState } from "react";
import { useAdapter } from "../adapters/useAdapter.ts";

/** Resolve invite token for a player row (direct fetch + optional nav fallback). */
export const usePlayerInviteToken = (
  playerId: string,
  options: {
    readonly listToken?: string;
    readonly navToken?: string;
  } = {},
): string => {
  const adapter = useAdapter();
  const [fetchedToken, setFetchedToken] = useState("");

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    void adapter.getPlayerById(playerId).then((player) => {
      if (!cancelled && player?.inviteToken) {
        setFetchedToken(player.inviteToken);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adapter, playerId]);

  return useMemo(() => {
    const fromList = options.listToken ?? "";
    if (fromList.length >= 8) return fromList;
    if (fetchedToken.length >= 8) return fetchedToken;
    const nav = options.navToken ?? "";
    if (nav.length >= 8) return nav;
    return fromList || fetchedToken || nav;
  }, [options.listToken, options.navToken, fetchedToken]);
};
