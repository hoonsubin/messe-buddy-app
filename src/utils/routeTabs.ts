import type { GmHomeTabKey } from "../components/gamemaker/gmHomeConstants.ts";
import type { PlayerDetailTabKey } from "../components/gamemaker/player-detail/constants.ts";
import type { PlayerTabKey } from "../components/player/constants.ts";

export const playerCockpitTabPath = (
  sessionId: string,
  tab: PlayerTabKey,
): string =>
  tab === "dashboard"
    ? `/session/${sessionId}`
    : `/session/${sessionId}/assistant`;

export const parsePlayerCockpitTab = (pathname: string): PlayerTabKey =>
  pathname.endsWith("/assistant") ? "assistant" : "dashboard";

export const gmHomeTabPath = (
  sessionId: string,
  tab: GmHomeTabKey,
): string =>
  tab === "players"
    ? `/gamemaker/${sessionId}`
    : `/gamemaker/${sessionId}/library`;

export const parseGmHomeTab = (pathname: string): GmHomeTabKey =>
  pathname.endsWith("/library") ? "library" : "players";

export const playerDetailTabPath = (
  sessionId: string,
  playerId: string,
  tab: PlayerDetailTabKey,
): string => {
  const base = `/gamemaker/${sessionId}/player/${playerId}`;
  return tab === "analytics" ? base : `${base}/${tab}`;
};

export const playerDetailScanPath = (
  sessionId: string,
  playerId: string,
): string => `/gamemaker/${sessionId}/player/${playerId}/scan`;

export const parsePlayerDetailTab = (
  pathname: string,
): PlayerDetailTabKey | "scan" => {
  if (pathname.endsWith("/scan")) return "scan";
  if (pathname.endsWith("/customize")) return "customize";
  if (pathname.endsWith("/buddy")) return "buddy";
  if (pathname.endsWith("/preboarding")) return "preboarding";
  return "analytics";
};
