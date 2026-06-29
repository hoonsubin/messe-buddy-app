import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Milestone,
  Mission,
  ProgressEvent,
} from "../../types/index.ts";
import {
  EXPECTED_SCHEDULE,
  expectedProgressPct,
} from "../../utils/expectedProgress.ts";

interface MissionTimelineChartProps {
  readonly startDateISO?: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly events: ReadonlyArray<ProgressEvent>;
}

const COMPLETED = new Set(["completed", "autoApproved"]);
const DAY = 86_400_000;
const eventTime = (e: ProgressEvent): number =>
  new Date(e.validatedAt ?? e.updated ?? e.created).getTime();
const now = (): number => Date.now();

const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const H = 250;
const PAD_L = 38;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 28;

const MissionTimelineChart = (props: MissionTimelineChartProps) => {
  const [filter, setFilter] = useState<string>("all");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(280, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const orderedMilestones = useMemo(
    () => [...props.milestones].sort((a, b) => a.order - b.order),
    [props.milestones],
  );

  const model = useMemo(() => {
    const inScope = filter === "all"
      ? props.missions
      : props.missions.filter((m) => m.milestoneId === filter);
    const ids = new Set(inScope.map((m) => m.id));
    const total = inScope.length;

    const evs = props.events
      .filter((e) => COMPLETED.has(e.status) && ids.has(e.missionId))
      .sort((a, b) => eventTime(a) - eventTime(b));

    const startMs = props.startDateISO
      ? new Date(props.startDateISO).getTime()
      : (evs[0] ? eventTime(evs[0]) : now() - DAY);
    const nowMs = now();
    const tMin = startMs;
    const tMax = Math.max(nowMs, startMs + DAY);

    // Actual cumulative completion %.
    const actual: [number, number][] = [[tMin, 0]];
    let cum = 0;
    for (const e of evs) {
      cum += 1;
      actual.push([eventTime(e), total === 0 ? 0 : (cum / total) * 100]);
    }
    const actualNow = total === 0 ? 0 : (cum / total) * 100;
    actual.push([nowMs, actualNow]);

    // Target (expected) curve over the elapsed window.
    const dNow = (nowMs - startMs) / DAY;
    const target: [number, number][] = [[tMin, 0]];
    for (const [d, p] of EXPECTED_SCHEDULE) {
      if (d > 0 && d < dNow) target.push([startMs + d * DAY, p]);
    }
    target.push([nowMs, expectedProgressPct(dNow)]);

    return { total, tMin, tMax, actual, target, actualNow };
  }, [filter, props.missions, props.events, props.startDateISO]);

  const x0 = PAD_L;
  const x1 = w - PAD_R;
  const yTop = PAD_T;
  const yBot = H - PAD_B;
  const sx = (t: number) =>
    x0 + ((t - model.tMin) / (model.tMax - model.tMin)) * (x1 - x0);
  const sy = (p: number) => yBot - (p / 100) * (yBot - yTop);
  const toLine = (pts: ReadonlyArray<[number, number]>) =>
    pts.map(([t, p]) => `${sx(t).toFixed(1)},${sy(p).toFixed(1)}`).join(" ");

  const yTicks = [0, 25, 50, 75, 100];
  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    model.tMin + ((model.tMax - model.tMin) * i) / (xTickCount - 1));

  const actualLine = toLine(model.actual);
  const areaPath = `M ${x0},${yBot} L ${actualLine} L ${
    sx(model.actual[model.actual.length - 1]![0]).toFixed(1)
  },${yBot} Z`;

  return (
    <div data-testid="mission-timeline-chart">
      {/* Legend + category filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          marginBottom: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
          <LegendDot color="hsl(var(--color-status-progress))" label="Completed" />
          <LegendDot color="hsl(var(--color-muted-fg))" label="Target" dashed />
        </div>
        <select
          className="form-input"
          aria-label="Filter by milestone"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "auto",
            minHeight: "auto",
            padding: "var(--space-1) var(--space-2)",
            fontSize: "var(--text-xs)",
          }}
        >
          <option value="all">All categories</option>
          {orderedMilestones.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <svg width={w} height={H} role="img" aria-label="Missions completed over time">
          {/* Y gridlines + labels */}
          {yTicks.map((p) => (
            <g key={p}>
              <line
                x1={x0}
                x2={x1}
                y1={sy(p)}
                y2={sy(p)}
                stroke="hsl(var(--color-border))"
                strokeWidth={1}
              />
              <text
                x={x0 - 6}
                y={sy(p) + 3}
                textAnchor="end"
                fontSize={10}
                fill="hsl(var(--color-muted-fg))"
              >
                {p}%
              </text>
            </g>
          ))}

          {/* X ticks + date labels */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={sx(t)}
              y={H - 10}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill="hsl(var(--color-muted-fg))"
            >
              {fmtDate(t)}
            </text>
          ))}

          {/* Target (expected) — dashed */}
          <polyline
            points={toLine(model.target)}
            fill="none"
            stroke="hsl(var(--color-muted-fg))"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            strokeLinejoin="round"
          />

          {/* Actual — area + line */}
          <path d={areaPath} fill="hsl(var(--color-status-progress) / 0.12)" />
          <polyline
            points={actualLine}
            fill="none"
            stroke="hsl(var(--color-status-progress))"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={sx(model.actual[model.actual.length - 1]![0])}
            cy={sy(model.actualNow)}
            r={3.5}
            fill="hsl(var(--color-status-progress))"
          />
        </svg>
      </div>
    </div>
  );
};

const LegendDot = (
  { color, label, dashed }: {
    readonly color: string;
    readonly label: string;
    readonly dashed?: boolean;
  },
) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontSize: "var(--text-xs)",
      color: "hsl(var(--color-muted-fg))",
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: "1rem",
        height: 0,
        borderTop: `${dashed ? "2px dashed" : "3px solid"} ${color}`,
      }}
    />
    {label}
  </span>
);

export default MissionTimelineChart;
