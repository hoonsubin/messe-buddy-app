import { useCallback, useEffect, useRef } from "react";

interface MarkdownEditorProps {
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

const MarkdownEditor = (props: MarkdownEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Shrink to auto, then expand to scrollHeight so it never clips content
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Grow when value changes externally (e.g. draft loaded)
  useEffect(() => {
    autoGrow();
  }, [props.value, autoGrow]);

  return (
    <div className="markdown-editor" data-testid="markdown-editor">
      <textarea
        ref={textareaRef}
        className="markdown-editor__textarea"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => {
          props.onChange(e.target.value);
          autoGrow();
        }}
        onFocus={autoGrow}
        aria-label="Mission body (Markdown)"
        rows={4}
      />
    </div>
  );
};

export default MarkdownEditor;
