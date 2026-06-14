import {
  MdBolt,
  MdCalendarToday,
  MdCheck,
  MdChevronRight,
} from "react-icons/md";
import type { Mission, ProgressEvent } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";

interface CurrentMissionsListProps {
  readonly missions: ReadonlyArray<Mission>;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly onMissionClick: (id: string) => void;
  readonly onMarkComplete: (id: string) => void;
}

/** Extracts the first plain-text sentence from a markdown body string. */
const firstSentence = (body: string): string => {
  const plain = body
    .replace(/^#+\s+.*$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^>\s*(.*)$/gm, "$1")
    .trim();
  const sentence = plain.split(/\n|\.(?:\s|$)/)[0] ?? "";
  return sentence.trim();
};

const CurrentMissionsList = (props: CurrentMissionsListProps) => {
  const eventByMission = new Map(
    props.progressEvents.map((e) => [e.missionId, e]),
  );

  if (props.missions.length === 0) return null;

  return (
    <section data-testid="current-missions-list" aria-label="Current missions">
      <h2 className="section-label">Current Missions</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {props.missions.map((mission) => {
          const event = eventByMission.get(mission.id);
          const isCompleted = event?.status === "completed" ||
            event?.status === "autoApproved";
          const desc = firstSentence(mission.body);

          return (
            <button
              key={mission.id}
              type="button"
              className={`mission-item${
                isCompleted ? " mission-item--completed" : ""
              }`}
              data-testid="mission-item"
              data-mission-id={mission.id}
              onClick={() => props.onMissionClick(mission.id)}
            >
              {/* Checkbox indicator */}
              <div
                className={`mission-item__check${
                  isCompleted ? " mission-item__check--done" : ""
                }`}
                aria-hidden="true"
              >
                {isCompleted && <MdCheck size={14} />}
              </div>

              {/* Main content */}
              <div className="mission-item__body">
                {mission.tags.length > 0 && (
                  <div className="mission-item__tags">
                    {mission.tags.map((tag) => (
                      <TagBadge key={tag} label={tag} variant={tag} />
                    ))}
                  </div>
                )}
                <p className="mission-item__title">{mission.title}</p>
                {desc && <p className="mission-item__desc">{desc}</p>}
                {mission.suggestedDueDate !== undefined && (
                  <p className="mission-item__due">
                    <MdCalendarToday
                      size={12}
                      aria-hidden="true"
                      style={{
                        verticalAlign: "middle",
                        marginRight: "0.25rem",
                      }}
                    />
                    {mission.suggestedDueDate}
                  </p>
                )}
              </div>

              {/* XP + chevron */}
              <div className="mission-item__right">
                <span className="mission-item__xp">
                  <MdBolt
                    size={14}
                    aria-hidden="true"
                    style={{ verticalAlign: "middle" }}
                  />
                  {mission.xpValue} XP
                </span>
                <MdChevronRight
                  size={18}
                  aria-hidden="true"
                  style={{ color: "hsl(var(--color-muted-fg))" }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CurrentMissionsList;
