import { useCallback, useRef, useState } from "react";
import {
  MdClose,
  MdLocationOn,
  MdOpenInNew,
  MdQrCode2,
  MdRateReview,
  MdTaskAlt,
} from "react-icons/md";
import { marked } from "marked";
import type { Mission, ProgressEvent } from "../../types/index.ts";
import { MISSION_TYPE } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import TagBadge from "../shared/TagBadge.tsx";
import XPBadge from "../shared/XPBadge.tsx";
import ValidationDisplay from "./ValidationDisplay.tsx";

/** Derive visual badge config from mission type + validation method. */
const getMethodBadge = (mission: Mission) => {
  if (mission.type === MISSION_TYPE.LINK) {
    return { label: "Link Mission", className: "mission-method-badge--link", Icon: MdOpenInNew };
  }
  if (mission.validationMethod === "qr") {
    return { label: "Offline Mission", className: "mission-method-badge--offline", Icon: MdLocationOn };
  }
  if (mission.validationMethod === "gmApprove") {
    return { label: "Needs Approval", className: "mission-method-badge--approval", Icon: MdRateReview };
  }
  return { label: "Self-Complete", className: "mission-method-badge--self", Icon: MdTaskAlt };
};

interface MissionDetailPopupProps {
  readonly mission: Mission;
  readonly playerId: string;
  readonly sessionId: string;
  readonly progressEvent?: ProgressEvent | null;
  readonly onClose: () => void;
  readonly onValidated: () => void;
}

const SWIPE_DOWN_THRESHOLD = 80;

const MissionDetailPopup = (props: MissionDetailPopupProps) => {
  const adapter = useAdapter();
  const mission = props.mission;

  // Tracks whether the validation view is showing (gmApprove / qr paths)
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompleted =
    props.progressEvent?.status === "completed" ||
    props.progressEvent?.status === "autoApproved";

  // ── Swipe-down to close ──────────────────────────────────────────────────
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    if (delta > SWIPE_DOWN_THRESHOLD) props.onClose();
    touchStartY.current = null;
  };

  // ── Primary action ───────────────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (isCompleted || isSubmitting) return;

    const method = mission.validationMethod;

    if (method === "selfApprove") {
      setIsSubmitting(true);
      try {
        await adapter.upsertProgressEvent(props.playerId, mission.id, {
          status: "autoApproved",
        });
        props.onValidated();
      } finally {
        setIsSubmitting(false);
      }
    } else if (method === "gmApprove") {
      // Write pendingApproval first; mock adapter fires subscription after 4 s.
      setIsSubmitting(true);
      try {
        await adapter.upsertProgressEvent(props.playerId, mission.id, {
          status: "pendingApproval",
        });
      } finally {
        setIsSubmitting(false);
      }
      setShowValidation(true);
    } else {
      // qr — C-07: no PB write before GM scans. Just show QR + subscribe.
      setShowValidation(true);
    }
  }, [adapter, isCompleted, isSubmitting, mission, props]);

  // ── Render body ──────────────────────────────────────────────────────────
  const bodyHtml = mission.body
    ? (marked.parse(mission.body) as string)
    : "";

  const isLink = mission.type === MISSION_TYPE.LINK;
  const methodBadge = getMethodBadge(mission);
  const actionLabel = isLink
    ? isCompleted
      ? "Visited"
      : "Mark as Visited"
    : isCompleted
    ? "Completed"
    : "Mark Complete";

  return (
    <div
      className="modal-backdrop"
      data-testid="mission-detail-popup"
      // Spec: does NOT dismiss on backdrop click — only close button + swipe-down
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-popup-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header row: method badge + close button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            className={`mission-method-badge ${methodBadge.className}`}
            aria-label={methodBadge.label}
          >
            <methodBadge.Icon size={11} aria-hidden="true" />
            {methodBadge.label}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={props.onClose}
            aria-label="Close"
          >
            <MdClose size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Title */}
        <h2
          id="mission-popup-title"
          style={{
            margin: "var(--space-3) 0 0",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
            lineHeight: "var(--leading-tight)",
          }}
        >
          {mission.title}
        </h2>

        {/* Meta row: XP + tags */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            marginTop: "var(--space-3)",
          }}
        >
          <XPBadge value={mission.xpValue} />
          {mission.tags.map((t) => (
            <TagBadge key={t} label={t} variant={t} />
          ))}
        </div>

        {/* QR context hint — shown before the user triggers validation */}
        {mission.validationMethod === "qr" && !showValidation && !isCompleted && (
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3)",
              background: "hsl(var(--color-status-progress) / 0.08)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-status-progress))",
              fontWeight: "var(--weight-medium)",
            }}
          >
            <MdQrCode2 size={16} aria-hidden="true" />
            Your buddy or Game Master will scan a QR code to confirm this.
          </div>
        )}

        {/* Body — rendered as Markdown for text missions */}
        {bodyHtml && !isLink && (
          <div
            className="prose"
            style={{ marginTop: "var(--space-4)" }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {/* Link missions — show external URL + open button */}
        {isLink && mission.externalUrl && (
          <div
            style={{
              marginTop: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {bodyHtml && (
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}
            <a
              href={mission.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                alignSelf: "flex-start",
              }}
            >
              <MdOpenInNew size={16} aria-hidden="true" />
              Open Link
            </a>
          </div>
        )}

        {/* Validation display (gmApprove / qr) mounts here once triggered */}
        {showValidation && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <ValidationDisplay
              playerId={props.playerId}
              missionId={mission.id}
              sessionId={props.sessionId}
              mission={mission}
              onValidated={props.onValidated}
            />
          </div>
        )}

        {/* Footer actions */}
        {!showValidation && (
          <div
            style={{
              marginTop: "var(--space-6)",
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="btn btn--ghost"
              onClick={props.onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleAction()}
              disabled={isCompleted || isSubmitting}
            >
              {isSubmitting ? "Saving…" : actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionDetailPopup;
