import { useMemo } from "react";
import { MdChevronRight } from "react-icons/md";
import type { Milestone, Mission } from "../../types/index.ts";

interface MilestoneGridProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly completedMissionIds: ReadonlyArray<string>;
  readonly onSelect: (milestoneId: string) => void;
}

/**
 * Grid of milestone boxes for the Customize tab. Each box shows the milestone's
 * name and how many of its missions exist / are completed; clicking opens the
 * milestone's missions (add / edit) sheet.
 */
const MilestoneGrid = (props: MilestoneGridProps) => {
  const completedSet = useMemo(
    () => new Set(props.completedMissionIds),
    [props.completedMissionIds],
  );

  const boxes = useMemo(
    () =>
      [...props.milestones]
        .sort((a, b) => a.order - b.order)
        .map((ms, i) => {
          const inMs = props.missions.filter((m) => m.milestoneId === ms.id);
          const done = inMs.filter((m) => completedSet.has(m.id)).length;
          return {
            id: ms.id,
            name: ms.name,
            index: i + 1,
            total: inMs.length,
            done,
          };
        }),
    [props.milestones, props.missions, completedSet],
  );

  if (boxes.length === 0) {
    return (
      <p className="core-text-sm core-text-muted core-text-center core-m-0" style={{ padding: "var(--space-6) 0" }}>
        Choose a template above to add milestones.
      </p>
    );
  }

  return (
    <div
      data-testid="milestone-grid"
      className="milestone-grid"
    >
      {boxes.map((b) => (
        <button
          key={b.id}
          type="button"
          className="card milestone-grid__box"
          data-testid="milestone-box"
          onClick={() => props.onSelect(b.id)}
        >
          <span className="milestone-grid__header">
            <span
              aria-hidden="true"
              className="milestone-grid__index"
            >
              {b.index}
            </span>
            <MdChevronRight
              size={20}
              aria-hidden="true"
              className="core-icon-muted"
            />
          </span>
          <span className="milestone-grid__name">
            {b.name}
          </span>
          <span className="milestone-grid__meta">
            {b.total} {b.total === 1 ? "mission" : "missions"}
            {b.total > 0 ? ` · ${b.done} done` : ""}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MilestoneGrid;
