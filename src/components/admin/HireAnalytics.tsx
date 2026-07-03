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
  <div className="card hire-analytics__stat">
    <div className="hire-analytics__stat-header">
      <span className="hire-analytics__stat-icon">
        {icon}
      </span>
      <span className="hire-analytics__stat-label">
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
    <div className="hire-analytics">
      <div className="hire-analytics__grid">
        {/* 1. Onboarding age */}
        <StatCard
          icon={<MdWbSunny size={18} aria-hidden="true" />}
          label="Onboarding age"
        >
          <div className="hire-analytics__stat-row">
            <span className="hire-analytics__big-number">
              {days ?? "—"}
            </span>
            <span className="hire-analytics__label">
              {days === 1 ? "day" : "days"}
            </span>
          </div>
          <p className="hire-analytics__caption">
            since onboarding started
          </p>
        </StatCard>

        {/* 2. Expected vs actual */}
        <StatCard
          icon={<MdTrendingUp size={18} aria-hidden="true" />}
          label="Progress vs plan"
        >
          <div className="hire-analytics__stat-row--wrap">
            <span className="hire-analytics__big-number">
              {actualPct}%
            </span>
            <span className="hire-analytics__label">
              of tasks completed
            </span>
          </div>
          <p className="hire-analytics__caption">
            Should be ~<strong className="core-text-fg">
              {expectedPct}%
            </strong>
            {"  |  "}
            {/* Dynamic: planColorVar is computed at runtime */}
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
          {total === 0
            ? (
              <div className="hire-analytics__all-done">
                No missions set up yet — add some in the Customize tab.
              </div>
            )
            : nextTask
            ? (
              <>
                <div className="hire-analytics__next-title">
                  {nextTask.title}
                </div>
                <p className="hire-analytics__caption">
                  in {nextTask.milestone}
                </p>
              </>
            )
            : (
              <div className="hire-analytics__all-done">
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
        <h3 className="hire-analytics__section-title">
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
