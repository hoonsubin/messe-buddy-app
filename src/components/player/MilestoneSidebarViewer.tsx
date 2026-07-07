import { useRef, useState } from "react";
import {
  MdAssignment,
  MdBolt,
  MdCheck,
  MdClose,
  MdDescription,
  MdEditNote,
  MdLink,
  MdOpenInNew,
  MdVideocam,
} from "react-icons/md";
import type { Mission, ProgressEvent, Resource } from "../../types/index.ts";

const SWIPE_THRESHOLD_PX = 60;

type SidebarTab = "missions" | "resources";

const typeIcon = (type: string) => {
  switch (type) {
    case "document":
      return <MdDescription size={18} aria-hidden="true" />;
    case "guide":
      return <MdAssignment size={18} aria-hidden="true" />;
    case "video":
      return <MdVideocam size={18} aria-hidden="true" />;
    case "form":
      return <MdEditNote size={18} aria-hidden="true" />;
    default:
      return <MdLink size={18} aria-hidden="true" />;
  }
};

interface MilestoneSidebarViewerProps {
  readonly milestoneId: string;
  readonly milestoneName: string;
  readonly xpThreshold: number;
  readonly currentXP: number;
  readonly missions: ReadonlyArray<Mission>;
  readonly resources: ReadonlyArray<Resource>;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly onClose: () => void;
  readonly onMissionClick: (id: string) => void;
}

const MilestoneSidebarViewer = (props: MilestoneSidebarViewerProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("missions");
  const eventByMission = new Map(
    props.progressEvents.map((e) => [e.missionId, e]),
  );
  const pct = Math.min(
    Math.round((props.currentXP / props.xpThreshold) * 100),
    100,
  );

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (delta < -SWIPE_THRESHOLD_PX) props.onClose();
    touchStartX.current = null;
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={props.onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
          background: "hsl(var(--color-fg) / 0.25)",
        }}
      />

      <aside
        className="sidebar sidebar--open"
        data-testid="milestone-sidebar-viewer"
        data-milestone-id={props.milestoneId}
        aria-label={`${props.milestoneName} milestone`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sidebar__header">
          <div>
            <p
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-muted-fg))",
                margin: "0 0 var(--space-1)",
              }}
            >
              Milestone
            </p>
            <h2 className="sidebar__title">{props.milestoneName}</h2>
          </div>
          <button
            type="button"
            className="sidebar__close icon-btn"
            onClick={props.onClose}
            aria-label="Close sidebar"
          >
            <MdClose size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: "var(--space-3) var(--space-4)" }}>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={props.currentXP}
            aria-valuemax={props.xpThreshold}
            aria-label={`${props.currentXP} of ${props.xpThreshold} XP`}
          >
            <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "var(--space-1)",
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            <span>{props.currentXP} / {props.xpThreshold} XP</span>
            <span>{pct}%</span>
          </div>
        </div>

        <div className="sidebar-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "missions"}
            className={`sidebar-tab${
              activeTab === "missions" ? " sidebar-tab--active" : ""
            }`}
            onClick={() => setActiveTab("missions")}
          >
            Missions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "resources"}
            className={`sidebar-tab${
              activeTab === "resources" ? " sidebar-tab--active" : ""
            }`}
            onClick={() => setActiveTab("resources")}
          >
            Resources
          </button>
        </div>

        <div className="sidebar__body">
          {activeTab === "missions" && (
            <>
              {props.missions.length === 0 && (
                <p
                  style={{
                    color: "hsl(var(--color-muted-fg))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  No missions yet.
                </p>
              )}
              {props.missions.map((mission) => {
                const event = eventByMission.get(mission.id);
                const isCompleted = event?.status === "completed" ||
                  event?.status === "autoApproved";

                return (
                  <button
                    key={mission.id}
                    type="button"
                    className="sidebar-mission-row"
                    onClick={() => props.onMissionClick(mission.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      padding: 0,
                    }}
                  >
                    <div
                      className={`mission-item__check${
                        isCompleted ? " mission-item__check--done" : ""
                      }`}
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    >
                      {isCompleted && <MdCheck size={14} />}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--weight-medium)",
                        color: "hsl(var(--color-fg))",
                        textAlign: "left",
                        textDecoration: isCompleted ? "line-through" : "none",
                        opacity: isCompleted ? 0.6 : 1,
                      }}
                    >
                      {mission.title}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "hsl(var(--color-primary))",
                        fontWeight: "var(--weight-medium)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.125rem",
                      }}
                    >
                      <MdBolt size={14} aria-hidden="true" />
                      {mission.xpValue}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {activeTab === "resources" && (
            <>
              {props.resources.length === 0 && (
                <p
                  style={{
                    color: "hsl(var(--color-muted-fg))",
                    fontSize: "var(--text-sm)",
                  }}
                  data-testid="milestone-resources-empty"
                >
                  No resources for this milestone yet. Your Game Master can
                  attach guides from the company library.
                </p>
              )}
              {props.resources.map((resource) => (
                <a
                  key={resource.id}
                  className="sidebar-resource-row"
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="milestone-resource-link"
                >
                  <span
                    className="sidebar-resource-row__icon"
                    aria-hidden="true"
                  >
                    {typeIcon(resource.type)}
                  </span>
                  <span className="sidebar-resource-row__title">
                    {resource.title}
                  </span>
                  <MdOpenInNew size={14} aria-hidden="true" />
                </a>
              ))}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default MilestoneSidebarViewer;
