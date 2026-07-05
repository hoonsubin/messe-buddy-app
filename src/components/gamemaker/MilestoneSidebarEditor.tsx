import { useCallback, useState } from "react";
import type { DraftMission, Milestone, Mission } from "../../types/index.ts";
import MissionEditor from "./MissionEditor.tsx";
import SaveActions from "./SaveActions.tsx";

interface MilestoneSidebarEditorProps {
  readonly milestone: Milestone | null;
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly draft: DraftMission | null;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onDraftChange: (draft: DraftMission) => void;
  readonly onRename: (newName: string) => void;
  readonly onSave: () => void;
  readonly onSaveAsTemplate: () => void;
  readonly onDiscard: () => void;
  readonly onAddMission: () => void;
}

const MilestoneSidebarEditor = (props: MilestoneSidebarEditorProps) => {
  const { milestone, onRename } = props;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(milestone?.name ?? "");

  const handleRenameStart = useCallback(() => {
    setRenameValue(milestone?.name ?? "");
    setIsRenaming(true);
  }, [milestone]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim()) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  }, [onRename, renameValue]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") setIsRenaming(false);
    },
    [handleRenameSubmit],
  );

  if (!props.milestone) {
    return (
      <div className="sidebar" data-testid="milestone-sidebar-editor">
        <p className="milestone-sidebar-editor__empty">
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
      <div className="milestone-sidebar-editor__header">
        {isRenaming
          ? (
            <input
              className="form-input milestone-sidebar-editor__rename-input"
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              autoFocus
            />
          )
          : (
            <button
              type="button"
              className="btn btn--ghost milestone-sidebar-editor__rename-btn"
              onClick={handleRenameStart}
              title="Click to rename"
            >
              {props.milestone.name}
            </button>
          )}
      </div>

      <div className="milestone-sidebar-editor__mission-list">
        <ul className="milestone-sidebar-editor__missions">
          {props.missions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`btn btn--ghost milestone-sidebar-editor__mission-btn${
                  props.activeMissionId === m.id ? " btn--active" : ""
                }`}
                onClick={() => props.onMissionSelect(m.id)}
              >
                {m.title}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn--secondary milestone-sidebar-editor__add-btn"
          onClick={props.onAddMission}
        >
          + Add mission
        </button>
      </div>

      {props.draft && (
        <div className="milestone-sidebar-editor__editor-area">
          <MissionEditor
            draft={props.draft}
            onDraftChange={props.onDraftChange}
          />
        </div>
      )}

      <div className="milestone-sidebar-editor__save-area">
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
