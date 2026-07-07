import type { RouteTabItem } from "../../shared/RouteTabBar.tsx";
import { playerDetailTabPath } from "../../../utils/routeTabs.ts";

export const PLAYER_DETAIL_TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "customize", label: "Customize" },
  { key: "buddy", label: "Assign Buddy" },
  { key: "preboarding", label: "Pre-boarding" },
] as const;

export type PlayerDetailTabKey = (typeof PLAYER_DETAIL_TABS)[number]["key"];

export const playerDetailTabsForPlayer = (
  sessionId: string,
  playerId: string,
  options: { readonly showAnalytics: boolean },
): ReadonlyArray<RouteTabItem> =>
  PLAYER_DETAIL_TABS
    .filter((tab) => tab.key !== "analytics" || options.showAnalytics)
    .map((tab) => ({
      key: tab.key,
      label: tab.label,
      to: playerDetailTabPath(sessionId, playerId, tab.key),
      end: tab.key === "analytics",
    }));
