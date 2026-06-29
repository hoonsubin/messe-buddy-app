import { useMemo } from "react";
import { MdFlag, MdTrendingUp, MdWbSunny } from "react-icons/md";
import type { Milestone, Mission, ProgressEvent } from "../../types/index.ts";
import { expectedProgressPct } from "../../utils/expectedProgress.ts";
import MissionTimelineChart from "./MissionTimelineChart.tsx";

interface HireAnalyticsProps {
  readonly startDateISO?: string;
  readonly firstName: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly events: ReadonlyArray<ProgressEvent>;
}

const COMPLETED = new Set(["completed", "autoApproved"]);
const DAY = 86_400_000;

const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / DAY));
};

const StatCard = (
  { icon, label, children }: {
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly children: React.ReactNode;
  },
) => (
  <div
    className="card"
    style={{
      padding: "var(--space-4) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      justifyContent: "space-between",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
    >
      <span
        style={{ display: "inline-flex", color: "hsl(var(--color-primary))" }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-fg))",
        }}
      >
        {label}
      </span>
    </div>
    {children}
  </div>
);

const HireAnalytics = (props: HireAnalyticsProps) => {
  const completedSet = useMemo(
    () =>
      new Set(
        props.events.filter((e) => COMPLETED.has(e.status)).map((e) =>
          e.missionId
        ),
      ),
    [props.events],
  );

  const days = daysSince(props.startDateISO);
  const total = props.missions.length;
  const doneCount = props.missions.filter((m) => completedSet.has(m.id)).length;
  const actualPct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const expectedPct = Math.round(expectedProgressPct(days ?? 0));
  const gap = Math.abs(actualPct - expectedPct);
  const planColorVar = actualPct < expectedPct
    ? "--color-destructive"
    : "--color-status-complete";
  const planLabel = gap === 0
    ? "On track"
    : actualPct < expectedPct
    ? `Behind ${gap}%`
    : `Ahead ${gap}%`;

  const orderedMilestones = useMemo(
    () => [...props.milestones].sort((a, b) => a.order - b.order),
    [props.milestones],
  );
  const nextTask = useMemo(() => {
    for (const ms of orderedMilestones) {
      const next = props.missions
        .filter((m) => m.milestoneId === ms.id)
        .sort((a, b) => a.order - b.order)
        .find((m) => !completedSet.has(m.id));
      if (next) return { title: next.title, milestone: ms.name };
    }
    return null;
  }, [orderedMilestones, props.missions, completedSet]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {/* 1. Onboarding age */}
        <StatCard
          icon={<MdWbSunny size={18} aria-hidden="true" />}
          label="Onboarding age"
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
                lineHeight: 1,
              }}
            >
              {days ?? "—"}
            </span>
            <span
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-medium)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {days === 1 ? "day" : "days"}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            since onboarding started
          </p>
        </StatCard>

        {/* 2. Expected vs actual */}
        <StatCard
          icon={<MdTrendingUp size={18} aria-hidden="true" />}
          label="Progress vs plan"
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
                lineHeight: 1,
              }}
            >
              {actualPct}%
            </span>
            <span
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-medium)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              of tasks completed
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Should be ~<strong style={{ color: "hsl(var(--color-fg))" }}>
              {expectedPct}%
            </strong>
            {"  |  "}
            <strong style={{ color: `hsl(var(${planColorVar}))` }}>
              {planLabel}
            </strong>
          </p>
        </StatCard>

        {/* 3. Suggested next step */}
        <StatCard
          icon={<MdFlag size={18} aria-hidden="true" />}
          label={`Suggested next step for ${props.firstName}`}
        >
          {nextTask
            ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--weight-semibold)",
                    color: "hsl(var(--color-fg))",
                    lineHeight: "var(--leading-tight)",
                  }}
                >
                  {nextTask.title}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-muted-fg))",
                  }}
                >
                  in {nextTask.milestone}
                </p>
              </>
            )
            : (
              <div
                style={{
                  fontSize: "var(--text-base)",
                  color: "hsl(var(--color-status-complete))",
                  fontWeight: "var(--weight-medium)",
                }}
              >
                All tasks complete 🎉
              </div>
            )}
        </StatCard>
      </div>

      {/* Missions completed over time */}
      <div
        className="card"
        style={{ padding: "var(--space-4) var(--space-5)" }}
      >
        <h3
          style={{
            margin: "0 0 var(--space-3)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)",
            color: "hsl(var(--color-fg))",
          }}
        >
          Missions completed over time
        </h3>
        <MissionTimelineChart
          {...(props.startDateISO !== undefined &&
            { startDateISO: props.startDateISO })}
          milestones={props.milestones}
          missions={props.missions}
          events={props.events}
        />
      </div>
    </div>
  );
};

export default HireAnalytics;
