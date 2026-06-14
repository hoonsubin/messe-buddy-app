// Phase 1 shell — logic wired in Phase 2+.
// LegendItem deferred to Phase 8 (ChatMessage/LiteLLM types). Using local shape.
interface LegendItem {
  readonly label: string;
  readonly color: string;
}

interface ProgressLegendProps {
  readonly items: ReadonlyArray<LegendItem>;
}

const ProgressLegend = (props: ProgressLegendProps) => (
  <ul
    className="progress-legend"
    data-testid="progress-legend"
    style={{ display: "flex", gap: "0.75rem", listStyle: "none", padding: 0 }}
  >
    {props.items.map((item) => (
      <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "var(--text-xs)" }}>
        <span
          aria-hidden="true"
          style={{
            width: "0.5rem",
            height: "0.5rem",
            borderRadius: "50%",
            backgroundColor: item.color,
            flexShrink: 0,
          }}
        />
        {item.label}
      </li>
    ))}
  </ul>
);

export default ProgressLegend;
