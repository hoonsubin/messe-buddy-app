import type { FieldType, UserRole } from "./unions.ts";

// Client-only value objects — never persisted to PocketBase.

export interface FieldSchema {
  readonly id: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly options?: ReadonlyArray<string>; // select / multiSelect only
}

// QR strategy only — used when mission.validationMethod = 'qr'. (C-07, C-16)
// hmac = HMAC-SHA256(playerId + missionId + sessionId + issuedAt, sessionSecret)
// Never transmitted to the player device; computed by GM and verified at scan time.
export interface QRPayload {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly xpValue: number;
  readonly issuedAt: number; // Unix ms timestamp
  readonly hmac: string; // hex-encoded HMAC-SHA256 (C-16)
}

// Decoded and enriched after QR scan — shown in ValidationResult.
export interface ScanData {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly xpValue: number;
  readonly playerName: string;
  readonly missionTitle: string;
  readonly decodedAt: string;
}

// Written to localStorage.getItem('mb_identity'). (C-03)
export interface LocalIdentity {
  readonly uid: string; // client-generated UUID
  readonly recoveryKey: string; // 8-char alphanumeric; also in players.recoveryKey
  readonly sessionId: string; // PB record ID of the session
  readonly role: UserRole; // 'player' | 'gamemaker'
}
