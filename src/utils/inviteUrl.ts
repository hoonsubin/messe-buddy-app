// Invite token utilities for the player slot & invite system (PLR-1).
// Tokens are short random alphanumeric strings — validation is a DB lookup,
// not a cryptographic signature.

const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 12;

/** Generate a one-time invite token (12 chars, URL-safe alphanumeric). */
export const generateInviteToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH));
  return Array.from(bytes)
    .map((b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length])
    .join("");
};

/** Read invite token from join URL search params (`?t=` per SPECS, `?token=` legacy). */
export const parseInviteTokenFromSearch = (
  searchParams: URLSearchParams,
): string => {
  const fromT = searchParams.get("t")?.trim();
  if (fromT) return fromT;
  return searchParams.get("token")?.trim() ?? "";
};

/**
 * Build the full invite URL for a player slot.
 * Resolves against window.location.origin so it works in both dev and prod.
 * Format: `<origin>/join/<sessionId>?t=<token>`
 */
export const buildInviteUrl = (sessionId: string, token: string): string => {
  const origin = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173";
  return `${origin}/join/${sessionId}?t=${encodeURIComponent(token)}`;
};
