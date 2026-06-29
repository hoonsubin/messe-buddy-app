import { USER_ROLE } from "../../types/index.ts";

export type LandingRole = "player" | "admin";

export const landingRoleFor = (role: string): LandingRole =>
  role === USER_ROLE.GAMEMAKER ? "admin" : "player";

export const roleLabel = (role: string): string =>
  role === USER_ROLE.GAMEMAKER ? "Admin" : "Employee";

export const profileInitials = (name?: string): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};
