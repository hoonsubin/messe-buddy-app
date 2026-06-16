import { useMemo, useState } from "react";
import { marked } from "marked";
import type {
  DraftMission,
  MissionTag,
  MissionType,
  ValidationMethod,
} from "../../types/index.ts";
import { MISSION_TYPE, VALIDATION_METHOD } from "../../types/index.ts";
import MarkdownEditor from "./MarkdownEditor.tsx";
import TagSelector from "./TagSelector.tsx";
import FormEditor from "./FormEditor.tsx";
import SegmentGroup from "../shared/SegmentGroup.tsx";
import XpSelector from "../shared/XpSelector.tsx";

// ── Option lists ───────────────────────────────────────────────────────────────

const MISSION_TYPE_OPTIONS: ReadonlyArray<
  { value: MissionType; label: string }
> = [
  { value: MISSION_TYPE.TEXT, label: "Text" },
  { value: MISSION_TYPE.LINK, label: "Link" },
  { value: MISSION_TYPE.FORM, label: "Form" },
];

const VALIDATION_OPTIONS: ReadonlyArray<
  { value: ValidationMethod; label: string }
> = [
  { value: VALIDATION_METHOD.GM_APPROVE, label: "GM approve" },
  { value: VALIDATION_METHOD.SELF_APPROVE, label: "Self approve" },
  { value: VALIDATION_METHOD.QR, label: "QR scan" },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface MissionEditorProps {
  readonly draft: DraftMission;
  readonly xpPreview: number; // kept for compat; no longer shown (XP is direct)
  readonly onDraftChange: (draft: DraftMission) => void;
}

const MissionEditor = (props: MissionEditorProps) => {
  const [bodyPreview, setBodyPreview] = useState(false);

  const renderedBody = useMemo(() => {
    if (!bodyPreview || !props.draft.body) return null;
    try {
      return marked.parse(props.draft.body, { async: false }) as string;
    } catch {
      return null;
    }
  }, [bodyPreview, props.draft.body]);

  return (
    <div
      data-testid="mission-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* Title */}
      <div className="form-field">
        <label className="form-label" htmlFor="mission-title">
          Title
        </label>
        <input
          id="mission-title"
          className="form-input"
          type="text"
          value={props.draft.title ?? ""}
          onChange={(e) =>
            props.onDraftChange({ ...props.draft, title: e.target.value })}
          placeholder="Mission title"
        />
      </div>

      {/* Body with markdown preview toggle */}
      <div className="form-field">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-2)",
          }}
        >
          <label className="form-label" style={{ margin: 0 }}>
            Body (Markdown)
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ fontSize: "var(--text-xs)" }}
            onClick={() => setBodyPreview((p) => !p)}
          >
            {bodyPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {bodyPreview
          ? (
            <div
              className="markdown-preview"
              data-testid="markdown-preview"
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid hsl(var(--color-border))",
                minHeight: "6rem",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
              }}
              dangerouslySetInnerHTML={{
                __html: renderedBody ?? "<em>Nothing to preview</em>",
              }}
            />
          )
          : (
            <MarkdownEditor
              value={props.draft.body ?? ""}
              placeholder="Describe this mission…"
              onChange={(body) => props.onDraftChange({ ...props.draft, body })}
            />
          )}
      </div>

      {/* Mission type */}
      <div className="form-field">
        <label className="form-label">Mission type</label>
        <SegmentGroup
          options={MISSION_TYPE_OPTIONS}
          value={props.draft.type ?? MISSION_TYPE.TEXT}
          label="Mission type"
          onChange={(type) =>
            props.onDraftChange({
              ...props.draft,
              type: type as MissionType,
              // Auto-set validationMethod to gmApprove when type is form (C-06)
              validationMethod: type === "form"
                ? VALIDATION_METHOD.GM_APPROVE
                : props.draft.validationMethod,
            })}
        />
      </div>

      {/* External URL (link type only) */}
      {props.draft.type === MISSION_TYPE.LINK && (
        <div className="form-field">
          <label className="form-label" htmlFor="mission-url">
            External URL
          </label>
          <input
            id="mission-url"
            className="form-input"
            type="url"
            value={props.draft.externalUrl ?? ""}
            onChange={(e) =>
              props.onDraftChange({
                ...props.draft,
                externalUrl: e.target.value,
              })}
            placeholder="https://..."
          />
        </div>
      )}

      {/* XP value — direct Fibonacci selection */}
      <div className="form-field">
        <label className="form-label">XP</label>
        <XpSelector
          value={props.draft.xpValue ?? 1}
          onChange={(xpValue) =>
            props.onDraftChange({ ...props.draft, xpValue })}
        />
      </div>

      {/* Tags */}
      <div className="form-field">
        <label className="form-label">Tags</label>
        <TagSelector
          selected={props.draft.tags ?? []}
          onChange={(tags: ReadonlyArray<MissionTag>) =>
            props.onDraftChange({ ...props.draft, tags })}
        />
      </div>

      {/* Suggested due date */}
      <div className="form-field">
        <label className="form-label" htmlFor="mission-due-date">
          Suggested due date
        </label>
        <input
          id="mission-due-date"
          className="form-input"
          type="date"
          value={props.draft.suggestedDueDate ?? ""}
          onChange={(e) =>
            props.onDraftChange({
              ...props.draft,
              suggestedDueDate: e.target.value || undefined,
            })}
        />
      </div>

      {/* Validation method - hidden when type is form (C-06) */}
      {props.draft.type !== MISSION_TYPE.FORM && (
        <div className="form-field">
          <label className="form-label">Validation</label>
          <SegmentGroup
            options={VALIDATION_OPTIONS}
            value={props.draft.validationMethod ?? VALIDATION_METHOD.GM_APPROVE}
            label="Validation method"
            onChange={(validationMethod) =>
              props.onDraftChange({
                ...props.draft,
                validationMethod: validationMethod as ValidationMethod,
              })}
          />
        </div>
      )}

      {/* isInCurrentMissions toggle */}
      <div
        className="form-field"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <input
          id="mission-current"
          type="checkbox"
          checked={props.draft.isInCurrentMissions ?? true}
          onChange={(e) =>
            props.onDraftChange({
              ...props.draft,
              isInCurrentMissions: e.target.checked,
            })}
          style={{
            width: "1.125rem",
            height: "1.125rem",
            accentColor: "hsl(var(--color-accent))",
            cursor: "pointer",
          }}
        />
        <label
          className="form-label"
          htmlFor="mission-current"
          style={{ margin: 0, cursor: "pointer" }}
        >
          Show in player's Current Missions
        </label>
      </div>

      {/* FormEditor - shown when type is form */}
      {props.draft.type === MISSION_TYPE.FORM && (
        <div data-testid="form-editor-slot">
          <p
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-medium)",
              color: "hsl(var(--color-fg))",
              margin: "0 0 var(--space-3)",
            }}
          >
            Form Fields
          </p>
          <FormEditor
            missionId={props.draft.milestoneId}
            fields={props.draft.formFields ?? []}
            onChange={(fields) =>
              props.onDraftChange({ ...props.draft, formFields: fields })}
          />
        </div>
      )}
    </div>
  );
};

export default MissionEditor;
