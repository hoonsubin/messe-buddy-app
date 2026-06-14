// Phase 1 shell — logic wired in Phase 4.
import type { MissionTag } from "../../types/index.ts";
import { MISSION_TAG } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";

interface TagSelectorProps {
  readonly selected: ReadonlyArray<MissionTag>;
  readonly onChange: (tags: ReadonlyArray<MissionTag>) => void;
}

const ALL_TAGS = Object.values(MISSION_TAG) as MissionTag[];

const TagSelector = (props: TagSelectorProps) => (
  <div className="tag-selector" data-testid="tag-selector" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
    {ALL_TAGS.map((tag) => {
      const isSelected = props.selected.includes(tag);
      return (
        <button
          key={tag}
          type="button"
          onClick={() =>
            props.onChange(
              isSelected ? props.selected.filter((t) => t !== tag) : [...props.selected, tag]
            )
          }
          aria-pressed={isSelected}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <TagBadge label={tag} variant={isSelected ? tag : undefined} />
        </button>
      );
    })}
  </div>
);

export default TagSelector;
