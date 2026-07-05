// GM picks the XP value awarded when this mission is validated.

const XP_OPTIONS = [5, 10, 15, 20] as const;

interface XpSelectorProps {
  readonly value: number;
  readonly onChange: (xp: number) => void;
}

const XpSelector = (props: XpSelectorProps) => (
  <div className="xp-selector" role="group" aria-label="XP value">
    {XP_OPTIONS.map((xp) => (
      <button
        key={xp}
        type="button"
        className={`xp-chip${props.value === xp ? " xp-chip--active" : ""}`}
        onClick={() => props.onChange(xp)}
        aria-pressed={props.value === xp}
      >
        {xp}
      </button>
    ))}
  </div>
);

export default XpSelector;
