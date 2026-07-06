import { useState } from "react";
import type { LibraryResource } from "../../types/index.ts";
import type { LibraryResourceInput } from "../../hooks/useLibraryResources.ts";
import { parseLibraryTags } from "../../utils/libraryTags.ts";
import FreeformTagInput from "../shared/FreeformTagInput.tsx";
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";
import { Input, Textarea } from "../shared/Input.tsx";
import {
  Modal,
  ModalActions,
  ModalDescription,
  ModalTitle,
} from "../shared/Modal.tsx";
import { MODAL_VARIANT } from "../shared/types.ts";

interface LibraryResourceFormModalProps {
  readonly mode: "create" | "edit";
  readonly initial?: LibraryResource;
  readonly tagSuggestions: ReadonlyArray<string>;
  readonly loading?: boolean;
  readonly onSubmit: (data: LibraryResourceInput) => Promise<void>;
  readonly onCancel: () => void;
}

const emptyForm = (): LibraryResourceInput => ({
  title: "",
  url: "",
  description: "",
  tags: [],
});

const toForm = (
  mode: "create" | "edit",
  initial?: LibraryResource,
): LibraryResourceInput =>
  mode === "edit" && initial
    ? {
      title: initial.title,
      url: initial.url,
      description: initial.description ?? "",
      tags: [...parseLibraryTags(initial.tags)],
    }
    : emptyForm();

const LibraryResourceFormModal = ({
  mode,
  initial,
  tagSuggestions,
  loading = false,
  onSubmit,
  onCancel,
}: LibraryResourceFormModalProps) => {
  const [form, setForm] = useState<LibraryResourceInput>(() =>
    toForm(mode, initial)
  );

  const canSave = form.title.trim() !== "" && form.url.trim() !== "" &&
    !loading;

  const handleSubmit = () => {
    if (!canSave) return;
    void onSubmit({
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description?.trim() || undefined,
      tags: form.tags,
    });
  };

  return (
    <Modal
      open
      variant={MODAL_VARIANT.NARROW}
      role="dialog"
      aria-labelledby="library-resource-modal-title"
      testId="library-resource-form-modal"
      onBackdropClick={onCancel}
    >
      <ModalTitle id="library-resource-modal-title">
        {mode === "create" ? "Add library resource" : "Edit library resource"}
      </ModalTitle>
      <ModalDescription>
        Resources are shared across all Game Makers. Internal IDs are assigned
        automatically.
      </ModalDescription>

      <div className="library-resource-form">
        <div className="form-field">
          <label className="form-label" htmlFor="lib-res-title">
            Title
          </label>
          <Input
            id="lib-res-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Parking & Access"
            autoFocus
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="lib-res-url">
            URL
          </label>
          <Input
            id="lib-res-url"
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://…"
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="lib-res-desc">
            Description (optional)
          </label>
          <Textarea
            id="lib-res-desc"
            rows={2}
            value={form.description ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short helper text for GMs"
          />
        </div>

        <FreeformTagInput
          selected={form.tags}
          suggestions={tagSuggestions}
          onChange={(tags) => setForm((f) => ({ ...f, tags: [...tags] }))}
        />
      </div>

      <ModalActions stack>
        <Button
          variant={BUTTON_VARIANT.PRIMARY}
          onClick={handleSubmit}
          disabled={!canSave}
        >
          {loading
            ? "Saving…"
            : mode === "create"
            ? "Save resource"
            : "Save changes"}
        </Button>
        <Button variant={BUTTON_VARIANT.GHOST} onClick={onCancel}>
          Cancel
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default LibraryResourceFormModal;
