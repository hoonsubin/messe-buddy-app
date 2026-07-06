import { useCallback, useEffect, useMemo, useState } from "react";
import type { QRPayload } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { devBackendTrace } from "../../store/devBackendTrace.ts";
import {
  fetchJourney,
  fetchPlayerById,
  fetchProgress,
  fetchSessionMeta,
} from "../../store/queryFetchers.ts";
import { queryKeys } from "../../store/queryKeys.ts";
import { useQueryClient } from "../../store/useQueryClient.ts";
import { decodeQRPayload, QRPayloadError } from "../../utils/qrPayload.ts";
import { useMutation } from "../useMutation.ts";
import { useQuery } from "../useQuery.ts";

export type ValidationConfirmErrorKind =
  | "missing_token"
  | "decode"
  | "wrong_session"
  | "confirm"
  | null;

export interface UseValidationPageResult {
  readonly payload: QRPayload | null;
  readonly playerName: string;
  readonly missionTitle: string;
  readonly milestoneName: string;
  readonly xpValue: number;
  readonly alreadyCompleted: boolean;
  readonly gameMakerId: string | null;
  readonly loading: boolean;
  readonly errorKind: ValidationConfirmErrorKind;
  readonly errorMessage: string | null;
  readonly confirming: boolean;
  readonly refresh: () => void;
  readonly retry: () => void;
  readonly confirm: (overrideValidatorUid?: string) => Promise<void>;
}

export const useValidationPage = (
  sessionId: string,
  token: string,
): UseValidationPageResult => {
  const adapter = useAdapter();
  const client = useQueryClient();
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [decodeError, setDecodeError] = useState<
    { kind: ValidationConfirmErrorKind; message: string } | null
  >(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeKey, setDecodeKey] = useState(0);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) devBackendTrace.setActiveScope(sessionId);
  }, [sessionId]);

  const sessionMeta = useQuery(
    sessionId && token ? queryKeys.sessionMeta(sessionId) : null,
    fetchSessionMeta(sessionId),
    { enabled: !!sessionId && !!token },
  );

  useEffect(() => {
    if (!token || !sessionId) return;
    if (sessionMeta.isInitialLoading) return;

    let cancelled = false;

    const run = async () => {
      setDecoding(true);
      setDecodeError(null);

      try {
        const s = sessionMeta.data ?? await adapter.getSession(sessionId);
        const secret = s.qrSecret ?? sessionId;
        const decoded = await decodeQRPayload(token, secret);

        if (decoded.sessionId !== sessionId) {
          if (!cancelled) {
            setDecodeError({
              kind: "wrong_session",
              message: "This QR code belongs to a different session.",
            });
          }
          return;
        }

        if (!cancelled) setPayload(decoded);
      } catch (e) {
        if (!cancelled) {
          setDecodeError({
            kind: "decode",
            message: e instanceof QRPayloadError
              ? e.message
              : "Could not verify this QR code.",
          });
        }
      } finally {
        if (!cancelled) setDecoding(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    adapter,
    decodeKey,
    sessionId,
    token,
    sessionMeta.data?.qrSecret,
    sessionMeta.isInitialLoading,
  ]);

  const playerId = payload?.playerId ?? "";

  const journey = useQuery(
    payload ? queryKeys.journey(sessionId, playerId) : null,
    fetchJourney(sessionId, playerId),
  );
  const progress = useQuery(
    payload ? queryKeys.progress(playerId) : null,
    fetchProgress(playerId),
  );
  const player = useQuery(
    payload ? queryKeys.playerId(playerId) : null,
    fetchPlayerById(playerId),
  );

  const mission = useMemo(
    () =>
      payload
        ? journey.data?.missions.find((m) => m.id === payload.missionId)
        : undefined,
    [journey.data?.missions, payload],
  );
  const milestone = useMemo(
    () =>
      mission
        ? journey.data?.milestones.find((ms) => ms.id === mission.milestoneId)
        : undefined,
    [journey.data?.milestones, mission],
  );

  const alreadyCompleted = useMemo(() => {
    if (!payload) return false;
    const existing = progress.data?.find((e) =>
      e.missionId === payload.missionId
    );
    return existing?.status === "completed" ||
      existing?.status === "autoApproved";
  }, [payload, progress.data]);

  const confirmMutation = useMutation({
    label: "validation:confirm",
    mutationFn: async (validatorUid: string) => {
      if (!payload) throw new Error("No payload");
      return adapter.upsertProgressEvent(payload.playerId, payload.missionId, {
        status: "completed",
        validatedBy: validatorUid,
        validatedAt: new Date().toISOString(),
      });
    },
    invalidateKeys: () =>
      payload
        ? [
          queryKeys.progress(payload.playerId),
          queryKeys.gmRoster(sessionId),
        ]
        : [],
  });

  const confirm = useCallback(
    async (overrideValidatorUid?: string) => {
      if (!payload || alreadyCompleted || confirmMutation.isPending) return;
      setConfirmError(null);
      try {
        await confirmMutation.mutate(overrideValidatorUid ?? "gm");
      } catch {
        setConfirmError("Failed to save validation. Please try again.");
        throw new Error("confirm failed");
      }
    },
    [alreadyCompleted, confirmMutation, payload],
  );

  const retry = useCallback(() => {
    setPayload(null);
    setDecodeKey((k) => k + 1);
    setDecodeError(null);
    if (sessionId) client.invalidateQuery(queryKeys.sessionMeta(sessionId));
  }, [client, sessionId]);

  const refresh = useCallback(() => {
    if (!payload) {
      if (sessionId) client.invalidateQuery(queryKeys.sessionMeta(sessionId));
      return;
    }
    client.invalidateQuery([
      queryKeys.sessionMeta(sessionId),
      queryKeys.journey(sessionId, playerId),
      queryKeys.progress(playerId),
      queryKeys.playerId(playerId),
    ]);
  }, [client, payload, playerId, sessionId]);

  if (!token) {
    return {
      payload: null,
      playerName: "",
      missionTitle: "",
      milestoneName: "",
      xpValue: 0,
      alreadyCompleted: false,
      gameMakerId: null,
      loading: false,
      errorKind: "missing_token",
      errorMessage: "Missing validation token.",
      confirming: false,
      refresh,
      retry,
      confirm,
    };
  }

  const sessionError = sessionMeta.error;
  const loading = sessionMeta.isInitialLoading || decoding ||
    (!!payload &&
      (journey.isInitialLoading || progress.isInitialLoading ||
        player.isInitialLoading));

  const playerName = player.data?.name || player.data?.uid || playerId;
  const missionTitle = mission?.title ?? payload?.missionId ?? "";
  const milestoneName = milestone?.name ?? "";
  const xpValue = mission?.xpValue ?? payload?.xpValue ?? 0;

  return {
    payload,
    playerName,
    missionTitle,
    milestoneName,
    xpValue,
    alreadyCompleted,
    gameMakerId: sessionMeta.data?.gameMakerId ?? null,
    loading,
    errorKind: sessionError
      ? "decode"
      : confirmError
      ? "confirm"
      : decodeError?.kind ?? null,
    errorMessage: sessionError
      ? "Could not load session data."
      : confirmError ?? decodeError?.message ?? null,
    confirming: confirmMutation.isPending,
    refresh,
    retry,
    confirm,
  };
};
