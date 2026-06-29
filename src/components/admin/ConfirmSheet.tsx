import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";

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
    <Button
      variant={BUTTON_VARIANT.PRIMARY}
      className="sheet-confirm__btn"
      onClick={props.onKeepEditing}
    >
      Keep editing
    </Button>
    <Button
      variant={BUTTON_VARIANT.SECONDARY}
      className="sheet-confirm__btn"
      onClick={props.onSaveDraft}
    >
      Save as draft
    </Button>
    <Button
      variant={BUTTON_VARIANT.GHOST}
      className="sheet-confirm__btn sheet-confirm__btn--destructive"
      onClick={props.onDiscardAndClose}
    >
      Discard changes
    </Button>
  </div>
);

export default ConfirmSheet;
