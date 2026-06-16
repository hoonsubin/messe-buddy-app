import type { LocalIdentity } from "../types/index.ts";

let ephemeralIdentity: LocalIdentity | null = null;

/** Set the ephemeral demo identity. Replaces any existing ephemeral identity. */
export function setEphemeralIdentity(identity: LocalIdentity): void {
  ephemeralIdentity = identity;
}

/** Clear the ephemeral demo identity. Safe to call even when not set. */
export function clearEphemeralIdentity(): void {
  ephemeralIdentity = null;
}

/** Read the current ephemeral identity, if any. */
export function readEphemeralIdentity(): LocalIdentity | null {
  return ephemeralIdentity;
}

/** True when an ephemeral demo identity is currently set. */
export function isEphemeralIdentity(): boolean {
  return ephemeralIdentity !== null;
}
