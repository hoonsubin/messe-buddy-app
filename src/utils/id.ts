/**
 * Generates a random 15-character alphanumeric ID.
 *
 * Not cryptographically secure - intended for local draft keys, UI list keys,
 * and optimistic IDs that will be replaced by the backend on persistence.
 */
export const makeId = (): string =>
  Math.random().toString(36).slice(2, 17).padEnd(15, "0").slice(0, 15);
