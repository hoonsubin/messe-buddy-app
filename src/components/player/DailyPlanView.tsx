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
      style={{
        background: "hsl(var(--color-card))",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Clickable header bar (always visible) ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-controls="daily-plan-content"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5)",
          cursor: "pointer",
          userSelect: "none",
          minHeight: "var(--min-touch)",
          borderRadius: collapsed
            ? "var(--radius-lg)"
            : "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
            color: "hsl(var(--color-fg))",
            lineHeight: "var(--leading-tight)",
            flex: 1,
          }}
        >
          Today's Missions
        </h2>

        {/* Numbered badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "1.5rem",
            height: "1.5rem",
            padding: "0 var(--space-2)",
            borderRadius: "var(--radius-full)",
            background: "hsl(var(--color-primary))",
            color: "hsl(var(--color-primary-fg))",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-semibold)",
            lineHeight: 1,
          }}
        >
          {missions.length}
        </span>

        {/* Chevron */}
        <span
          aria-hidden="true"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            transition: "transform var(--duration-fast) var(--ease-out)",
            transform: collapsed ? "none" : "rotate(180deg)",
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </div>

      {/* ── Collapsible content ── */}
      <div
        id="daily-plan-content"
        role="region"
        aria-label="Today's missions list"
        style={{
          overflow: "hidden",
          maxHeight: collapsed ? "0" : "80rem",
          transition: "max-height var(--duration-normal) var(--ease-out)",
          borderBottomLeftRadius: "var(--radius-lg)",
          borderBottomRightRadius: "var(--radius-lg)",
        }}
      >
        <div
          style={{
            padding: "0 var(--space-5) var(--space-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Start here - these are your top priorities for today.
          </p>
          {missions.length === 0
            ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-muted-fg))",
                  fontStyle: "italic",
                  padding: "var(--space-3) 0",
                }}
              >
                Nothing planned for today.
              </p>
            )
            : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                {missions.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-3)",
                      background: "hsl(var(--color-bg))",
                      borderRadius: "var(--radius-md)",
                      gap: "var(--space-2)",
                      minHeight: "var(--min-touch)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--weight-medium)",
                        color: "hsl(var(--color-fg))",
                        flex: 1,
                      }}
                    >
                      {m.title}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        flexShrink: 0,
                      }}
                    >
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
