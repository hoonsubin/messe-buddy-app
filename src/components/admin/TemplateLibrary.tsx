// Phase 1 shell — template browsing panel. Logic wired in Phase 4.
// TemplateExport type is deferred to Phase 8; using a local shape for now.

interface TemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly milestoneCount: number;
  readonly missionCount: number;
}

interface TemplateLibraryProps {
  readonly templates: ReadonlyArray<TemplateSummary>;
  readonly onLoad: (templateId: string) => void;
}

const TemplateLibrary = (props: TemplateLibraryProps) => (
  <div data-testid="template-library" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
    <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)" }}>Templates</h3>
    {props.templates.length === 0 ? (
      <p style={{ color: "hsl(var(--color-muted-fg))", fontSize: "var(--text-sm)" }}>No templates saved yet.</p>
    ) : (
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {props.templates.map((t) => (
          <li key={t.id} className="card" style={{ padding: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-sm)" }}>{t.name}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "hsl(var(--color-muted-fg))" }}>
                {t.milestoneCount} milestones · {t.missionCount} missions
              </div>
            </div>
            <button type="button" className="btn btn--secondary" onClick={() => props.onLoad(t.id)}>
              Load
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default TemplateLibrary;
