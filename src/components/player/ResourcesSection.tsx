import { useState } from "react";
import {
  MdAssignment,
  MdDescription,
  MdEditNote,
  MdLink,
  MdVideocam,
} from "react-icons/md";
import type { Resource } from "../../types/index.ts";

interface ResourcesSectionProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onSearch: (query: string) => void;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "document": return <MdDescription size={18} aria-hidden="true" />;
    case "guide": return <MdAssignment size={18} aria-hidden="true" />;
    case "video": return <MdVideocam size={18} aria-hidden="true" />;
    case "form": return <MdEditNote size={18} aria-hidden="true" />;
    default: return <MdLink size={18} aria-hidden="true" />;
  }
};

const typeLabel = (type: string): string =>
  type.charAt(0).toUpperCase() + type.slice(1);

const ResourcesSection = (props: ResourcesSectionProps) => {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? props.resources.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase())
    )
    : props.resources;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    props.onSearch(e.target.value);
  };

  return (
    <div className="resources-section" data-testid="resources-section">
      {/* Search bar */}
      <input
        type="search"
        className="form-input"
        placeholder="Search resources…"
        value={query}
        onChange={handleSearch}
        aria-label="Search resources"
        style={{ marginBottom: "var(--space-3)" }}
      />

      {/* 2-column grid */}
      <div className="resources-grid">
        {filtered.map((r) => (
          <a
            key={r.id}
            className="resource-card"
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="resource-card"
          >
            <div className="resource-card__icon" aria-hidden="true">
              {typeIcon(r.type)}
            </div>
            <span className="resource-card__title">{r.title}</span>
            <span className="resource-card__type">{typeLabel(r.type)}</span>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <p
          style={{
            color: "hsl(var(--color-muted-fg))",
            fontSize: "var(--text-sm)",
          }}
        >
          No resources found.
        </p>
      )}
    </div>
  );
};

export default ResourcesSection;
