import type { MissionTag } from "../../types/index.ts";
import { MISSION_TAG } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";

interface TagSelectorProps {
  readonly selected: ReadonlyArray<MissionTag>;
  readonly onChange: (tags: ReadonlyArray<MissionTag>) => void;
}

const ALL_TAGS = Object.values(MISSION_TAG) as MissionTag[];

const TagSelector = (props: TagSelectorProps) => (
  <div
    className="tag-selector core-flex-row core-gap-2 core-flex-wrap"
    data-testid="tag-selector"
  >
    {ALL_TAGS.map((tag) => {
      const isSelected = props.selected.includes(tag);
      return (
        <button
          key={tag}
          type="button"
          className="core-btn-reset"
          onClick={() =>
            props.onChange(
              isSelected
                ? props.selected.filter((t) => t !== tag)
                : [...props.selected, tag],
            )}
          aria-pressed={isSelected}
        >
          <TagBadge label={tag} variant={isSelected ? tag : undefined} />
        </button>
      );
    })}
  </div>
);

export default TagSelector;
