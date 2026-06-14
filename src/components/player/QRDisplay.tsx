import { useEffect, useRef, useState } from "react";
import * as QRCode from "qrcode";
import type { ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { encodeQRPayload } from "../../utils/qrPayload.ts";

interface QRDisplayProps {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly xpValue: number;
  readonly onValidated: () => void;
}

const QRDisplay = (props: QRDisplayProps) => {
  const adapter = useAdapter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  const { playerId, missionId, sessionId, xpValue, onValidated } = props;

  // ── Encode payload and render QR canvas ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!canvasRef.current) return;

      try {
        // For the mock, we use sessionId as the HMAC secret (C-16 note).
        const encoded = await encodeQRPayload(
          {
            playerId,
            missionId,
            sessionId,
            xpValue,
            issuedAt: Date.now(),
          },
          sessionId,
        );

        if (!cancelled && canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, encoded, {
            width: 220,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        }
      } catch (e) {
        if (!cancelled) {
          setEncodeError(
            e instanceof Error ? e.message : "Failed to generate QR code",
          );
        }
      }
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [playerId, missionId, sessionId, xpValue]);

  // ── Subscribe for GM scan completion ───────────────────────────────────
  useEffect(() => {
    const unsubscribe = adapter.subscribeProgressEvent(
      playerId,
      missionId,
      (event: ProgressEvent) => {
        if (event.status === "completed" || event.status === "autoApproved") {
          onValidated();
        }
      },
    );
    return unsubscribe;
  }, [adapter, playerId, missionId, onValidated]);

  return (
    <div
      className="validation-display"
      data-testid="qr-display"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-4)",
      }}
    >
      {encodeError
        ? (
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-destructive))",
            }}
          >
            {encodeError}
          </p>
        )
        : (
          <canvas
            ref={canvasRef}
            aria-label={`QR code for mission ${props.missionId}`}
            style={{
              borderRadius: "var(--radius-md)",
              display: "block",
            }}
          />
        )}
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
          textAlign: "center",
          margin: 0,
        }}
      >
        Ask your Game Master to scan this code
      </p>
    </div>
  );
};

export default QRDisplay;
