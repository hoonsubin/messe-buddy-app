// Phase 1 shell — logic wired in Phase 2+.
import type { Mission, ProgressEvent } from "../../types/index.ts";
import TagBadge from "./TagBadge.tsx";
import XPBadge from "./XPBadge.tsx";

interface MissionCardProps {
  readonly mission: Mission;
  readonly progressEvent?: ProgressEvent;
  readonly editable?: boolean;
  readonly onClick: () => void;
  readonly onToggleComplete?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onSendToCurrent?: () => void;
}

const MissionCard = (props: MissionCardProps) => {
  const isCompleted = props.progressEvent?.status === "completed" ||
    props.progressEvent?.status === "autoApproved";

  return (
    <article
      className={`mission-card${isCompleted ? " mission-card--completed" : ""}`}
      data-testid="mission-card"
      data-mission-id={props.mission.id}
      data-type={props.mission.type}
    >
      <button
        type="button"
        className="mission-card__title-btn"
        onClick={props.onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
      >
        <p className="mission-card__title">{props.mission.title}</p>
      </button>
      <div className="mission-card__meta">
        <XPBadge value={props.mission.xpValue} />
        {props.mission.tags.map((tag) => (
          <TagBadge key={tag} label={tag} variant={tag} />
        ))}
      </div>
    </article>
  );
};

export default MissionCard;
