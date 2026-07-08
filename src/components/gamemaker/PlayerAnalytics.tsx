import { useMemo } from "react";
import { MdFlag, MdTrendingUp, MdWbSunny } from "react-icons/md";
import type { Milestone, Mission, ProgressEvent } from "../../types/index.ts";
import {
  expectedProgressPct,
  onboardingDays,
  TOTAL_ONBOARDING_DAYS,
} from "../../utils/expectedProgress.ts";
import MissionTimelineChart from "./MissionTimelineChart.tsx";

interface PlayerAnalyticsProps {
  readonly startDateISO?: string;
  readonly firstName: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly events: ReadonlyArray<ProgressEvent>;
}

const COMPLETED = new Set(["completed", "autoApproved"]);

const StatCard = (
  { icon, label, children }: {
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly children: React.ReactNode;
  },
) => (
  <div className="card player-analytics__stat">
    <div className="player-analytics__stat-header">
      <span className="player-analytics__stat-icon">
        {icon}
      </span>
      <span className="player-analytics__stat-label">
        {label}
      </span>
    </div>
    {children}
  </div>
);

const PlayerAnalytics = (props: PlayerAnalyticsProps) => {
  const completedSet = useMemo(
    () =>
      new Set(
        props.events.filter((e) => COMPLETED.has(e.status)).map((e) =>
          e.missionId
        ),
      ),
    [props.events],
  );

  const days = onboardingDays(props.startDateISO, props.events);
  const total = props.missions.length;
  const doneCount = props.missions.filter((m) => completedSet.has(m.id)).length;
  const actualPct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const expectedPct = Math.round(expectedProgressPct(days));
  const gap = Math.abs(actualPct - expectedPct);
  const planColorVar = actualPct < expectedPct
    ? "--color-destructive"
    : "--color-status-complete";
  const planLabel = gap === 0
    ? "On track"
    : actualPct < expectedPct
    ? `Behind ${gap}%`
    : `Ahead ${gap}%`;

  const orderedMilestones = [...props.milestones].sort((a, b) =>
    a.order - b.order
  );
  const nextTask = (() => {
    for (const ms of orderedMilestones) {
      const next = props.missions
        .filter((m) => m.milestoneId === ms.id)
        .sort((a, b) => a.order - b.order)
        .find((m) => !completedSet.has(m.id));
      if (next) return { title: next.title, milestone: ms.name };
    }
    return null;
  })();

  return (
    <div className="player-analytics">
      <div className="player-analytics__grid">
        {/* 1. Onboarding age */}
        <StatCard
          icon={<MdWbSunny size={18} aria-hidden="true" />}
          label="Onboarding age"
        >
          <div className="player-analytics__stat-row">
            <span className="player-analytics__big-number">
              {days}
            </span>
            <span className="player-analytics__label">
              {days === 1 ? "day" : "days"} of {TOTAL_ONBOARDING_DAYS}
            </span>
          </div>
          <p className="player-analytics__caption">
            since onboarding started
          </p>
        </StatCard>

        {/* 2. Expected vs actual */}
        <StatCard
          icon={<MdTrendingUp size={18} aria-hidden="true" />}
          label="Progress vs plan"
        >
          <div className="player-analytics__stat-row--wrap">
            <span className="player-analytics__big-number">
              {actualPct}%
            </span>
            <span className="player-analytics__label">
              of tasks completed
            </span>
          </div>
          <p className="player-analytics__caption">
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
              <div className="player-analytics__all-done">
                No missions set up yet — add some in the Customize tab.
              </div>
            )
            : nextTask
            ? (
              <>
                <div className="player-analytics__next-title">
                  {nextTask.title}
                </div>
                <p className="player-analytics__caption">
                  in {nextTask.milestone}
                </p>
              </>
            )
            : (
              <div className="player-analytics__all-done">
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
        <h3 className="player-analytics__section-title">
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

export default PlayerAnalytics;
