// Phase 1 shell — hover state and interaction wired in Phase 3.
import type { Milestone } from "../../types/index.ts";
import type { MilestoneProgress } from "../../types/index.ts";
import BackgroundCanvas from "../shared/BackgroundCanvas.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import YouAreHereMarker from "./YouAreHereMarker.tsx";
import ProgressLegend from "./ProgressLegend.tsx";

const LEGEND_ITEMS = [
  { label: "Upcoming", color: "hsl(214 19% 65%)" },
  { label: "In progress", color: "hsl(227 59% 55%)" },
  { label: "Complete", color: "hsl(142 71% 45%)" },
];

interface MilestoneMapViewerProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly bgImageUrl: string;
  readonly playerXPercent?: number;
  readonly playerYPercent?: number;
  readonly onMilestoneClick: (id: string) => void;
}

const MilestoneMapViewer = (props: MilestoneMapViewerProps) => {
  const progressById = new Map(props.milestoneProgress.map((mp) => [mp.milestoneId, mp]));

  return (
    <div className="milestone-map" data-testid="milestone-map-viewer">
      <BackgroundCanvas imageUrl={props.bgImageUrl} alt="Onboarding journey map" />
      {props.milestones.map((ms) => {
        const mp = progressById.get(ms.id);
        return (
          <MilestoneNode
            key={ms.id}
            id={ms.id}
            label={ms.name}
            xPercent={ms.xPercent}
            yPercent={ms.yPercent}
            progressPercent={mp?.percentComplete ?? 0}
            status={mp?.status ?? "upcoming"}
            onClick={() => props.onMilestoneClick(ms.id)}
          />
        );
      })}
      {props.playerXPercent !== undefined && props.playerYPercent !== undefined && (
        <YouAreHereMarker xPercent={props.playerXPercent} yPercent={props.playerYPercent} />
      )}
      <div style={{ position: "absolute", insetBlockEnd: "var(--space-3)", insetInlineStart: "var(--space-3)" }}>
        <ProgressLegend items={LEGEND_ITEMS} />
      </div>
    </div>
  );
};

export default MilestoneMapViewer;
