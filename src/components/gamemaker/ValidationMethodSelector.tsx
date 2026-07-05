import type { ValidationMethod } from "../../types/index.ts";
import { VALIDATION_METHOD } from "../../types/index.ts";

interface ValidationMethodSelectorProps {
  readonly value: ValidationMethod;
  readonly onChange: (method: ValidationMethod) => void;
  readonly hidden?: boolean;
}

const ValidationMethodSelector = (props: ValidationMethodSelectorProps) => {
  if (props.hidden) return null;
  return (
    <div data-testid="validation-method-selector">
      <label htmlFor="validation-method-select" className="form-label">
        Validation method
      </label>
      <select
        id="validation-method-select"
        className="form-input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as ValidationMethod)}
      >
        {(Object.values(VALIDATION_METHOD) as ValidationMethod[]).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ValidationMethodSelector;
