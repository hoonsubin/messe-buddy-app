import { useState } from "react";
import {
  MdAssignment,
  MdDescription,
  MdEditNote,
  MdLink,
  MdSearch,
  MdVideocam,
} from "react-icons/md";
import type { Resource } from "../../types/index.ts";

interface ResourcesSectionProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onSearch: (query: string) => void;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "document":
      return <MdDescription size={18} aria-hidden="true" />;
    case "guide":
      return <MdAssignment size={18} aria-hidden="true" />;
    case "video":
      return <MdVideocam size={18} aria-hidden="true" />;
    case "form":
      return <MdEditNote size={18} aria-hidden="true" />;
    default:
      return <MdLink size={18} aria-hidden="true" />;
  }
};

const ResourcesSection = (props: ResourcesSectionProps) => {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? props.resources.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      (r.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
    )
    : props.resources;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    props.onSearch(e.target.value);
  };

  return (
    <div className="resources-section" data-testid="resources-section">
      <p className="section-label" style={{ margin: 0 }}>Resources</p>

      {/* Search bar */}
      <div className="search-bar" role="search">
        <MdSearch size={16} aria-hidden="true" />
        <input
          type="search"
          className="search-bar__input"
          placeholder="Search resources…"
          value={query}
          onChange={handleSearch}
          aria-label="Search resources"
        />
      </div>

      {/* Responsive grid: 2-col on ≥640px, 1-col on mobile */}
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
            <div className="resource-card__body">
              <span className="resource-card__title">{r.title}</span>
              {r.description !== undefined && (
                <span className="resource-card__desc">{r.description}</span>
              )}
            </div>
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
