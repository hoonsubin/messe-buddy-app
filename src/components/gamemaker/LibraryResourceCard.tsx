import type { LibraryResource } from "../../types/index.ts";
import { parseLibraryTags } from "../../utils/libraryTags.ts";
import TagBadge from "../shared/TagBadge.tsx";
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";

interface LibraryResourceCardProps {
  readonly resource: LibraryResource;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

const LibraryResourceCard = ({
  resource,
  onEdit,
  onDelete,
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
      </div>
      <div className="library-resource-card__actions">
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
