// Phase 1 shell — "Today's Missions" card/banner.
// Primary orientation surface for new hires. Logic wired in Phase 2+.
import TagBadge from "../shared/TagBadge.tsx";
import XPBadge from "../shared/XPBadge.tsx";

interface DailyMissionPlaceholder {
  readonly title: string;
  readonly xpValue: number;
  readonly tags: ReadonlyArray<string>;
}

interface DailyPlanViewProps {
  readonly missions?: ReadonlyArray<DailyMissionPlaceholder>;
}

const DEFAULT_MISSIONS: ReadonlyArray<DailyMissionPlaceholder> = [
  {
    title: "Complete your profile",
    xpValue: 50,
    tags: ["mandatory"],
  },
  {
    title: "Meet your buddy",
    xpValue: 30,
    tags: ["urgent"],
  },
  {
    title: "Explore the office map",
    xpValue: 20,
    tags: [],
  },
];

const DailyPlanView = (props: DailyPlanViewProps) => {
  const missions = props.missions ?? DEFAULT_MISSIONS;

  return (
    <section
      aria-label="Today's missions"
      data-testid="daily-plan-view"
      style={{
        background: "hsl(var(--color-card))",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
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
        }}
      >
        Today's Missions
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
        }}
      >
        Start here — these are your top priorities for today.
      </p>
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
        {missions.map((m, i) => (
          <li
            key={i}
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
    </section>
  );
};

export default DailyPlanView;
