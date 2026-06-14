// Phase 1 shell — logic wired in Phase 3.
import type { Mission, ProgressEvent } from "../../types/index.ts";
import MissionCard from "../shared/MissionCard.tsx";

interface CurrentMissionsListProps {
  readonly missions: ReadonlyArray<Mission>;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly onMissionClick: (id: string) => void;
  readonly onMarkComplete: (id: string) => void;
}

const CurrentMissionsList = (props: CurrentMissionsListProps) => {
  const eventByMission = new Map(props.progressEvents.map((e) => [e.missionId, e]));

  return (
    <div className="ms-strip" data-testid="current-missions-list" role="list" aria-label="Current missions">
      {props.missions.map((mission) => (
        <div key={mission.id} role="listitem" style={{ flexShrink: 0, width: "16rem" }}>
          <MissionCard
            mission={mission}
            progressEvent={eventByMission.get(mission.id)}
            onClick={() => props.onMissionClick(mission.id)}
            onToggleComplete={() => props.onMarkComplete(mission.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default CurrentMissionsList;
