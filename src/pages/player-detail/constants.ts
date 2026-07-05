export const PLAYER_DETAIL_TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "customize", label: "Customize" },
  { key: "buddy", label: "Assign Buddy" },
  { key: "preboarding", label: "Pre-boarding" },
] as const;

export type PlayerDetailTabKey = (typeof PLAYER_DETAIL_TABS)[number]["key"];

export const visiblePlayerDetailTabs = (options: {
  readonly showAnalytics: boolean;
}) =>
  PLAYER_DETAIL_TABS.filter((tab) =>
    tab.key !== "analytics" || options.showAnalytics
  );
