import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";
import {
  Modal,
  ModalActions,
  ModalDescription,
  ModalTitle,
} from "../patterns/Modal.tsx";

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly body?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** When true, the confirm button renders as btn--destructive. */
  readonly isDestructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    open={isOpen}
    onBackdropClick={onCancel}
    role="alertdialog"
    aria-labelledby="confirm-dialog-title"
    testId="confirm-dialog"
  >
    <ModalTitle id="confirm-dialog-title">{title}</ModalTitle>
    {body && <ModalDescription>{body}</ModalDescription>}
    <ModalActions>
      <Button variant={BUTTON_VARIANT.GHOST} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={isDestructive
          ? BUTTON_VARIANT.DESTRUCTIVE
          : BUTTON_VARIANT.PRIMARY}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </ModalActions>
  </Modal>
);

export default ConfirmDialog;
