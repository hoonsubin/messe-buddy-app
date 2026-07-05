const INVITE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** URL-safe opaque invite key for `players.inviteToken`. */
export const generateInviteToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length])
    .join("");
};
