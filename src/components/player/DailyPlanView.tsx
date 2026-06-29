// Today's Missions - primary orientation surface for new hires.
// Renders missions computed by the getDailyMissions use case.
// Collapsible by default; collapsed state shows only a header bar
// with a numbered badge. Click to expand and see the full list.
import { useState } from "react";
import type { Mission } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";
import XPBadge from "../shared/XPBadge.tsx";

interface DailyPlanViewProps {
  readonly missions: ReadonlyArray<Mission>;
}

const DailyPlanView = (props: DailyPlanViewProps) => {
  const { missions } = props;
  const [collapsed, setCollapsed] = useState(true);

  const toggle = () => setCollapsed((prev) => !prev);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <section
      aria-label="Today's missions"
      data-testid="daily-plan-view"
      className={`daily-plan${collapsed ? "" : " daily-plan--expanded"}`}
    >
      {/* ── Clickable header bar (always visible) ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-controls="daily-plan-content"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="daily-plan__header"
      >
        <h2 className="daily-plan__title">
          Today's Missions
        </h2>

        {/* Numbered badge */}
        <span className="daily-plan__badge">
          {missions.length}
        </span>

        {/* Chevron */}
        <span aria-hidden="true" className="daily-plan__chevron">
          ▼
        </span>
      </div>

      {/* ── Collapsible content ── */}
      <div
        id="daily-plan-content"
        role="region"
        aria-label="Today's missions list"
        className="daily-plan__content"
      >
        <div className="daily-plan__content-inner">
          <p className="daily-plan__desc">
            Start here - these are your top priorities for today.
          </p>
          {missions.length === 0
            ? (
              <p className="daily-plan__empty">
                Nothing planned for today.
              </p>
            )
            : (
              <ul className="daily-plan__list">
                {missions.map((m) => (
                  <li key={m.id} className="daily-plan__mission-row">
                    <span className="daily-plan__mission-name">
                      {m.title}
                    </span>
                    <span className="daily-plan__mission-meta">
                      {m.tags.map((tag) => (
                        <TagBadge key={tag} label={tag} variant={tag} />
                      ))}
                      <XPBadge value={m.xpValue} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </section>
  );
};

export default DailyPlanView;
