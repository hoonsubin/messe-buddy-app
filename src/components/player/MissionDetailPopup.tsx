import { useCallback, useEffect, useRef, useState } from "react";
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
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";
import IconButton from "../shared/IconButton.tsx";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../shared/Modal.tsx";
import { MODAL_VARIANT } from "../shared/types.ts";
import TagBadge from "../shared/TagBadge.tsx";
import XpBadge from "../shared/XpBadge.tsx";
import ValidationDisplay from "./ValidationDisplay.tsx";
import { isProgressValidated } from "../../store/progressEvents.ts";

/** Derive visual badge config from mission type + validation method. */
const getMethodBadge = (mission: Mission) => {
  if (mission.type === MISSION_TYPE.LINK) {
    return {
      label: "Link Mission",
      className: "mission-method-badge--link",
      Icon: MdOpenInNew,
    };
  }
  if (mission.validationMethod === "qr") {
    return {
      label: "Offline Mission",
      className: "mission-method-badge--offline",
      Icon: MdLocationOn,
    };
  }
  if (mission.validationMethod === "gmApprove") {
    return {
      label: "Needs Approval",
      className: "mission-method-badge--approval",
      Icon: MdRateReview,
    };
  }
  return {
    label: "Self-Complete",
    className: "mission-method-badge--self",
    Icon: MdTaskAlt,
  };
};

interface MissionDetailPopupProps {
  readonly mission: Mission;
  readonly playerId: string;
  readonly sessionId: string;
  readonly qrSecret: string;
  readonly progressEvent?: ProgressEvent | null;
  readonly markSelfComplete: () => Promise<void>;
  readonly markPending: () => Promise<void>;
  readonly onClose: () => void;
  readonly onValidated: () => void;
}

const SWIPE_DOWN_THRESHOLD = 80;

const MissionDetailPopup = (props: MissionDetailPopupProps) => {
  const mission = props.mission;

  // Tracks whether the validation view is showing (gmApprove / qr paths)
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompleted = props.progressEvent?.status !== undefined &&
    isProgressValidated(props.progressEvent.status);

  const onValidatedRef = useRef(props.onValidated);
  useEffect(() => {
    onValidatedRef.current = props.onValidated;
  });

  // Close QR / pending-approval wait when progress cache updates (SSE or poll).
  useEffect(() => {
    if (isCompleted && showValidation) {
      onValidatedRef.current();
    }
  }, [isCompleted, showValidation]);

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
        await props.markSelfComplete();
        props.onValidated();
      } finally {
        setIsSubmitting(false);
      }
    } else if (method === "gmApprove") {
      setIsSubmitting(true);
      try {
        await props.markPending();
      } finally {
        setIsSubmitting(false);
      }
      setShowValidation(true);
    } else {
      // qr - C-07: no PB write before GM scans. Just show QR + subscribe.
      setShowValidation(true);
    }
  }, [isCompleted, isSubmitting, mission, props]);

  // ── Render body ──────────────────────────────────────────────────────────
  const bodyHtml = mission.body ? (marked.parse(mission.body) as string) : "";

  const isLink = mission.type === MISSION_TYPE.LINK;
  const methodBadge = getMethodBadge(mission);
  const actionLabel = isLink
    ? isCompleted ? "Visited" : "Mark as Visited"
    : isCompleted
    ? "Completed"
    : "Mark Complete";

  return (
    <Modal
      open
      variant={MODAL_VARIANT.STRUCTURED}
      testId="mission-detail-popup"
      aria-labelledby="mission-popup-title"
      panelProps={{
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
      }}
    >
      <ModalHeader>
        <span
          className={`mission-method-badge ${methodBadge.className}`}
          aria-label={methodBadge.label}
        >
          <methodBadge.Icon size={11} aria-hidden="true" />
          {methodBadge.label}
        </span>
        <IconButton onClick={props.onClose} aria-label="Close">
          <MdClose size={20} aria-hidden="true" />
        </IconButton>
      </ModalHeader>

      <ModalBody>
        <ModalTitle id="mission-popup-title" className="mission-popup__title">
          {mission.title}
        </ModalTitle>

        <div className="mission-popup__meta core-flex-row core-flex-wrap core-gap-2 core-mb-4">
          <XpBadge value={mission.xpValue} />
          {mission.tags.map((t) => <TagBadge key={t} label={t} variant={t} />)}
        </div>

        {mission.validationMethod === "qr" && !showValidation && !isCompleted &&
          (
            <div className="mission-popup__qr-hint">
              <MdQrCode2 size={16} aria-hidden="true" />
              Your buddy or Game Master will scan a QR code to confirm this.
            </div>
          )}

        {bodyHtml && !isLink && (
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {isLink && mission.externalUrl && (
          <div className="mission-popup__link-block core-flex-col core-gap-3">
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
              className="btn btn--secondary mission-popup__link-btn"
            >
              <MdOpenInNew size={16} aria-hidden="true" />
              Open Link
            </a>
          </div>
        )}

        {showValidation && (
          <div className="core-mt-4">
            <ValidationDisplay
              playerId={props.playerId}
              missionId={mission.id}
              sessionId={props.sessionId}
              qrSecret={props.qrSecret}
              mission={mission}
              onValidated={props.onValidated}
            />
          </div>
        )}
      </ModalBody>

      {!showValidation && (
        <ModalFooter>
          <Button variant={BUTTON_VARIANT.GHOST} onClick={props.onClose}>
            Close
          </Button>
          <Button
            variant={BUTTON_VARIANT.PRIMARY}
            onClick={() => void handleAction()}
            disabled={isCompleted || isSubmitting}
          >
            {isSubmitting ? "Saving…" : actionLabel}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default MissionDetailPopup;
