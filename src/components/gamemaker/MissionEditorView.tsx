import type { DraftMission } from "../../types/index.ts";
import type { StoredDraft } from "../../utils/draftStorage.ts";
import MissionEditor from "./MissionEditor.tsx";
import DraftRestoreBanner from "./DraftRestoreBanner.tsx";

interface MissionEditorViewProps {
  readonly draft: DraftMission | null;
  readonly storedDraft: StoredDraft | null;
  readonly onDraftChange: (draft: DraftMission) => void;
  readonly onDismissStoredDraft: () => void;
  readonly onLoadStoredDraft: () => void;
}

const MissionEditorView = (props: MissionEditorViewProps) => (
  <div className="core-flex-col mission-editor-view">
    {/* Draft restore banner */}
    {props.storedDraft && (
      <DraftRestoreBanner
        savedAt={props.storedDraft.savedAt}
        onDismiss={props.onDismissStoredDraft}
        onLoad={props.onLoadStoredDraft}
      />
    )}

    {props.draft
      ? (
        <div className="mission-editor-view__editor">
          <MissionEditor
            draft={props.draft}
            onDraftChange={props.onDraftChange}
          />
        </div>
      )
      : (
        <p className="core-text-sm core-text-muted mission-editor-view__empty">
          Select a mission to edit
        </p>
      )}
  </div>
);

export default MissionEditorView;
