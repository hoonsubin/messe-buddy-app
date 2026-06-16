import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { QRPayload } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { decodeQRPayload, QRPayloadError } from "../utils/qrPayload.ts";
import FetchErrorPanel from "../components/shared/FetchErrorPanel.tsx";
import TopBar from "../components/shared/TopBar.tsx";

const ValidationPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity } = useIdentity();
  const sid = sessionId ?? "";
  const token = searchParams.get("t") ?? "";

  const {
    session,
    milestones,
    missions,
    loading,
    error,
    refresh,
  } = useSession(sid);

  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const [xpValue, setXpValue] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const goToAdmin = useCallback(() => {
    navigate(`/admin/${sid}`, { replace: true });
  }, [navigate, sid]);

  useEffect(() => {
    if (!sid || !token || loading || error || !session) return;

    let cancelled = false;

    const decode = async () => {
      setDecoding(true);
      setDecodeError(null);
      setPayload(null);

      const secret = session.qrSecret ?? sid;

      try {
        const decoded = await decodeQRPayload(token, secret);

        if (decoded.sessionId !== sid) {
          if (!cancelled) {
            setDecodeError(
              "This QR code belongs to a different session.",
            );
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
          setPlayerName(player?.name ?? player?.uid ?? decoded.playerId);
          setMissionTitle(mission?.title ?? decoded.missionId);
          setMilestoneName(milestone?.name ?? "");
          setXpValue(mission?.xpValue ?? decoded.xpValue);
          setAlreadyCompleted(completed);
        }
      } catch (e) {
        if (!cancelled) {
          setDecodeError(
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
  }, [adapter, error, loading, milestones, missions, session, sid, token]);

  const handleConfirm = useCallback(async () => {
    if (!payload || alreadyCompleted || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      await adapter.upsertProgressEvent(payload.playerId, payload.missionId, {
        status: "completed",
        validatedBy: identity?.uid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      goToAdmin();
    } catch {
      setConfirmError("Failed to save validation. Please try again.");
      setConfirming(false);
    }
  }, [
    adapter,
    alreadyCompleted,
    confirming,
    goToAdmin,
    identity,
    payload,
  ]);

  if (error) {
    return (
      <FetchErrorPanel
        message="Could not load session data."
        onRetry={() => refresh()}
        onBack={goToAdmin}
        backLabel="Back to cockpit"
        testId="validation-page"
        page="validation"
      />
    );
  }

  if (!token) {
    return (
      <FetchErrorPanel
        message="Missing validation token. Scan a player QR code or open a full validation link."
        onRetry={() => refresh()}
        retryLabel="Reload"
        onBack={goToAdmin}
        backLabel="Back to cockpit"
        testId="validation-page"
        page="validation"
      />
    );
  }

  const showSpinner = loading || decoding;

  return (
    <div
      data-testid="validation-page"
      data-page="validation"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={identity?.uid ?? "Game Master"}
        totalXP={0}
        role="Game Master"
      />

      <main
        style={{
          flex: 1,
          padding:
            "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
          maxWidth: "28rem",
          marginInline: "auto",
          width: "100%",
        }}
      >
        <h1
          style={{
            margin: "0 0 var(--space-6)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          Confirm validation
        </h1>

        {showSpinner && (
          <p style={{ color: "hsl(var(--color-muted-fg))" }}>
            Verifying QR code…
          </p>
        )}

        {!showSpinner && decodeError && (
          <FetchErrorPanel
            message={decodeError}
            onRetry={() => refresh()}
            retryLabel="Try again"
            onBack={goToAdmin}
            backLabel="Back to cockpit"
          />
        )}

        {!showSpinner && !decodeError && payload && (
          <div
            className="card"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {alreadyCompleted
              ? (
                <p
                  role="status"
                  style={{
                    margin: 0,
                    color: "hsl(var(--color-status-complete))",
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  This mission is already completed.
                </p>
              )
              : (
                <p
                  style={{
                    margin: 0,
                    color: "hsl(var(--color-muted-fg))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Review the details below, then confirm to award XP.
                </p>
              )}

            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: "var(--space-3)",
                fontSize: "var(--text-sm)",
              }}
            >
              {milestoneName && (
                <>
                  <dt style={{ color: "hsl(var(--color-muted-fg))" }}>
                    Milestone
                  </dt>
                  <dd
                    style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}
                  >
                    {milestoneName}
                  </dd>
                </>
              )}
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>Mission</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                {missionTitle}
              </dd>
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>Player</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                {playerName}
              </dd>
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>XP</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                +{xpValue}
              </dd>
            </dl>

            {confirmError && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "hsl(var(--color-destructive))",
                  fontSize: "var(--text-sm)",
                }}
              >
                {confirmError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginTop: "var(--space-2)",
              }}
            >
              {!alreadyCompleted && (
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  disabled={confirming}
                  onClick={() => void handleConfirm()}
                >
                  {confirming ? "Saving…" : "Confirm"}
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={goToAdmin}
                disabled={confirming}
              >
                {alreadyCompleted ? "Back to cockpit" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidationPage;
