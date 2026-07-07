import type { RouteTabItem } from "../shared/RouteTabBar.tsx";
import { gmHomeTabPath } from "../../utils/routeTabs.ts";

export const GM_HOME_TABS = [
  { key: "players", label: "Players" },
  { key: "library", label: "Resource library" },
] as const;

export type GmHomeTabKey = (typeof GM_HOME_TABS)[number]["key"];

export const gmHomeTabsForSession = (
  sessionId: string,
): ReadonlyArray<RouteTabItem> =>
  GM_HOME_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    to: gmHomeTabPath(sessionId, tab.key),
    end: tab.key === "players",
  }));
