export const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";

export const PLAYER_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "assistant", label: "AI Assistant" },
] as const;

export type PlayerTabKey = (typeof PLAYER_TABS)[number]["key"];
