import type { LandingView } from "../../hooks/useLandingFlow.ts";

export const LANDING_SUBTITLES: Partial<Record<LandingView, string>> = {
  "role-select": "Choose how you'd like to join",
  "returning-user": "Welcome back",
  join: "Enter your session code",
  create: "Create a new onboarding session",
  recover: "Restore your progress",
};
