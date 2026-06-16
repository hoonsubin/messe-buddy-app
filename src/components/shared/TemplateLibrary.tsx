import { useState } from "react";
import { MdDeleteOutline } from "react-icons/md";
import SearchBar from "./SearchBar.tsx";
import type { TemplateSummary } from "../../utils/templateSummary.ts";

interface TemplateLibraryProps {
  readonly templates: ReadonlyArray<TemplateSummary>;
  readonly onLoad: (templateId: string) => void;
  readonly onDelete?: (templateId: string) => void;
  readonly showSearch?: boolean;
  readonly showTitle?: boolean;
  readonly showPlaceholders?: boolean;
  readonly loading?: boolean;
  readonly loadLabel?: string;
  readonly emptyMessage?: string;
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

const TemplateLibrary = ({
  templates,
  onLoad,
  onDelete,
  showSearch = true,
  showTitle = true,
  showPlaceholders = true,
  loading = false,
  loadLabel = "Use",
  emptyMessage = "No templates saved yet.",
}: TemplateLibraryProps) => {
  const [query, setQuery] = useState("");

  const usePlaceholders = showPlaceholders && templates.length === 0;
  const source = usePlaceholders ? PLACEHOLDER_TEMPLATES : templates;

  const visible = query.trim()
    ? source.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : source;

  const isPlaceholder = usePlaceholders;

  return (
    <div className="template-library" data-testid="template-library">
      {showTitle && (
        <h3 className="template-library__title">Onboarding Templates</h3>
      )}

      {showSearch && (
        <SearchBar
          placeholder="Search templates..."
          onSearch={setQuery}
        />
      )}

      {visible.length === 0
        ? (
          <p className="template-library__empty">
            {query.trim() ? `No templates match "${query}"` : emptyMessage}
          </p>
        )
        : (
          <ul className="template-library__list">
            {visible.map((t) => (
              <li key={t.id} className="card template-library__row">
                <div className="template-library__info">
                  <div className="template-library__name">{t.name}</div>
                  <div className="template-library__meta">
                    {t.milestoneCount} milestones · {t.missionCount} missions
                  </div>
                </div>
                <div className="template-library__actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() =>
                      onLoad(t.id)}
                    disabled={isPlaceholder || loading}
                    title={isPlaceholder ? "Save a template first" : undefined}
                  >
                    {loading ? "Loading…" : loadLabel}
                  </button>
                  {onDelete !== undefined && (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => onDelete(t.id)}
                      disabled={isPlaceholder || loading}
                      aria-label={`Delete ${t.name}`}
                      title={isPlaceholder
                        ? "Save a template first"
                        : undefined}
                    >
                      <MdDeleteOutline size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
};

export default TemplateLibrary;
