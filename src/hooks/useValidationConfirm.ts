import { useCallback, useEffect, useState } from "react";
import type { QRPayload } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useSession } from "./useSession.ts";
import { decodeQRPayload, QRPayloadError } from "../utils/qrPayload.ts";

export type ValidationConfirmErrorKind =
  | "missing_token"
  | "decode"
  | "wrong_session"
  | "confirm"
  | null;

export interface UseValidationConfirmResult {
  readonly payload: QRPayload | null;
  readonly playerName: string;
  readonly missionTitle: string;
  readonly milestoneName: string;
  readonly xpValue: number;
  readonly alreadyCompleted: boolean;
  /**
   * The player session's owning Game Maker uid, once the session has loaded.
   * Callers use this to resolve which locally-cached identity (if any) is
   * authorized to confirm — the player's sessionId never matches a GM's own
   * cached identity, which is scoped to their home session instead.
   */
  readonly gameMakerId: string | null;
  readonly loading: boolean;
  readonly errorKind: ValidationConfirmErrorKind;
  readonly errorMessage: string | null;
  readonly confirming: boolean;
  readonly refresh: () => void;
  readonly retry: () => void;
  readonly confirm: () => Promise<void>;
}

export const useValidationConfirm = (
  sessionId: string,
  token: string,
  validatorUid: string | undefined,
): UseValidationConfirmResult => {
  const adapter = useAdapter();
  const {
    session,
    milestones,
    missions,
    loading: sessionLoading,
    error: sessionError,
    refresh: refreshSession,
  } = useSession(sessionId);

  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const [xpValue, setXpValue] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [errorKind, setErrorKind] = useState<ValidationConfirmErrorKind>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [decodeKey, setDecodeKey] = useState(0);

  const refresh = useCallback(() => refreshSession(), [refreshSession]);
  const retry = useCallback(() => {
    setDecodeKey((k) => k + 1);
    setErrorKind(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!token) return;

    if (!sessionId || sessionLoading || sessionError || !session) return;

    let cancelled = false;

    const decode = async () => {
      setDecoding(true);
      setErrorKind(null);
      setErrorMessage(null);
      setPayload(null);

      const secret = session.qrSecret ?? sessionId;

      try {
        const decoded = await decodeQRPayload(token, secret);

        if (decoded.sessionId !== sessionId) {
          if (!cancelled) {
            setErrorKind("wrong_session");
            setErrorMessage("This QR code belongs to a different session.");
          }
          return;
        }

        const mission = missions.find((m) => m.id === decoded.missionId);
        const milestone = mission
          ? milestones.find((ms) => ms.id === mission.milestoneId)
          : undefined;
        const player = await adapter.getPlayerById(decoded.playerId);
        const events = await adapter.listProgressEvents(decoded.playerId);
        const existing = events.find((e) => e.missionId === decoded.missionId);
        const completed = existing?.status === "completed" ||
          existing?.status === "autoApproved";

        if (!cancelled) {
          setPayload(decoded);
          setPlayerName(player?.name || player?.uid || decoded.playerId);
          setMissionTitle(mission?.title ?? decoded.missionId);
          setMilestoneName(milestone?.name ?? "");
          setXpValue(mission?.xpValue ?? decoded.xpValue);
          setAlreadyCompleted(completed);
        }
      } catch (e) {
        if (!cancelled) {
          setErrorKind("decode");
          setErrorMessage(
            e instanceof QRPayloadError
              ? e.message
              : "Could not verify this QR code.",
          );
        }
      } finally {
        if (!cancelled) setDecoding(false);
      }
    };

    void decode();
    return () => {
      cancelled = true;
    };
  }, [
    adapter,
    decodeKey,
    milestones,
    missions,
    session,
    sessionError,
    sessionId,
    sessionLoading,
    token,
  ]);

  const confirm = useCallback(async () => {
    if (!payload || alreadyCompleted || confirming) return;
    setConfirming(true);
    setErrorKind(null);
    setErrorMessage(null);
    try {
      await adapter.upsertProgressEvent(payload.playerId, payload.missionId, {
        status: "completed",
        validatedBy: validatorUid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
    } catch {
      setErrorKind("confirm");
      setErrorMessage("Failed to save validation. Please try again.");
      setConfirming(false);
      throw new Error("confirm failed");
    }
  }, [adapter, alreadyCompleted, confirming, payload, validatorUid]);

  const loading = sessionLoading || decoding;

  return {
    payload,
    playerName,
    missionTitle,
    milestoneName,
    xpValue,
    alreadyCompleted,
    gameMakerId: session?.gameMakerId ?? null,
    loading,
    errorKind: sessionError ? "decode" : errorKind,
    errorMessage: sessionError ? "Could not load session data." : errorMessage,
    confirming,
    refresh,
    retry,
    confirm,
  };
};
