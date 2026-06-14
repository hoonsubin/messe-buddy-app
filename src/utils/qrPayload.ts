import type { QRPayload } from "../types/index.ts";

// Single encode/decode point for QR payloads. (C-16)
//
// The `secret` is the session secret — never transmitted to the player device.
// In the mock adapter, pass the sessionId as a stand-in secret.
// In the PocketBase adapter, derive it from a server-side session field.
//
// Encoding:   QRPayload (minus hmac) → compute HMAC → embed → JSON → base64
// Decoding:   base64 → JSON → verify HMAC → return QRPayload (or throw)

// ── HMAC ──────────────────────────────────────────────────────────────────────

// Message format per SPECS.md C-16: concatenation of the four identity fields.
const hmacMessage = (
  playerId: string,
  missionId: string,
  sessionId: string,
  issuedAt: number
): string => {
  return `${playerId}${missionId}${sessionId}${issuedAt}`;
};

const computeHmac = async (message: string, secret: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const verifyHmac = async (
  message: string,
  secret: string,
  expected: string
): Promise<boolean> => {
  const actual = await computeHmac(message, secret);
  // Constant-time comparison via subtle.verify is preferred; we use string
  // equality here because the secret never leaves the GM device (C-07).
  return actual === expected;
};

// ── Encode ────────────────────────────────────────────────────────────────────

export type QRPayloadInput = Omit<QRPayload, "hmac">;

export const encodeQRPayload = async (
  input: QRPayloadInput,
  secret: string
): Promise<string> => {
  const hmac = await computeHmac(
    hmacMessage(input.playerId, input.missionId, input.sessionId, input.issuedAt),
    secret
  );
  const payload: QRPayload = { ...input, hmac };
  return btoa(JSON.stringify(payload));
};

// ── Decode ────────────────────────────────────────────────────────────────────

export class QRPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QRPayloadError";
  }
}

export const decodeQRPayload = async (
  encoded: string,
  secret: string
): Promise<QRPayload> => {
  let raw: unknown;
  try {
    raw = JSON.parse(atob(encoded));
  } catch {
    throw new QRPayloadError("Invalid QR payload: not base64-encoded JSON");
  }

  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as Record<string, unknown>).playerId !== "string" ||
    typeof (raw as Record<string, unknown>).missionId !== "string" ||
    typeof (raw as Record<string, unknown>).sessionId !== "string" ||
    typeof (raw as Record<string, unknown>).xpValue !== "number" ||
    typeof (raw as Record<string, unknown>).issuedAt !== "number" ||
    typeof (raw as Record<string, unknown>).hmac !== "string"
  ) {
    throw new QRPayloadError("Invalid QR payload: missing required fields");
  }

  const candidate = raw as QRPayload;

  const valid = await verifyHmac(
    hmacMessage(
      candidate.playerId,
      candidate.missionId,
      candidate.sessionId,
      candidate.issuedAt
    ),
    secret,
    candidate.hmac
  );

  if (!valid) {
    throw new QRPayloadError("Invalid QR payload: HMAC verification failed");
  }

  return candidate;
}
