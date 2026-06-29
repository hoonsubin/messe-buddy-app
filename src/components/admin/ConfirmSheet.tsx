interface ConfirmSheetProps {
  readonly onKeepEditing: () => void;
  readonly onSaveDraft: () => void;
  readonly onDiscardAndClose: () => void;
}

const ConfirmSheet = (props: ConfirmSheetProps) => (
  <div className="sheet-confirm" role="alertdialog" aria-modal="true">
    <p className="sheet-confirm__title">Unsaved changes</p>
    <p className="sheet-confirm__desc">
      What would you like to do with your edits?
    </p>
    <button
      type="button"
      className="btn btn--primary sheet-confirm__btn"
      onClick={props.onKeepEditing}
    >
      Keep editing
    </button>
    <button
      type="button"
      className="btn btn--secondary sheet-confirm__btn"
      onClick={props.onSaveDraft}
    >
      Save as draft
    </button>
    <button
      type="button"
      className="btn btn--ghost sheet-confirm__btn sheet-confirm__btn--destructive"
      onClick={props.onDiscardAndClose}
    >
      Discard changes
    </button>
  </div>
);

export default ConfirmSheet;
