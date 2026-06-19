/**
 * Generates a random 15-character alphanumeric ID compatible with PocketBase's
 * ID format ([a-z0-9], 15 chars). Used both as local draft keys and as the
 * caller-specified ID passed to PocketBase on record creation, so draft ID ===
 * server ID from the moment of creation — no post-save remapping required.
 *
 * Not cryptographically secure; collision probability is negligible at the
 * scale of a single MesseBuddy session.
 */
export const makeId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 15 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};
