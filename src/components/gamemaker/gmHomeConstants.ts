export const GM_HOME_TABS = [
  { key: "players", label: "Players" },
  { key: "library", label: "Resource library" },
] as const;

export type GmHomeTabKey = (typeof GM_HOME_TABS)[number]["key"];
