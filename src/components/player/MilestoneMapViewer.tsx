import type { Milestone, MilestoneProgress } from "../../types/index.ts";
import IsometricMilestoneMap from "./IsometricMilestoneMap.tsx";

interface MilestoneMapViewerProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  /** Retained for API compatibility with the admin/session source of truth;
   *  the isometric player map derives its own layout from milestone order. */
  readonly bgImageUrl?: string;
  readonly mapNodeScale?: number;
  readonly playerXPercent?: number;
  readonly playerYPercent?: number;
  readonly onMilestoneClick: (id: string) => void;
}

const MilestoneMapViewer = (props: MilestoneMapViewerProps) => (
  <IsometricMilestoneMap
    milestones={props.milestones}
    milestoneProgress={props.milestoneProgress}
    onMilestoneClick={props.onMilestoneClick}
  />
);

export default MilestoneMapViewer;
