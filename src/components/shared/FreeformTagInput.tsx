import { useCallback, useState } from "react";
import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";
import { Input } from "../ui/Input.tsx";
import TagBadge from "./TagBadge.tsx";
import { normalizeTag } from "../../utils/libraryTags.ts";

interface FreeformTagInputProps {
  readonly selected: ReadonlyArray<string>;
  readonly suggestions: ReadonlyArray<string>;
  readonly onChange: (tags: ReadonlyArray<string>) => void;
  readonly inputLabel?: string;
}

const FreeformTagInput = ({
  selected,
  suggestions,
  onChange,
  inputLabel = "Tags",
}: FreeformTagInputProps) => {
  const [draft, setDraft] = useState("");

  const addTag = useCallback(
    (raw: string) => {
      const tag = normalizeTag(raw);
      if (!tag || selected.includes(tag)) return;
      onChange([...selected, tag]);
      setDraft("");
    },
    [onChange, selected],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(selected.filter((t) => t !== tag));
    },
    [onChange, selected],
  );

  const availableSuggestions = suggestions.filter((t) => !selected.includes(t));

  return (
    <div className="freeform-tag-input" data-testid="freeform-tag-input">
      <label className="form-label">{inputLabel}</label>

      {selected.length > 0 && (
        <div className="freeform-tag-input__chips">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              className="freeform-tag-input__chip-btn core-btn-reset"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              data-testid={`tag-chip-${tag}`}
            >
              <TagBadge label={`${tag} ×`} />
            </button>
          ))}
        </div>
      )}

      <div className="freeform-tag-input__row">
        <Input
          type="text"
          className="freeform-tag-input__field"
          placeholder="Add a tag…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="New tag"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
        />
        <Button
          variant={BUTTON_VARIANT.SECONDARY}
          onClick={() => addTag(draft)}
          disabled={!normalizeTag(draft)}
        >
          Add
        </Button>
      </div>

      {availableSuggestions.length > 0 && (
        <div className="freeform-tag-input__suggestions">
          <p className="freeform-tag-input__hint">
            Suggestions from existing resources
          </p>
          <div className="freeform-tag-input__suggestion-row">
            {availableSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                className="freeform-tag-input__suggestion core-btn-reset"
                onClick={() => addTag(tag)}
                data-testid={`tag-suggestion-${tag}`}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeformTagInput;
