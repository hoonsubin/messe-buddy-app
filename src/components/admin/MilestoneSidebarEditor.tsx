// Phase 1 shell — admin sidebar for editing a milestone's missions. Logic wired in Phase 4.
import type { Milestone, Mission, PBRecord } from "../../types/index.ts";
import MissionEditor from "./MissionEditor.tsx";
import SaveActions from "./SaveActions.tsx";

interface MilestoneSidebarEditorProps {
  readonly milestone: Milestone | null;
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly draft: Omit<Mission, keyof PBRecord> | null;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onDraftChange: (draft: Omit<Mission, keyof PBRecord>) => void;
  readonly onSave: () => void;
  readonly onSaveAsTemplate: () => void;
  readonly onDiscard: () => void;
  readonly onAddMission: () => void;
}

const MilestoneSidebarEditor = (props: MilestoneSidebarEditorProps) => {
  if (!props.milestone) {
    return (
      <div className="sidebar" data-testid="milestone-sidebar-editor">
        <p
          style={{
            padding: "var(--space-6)",
            color: "hsl(var(--color-muted-fg))",
            fontSize: "var(--text-sm)",
          }}
        >
          Select a milestone to edit
        </p>
      </div>
    );
  }

  return (
    <div
      className="sidebar sidebar--open"
      data-testid="milestone-sidebar-editor"
    >
      <div
        style={{
          padding: "var(--space-4) var(--space-5)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          {props.milestone.name}
        </h2>
      </div>

      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          {props.missions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`btn btn--ghost${
                  props.activeMissionId === m.id ? " btn--active" : ""
                }`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  justifyContent: "flex-start",
                  fontSize: "var(--text-sm)",
                }}
                onClick={() => props.onMissionSelect(m.id)}
              >
                {m.title}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn--secondary"
          style={{ marginTop: "var(--space-3)", width: "100%" }}
          onClick={props.onAddMission}
        >
          + Add mission
        </button>
      </div>

      {props.draft && (
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            flex: 1,
            overflowY: "auto",
          }}
        >
          <MissionEditor
            draft={props.draft}
            onDraftChange={props.onDraftChange}
          />
        </div>
      )}

      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderTop: "1px solid hsl(var(--color-border))",
        }}
      >
        <SaveActions
          isDirty={props.isDirty}
          isSaving={props.isSaving}
          onSave={props.onSave}
          onSaveAsTemplate={props.onSaveAsTemplate}
          onDiscard={props.onDiscard}
        />
      </div>
    </div>
  );
};

export default MilestoneSidebarEditor;
