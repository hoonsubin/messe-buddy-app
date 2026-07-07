import { useState } from "react";
import {
  MdAssignment,
  MdDescription,
  MdEditNote,
  MdExpandLess,
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
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  // Results only populated after the user types (REQ-004).
  const filtered = query.trim()
    ? props.resources.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      (r.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
    )
    : [];

  const hasQuery = query.trim().length > 0;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    props.onSearch(e.target.value);
  };

  const handleOpen = () => {
    setExpanded(true);
    setQuery("");
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery("");
  };

  return (
    <div
      className="resources-section"
      data-testid="resources-section"
      aria-label="Resources"
    >
      {expanded
        ? (
          <>
            {/* ── Expanded header row ─────────────────────────────── */}
            <div className="resources-expanded-header">
              <p className="section-label" style={{ margin: 0, flex: 1 }}>
                Resources
              </p>
              <button
                type="button"
                className="assistant-chat-card__toggle"
                aria-label="Collapse resource search"
                aria-expanded="true"
                onClick={handleClose}
              >
                <MdExpandLess size={22} />
              </button>
            </div>

            {/* ── Search bar ──────────────────────────────────────── */}
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

            {/* ── Empty state: no query yet ───────────────────────── */}
            {!hasQuery && props.resources.length === 0 && (
              <p
                style={{
                  color: "hsl(var(--color-muted-fg))",
                  fontSize: "var(--text-sm)",
                  textAlign: "center",
                  padding: "var(--space-4) var(--space-2)",
                }}
                data-testid="resources-search-empty-catalog"
              >
                No resources shared yet. Your Game Master can attach guides to
                milestones — try the map sidebar Resources tab.
              </p>
            )}

            {!hasQuery && props.resources.length > 0 && (
              <p
                style={{
                  color: "hsl(var(--color-muted-fg))",
                  fontSize: "var(--text-sm)",
                  textAlign: "center",
                  padding: "var(--space-4) var(--space-2)",
                }}
              >
                Type to search resources…
              </p>
            )}

            {/* ── Responsive grid ─────────────────────────────────── */}
            {hasQuery && filtered.length > 0 && (
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
                        <span className="resource-card__desc">
                          {r.description}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* ── No results ──────────────────────────────────────── */}
            {hasQuery && filtered.length === 0 && (
              <p
                style={{
                  color: "hsl(var(--color-muted-fg))",
                  fontSize: "var(--text-sm)",
                  textAlign: "center",
                }}
              >
                No resources found.
              </p>
            )}
          </>
        )
        : (
          /* ── Collapsed trigger bar ──────────────────────────────── */
          <button
            type="button"
            className="resources-collapsed-bar"
            aria-expanded="false"
            aria-label="Open resource search"
            onClick={handleOpen}
          >
            <p className="section-label" style={{ margin: 0, flex: 1 }}>
              Resources
            </p>
            <MdSearch size={20} aria-hidden="true" />
          </button>
        )}
    </div>
  );
};

export default ResourcesSection;
