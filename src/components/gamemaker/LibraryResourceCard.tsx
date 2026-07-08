import type { LibraryResource } from "../../types/index.ts";
import type { TemplateResourceAssignment } from "../../hooks/pages/useGmHomePage.ts";
import { parseLibraryTags } from "../../utils/libraryTags.ts";
import TagBadge from "../shared/TagBadge.tsx";
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";

interface LibraryResourceCardProps {
  readonly resource: LibraryResource;
  readonly assignments: ReadonlyArray<TemplateResourceAssignment>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onAssign: () => void;
  readonly onUnassign: (templateName: string, milestoneIndex: number) => void;
}

const LibraryResourceCard = ({
  resource,
  assignments,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
}: LibraryResourceCardProps) => {
  const tags = parseLibraryTags(resource.tags);

  return (
    <li
      className="card library-resource-card"
      data-testid="library-resource-card"
    >
      <div className="library-resource-card__body">
        <span className="library-resource-card__title">{resource.title}</span>
        <span className="library-resource-card__url">{resource.url}</span>
        {resource.description && (
          <span className="library-resource-card__desc">
            {resource.description}
          </span>
        )}
        {tags.length > 0 && (
          <div className="library-resource-card__tags">
            {tags.map((tag) => <TagBadge key={tag} label={tag} />)}
          </div>
        )}
        <div
          className="library-resource-card__assignments"
          data-testid="library-resource-assignments"
        >
          {assignments.length === 0
            ? (
              <span className="library-resource-card__assignments-empty">
                Not assigned to any template milestone
              </span>
            )
            : (
              assignments.map((a) => (
                <span
                  key={`${a.templateName}:${a.milestoneIndex}`}
                  className="library-resource-card__assignment-chip"
                  data-testid="library-resource-assignment-chip"
                >
                  {a.templateName} &rsaquo; {a.milestoneName}
                  <button
                    type="button"
                    aria-label={`Unassign from ${a.templateName}'s ${a.milestoneName}`}
                    onClick={() => onUnassign(a.templateName, a.milestoneIndex)}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
        </div>
      </div>
      <div className="library-resource-card__actions">
        <Button variant={BUTTON_VARIANT.GHOST} onClick={onAssign}>
          Assign to milestone
        </Button>
        <Button variant={BUTTON_VARIANT.GHOST} onClick={onEdit}>
          Edit
        </Button>
        <Button variant={BUTTON_VARIANT.GHOST} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
};

export default LibraryResourceCard;
