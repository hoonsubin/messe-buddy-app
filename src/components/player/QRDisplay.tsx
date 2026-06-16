import { useEffect, useRef, useState } from "react";
import * as QRCode from "qrcode";
import type { ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { encodeQRPayload } from "../../utils/qrPayload.ts";
import { buildValidationUrl } from "../../utils/qrUrl.ts";

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

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!canvasRef.current) return;

      try {
        const session = await adapter.getSession(sessionId);
        const secret = session.qrSecret ?? sessionId;

        const encoded = await encodeQRPayload(
          {
            playerId,
            missionId,
            sessionId,
            xpValue,
            issuedAt: Date.now(),
          },
          secret,
        );

        const validationUrl = buildValidationUrl(sessionId, encoded);

        if (!cancelled && canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, validationUrl, {
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
  }, [adapter, playerId, missionId, sessionId, xpValue]);

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
