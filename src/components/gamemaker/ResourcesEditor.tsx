import { useState } from "react";
import {
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdClose,
  MdEdit,
} from "react-icons/md";
import type { PBRecord, Resource } from "../../types/index.ts";
import type { ResourceType } from "../../types/index.ts";
import { RESOURCE_TYPE } from "../../types/index.ts";
import { Modal } from "../patterns/Modal.tsx";

interface ResourcesEditorProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onAdd: (data: {
    readonly title: string;
    readonly type: ResourceType;
    readonly url: string;
    readonly isVisibleToPlayer: boolean;
  }) => void;
  readonly onUpdate: (
    resourceId: string,
    patch: Partial<Omit<Resource, keyof PBRecord>>,
  ) => void;
  readonly onDelete: (resourceId: string) => void;
  readonly onToggleVisibility: (resourceId: string, visible: boolean) => void;
  readonly sessionId: string;
}

interface Draft {
  readonly title: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly isVisibleToPlayer: boolean;
}

const emptyDraft: Draft = {
  title: "",
  type: RESOURCE_TYPE.LINK,
  url: "",
  isVisibleToPlayer: true,
};

const ResourcesEditor = (props: ResourcesEditorProps) => {
  // null = closed; "new" = adding; a Resource = editing that one.
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const openAdd = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };
  const openEdit = (r: Resource) => {
    setDraft({
      title: r.title,
      type: r.type,
      url: r.url,
      isVisibleToPlayer: r.isVisibleToPlayer,
    });
    setEditing(r);
  };
  const close = () => setEditing(null);

  const submit = () => {
    if (editing === "new") {
      props.onAdd({ ...draft });
    } else if (editing) {
      props.onUpdate(editing.id, draft);
    }
    close();
  };

  const canSave = draft.title.trim() !== "" && draft.url.trim() !== "";

  return (
    <div
      data-testid="resources-editor"
      className="resources-editor"
    >
      <ul className="resources-editor__list">
        {props.resources.map((r) => (
          <li
            key={r.id}
            className="card resources-editor__item"
          >
            <label
              className="resources-editor__toggle-label"
              aria-label={`Toggle visibility for ${r.title}`}
            >
              <input
                type="checkbox"
                checked={r.isVisibleToPlayer}
                onChange={(e) =>
                  props.onToggleVisibility(r.id, e.target.checked)}
                style={{ display: "none" }}
              />
              <span
                className={`resources-editor__toggle-icon${
                  r.isVisibleToPlayer
                    ? " resources-editor__toggle-icon--visible"
                    : " resources-editor__toggle-icon--hidden"
                }`}
              >
                {r.isVisibleToPlayer
                  ? <MdCheckBox />
                  : <MdCheckBoxOutlineBlank />}
              </span>
            </label>

            {/* Clickable → edit */}
            <button
              type="button"
              onClick={() => openEdit(r)}
              data-testid="resource-edit"
              className="resources-editor__edit-btn"
            >
              <span className="resources-editor__edit-text">
                <span className="resources-editor__edit-title">
                  {r.title}
                </span>
                <span className="resources-editor__edit-type">
                  {r.type}
                </span>
              </span>
              <MdEdit
                size={15}
                aria-hidden="true"
                className="core-icon-muted"
              />
            </button>

            <button
              type="button"
              className="btn btn--ghost resources-editor__delete-btn"
              onClick={() => props.onDelete(r.id)}
              aria-label={`Remove ${r.title}`}
            >
              <MdClose size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="btn btn--secondary" onClick={openAdd}>
        + Add resource
      </button>

      {editing !== null && (
        <Modal
          open
          onBackdropClick={close}
          aria-labelledby="resources-editor-modal-title"
          testId="resources-editor-modal"
          panelClassName="card resources-editor__modal"
        >
          <h3
            id="resources-editor-modal-title"
            className="resources-editor__modal-title"
          >
            {editing === "new" ? "Add resource" : "Edit resource"}
          </h3>

          <div className="form-field">
            <label className="form-label" htmlFor="res-title">Title</label>
            <input
              id="res-title"
              className="form-input"
              type="text"
              value={draft.title}
              autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Resource name"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="res-type">Type</label>
            <select
              id="res-type"
              className="form-input"
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as ResourceType })}
            >
              {(Object.values(RESOURCE_TYPE) as ResourceType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="res-url">URL</label>
            <input
              id="res-url"
              className="form-input"
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <label className="resources-editor__visibility-label">
            <input
              type="checkbox"
              checked={draft.isVisibleToPlayer}
              onChange={(e) =>
                setDraft({ ...draft, isVisibleToPlayer: e.target.checked })}
            />
            Visible to the player
          </label>

          <div className="resources-editor__modal-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSave}
              onClick={submit}
            >
              {editing === "new" ? "Add" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ResourcesEditor;
