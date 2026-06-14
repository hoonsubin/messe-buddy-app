import { useMemo, useState } from "react";
import { MdWarning } from "react-icons/md";

interface HireProgressRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly sessionName: string;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number;
  readonly isStalled: boolean;
}

interface CrossHireDashboardProps {
  readonly hires: ReadonlyArray<HireProgressRow>;
}

const StalledHireAlert = ({ days }: { readonly days: number }) => (
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
    Stalled &middot; {days}d
  </span>
);

const CrossHireDashboard = ({ hires }: CrossHireDashboardProps) => {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const lower = filter.toLowerCase().trim();
    const base = lower === ""
      ? hires
      : hires.filter((h) =>
        h.playerName.toLowerCase().includes(lower) ||
        h.sessionName.toLowerCase().includes(lower)
      );

    // Sort: stalled first, then by daysSinceLastActivity descending
    // (most stalled at top)
    return [...base].sort((a, b) => {
      if (a.isStalled !== b.isStalled) return a.isStalled ? -1 : 1;
      return b.daysSinceLastActivity - a.daysSinceLastActivity;
    });
  }, [hires, filter]);

  const totalActive = hires.length;
  const averageProgress = hires.length > 0
    ? Math.round(
      hires.reduce((sum, h) => sum + h.progressPercent, 0) / hires.length,
    )
    : 0;
  const stalledCount = hires.filter((h) => h.isStalled).length;

  const statusLabel = (hire: HireProgressRow): string => {
    if (hire.isStalled) return "Stalled";
    if (hire.progressPercent < 20) return "Just started";
    return "On track";
  };

  const statusColorVar = (hire: HireProgressRow): string => {
    if (hire.isStalled) return "--color-destructive";
    if (hire.progressPercent < 20) return "--color-muted-fg";
    return "--color-status-complete";
  };

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

      {/* Filter bar */}
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
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
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
        {filtered.map((hire) => (
          <li
            key={hire.playerId}
            className="card"
            style={{
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
            data-testid="hire-progress-row"
            data-status={hire.isStalled ? "stalled" : "onTrack"}
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
                    color: `hsl(var(${statusColorVar(hire)}))`,
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  {statusLabel(hire)}
                </span>
                {hire.isStalled && (
                  <StalledHireAlert days={hire.daysSinceLastActivity} />
                )}
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
                    background: hire.isStalled
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
