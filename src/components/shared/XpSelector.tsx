// Fibonacci XP chip selector — replaces the 1-5 pip DifficultySelector.
// The GM picks a direct XP value from the Fibonacci sequence.

const FIBONACCI_XP = [1, 2, 3, 5, 8, 13, 21, 34] as const;

interface XpSelectorProps {
  readonly value: number;
  readonly onChange: (xp: number) => void;
}

const XpSelector = (props: XpSelectorProps) => (
  <div className="xp-selector" role="group" aria-label="XP value">
    {FIBONACCI_XP.map((xp) => (
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
