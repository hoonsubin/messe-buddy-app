import type { RouteTabItem } from "../shared/RouteTabBar.tsx";
import { playerCockpitTabPath } from "../../utils/routeTabs.ts";

export const PLAYER_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "assistant", label: "AI Assistant" },
] as const;

export type PlayerTabKey = (typeof PLAYER_TABS)[number]["key"];

export const playerCockpitTabsForSession = (
  sessionId: string,
): ReadonlyArray<RouteTabItem> =>
  PLAYER_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    to: playerCockpitTabPath(sessionId, tab.key),
    end: tab.key === "dashboard",
  }));
