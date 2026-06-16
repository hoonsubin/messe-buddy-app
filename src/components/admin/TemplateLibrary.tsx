import { useState } from "react";
import { MdDeleteOutline } from "react-icons/md";
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
  readonly onDelete: (templateId: string) => void;
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
  const [query, setQuery] = useState("");

  const source = props.templates.length > 0
    ? props.templates
    : PLACEHOLDER_TEMPLATES;

  const visible = query.trim()
    ? source.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : source;

  // Placeholders are display-only - disable load/delete for them
  const isPlaceholder = props.templates.length === 0;

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
        onSearch={setQuery}
      />

      {visible.length === 0
        ? (
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              margin: 0,
              textAlign: "center",
              padding: "var(--space-4) 0",
            }}
          >
            No templates match "{query}"
          </p>
        )
        : (
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
            {visible.map((t) => (
              <li
                key={t.id}
                className="card"
                style={{
                  padding: "var(--space-3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: "var(--weight-medium)",
                      fontSize: "var(--text-sm)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
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
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-1)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => props.onLoad(t.id)}
                    disabled={isPlaceholder}
                    title={isPlaceholder ? "Save a template first" : undefined}
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => props.onDelete(t.id)}
                    disabled={isPlaceholder}
                    aria-label={`Delete ${t.name}`}
                    title={isPlaceholder ? "Save a template first" : undefined}
                  >
                    <MdDeleteOutline size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
};

export default TemplateLibrary;
