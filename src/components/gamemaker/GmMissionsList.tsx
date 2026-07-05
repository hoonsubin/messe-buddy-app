import { useCallback, useEffect, useRef, useState } from "react";
import { MdChevronRight, MdDragIndicator, MdExpandMore } from "react-icons/md";
import type { Milestone, Mission } from "../../types/index.ts";
import { MISSION_TYPE } from "../../types/index.ts";

// ── Type label helpers ──────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  [MISSION_TYPE.TEXT]: "Text",
  [MISSION_TYPE.LINK]: "Link",
  [MISSION_TYPE.FORM]: "Form",
};

const TYPE_COLOR: Record<string, string> = {
  [MISSION_TYPE.TEXT]: "hsl(200, 70%, 45%)",
  [MISSION_TYPE.LINK]: "hsl(270, 60%, 50%)",
  [MISSION_TYPE.FORM]: "hsl(150, 55%, 42%)",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface GmMissionsListProps {
  readonly missions: ReadonlyArray<Mission>;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly onReorder?: (missionId: string, newOrder: number) => void;
  readonly onMissionClick?: (missionId: string) => void;
}

// ── Group helpers ───────────────────────────────────────────────────────────

interface MissionGroup {
  readonly milestone: Milestone;
  readonly missions: Mission[];
}

const buildGroups = (
  missions: ReadonlyArray<Mission>,
  milestones: ReadonlyArray<Milestone>,
): MissionGroup[] => {
  const milestoneById = new Map(milestones.map((ms) => [ms.id, ms]));
  const byMilestone = new Map<string, Mission[]>();

  for (const mission of missions) {
    const list = byMilestone.get(mission.milestoneId);
    if (list) {
      list.push(mission);
    } else {
      byMilestone.set(mission.milestoneId, [mission]);
    }
  }

  // Sort missions within each group by `order`
  for (const [, list] of byMilestone) {
    list.sort((a, b) => a.order - b.order);
  }

  const groups: MissionGroup[] = [];
  for (const [milestoneId, missionsList] of byMilestone) {
    const milestone = milestoneById.get(milestoneId);
    if (milestone) {
      groups.push({ milestone, missions: missionsList });
    }
  }

  // Sort groups by milestone order
  groups.sort((a, b) => a.milestone.order - b.milestone.order);

  return groups;
};

// ── Component ───────────────────────────────────────────────────────────────

const GmMissionsList = (props: GmMissionsListProps) => {
  const { missions, milestones, onReorder, onMissionClick } = props;

  // Groups computed from props - seed local order state on first render
  const [groups, setGroups] = useState<MissionGroup[]>(() =>
    buildGroups(missions, milestones)
  );

  // Track which groups are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Rebuild groups when missions/milestones change externally
  const prevMissionsLenRef = useRef(missions.length);
  const prevMilestonesLenRef = useRef(milestones.length);

  useEffect(() => {
    const missionsChanged = missions.length !== prevMissionsLenRef.current;
    const milestonesChanged =
      milestones.length !== prevMilestonesLenRef.current;
    prevMissionsLenRef.current = missions.length;
    prevMilestonesLenRef.current = milestones.length;

    if (missionsChanged || milestonesChanged) {
      setGroups(buildGroups(missions, milestones));
    }
  }, [missions.length, milestones.length, missions, milestones]);

  // ── Drag state ──────────────────────────────────────────────────────────

  const dragMissionId = useRef<string | null>(null);
  const dragMilestoneId = useRef<string | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (missionId: string, milestoneId: string) => {
      dragMissionId.current = missionId;
      dragMilestoneId.current = milestoneId;
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    dragMissionId.current = null;
    dragMilestoneId.current = null;
    dragOverIndex.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, groupIndex: number, missionIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const group = groups[groupIndex];
      if (!group) return;
      if (dragMilestoneId.current !== group.milestone.id) return;

      dragOverIndex.current = missionIndex;
    },
    [groups],
  );

  const handleDragLeave = useCallback(() => {
    dragOverIndex.current = null;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, groupIndex: number) => {
      e.preventDefault();

      const missionId = dragMissionId.current;
      const milestoneId = dragMilestoneId.current;
      dragMissionId.current = null;
      dragMilestoneId.current = null;

      if (!missionId || !milestoneId) return;

      const group = groups[groupIndex];
      if (!group || group.milestone.id !== milestoneId) return;

      const fromIndex = group.missions.findIndex(
        (m) => m.id === missionId,
      );
      if (fromIndex === -1) return;

      const toIndex = dragOverIndex.current ?? fromIndex;
      dragOverIndex.current = null;

      if (fromIndex === toIndex) return;

      // Reorder within the group
      setGroups((prev) =>
        prev.map((g) => {
          if (g.milestone.id !== milestoneId) return g;
          const newMissions = [...g.missions];
          const [moved] = newMissions.splice(fromIndex, 1);
          newMissions.splice(toIndex, 0, moved!);
          return { ...g, missions: newMissions };
        })
      );

      // Notify parent with new order
      onReorder?.(missionId, toIndex);
    },
    [groups, onReorder],
  );

  const toggleGroup = useCallback((milestoneId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────

  if (groups.length === 0) {
    return (
      <section
        data-testid="gm-missions-list"
        aria-label="Mission list"
        style={{
          padding: "var(--space-4)",
          borderTop: "1px solid hsl(var(--color-border))",
        }}
      >
        <h2 className="section-label">
          Missions
        </h2>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            margin: 0,
            textAlign: "center",
            padding: "var(--space-6)",
          }}
        >
          No missions yet. Click a milestone on the map to add missions.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="gm-missions-list"
      aria-label="Mission list"
      style={{
        borderTop: "1px solid hsl(var(--color-border))",
        overflowY: "auto",
      }}
    >
      <h2
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "hsl(var(--color-bg))",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-muted-fg))",
          margin: 0,
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        Missions
      </h2>

      {groups.map((group, groupIndex) => {
        const isCollapsed = collapsedGroups.has(group.milestone.id);
        const missionCount = group.missions.length;

        return (
          <div
            key={group.milestone.id}
            data-milestone-id={group.milestone.id}
            style={{
              borderBottom: "1px solid hsl(var(--color-border))",
            }}
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.milestone.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                background: "hsl(var(--color-secondary) / 0.4)",
                border: "none",
                cursor: "pointer",
                color: "hsl(var(--color-fg))",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                textAlign: "left",
                minHeight: "var(--min-touch)",
              }}
            >
              {isCollapsed
                ? (
                  <MdChevronRight
                    size={16}
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      color: "hsl(var(--color-muted-fg))",
                    }}
                  />
                )
                : (
                  <MdExpandMore
                    size={16}
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      color: "hsl(var(--color-muted-fg))",
                    }}
                  />
                )}
              <span style={{ flex: 1 }}>{group.milestone.name}</span>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "hsl(var(--color-muted-fg))",
                  fontWeight: "var(--weight-normal)",
                }}
              >
                {missionCount} {missionCount === 1 ? "mission" : "missions"}
              </span>
            </button>

            {/* Mission rows */}
            {!isCollapsed && (
              <div
                onDragOver={(e) => {
                  // Allow drag-over on the container for dropping at end
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (
                    dragMilestoneId.current === group.milestone.id
                  ) {
                    dragOverIndex.current = group.missions.length;
                  }
                }}
                onDrop={(e) => handleDrop(e, groupIndex)}
              >
                {group.missions.map((mission, missionIndex) => {
                  const typeLabel = TYPE_LABEL[mission.type] ??
                    mission.type;
                  const typeColor = TYPE_COLOR[mission.type] ??
                    "hsl(var(--color-muted-fg))";

                  return (
                    <div
                      key={mission.id}
                      draggable
                      onDragStart={() =>
                        handleDragStart(
                          mission.id,
                          group.milestone.id,
                        )}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) =>
                        handleDragOver(e, groupIndex, missionIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, groupIndex)}
                      onClick={() => onMissionClick?.(mission.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Mission: ${mission.title}`}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" || e.key === " "
                        ) {
                          e.preventDefault();
                          onMissionClick?.(mission.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-3)",
                        cursor: onMissionClick ? "pointer" : "grab",
                        borderBottom:
                          "1px solid hsl(var(--color-border) / 0.5)",
                        transition: "background 0.15s",
                        background: "transparent",
                        minHeight: "var(--min-touch)",
                        outline: "none",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLElement
                        ).style.background =
                          "hsl(var(--color-secondary) / 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLElement
                        ).style.background = "transparent";
                      }}
                      onFocus={(e) => {
                        (
                          e.currentTarget as HTMLElement
                        ).style.background =
                          "hsl(var(--color-secondary) / 0.3)";
                      }}
                      onBlur={(e) => {
                        (
                          e.currentTarget as HTMLElement
                        ).style.background = "transparent";
                      }}
                    >
                      {/* Drag handle */}
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          color: "hsl(var(--color-muted-fg))",
                          cursor: "grab",
                        }}
                      >
                        <MdDragIndicator size={18} />
                      </span>

                      {/* Type badge */}
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-semibold)",
                          color: "hsl(var(--color-primary-fg))",
                          background: typeColor,
                          borderRadius: "var(--radius-sm)",
                          padding: "0.1rem var(--space-2)",
                          lineHeight: "1.4",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {typeLabel}
                      </span>

                      {/* Title */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--weight-medium)",
                          color: "hsl(var(--color-fg))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {mission.title}
                      </span>

                      {/* XP badge */}
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "var(--text-xs)",
                          color: "hsl(var(--color-muted-fg))",
                          fontWeight: "var(--weight-medium)",
                        }}
                      >
                        {mission.xpValue} XP
                      </span>
                    </div>
                  );
                })}

                {/* Empty group message */}
                {group.missions.length === 0 && (
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "hsl(var(--color-muted-fg))",
                      margin: 0,
                      textAlign: "center",
                      padding: "var(--space-4) var(--space-3)",
                    }}
                  >
                    No missions in this milestone
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default GmMissionsList;
