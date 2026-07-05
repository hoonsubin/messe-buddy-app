const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateRecoveryKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
    .join("");
};
