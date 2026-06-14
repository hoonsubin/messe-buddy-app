// Phase 1 shell — HR overview dashboard with filterable hire progress list.
// Logic wired in Phase 3+.
import { MdWarning } from "react-icons/md";

interface HireProgressRow {
  readonly playerName: string;
  readonly sessionName: string;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number;
  readonly status: "onTrack" | "stalled" | "justStarted";
}

interface CrossHireDashboardProps {
  readonly hires?: ReadonlyArray<HireProgressRow>;
  readonly totalActive?: number;
  readonly averageProgress?: number;
  readonly stalledCount?: number;
}

const StalledHireAlert = () => (
  <span
    data-testid="stalled-hire-alert"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-1)",
      padding: "0 var(--space-2)",
      borderRadius: "var(--radius-full)",
      background: "hsl(var(--color-destructive) / 0.12)",
      color: "hsl(var(--color-destructive))",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      lineHeight: "var(--leading-tight)",
      minHeight: "1.5rem",
    }}
  >
    <MdWarning size={12} aria-hidden="true" />
    Stalled
  </span>
);

const DEFAULT_HIRES: ReadonlyArray<HireProgressRow> = [
  {
    playerName: "Anna Schneider",
    sessionName: "Q1 Engineering Cohort",
    progressPercent: 72,
    daysSinceLastActivity: 1,
    status: "onTrack",
  },
  {
    playerName: "Marco Reus",
    sessionName: "Q1 Engineering Cohort",
    progressPercent: 15,
    daysSinceLastActivity: 12,
    status: "stalled",
  },
  {
    playerName: "Lena Weber",
    sessionName: "Sales Onboarding",
    progressPercent: 4,
    daysSinceLastActivity: 0,
    status: "justStarted",
  },
];

const STATUS_LABELS: Record<HireProgressRow["status"], string> = {
  onTrack: "On track",
  stalled: "Stalled",
  justStarted: "Just started",
};

const STATUS_COLOR_VARS: Record<HireProgressRow["status"], string> = {
  onTrack: "--color-status-complete",
  stalled: "--color-destructive",
  justStarted: "--color-muted-fg",
};

const CrossHireDashboard = (props: CrossHireDashboardProps) => {
  const hires = props.hires ?? DEFAULT_HIRES;
  const totalActive = props.totalActive ?? 12;
  const averageProgress = props.averageProgress ?? 48;
  const stalledCount = props.stalledCount ?? 2;

  return (
    <section
      aria-label="Cross-hire dashboard"
      data-testid="cross-hire-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* Summary header */}
      <div
        className="card"
        style={{
          padding: "var(--space-4)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-bold)",
              color: "hsl(var(--color-fg))",
              fontFamily: "var(--font-display)",
            }}
          >
            {totalActive}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Active hires
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-bold)",
              color: "hsl(var(--color-fg))",
              fontFamily: "var(--font-display)",
            }}
          >
            {averageProgress}%
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Avg progress
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-bold)",
              color: "hsl(var(--color-destructive))",
              fontFamily: "var(--font-display)",
            }}
          >
            {stalledCount}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Stalled
          </div>
        </div>
      </div>

      {/* Filter bar (placeholder — no onChange handler for Phase 1 shell) */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          placeholder="Filter by name or session..."
          aria-label="Filter hires"
          style={{
            flex: 1,
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid hsl(var(--color-border))",
            background: "hsl(var(--color-bg))",
            color: "hsl(var(--color-fg))",
            fontSize: "var(--text-sm)",
            minHeight: "var(--min-touch)",
          }}
        />
      </div>

      {/* Hire progress list */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {hires.map((hire, i) => (
          <li
            key={i}
            className="card"
            style={{
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
            data-testid="hire-progress-row"
            data-status={hire.status}
          >
            {/* Top row: name + status badge */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "var(--weight-semibold)",
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-fg))",
                  }}
                >
                  {hire.playerName}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                  }}
                >
                  {hire.sessionName}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: `hsl(var(${STATUS_COLOR_VARS[hire.status]}))`,
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  {STATUS_LABELS[hire.status]}
                </span>
                {hire.status === "stalled" && <StalledHireAlert />}
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <div
                role="progressbar"
                aria-valuenow={hire.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${hire.progressPercent}% complete`}
                style={{
                  flex: 1,
                  height: "0.5rem",
                  borderRadius: "var(--radius-full)",
                  background: "hsl(var(--color-muted))",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${hire.progressPercent}%`,
                    height: "100%",
                    borderRadius: "var(--radius-full)",
                    background: hire.status === "stalled"
                      ? "hsl(var(--color-destructive))"
                      : "hsl(var(--color-accent))",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  color: "hsl(var(--color-fg))",
                  minWidth: "2.5rem",
                  textAlign: "right",
                }}
              >
                {hire.progressPercent}%
              </span>
            </div>

            {/* Days since last activity */}
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {hire.daysSinceLastActivity === 0
                ? "Active today"
                : `Last active ${hire.daysSinceLastActivity} day${
                  hire.daysSinceLastActivity === 1 ? "" : "s"
                } ago`}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export type { HireProgressRow };
export { StalledHireAlert };
export default CrossHireDashboard;
