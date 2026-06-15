interface GridOverlayProps {
  readonly enabled: boolean;
  readonly columns: number;
  readonly rows: number;
}

const GridOverlay = (props: GridOverlayProps) =>
  props.enabled
    ? (
      <svg
        className="grid-overlay"
        data-testid="grid-overlay"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, transparent, transparent calc(100% / ${props.rows} - 1px), hsl(var(--color-border)) calc(100% / ${props.rows})), repeating-linear-gradient(90deg, transparent, transparent calc(100% / ${props.columns} - 1px), hsl(var(--color-border)) calc(100% / ${props.columns}))`,
          opacity: 0.4,
        }}
      />
    )
    : null;

export interface GridToggleButtonProps {
  readonly enabled: boolean;
  readonly onToggle: () => void;
}

export const GridToggleButton = (props: GridToggleButtonProps) => (
  <button
    type="button"
    className="map-grid-btn"
    onClick={props.onToggle}
    aria-pressed={props.enabled}
    aria-label={props.enabled ? "Hide grid" : "Show grid"}
  >
    {props.enabled ? "Grid on" : "Grid off"}
  </button>
);

export default GridOverlay;
