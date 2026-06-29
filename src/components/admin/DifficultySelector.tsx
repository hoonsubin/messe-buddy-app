interface DifficultySelectorProps {
  readonly value: number;
  readonly xpPreview: number;
  readonly onChange: (value: number) => void;
}

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

const DifficultySelector = (props: DifficultySelectorProps) => (
  <div data-testid="difficulty-selector">
    <div
      className="difficulty-selector"
      role="group"
      aria-label="Mission difficulty"
    >
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          className={`difficulty-selector__pip${
            props.value === d ? " difficulty-selector__pip--selected" : ""
          }`}
          onClick={() => props.onChange(d)}
          aria-pressed={props.value === d}
          aria-label={`Difficulty ${d}`}
        >
          {d}
        </button>
      ))}
    </div>
    <p
      className="core-text-xs core-text-muted"
      style={{ marginTop: "var(--space-1)" }}
    >
      ≈ {props.xpPreview} XP
    </p>
  </div>
);

export default DifficultySelector;
