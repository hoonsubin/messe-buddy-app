import { useCallback, useState } from "react";
import { MdAdd } from "react-icons/md";
import type { LibraryResource } from "../../types/index.ts";
import type {
  LibraryResourceInput,
  LibraryResourcePatch,
} from "../../types/resourceInputs.ts";
import ConfirmDialog from "../shared/ConfirmDialog.tsx";
import FetchErrorPanel from "../shared/FetchErrorPanel.tsx";
import LibraryResourceCard from "./LibraryResourceCard.tsx";
import LibraryResourceFormModal from "./LibraryResourceFormModal.tsx";

interface ResourceLibraryTabProps {
  readonly resources: ReadonlyArray<LibraryResource>;
  readonly tagSuggestions: ReadonlyArray<string>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly createResource: (
    data: LibraryResourceInput,
  ) => Promise<LibraryResource>;
  readonly updateResource: (
    id: string,
    patch: LibraryResourcePatch,
  ) => Promise<LibraryResource>;
  readonly deleteResource: (id: string) => Promise<void>;
}

const ResourceLibraryTab = ({
  resources,
  tagSuggestions,
  loading,
  error,
  refresh,
  createResource,
  updateResource,
  deleteResource,
}: ResourceLibraryTabProps) => {
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<LibraryResource | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LibraryResource | null>(
    null,
  );

  const closeForm = useCallback(() => {
    setFormMode(null);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: LibraryResourceInput) => {
      setSaving(true);
      try {
        if (formMode === "edit" && editing) {
          await updateResource(editing.id, data);
        } else {
          await createResource(data);
        }
        closeForm();
      } finally {
        setSaving(false);
      }
    },
    [closeForm, createResource, editing, formMode, updateResource],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    await deleteResource(pendingDelete.id);
    setPendingDelete(null);
  }, [deleteResource, pendingDelete]);

  if (error) {
    return (
      <FetchErrorPanel
        message="Could not load the resource library."
        onRetry={refresh}
        testId="resource-library-error"
      />
    );
  }

  return (
    <div
      className="gm-home__tab-panel"
      data-testid="resource-library-tab"
    >
      <header className="gm-home__header">
        <div>
          <h1 className="gm-home__title">Resource library</h1>
          <p className="gm-home__subtitle">
            Company-wide · shared across all GMs
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary gm-home__header-btn"
          data-testid="add-library-resource-btn"
          onClick={() => {
            setEditing(null);
            setFormMode("create");
          }}
        >
          <MdAdd size={18} aria-hidden="true" />
          Add resource
        </button>
      </header>

      {loading && resources.length === 0
        ? <p className="gm-home__loading">Loading resources…</p>
        : resources.length === 0
        ? (
          <div className="card gm-home__empty">
            <p className="gm-home__empty-text">
              No library resources yet. Add links and guides your team can
              attach to player milestones.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setFormMode("create")}
            >
              <MdAdd size={18} aria-hidden="true" />
              Add resource
            </button>
          </div>
        )
        : (
          <ul className="library-resource-list">
            {resources.map((resource) => (
              <LibraryResourceCard
                key={resource.id}
                resource={resource}
                onEdit={() => {
                  setEditing(resource);
                  setFormMode("edit");
                }}
                onDelete={() => setPendingDelete(resource)}
              />
            ))}
          </ul>
        )}

      {formMode !== null && (
        <LibraryResourceFormModal
          key={editing?.id ?? "new"}
          mode={formMode}
          initial={editing ?? undefined}
          tagSuggestions={tagSuggestions}
          loading={saving}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete this resource?"
        body={pendingDelete
          ? `"${pendingDelete.title}" will be removed from the library. Player milestone attachments may also be removed.`
          : undefined}
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default ResourceLibraryTab;
