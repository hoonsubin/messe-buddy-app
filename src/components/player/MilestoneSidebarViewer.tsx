// Phase 1 shell — logic wired in Phase 3.
import type { Mission, ProgressEvent } from "../../types/index.ts";
import MissionCard from "../shared/MissionCard.tsx";

interface MilestoneSidebarViewerProps {
  readonly milestoneId: string;
  readonly milestoneName: string;
  readonly xpThreshold: number;
  readonly currentXP: number;
  readonly missions: ReadonlyArray<Mission>;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly onClose: () => void;
  readonly onMissionClick: (id: string) => void;
}

const MilestoneSidebarViewer = (props: MilestoneSidebarViewerProps) => {
  const eventByMission = new Map(props.progressEvents.map((e) => [e.missionId, e]));
  const pct = Math.min(props.currentXP / props.xpThreshold, 1);

  return (
    <aside
      className="sidebar sidebar--open"
      data-testid="milestone-sidebar-viewer"
      data-milestone-id={props.milestoneId}
      aria-label={`${props.milestoneName} missions`}
    >
      <div className="sidebar__header">
        <h2 className="sidebar__title">{props.milestoneName}</h2>
        <button type="button" className="sidebar__close icon-btn" onClick={props.onClose} aria-label="Close sidebar">
          ✕
        </button>
      </div>
      <div style={{ padding: "0 var(--space-4) var(--space-2)" }}>
        <div className="progress-bar" role="progressbar" aria-valuenow={props.currentXP} aria-valuemax={props.xpThreshold}>
          <div className="progress-bar__fill" style={{ width: `${pct * 100}%` }} />
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "hsl(var(--color-muted-fg))", marginTop: "var(--space-1)" }}>
          {props.currentXP} / {props.xpThreshold} XP
        </p>
      </div>
      <div className="sidebar__body">
        {props.missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            progressEvent={eventByMission.get(mission.id)}
            onClick={() => props.onMissionClick(mission.id)}
          />
        ))}
      </div>
    </aside>
  );
};

export default MilestoneSidebarViewer;
