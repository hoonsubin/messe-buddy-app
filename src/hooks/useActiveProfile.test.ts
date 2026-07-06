import { assertEquals } from "jsr:@std/assert@1";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { resolveActiveProfile } from "./resolveActiveProfile.ts";

const player = (
  uid: string,
  sessionId: string,
  name: string,
): CachedIdentity => ({
  uid,
  sessionId,
  name,
  role: USER_ROLE.PLAYER,
  recoveryKey: `rk_${uid}`,
});

Deno.test("resolveActiveProfile returns first match when no active uid", () => {
  const profiles = [
    player("uid_a", "sess1", "Alice"),
    player("uid_b", "sess1", "Bob"),
  ];
  assertEquals(
    resolveActiveProfile(profiles, "sess1", USER_ROLE.PLAYER)?.uid,
    "uid_a",
  );
});

Deno.test("resolveActiveProfile prefers mb_active_uid among same-session players", () => {
  const profiles = [
    player("uid_a", "sess1", "Alice"),
    player("uid_b", "sess1", "Bob"),
  ];
  assertEquals(
    resolveActiveProfile(profiles, "sess1", USER_ROLE.PLAYER, "uid_b")?.name,
    "Bob",
  );
});

Deno.test("resolveActiveProfile ignores active uid from a different session", () => {
  const profiles = [
    player("uid_a", "sess1", "Alice"),
    player("uid_b", "sess2", "Bob"),
  ];
  assertEquals(
    resolveActiveProfile(profiles, "sess1", USER_ROLE.PLAYER, "uid_b")?.uid,
    "uid_a",
  );
});
