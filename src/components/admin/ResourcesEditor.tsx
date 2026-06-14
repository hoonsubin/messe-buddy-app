// Phase 1 shell — logic wired in Phase 4.
import type { Resource, PBRecord } from "../../types/index.ts";
import type { ResourceType } from "../../types/index.ts";
import { RESOURCE_TYPE } from "../../types/index.ts";

interface ResourcesEditorProps {
  readonly resources: ReadonlyArray<Resource>;
  readonly onAdd: (data: Omit<Resource, keyof PBRecord>) => void;
  readonly onDelete: (resourceId: string) => void;
  readonly sessionId: string;
}

const ResourcesEditor = (props: ResourcesEditorProps) => (
  <div data-testid="resources-editor" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {props.resources.map((r) => (
        <li key={r.id} className="card" style={{ padding: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{r.title} <span style={{ fontSize: "var(--text-xs)", color: "hsl(var(--color-muted-fg))" }}>({r.type})</span></span>
          <button type="button" className="btn btn--ghost" onClick={() => props.onDelete(r.id)} aria-label={`Remove ${r.title}`}>✕</button>
        </li>
      ))}
    </ul>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        props.onAdd({
          sessionId: props.sessionId,
          title: fd.get("title") as string,
          type: fd.get("type") as ResourceType,
          url: fd.get("url") as string,
          isVisibleToPlayer: true,
        });
        (e.target as HTMLFormElement).reset();
      }}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
    >
      <div className="form-field">
        <label className="form-label" htmlFor="res-title">Title</label>
        <input id="res-title" name="title" className="form-input" type="text" required placeholder="Resource name" />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="res-type">Type</label>
        <select id="res-type" name="type" className="form-input">
          {(Object.values(RESOURCE_TYPE) as ResourceType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="res-url">URL</label>
        <input id="res-url" name="url" className="form-input" type="url" required placeholder="https://..." />
      </div>
      <button type="submit" className="btn btn--secondary">+ Add resource</button>
    </form>
  </div>
);

export default ResourcesEditor;
