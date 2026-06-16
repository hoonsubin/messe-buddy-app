import type { MilestoneStatus } from "../../types/index.ts";

interface MilestoneNodeProps {
  readonly id: string;
  readonly label: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly progressPercent: number;
  readonly status: MilestoneStatus;
  readonly draggable?: boolean;
  readonly className?: string;
  readonly onClick: () => void;
  readonly onDoubleClick?: () => void;
  readonly onDragEnd?: (x: number, y: number) => void;
  readonly onContextMenu?: (e: React.MouseEvent) => void;
  readonly onPointerDown?: (e: React.PointerEvent) => void;
}

// Minimum visible fill so nodes never appear empty on the map.
const MIN_FILL = 0.12;

const MilestoneNode = (props: MilestoneNodeProps) => {
  const fillHeight = Math.max(MIN_FILL, props.progressPercent);
  const pct = Math.round(props.progressPercent * 100);

  return (
    <button
      type="button"
      className={`milestone-node${
        props.className ? ` ${props.className}` : ""
      }`}
      data-testid={`milestone-node-${props.id}`}
      data-milestone-id={props.id}
      data-status={props.status}
      style={{ left: `${props.xPercent}%`, top: `${props.yPercent}%` }}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
      onContextMenu={props.onContextMenu}
      onPointerDown={props.onPointerDown}
      draggable={false}
      aria-label={`${props.label} - ${pct}% complete`}
    >
      <div className="milestone-node__box">
        {/* Liquid fill - rises from bottom */}
        <div
          className="milestone-node__fill"
          style={{ height: `${fillHeight * 100}%` }}
        />
        {/* Label sits above fill via z-index */}
        <span className="milestone-node__name">{props.label}</span>
      </div>
    </button>
  );
};

export default MilestoneNode;
