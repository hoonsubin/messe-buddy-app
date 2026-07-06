export const PLAYER_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "assistant", label: "AI Assistant" },
] as const;

export type PlayerTabKey = (typeof PLAYER_TABS)[number]["key"];
