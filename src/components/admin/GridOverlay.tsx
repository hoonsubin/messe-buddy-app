// Phase 1 shell — logic wired in Phase 4.
interface GridOverlayProps {
  readonly enabled: boolean;
  readonly columns: number;
  readonly rows: number;
  readonly onToggle: () => void;
}

const GridOverlay = (props: GridOverlayProps) => (
  <>
    {props.enabled && (
      <svg
        className="grid-overlay"
        data-testid="grid-overlay"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent calc(100% / ${props.rows} - 1px), hsl(var(--color-border)) calc(100% / ${props.rows})), repeating-linear-gradient(90deg, transparent, transparent calc(100% / ${props.columns} - 1px), hsl(var(--color-border)) calc(100% / ${props.columns}))`,
          opacity: 0.4,
        }}
      />
    )}
    <button
      type="button"
      className="btn btn--ghost"
      onClick={props.onToggle}
      aria-pressed={props.enabled}
      style={{ position: "absolute", insetBlockEnd: "var(--space-2)", insetInlineEnd: "var(--space-2)", fontSize: "var(--text-xs)" }}
    >
      {props.enabled ? "Grid on" : "Grid off"}
    </button>
  </>
);

export default GridOverlay;
