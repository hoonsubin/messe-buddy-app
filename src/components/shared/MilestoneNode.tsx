import type { MilestoneStatus } from "../../types/index.ts";

interface MilestoneNodeProps {
  readonly id: string;
  readonly label: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly progressPercent: number;
  readonly status: MilestoneStatus;
  readonly missionCount?: number;
  readonly showDeleteButton?: boolean;
  readonly draggable?: boolean;
  readonly className?: string;
  readonly animationDelay?: string;
  readonly onClick?: () => void;
  readonly onDoubleClick?: () => void;
  readonly onContextMenu?: (e: React.MouseEvent) => void;
  readonly onPointerDown?: (e: React.PointerEvent) => void;
  readonly onDeleteClick?: (e: React.MouseEvent) => void;
}

// Minimum visible fill so nodes never appear empty on the map.
const MIN_FILL = 0.12;

const MilestoneNode = (props: MilestoneNodeProps) => {
  const fillHeight = Math.max(MIN_FILL, props.progressPercent);
  const pct = Math.round(props.progressPercent * 100);
  const mCount = props.missionCount ?? 0;

  return (
    <button
      type="button"
      className={`milestone-node${props.className ? ` ${props.className}` : ""}`}
      data-testid={`milestone-node-${props.id}`}
      data-milestone-id={props.id}
      data-status={props.status}
      style={{
        left: `${props.xPercent}%`,
        top: `${props.yPercent}%`,
        animationDelay: props.animationDelay,
      }}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
      onContextMenu={props.onContextMenu}
      onPointerDown={props.onPointerDown}
      draggable={false}
      aria-label={`${props.label} - ${pct}% complete`}
    >
      {/* Delete badge — visible in edit mode */}
      {props.showDeleteButton && (
        <span
          className="milestone-node__delete-btn"
          role="button"
          aria-label={`Delete ${props.label}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onDeleteClick?.(e);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </span>
      )}

      {/* Navy box with liquid fill */}
      <div className="milestone-node__box">
        <div
          className="milestone-node__fill"
          style={{ height: `${fillHeight * 100}%` }}
        />
        <span className="milestone-node__name">{props.label}</span>
      </div>

      {/* Mission count pill — below the box */}
      <span
        className={`milestone-node__pill${mCount === 0 ? " milestone-node__pill--empty" : ""}`}
        aria-label={`${mCount} missions`}
      >
        {mCount} missions
      </span>
    </button>
  );
};

export default MilestoneNode;
