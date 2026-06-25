import { useMemo, useState } from "react";
import {
  MdCheck,
  MdExpandLess,
  MdExpandMore,
  MdMap,
  MdWarning,
} from "react-icons/md";

import type { HireProgressRow } from "../../hooks/useProgress/types.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "stalled" | "progress" | "activity" | "name";

interface CrossHireDashboardProps {
  readonly hires: ReadonlyArray<HireProgressRow>;
  readonly pendingCountByPlayer: Record<string, number>;
  readonly onViewOnMap: (playerId: string) => void;
  readonly onApprove: (playerId: string) => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StalledHireAlert = ({ days }: { readonly days: number | null }) => (
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
    {days !== null ? `Stalled · ${days}d` : "Stalled · No activity"}
  </span>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const playerInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// ── Component ─────────────────────────────────────────────────────────────────

const CrossHireDashboard = ({
  hires,
  pendingCountByPlayer,
  onViewOnMap,
  onApprove,
}: CrossHireDashboardProps) => {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("stalled");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const lower = filter.toLowerCase().trim();
    const base = lower === ""
      ? hires
      : hires.filter((h) =>
        h.playerName.toLowerCase().includes(lower) ||
        h.sessionName.toLowerCase().includes(lower)
      );

    return [...base].sort((a, b) => {
      switch (sortKey) {
        case "stalled": {
          if (a.isStalled !== b.isStalled) return a.isStalled ? -1 : 1;
          const da = a.daysSinceLastActivity ?? Number.MAX_SAFE_INTEGER;
          const db = b.daysSinceLastActivity ?? Number.MAX_SAFE_INTEGER;
          return db - da;
        }
        case "progress":
          return a.progressPercent - b.progressPercent;
        case "activity": {
          const da = a.daysSinceLastActivity ?? Number.MAX_SAFE_INTEGER;
          const db = b.daysSinceLastActivity ?? Number.MAX_SAFE_INTEGER;
          return da - db;
        }
        case "name":
          return a.playerName.localeCompare(b.playerName);
      }
    });
  }, [hires, filter, sortKey]);

  const totalActive = hires.length;
  const averageProgress = hires.length > 0
    ? Math.round(
      hires.reduce((sum, h) => sum + h.progressPercent, 0) / hires.length,
    )
    : 0;
  const stalledCount = hires.filter((h) => h.isStalled).length;

  return (
    <section
      aria-label="New hires"
      data-testid="cross-hire-dashboard"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        {[
          {
            label: "Active",
            value: String(totalActive),
            colorVar: "--color-fg",
          },
          {
            label: "Avg progress",
            value: `${averageProgress}%`,
            colorVar: "--color-fg",
          },
          {
            label: "Stalled",
            value: String(stalledCount),
            colorVar: stalledCount > 0 ? "--color-destructive" : "--color-fg",
          },
        ].map(({ label, value, colorVar }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-bold)",
                color: `hsl(var(${colorVar}))`,
                fontFamily: "var(--font-display)",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + sort toolbar ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <input
          type="search"
          placeholder="Search hires..."
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
        <select
          aria-label="Sort hires"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid hsl(var(--color-border))",
            background: "hsl(var(--color-bg))",
            color: "hsl(var(--color-fg))",
            fontSize: "var(--text-sm)",
            minHeight: "var(--min-touch)",
            cursor: "pointer",
          }}
        >
          <option value="stalled">Stalled first</option>
          <option value="progress">Progress low→high</option>
          <option value="activity">Recent activity</option>
          <option value="name">Name A→Z</option>
        </select>
      </div>

      {/* ── Hire list ────────────────────────────────────────────────────── */}
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0 }}
        data-testid="hire-list"
      >
        {filtered.map((hire) => {
          const isExpanded = expandedId === hire.playerId;
          const pendingCount = pendingCountByPlayer[hire.playerId] ?? 0;

          return (
            <li
              key={hire.playerId}
              data-testid="hire-progress-row"
              data-status={hire.isStalled ? "stalled" : "onTrack"}
              style={{ borderBottom: "1px solid hsl(var(--color-border))" }}
            >
              {/* ── Collapsed row ─────────────────────────────────────── */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`hire-expand-${hire.playerId}`}
                onClick={() => setExpandedId(isExpanded ? null : hire.playerId)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "var(--space-3) var(--space-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  minHeight: "var(--min-touch)",
                }}
              >
                {/* Avatar */}
                <div
                  aria-hidden="true"
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: hire.isStalled
                      ? "hsl(var(--color-destructive) / 0.12)"
                      : "hsl(var(--color-accent) / 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)",
                    color: hire.isStalled
                      ? "hsl(var(--color-destructive))"
                      : "hsl(var(--color-accent))",
                    flexShrink: 0,
                  }}
                >
                  {playerInitials(hire.playerName)}
                </div>

                {/* Name + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "var(--weight-semibold)",
                        fontSize: "var(--text-sm)",
                        color: "hsl(var(--color-fg))",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hire.playerName}
                    </span>
                    {hire.isStalled
                      ? <StalledHireAlert days={hire.daysSinceLastActivity} />
                      : (
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: `hsl(var(${statusColorVar(hire)}))`,
                            fontWeight: "var(--weight-medium)",
                            flexShrink: 0,
                          }}
                        >
                          {statusLabel(hire)}
                        </span>
                      )}
                  </div>
                  {/* Progress bar */}
                  <div
                    role="progressbar"
                    aria-valuenow={hire.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${hire.progressPercent}% complete`}
                    style={{
                      height: "0.25rem",
                      borderRadius: "var(--radius-full)",
                      background: "hsl(var(--color-muted))",
                      overflow: "hidden",
                      marginBottom: "var(--space-1)",
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
                      color: "hsl(var(--color-muted-fg))",
                    }}
                  >
                    {hire.progressPercent}% · {hire.currentMilestoneName}
                  </span>
                </div>

                {/* Expand chevron */}
                {isExpanded
                  ? (
                    <MdExpandLess
                      size={18}
                      aria-hidden="true"
                      style={{
                        color: "hsl(var(--color-muted-fg))",
                        flexShrink: 0,
                      }}
                    />
                  )
                  : (
                    <MdExpandMore
                      size={18}
                      aria-hidden="true"
                      style={{
                        color: "hsl(var(--color-muted-fg))",
                        flexShrink: 0,
                      }}
                    />
                  )}
              </button>

              {/* ── Expanded panel ────────────────────────────────────── */}
              {isExpanded && (
                <div
                  id={`hire-expand-${hire.playerId}`}
                  data-testid="hire-expand-panel"
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "hsl(var(--color-secondary))",
                    borderTop: "1px solid hsl(var(--color-border))",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                  }}
                >
                  {/* Metadata row */}
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "hsl(var(--color-muted-fg))",
                      display: "flex",
                      gap: "var(--space-3)",
                    }}
                  >
                    <span>{hire.totalXP} XP</span>
                    <span>·</span>
                    <span>
                      Milestone {hire.currentMilestoneIndex} /{" "}
                      {hire.totalMilestones}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      data-testid="view-on-map-btn"
                      onClick={() => onViewOnMap(hire.playerId)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "var(--space-1)",
                        fontSize: "var(--text-xs)",
                        minHeight: "var(--min-touch)",
                      }}
                    >
                      <MdMap size={14} aria-hidden="true" />
                      View on map
                    </button>

                    {pendingCount > 0 && (
                      <button
                        type="button"
                        className="btn btn--secondary"
                        data-testid="approve-btn"
                        onClick={() => onApprove(hire.playerId)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "var(--space-1)",
                          fontSize: "var(--text-xs)",
                          minHeight: "var(--min-touch)",
                          color: "hsl(var(--color-destructive))",
                          borderColor: "hsl(var(--color-destructive) / 0.4)",
                        }}
                      >
                        <MdCheck size={14} aria-hidden="true" />
                        Approve ({pendingCount})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export type { HireProgressRow };
export { StalledHireAlert };
export default CrossHireDashboard;
