import { MdAdd } from "react-icons/md";
import type { TemplateExport } from "../../types/index.ts";

interface TemplateSelectProps {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly appliedName: string | null;
  readonly applying: boolean;
  readonly onSelect: (name: string) => void;
  readonly onAddNew: () => void;
}

/**
 * Template chooser: a dropdown of saved templates (selecting one applies it to
 * the player) plus a button to save a new template.
 */
const TemplateSelect = (props: TemplateSelectProps) => (
  <div className="core-flex-row core-gap-2">
    <select
      className="form-input core-flex-1 core-min-w-0"
      data-testid="template-select"
      aria-label="Onboarding template"
      value={props.appliedName ?? ""}
      disabled={props.applying}
      onChange={(e) => {
        if (e.target.value) props.onSelect(e.target.value);
      }}
    >
      <option value="" disabled>
        {props.applying ? "Applying…" : "Choose a template…"}
      </option>
      {props.templates.map((t) => (
        <option key={t.name} value={t.name}>
          {t.name} · {t.milestones.length} milestones · {t.missions.length}{" "}
          missions
        </option>
      ))}
    </select>

    <button
      type="button"
      className="btn btn--secondary core-shrink-0 core-gap-1"
      data-testid="add-template"
      onClick={props.onAddNew}
      style={{ whiteSpace: "nowrap" }}
    >
      <MdAdd size={16} aria-hidden="true" />
      New template
    </button>
  </div>
);

export default TemplateSelect;
