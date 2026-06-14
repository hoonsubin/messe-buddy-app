// Phase 1 shell — full mission edit form. Logic wired in Phase 4.
import type { Mission, PBRecord } from "../../types/index.ts";
import MarkdownEditor from "./MarkdownEditor.tsx";
import DifficultySelector from "./DifficultySelector.tsx";
import TagSelector from "./TagSelector.tsx";
import MissionTypeSelector from "./MissionTypeSelector.tsx";
import ValidationMethodSelector from "./ValidationMethodSelector.tsx";
import FormEditor from "./FormEditor.tsx";

interface MissionEditorProps {
  readonly draft: Omit<Mission, keyof PBRecord>;
  readonly onDraftChange: (draft: Omit<Mission, keyof PBRecord>) => void;
}

const MissionEditor = (props: MissionEditorProps) => (
  <div data-testid="mission-editor" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
    <div className="form-field">
      <label className="form-label" htmlFor="mission-title">Title</label>
      <input
        id="mission-title"
        className="form-input"
        type="text"
        value={props.draft.title}
        onChange={(e) => props.onDraftChange({ ...props.draft, title: e.target.value })}
        placeholder="Mission title"
      />
    </div>

    <div className="form-field">
      <label className="form-label">Body (Markdown)</label>
      <MarkdownEditor
        value={props.draft.body ?? ""}
        placeholder="Describe this mission…"
        onChange={(body) => props.onDraftChange({ ...props.draft, body })}
      />
    </div>

    <MissionTypeSelector
      value={props.draft.type}
      onChange={(type) => props.onDraftChange({ ...props.draft, type })}
    />

    {props.draft.type === "link" && (
      <div className="form-field">
        <label className="form-label" htmlFor="mission-url">External URL</label>
        <input
          id="mission-url"
          className="form-input"
          type="url"
          value={props.draft.externalUrl ?? ""}
          onChange={(e) => props.onDraftChange({ ...props.draft, externalUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    )}

    <div className="form-field">
      <label className="form-label">Difficulty</label>
      <DifficultySelector
        value={props.draft.difficulty}
        xpPreview={props.draft.xpValue}
        onChange={(difficulty) => props.onDraftChange({ ...props.draft, difficulty })}
      />
    </div>

    <div className="form-field">
      <label className="form-label">Tags</label>
      <TagSelector
        selected={props.draft.tags}
        onChange={(tags) => props.onDraftChange({ ...props.draft, tags })}
      />
    </div>

    <ValidationMethodSelector
      value={props.draft.validationMethod}
      hidden={props.draft.type === "form"}
      onChange={(validationMethod) => props.onDraftChange({ ...props.draft, validationMethod })}
    />

    {/* FormEditor rendered at page level when type="form"; shown here as slot marker */}
    {props.draft.type === "form" && (
      <div data-testid="form-editor-slot">
        <p style={{ fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))" }}>
          Form fields are managed in the section below.
        </p>
        <FormEditor
          missionId={props.draft.milestoneId}
          fields={[]}
          onChange={() => undefined}
        />
      </div>
    )}
  </div>
);

export default MissionEditor;
