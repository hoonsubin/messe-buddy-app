import type { Milestone } from "../../types/index.ts";
import type { MilestoneProgress } from "../../types/index.ts";
import MapViewport from "../shared/MapViewport.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import YouAreHereMarker from "./YouAreHereMarker.tsx";

interface MilestoneMapViewerProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly bgImageUrl: string;
  /** From Session.mapNodeScale — shared source of truth with the admin editor. */
  readonly mapNodeScale: number;
  /** Per-milestone mission counts — same shape as MilestoneMapEditor. If omitted, nodes show 0. */
  readonly missionCounts?: Readonly<Record<string, number>>;
  readonly playerXPercent?: number;
  readonly playerYPercent?: number;
  readonly onMilestoneClick: (id: string) => void;
}

const MilestoneMapViewer = (props: MilestoneMapViewerProps) => {
  const progressById = new Map(
    props.milestoneProgress.map((mp) => [mp.milestoneId, mp]),
  );
  const missionCounts = props.missionCounts ?? {};

  return (
    <MapViewport
      bgImageUrl={props.bgImageUrl}
      nodeScale={props.mapNodeScale}
      testId="milestone-map-viewer"
      panFromNodes
    >
      {/* Milestone nodes */}
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
            missionCount={missionCounts[ms.id] ?? 0}
            onClick={() => props.onMilestoneClick(ms.id)}
          />
        );
      })}

      {/* Player location marker */}
      {props.playerXPercent !== undefined &&
        props.playerYPercent !== undefined && (
        <YouAreHereMarker
          xPercent={props.playerXPercent}
          yPercent={props.playerYPercent}
        />
      )}
    </MapViewport>
  );
};

export default MilestoneMapViewer;
