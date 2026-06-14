// Phase 1 shell — logic wired in Phase 3.
import type { Mission, ProgressEvent } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";
import XPBadge from "../shared/XPBadge.tsx";

interface MissionDetailPopupProps {
  readonly mission: Mission | null;
  readonly progressEvent?: ProgressEvent | null;
  readonly onClose: () => void;
  readonly onMarkComplete: () => void;
}

const MissionDetailPopup = (props: MissionDetailPopupProps) => {
  if (!props.mission) return null;
  const mission = props.mission;
  return (
    <div
      className="modal-backdrop"
      data-testid="mission-detail-popup"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mission-popup-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <h2 id="mission-popup-title" style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>
            {mission.title}
          </h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
          <XPBadge value={mission.xpValue} />
          {mission.tags.map((t) => <TagBadge key={t} label={t} variant={t} />)}
        </div>

        {mission.body && (
          <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "hsl(var(--color-fg))", lineHeight: "var(--leading-relaxed)" }}>
            {mission.body}
          </p>
        )}

        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={props.onClose}>Close</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={props.onMarkComplete}
            disabled={props.progressEvent?.status === "completed" || props.progressEvent?.status === "autoApproved"}
          >
            Mark complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionDetailPopup;
