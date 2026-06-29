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

interface ResourcesEditorProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onAdd: (data: Omit<Resource, keyof PBRecord>) => void;
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
      props.onAdd({ sessionId: props.sessionId, ...draft });
    } else if (editing) {
      props.onUpdate(editing.id, draft);
    }
    close();
  };

  const canSave = draft.title.trim() !== "" && draft.url.trim() !== "";

  return (
    <div
      data-testid="resources-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {props.resources.map((r) => (
          <li
            key={r.id}
            className="card"
            style={{
              padding: "var(--space-2) var(--space-3)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "var(--text-lg)",
                  color: r.isVisibleToPlayer
                    ? "hsl(var(--color-status-complete))"
                    : "hsl(var(--color-muted-fg))",
                }}
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
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
              }}
            >
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    color: "hsl(var(--color-fg))",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                  }}
                >
                  {r.type}
                </span>
              </span>
              <MdEdit
                size={15}
                aria-hidden="true"
                style={{ color: "hsl(var(--color-muted-fg))", flexShrink: 0 }}
              />
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => props.onDelete(r.id)}
              aria-label={`Remove ${r.title}`}
              style={{ flexShrink: 0 }}
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
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={editing === "new" ? "Add resource" : "Edit resource"}
          onClick={close}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "26rem",
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
              }}
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
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-fg))",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={draft.isVisibleToPlayer}
                onChange={(e) =>
                  setDraft({ ...draft, isVisibleToPlayer: e.target.checked })}
              />
              Visible to the new hire
            </label>

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ flex: 1 }}
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                disabled={!canSave}
                onClick={submit}
              >
                {editing === "new" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesEditor;
