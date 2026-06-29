// Phase 1 shell - read-only preview of a template's missions. Logic wired in Phase 4.
import type { Mission } from "../../types/index.ts";
import XPBadge from "../shared/XPBadge.tsx";
import TagBadge from "../shared/TagBadge.tsx";

interface TemplateFieldsProps {
  readonly missions: ReadonlyArray<Mission>;
}

const TemplateFields = (props: TemplateFieldsProps) => (
  <ul data-testid="template-fields" className="template-fields__list">
    {props.missions.map((m) => (
      <li
        key={m.id}
        className="card template-fields__item"
      >
        <span className="core-flex-1 core-text-sm">{m.title}</span>
        <XPBadge value={m.xpValue} />
        {m.tags.map((t) => <TagBadge key={t} label={t} variant={t} />)}
      </li>
    ))}
    {props.missions.length === 0 && (
      <li className="template-fields__empty">
        No missions
      </li>
    )}
  </ul>
);

export default TemplateFields;
