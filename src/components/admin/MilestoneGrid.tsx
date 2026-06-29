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
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
        gap: "var(--space-3)",
      }}
    >
      {boxes.map((b) => (
        <button
          key={b.id}
          type="button"
          className="card"
          data-testid="milestone-box"
          onClick={() => props.onSelect(b.id)}
          style={{
            padding: "var(--space-5)",
            minHeight: "8rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "var(--space-3)",
            cursor: "pointer",
            textAlign: "left",
            border: "1px solid hsl(var(--color-border))",
            background: "hsl(var(--color-card))",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2rem",
                height: "2rem",
                flexShrink: 0,
                borderRadius: "var(--radius-full)",
                background: "hsl(var(--color-primary) / 0.1)",
                color: "hsl(var(--color-primary))",
                fontWeight: "var(--weight-semibold)",
                fontSize: "var(--text-sm)",
              }}
            >
              {b.index}
            </span>
            <MdChevronRight
              size={20}
              aria-hidden="true"
              className="core-icon-muted"
            />
          </span>
          <span
            style={{
              flex: 1,
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-base)",
              color: "hsl(var(--color-fg))",
              lineHeight: "var(--leading-tight)",
              textWrap: "balance",
            }}
          >
            {b.name}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            {b.total} {b.total === 1 ? "mission" : "missions"}
            {b.total > 0 ? ` · ${b.done} done` : ""}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MilestoneGrid;
