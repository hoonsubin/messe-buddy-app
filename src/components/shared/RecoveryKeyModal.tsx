import { useState } from "react";
import Button from "./Button.tsx";
import { BUTTON_VARIANT } from "./types.ts";
import {
  Modal,
  ModalDescription,
  ModalKeyBlock,
  ModalTitle,
} from "./Modal.tsx";
import { MODAL_VARIANT } from "./types.ts";

interface RecoveryKeyModalProps {
  readonly recoveryKey: string;
  readonly onDismiss: () => void;
}

const RecoveryKeyModal = (props: RecoveryKeyModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(props.recoveryKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      open
      variant={MODAL_VARIANT.NARROW}
      role="dialog"
      aria-labelledby="recovery-modal-title"
    >
      <ModalTitle id="recovery-modal-title">Save your recovery key</ModalTitle>
      <ModalDescription>
        This key restores your progress if you lose access. It won't be shown
        again.
      </ModalDescription>

      <ModalKeyBlock>
        <code className="modal__key-text">{props.recoveryKey}</code>
        <Button
          variant={BUTTON_VARIANT.GHOST}
          className="recovery-modal__key-btn"
          onClick={handleCopy}
          aria-label="Copy recovery key to clipboard"
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </ModalKeyBlock>

      <Button
        variant={BUTTON_VARIANT.PRIMARY}
        fullWidth
        onClick={props.onDismiss}
      >
        I've saved my recovery key
      </Button>
    </Modal>
  );
};

export default RecoveryKeyModal;
