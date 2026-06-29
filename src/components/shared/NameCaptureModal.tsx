import { useState } from "react";
import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";
import { Input } from "../ui/Input.tsx";
import {
  Modal,
  ModalActions,
  ModalDescription,
  ModalTitle,
} from "../patterns/Modal.tsx";
import { MODAL_VARIANT } from "../patterns/types.ts";

interface NameCaptureModalProps {
  readonly onSubmit: (name: string) => void;
  readonly loading?: boolean;
  readonly title?: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly inputLabel?: string;
  readonly onCancel?: () => void;
}

const NameCaptureModal = (props: NameCaptureModalProps) => {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !props.loading;

  return (
    <Modal
      open
      variant={MODAL_VARIANT.NARROW}
      role="dialog"
      aria-labelledby="name-modal-title"
    >
      <ModalTitle id="name-modal-title">
        {props.title ?? "What's your name?"}
      </ModalTitle>
      <ModalDescription>
        {props.description ??
          "Your buddy and team will see this so they can welcome you. You can fill in the rest of your profile later."}
      </ModalDescription>

      <Input
        type="text"
        className="core-w-full core-mb-4"
        placeholder={props.placeholder ?? "e.g. Sofia Chen"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        maxLength={60}
        aria-label={props.inputLabel ?? "Your name"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) props.onSubmit(trimmed);
          if (e.key === "Escape" && props.onCancel) props.onCancel();
        }}
      />

      <ModalActions stack>
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          fullWidth
          disabled={!canSubmit}
          onClick={() => props.onSubmit(trimmed)}
        >
          {props.loading ? "Saving…" : (props.submitLabel ?? "Continue")}
        </Button>
        {props.onCancel && (
          <Button
            variant={BUTTON_VARIANT.GHOST}
            fullWidth
            onClick={props.onCancel}
            disabled={props.loading}
          >
            Cancel
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
};

export default NameCaptureModal;
