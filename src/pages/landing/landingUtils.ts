import { USER_ROLE } from "../../types/index.ts";

export type LandingRole = "player" | "gamemaker";

export const landingRoleFor = (role: string): LandingRole =>
  role === USER_ROLE.GAMEMAKER ? "gamemaker" : "player";

export const roleLabel = (role: string): string =>
  role === USER_ROLE.GAMEMAKER ? "Game Maker" : "Employee";

export const profileInitials = (name?: string): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};
