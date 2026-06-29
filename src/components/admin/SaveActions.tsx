interface SaveActionsProps {
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly onSave: () => void;
  /** Omit to hide the "Save as template" button. */
  readonly onSaveAsTemplate?: () => void;
  readonly onDiscard: () => void;
}

const SaveActions = (props: SaveActionsProps) => (
  <div className="save-actions" data-testid="save-actions">
    <button
      type="button"
      className="btn btn--ghost"
      onClick={props.onDiscard}
      disabled={!props.isDirty}
    >
      Discard changes
    </button>
    {props.onSaveAsTemplate && (
      <button
        type="button"
        className="btn btn--secondary"
        onClick={props.onSaveAsTemplate}
        disabled={props.isSaving}
      >
        Save as template
      </button>
    )}
    <button
      type="button"
      className="btn btn--primary"
      onClick={props.onSave}
      disabled={!props.isDirty || props.isSaving}
    >
      {props.isSaving ? "Saving…" : "Save"}
    </button>
  </div>
);

export default SaveActions;
