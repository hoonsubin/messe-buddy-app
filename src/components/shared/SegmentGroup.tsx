// Generic exclusive pill-button row — analog of Ionic's ion-segment + ion-segment-button.
// Use wherever the user must pick exactly one option from a small set.

interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SegmentGroupProps<T extends string> {
  readonly options: ReadonlyArray<SegmentOption<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label?: string; // accessible group label
}

const SegmentGroup = <T extends string>(props: SegmentGroupProps<T>) => (
  <div className="segment-group" role="group" aria-label={props.label}>
    {props.options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`segment-btn${
          props.value === opt.value ? " segment-btn--active" : ""
        }`}
        onClick={() => props.onChange(opt.value)}
        aria-pressed={props.value === opt.value}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentGroup;
