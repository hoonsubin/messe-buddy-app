import type { DraftMission } from "../../types/index.ts";
import type { StoredDraft } from "../../utils/draftStorage.ts";
import MissionEditor from "./MissionEditor.tsx";
import DraftRestoreBanner from "./DraftRestoreBanner.tsx";

interface MissionEditorViewProps {
  readonly draft: DraftMission | null;
  readonly xpPreview: number;
  readonly storedDraft: StoredDraft | null;
  readonly onDraftChange: (draft: DraftMission) => void;
  readonly onDismissStoredDraft: () => void;
  readonly onLoadStoredDraft: () => void;
}

const MissionEditorView = (props: MissionEditorViewProps) => (
  <div className="core-flex-col" style={{ minHeight: "100%" }}>
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
        <div
          style={{
            padding: "var(--space-4) var(--space-5) var(--space-6)",
            flex: 1,
          }}
        >
          <MissionEditor
            draft={props.draft}
            xpPreview={props.xpPreview}
            onDraftChange={props.onDraftChange}
          />
        </div>
      )
      : (
        <p className="core-text-sm core-text-muted" style={{ padding: "var(--space-6) var(--space-5)" }}>
          Select a mission to edit
        </p>
      )}
  </div>
);

export default MissionEditorView;
