// Phase 1 shell — logic wired in Phase 2+.
import type { MilestoneStatus } from "../../types/index.ts";

interface MilestoneNodeProps {
  readonly id: string;
  readonly label: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly progressPercent: number;
  readonly status: MilestoneStatus;
  readonly draggable?: boolean;
  readonly onClick: () => void;
  readonly onDragEnd?: (x: number, y: number) => void;
}

const MilestoneNode = (props: MilestoneNodeProps) => (
  <button
    type="button"
    className="milestone-node"
    data-testid={`milestone-node-${props.id}`}
    data-status={props.status}
    style={{ left: `${props.xPercent}%`, top: `${props.yPercent}%` }}
    onClick={props.onClick}
    draggable={props.draggable ?? false}
    aria-label={`${props.label} — ${Math.round(props.progressPercent * 100)}% complete`}
  >
    <div className={`milestone-node__ring milestone-node__ring--${props.status}`}>
      <span aria-hidden="true">{Math.round(props.progressPercent * 100)}</span>
    </div>
    <span className="milestone-node__label">{props.label}</span>
  </button>
);

export default MilestoneNode;
