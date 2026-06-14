// Phase 1 shell — read-only preview of a template's missions. Logic wired in Phase 4.
import type { Mission } from "../../types/index.ts";
import XPBadge from "../shared/XPBadge.tsx";
import TagBadge from "../shared/TagBadge.tsx";

interface TemplateFieldsProps {
  readonly missions: ReadonlyArray<Mission>;
}

const TemplateFields = (props: TemplateFieldsProps) => (
  <ul data-testid="template-fields" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
    {props.missions.map((m) => (
      <li key={m.id} className="card" style={{ padding: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1, fontSize: "var(--text-sm)" }}>{m.title}</span>
        <XPBadge value={m.xpValue} />
        {m.tags.map((t) => <TagBadge key={t} label={t} variant={t} />)}
      </li>
    ))}
    {props.missions.length === 0 && (
      <li style={{ color: "hsl(var(--color-muted-fg))", fontSize: "var(--text-sm)" }}>No missions</li>
    )}
  </ul>
);

export default TemplateFields;
