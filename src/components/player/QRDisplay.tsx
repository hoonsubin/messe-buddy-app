import { useEffect, useRef, useState } from "react";
import * as QRCode from "qrcode";
import { useSession } from "../../hooks/useSession.ts";
import { useWatchMission } from "../../hooks/useProgress/index.ts";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const { session } = useSession(props.sessionId, {
    playerId: props.playerId,
  });
  const { watchMission } = useWatchMission(props.playerId);

  const { playerId, missionId, sessionId, xpValue, onValidated } = props;

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!canvasRef.current || !session) return;

      try {
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
  }, [playerId, missionId, session, sessionId, xpValue]);

  useEffect(() => {
    const unsubscribe = watchMission(missionId, (event) => {
      if (event.status === "completed" || event.status === "autoApproved") {
        onValidated();
      }
    });
    return unsubscribe;
  }, [missionId, onValidated, watchMission]);

  return (
    <div
      className="validation-display qr-display"
      data-testid="qr-display"
    >
      {encodeError
        ? (
          <p className="qr-encode-error">
            {encodeError}
          </p>
        )
        : (
          <canvas
            ref={canvasRef}
            aria-label={`QR code for mission ${props.missionId}`}
            className="qr-canvas"
          />
        )}
      <p className="qr-hint-text">
        Ask your Game Master to scan this code
      </p>
    </div>
  );
};

export default QRDisplay;
