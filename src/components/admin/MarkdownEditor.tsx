// Phase 1 shell — preview pane wired in Phase 4.
interface MarkdownEditorProps {
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

const MarkdownEditor = (props: MarkdownEditorProps) => (
  <div className="markdown-editor" data-testid="markdown-editor">
    <textarea
      className="markdown-editor__textarea"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) =>
        props.onChange(e.target.value)}
      aria-label="Mission body (Markdown)"
    />
  </div>
);

export default MarkdownEditor;
