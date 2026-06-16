// URL transport wrapper for signed QR payloads. (C-16)
// Encoding: qrPayload.ts → buildValidationUrl → QR canvas
// Decoding: scanner reads string → parseValidationToken → ValidationPage ?t=

export interface ParsedValidationToken {
  readonly sessionId: string;
  readonly token: string;
}

const VALIDATE_PATH_RE = /\/validate\/([^/]+)$/;

const parseFromUrl = (url: URL): ParsedValidationToken | null => {
  const match = url.pathname.match(VALIDATE_PATH_RE);
  if (!match?.[1]) return null;
  const token = url.searchParams.get("t");
  if (!token) return null;
  return { sessionId: match[1], token };
};

export const buildValidationUrl = (
  sessionId: string,
  encodedPayload: string,
): string => {
  const origin = typeof globalThis.location !== "undefined"
    ? globalThis.location.origin
    : "";
  const query = new URLSearchParams({ t: encodedPayload });
  return `${origin}/validate/${sessionId}?${query.toString()}`;
};

export const validationPathFromToken = (
  sessionId: string,
  token: string,
): string => {
  const query = new URLSearchParams({ t: token });
  return `/validate/${sessionId}?${query.toString()}`;
};

export const parseValidationToken = (
  scanned: string,
): ParsedValidationToken | null => {
  const trimmed = scanned.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return parseFromUrl(new URL(trimmed));
    }

    const base = typeof globalThis.location !== "undefined"
      ? globalThis.location.origin
      : "http://localhost";
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return parseFromUrl(new URL(path, base));
  } catch {
    return null;
  }
};
