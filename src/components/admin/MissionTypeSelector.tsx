// Phase 1 shell - logic wired in Phase 4.
import type { MissionType } from "../../types/index.ts";
import { MISSION_TYPE } from "../../types/index.ts";

interface MissionTypeSelectorProps {
  readonly value: MissionType;
  readonly onChange: (type: MissionType) => void;
}

const MissionTypeSelector = (props: MissionTypeSelectorProps) => (
  <div data-testid="mission-type-selector">
    <label htmlFor="mission-type-select" className="form-label">
      Mission type
    </label>
    <select
      id="mission-type-select"
      className="form-input"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as MissionType)}
    >
      {(Object.values(MISSION_TYPE) as MissionType[]).map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  </div>
);

export default MissionTypeSelector;
