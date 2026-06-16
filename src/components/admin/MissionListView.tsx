import type { Mission } from "../../types/index.ts";

interface MissionListViewProps {
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onAddMission: () => void;
}

const MissionListView = (props: MissionListViewProps) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}
  >
    <ul className="sheet-mission-list" role="list">
      {props.missions.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            className={`sheet-mission-item${
              props.activeMissionId === m.id
                ? " sheet-mission-item--active"
                : ""
            }`}
            onClick={() => props.onMissionSelect(m.id)}
          >
            {m.title || (
              <em style={{ opacity: 0.5 }}>
                Untitled
              </em>
            )}
          </button>
        </li>
      ))}
    </ul>

    <div style={{ padding: "var(--space-4) var(--space-5)" }}>
      <button
        type="button"
        className="btn btn--secondary"
        style={{
          width: "100%",
          minHeight: "var(--touch-target)",
        }}
        onClick={props.onAddMission}
      >
        + Add mission
      </button>
    </div>
  </div>
);

export default MissionListView;
