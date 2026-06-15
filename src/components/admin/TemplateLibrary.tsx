// Phase 1 shell — template browsing panel. Logic wired in Phase 4.
// TemplateExport type is deferred to Phase 8; using a local shape for now.
import SearchBar from "../shared/SearchBar.tsx";

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

const PLACEHOLDER_TEMPLATES: ReadonlyArray<TemplateSummary> = [
  {
    id: "tpl-1",
    name: "Engineering Onboarding",
    milestoneCount: 4,
    missionCount: 12,
  },
  {
    id: "tpl-2",
    name: "Sales Bootcamp",
    milestoneCount: 3,
    missionCount: 8,
  },
  {
    id: "tpl-3",
    name: "Executive Welcome",
    milestoneCount: 5,
    missionCount: 15,
  },
];

const TemplateLibrary = (props: TemplateLibraryProps) => {
  const templates = props.templates.length > 0
    ? props.templates
    : PLACEHOLDER_TEMPLATES;

  return (
    <div
      data-testid="template-library"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        Onboarding Templates
      </h3>

      <SearchBar
        placeholder="Search templates..."
        onSearch={() => undefined}
      />

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {templates.map((t) => (
          <li
            key={t.id}
            className="card"
            style={{
              padding: "var(--space-3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: "var(--weight-medium)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "hsl(var(--color-muted-fg))",
                }}
              >
                {t.milestoneCount} milestones · {t.missionCount} missions
              </div>
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => props.onLoad(t.id)}
            >
              Use Template
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TemplateLibrary;
