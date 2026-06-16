import type { DraftMission } from "../types/index.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoredDraft {
  readonly draft: DraftMission;
  readonly missionId: string;
  readonly savedAt: string;
}

// ── Key generator ──────────────────────────────────────────────────────────────

export const DRAFT_KEY = (sessionId: string, missionId: string) =>
  `mb_draft_${sessionId}_${missionId}`;

// ── Load ───────────────────────────────────────────────────────────────────────

export const loadStoredDraft = (
  sessionId: string,
  missionId: string,
): StoredDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(sessionId, missionId));
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
};

// ── Save ───────────────────────────────────────────────────────────────────────

export const saveStoredDraft = (
  sessionId: string,
  missionId: string,
  draft: DraftMission,
) => {
  const payload: StoredDraft = {
    draft,
    missionId,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      DRAFT_KEY(sessionId, missionId),
      JSON.stringify(payload),
    );
  } catch { /* storage full or disabled */ }
};

// ── Clear ──────────────────────────────────────────────────────────────────────

export const clearStoredDraft = (sessionId: string, missionId: string) => {
  try {
    localStorage.removeItem(DRAFT_KEY(sessionId, missionId));
  } catch { /* ignore */ }
};

// ── Formatting ─────────────────────────────────────────────────────────────────

export const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "earlier";
  }
};
