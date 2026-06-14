// Phase 1 shell — logic wired in Phase 3.
import type { Resource } from "../../types/index.ts";
import SearchBar from "../shared/SearchBar.tsx";
import ResourceCard from "../shared/ResourceCard.tsx";

interface ResourcesSectionProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onSearch: (query: string) => void;
}

const ResourcesSection = (props: ResourcesSectionProps) => (
  <div className="resources-section" data-testid="resources-section" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", height: "100%" }}>
    <SearchBar placeholder="Search resources…" onSearch={props.onSearch} />
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", overflowY: "auto", flex: 1 }}>
      {props.resources.map((r) => (
        <ResourceCard key={r.id} title={r.title} type={r.type} url={r.url} />
      ))}
    </div>
  </div>
);

export default ResourcesSection;
