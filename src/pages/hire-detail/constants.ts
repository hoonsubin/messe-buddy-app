export const HIRE_DETAIL_TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "customize", label: "Customize" },
  { key: "buddy", label: "Assign Buddy" },
  { key: "preboarding", label: "Pre-boarding" },
] as const;

export type HireDetailTabKey = (typeof HIRE_DETAIL_TABS)[number]["key"];
