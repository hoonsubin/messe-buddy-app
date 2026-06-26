import { useMemo } from "react";
import { MdArrowBack, MdCheck, MdClose, MdSettings } from "react-icons/md";
import type {
  BuddyProfile,
  Milestone,
  Mission,
  PBRecord,
  Player,
  PlayerProgress,
  PreBoardingCheckItem,
  ProgressEvent,
} from "../../types/index.ts";
import MilestoneMapViewer from "../player/MilestoneMapViewer.tsx";
import BuddyAssignmentForm from "./BuddyAssignmentForm.tsx";
import HireChecklist from "./HireChecklist.tsx";

interface HireDetailViewProps {
  readonly player: Player;
  readonly allPlayers: ReadonlyArray<Player>;
  readonly playerProgress: PlayerProgress | null;
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly bgImageUrl: string;
  readonly mapNodeScale: number;
  readonly buddyDraft: Omit<
    BuddyProfile,
    keyof PBRecord | "assignedToPlayerId"
  >;
  readonly checklistItems: ReadonlyArray<PreBoardingCheckItem>;
  readonly onBack: () => void;
  readonly onConfigureSession: () => void;
  readonly onApprove: (missionId: string) => void;
  readonly onReject: (missionId: string) => void;
  readonly onChecklistToggle: (itemId: string) => void;
  readonly onChecklistRename: (itemId: string, newLabel: string) => void;
  readonly onChecklistDelete: (itemId: string) => void;
  readonly onChecklistAdd: (label: string) => void;
  readonly onChecklistReorder: (fromIndex: number, toIndex: number) => void;
  readonly onBuddyDraftChange: (
    draft: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">,
  ) => void;
  readonly onBuddySave: () => void;
}

const HireDetailView = ({
  player,
  allPlayers,
  playerProgress,
  pendingEvents,
  milestones,
  missions,
  bgImageUrl,
  mapNodeScale,
  buddyDraft,
  checklistItems,
  onBack,
  onConfigureSession,
  onApprove,
  onReject,
  onChecklistToggle,
  onChecklistRename,
  onChecklistDelete,
  onChecklistAdd,
  onChecklistReorder,
  onBuddyDraftChange,
  onBuddySave,
}: HireDetailViewProps) => {
  const milestoneProgress = playerProgress?.milestoneProgress ?? [];
  const totalXP = playerProgress?.totalXP ?? 0;

  const missionCountsByMilestone = useMemo(
    () => missions.reduce<Record<string, number>>(
      (acc, m) => { acc[m.milestoneId] = (acc[m.milestoneId] ?? 0) + 1; return acc; },
      {},
    ),
    [missions],
  );

  const currentMilestone = useMemo(() => {
    const inProgress = milestones.find((ms) => {
      const mp = milestoneProgress.find((p) => p.milestoneId === ms.id);
      return mp?.status === "inProgress";
    });
    return inProgress ?? milestones[0] ?? null;
  }, [milestones, milestoneProgress]);

  const currentMilestoneIndex = currentMilestone
    ? milestones.findIndex((ms) => ms.id === currentMilestone.id) + 1
    : 1;

  const overallProgress = milestoneProgress.length > 0
    ? Math.round(
      milestoneProgress.reduce((sum, mp) => sum + mp.percentComplete, 0) /
      milestoneProgress.length,
    )
    : 0;

  return (
    <div
      data-testid="hire-detail-view"
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      {/* Sub-header: back + hire info + configure */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-4)",
          background: "hsl(var(--color-card))",
          borderBottom: "1px solid hsl(var(--color-border))",
          position: "sticky",
          top: "var(--topbar-h)",
          zIndex: 5,
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onBack}
          data-testid="hire-detail-back-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            flexShrink: 0,
          }}
        >
          <MdArrowBack size={16} aria-hidden="true" />
          Hire list
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-sm)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.name}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.role}
            {player.team ? ` · ${player.team}` : ""}
          </div>
        </div>

        {pendingEvents.length > 0 && (
          <span
            data-testid="hire-detail-pending-badge"
            style={{
              fontSize: "var(--text-xs)",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--color-destructive) / 0.12)",
              color: "hsl(var(--color-destructive))",
              fontWeight: "var(--weight-semibold)",
              flexShrink: 0,
            }}
          >
            {pendingEvents.length} pending
          </span>
        )}

        <button
          type="button"
          className="btn btn--secondary"
          onClick={onConfigureSession}
          data-testid="configure-session-btn"
          style={{
            fontSize: "var(--text-xs)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            flexShrink: 0,
          }}
        >
          <MdSettings size={14} aria-hidden="true" />
          Configure
        </button>
      </div>

      {/* Milestone map — read-only viewer */}
      <div
        data-testid="hire-detail-map"
        style={{
          height: "min(44svh, 22rem)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <MilestoneMapViewer
          milestones={milestones}
          milestoneProgress={milestoneProgress}
          bgImageUrl={bgImageUrl}
          mapNodeScale={mapNodeScale}
          missionCounts={missionCountsByMilestone}
          onMilestoneClick={() => {/* read-only in this context */}}
        />
      </div>

      {/* Three panels row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        {/* Progress panel */}
        <div
          data-testid="hire-detail-progress-panel"
          className="card"
          style={{
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Progress
          </div>
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-bold)",
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {totalXP} XP
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Milestone {currentMilestoneIndex} / {milestones.length}
            {currentMilestone ? ` · ${currentMilestone.name}` : ""}
          </div>
          <div
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${overallProgress}% complete`}
            style={{
              height: "0.25rem",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--color-muted))",
              overflow: "hidden",
              marginTop: "var(--space-1)",
            }}
          >
            <div
              style={{
                width: `${overallProgress}%`,
                height: "100%",
                borderRadius: "var(--radius-full)",
                background: "hsl(var(--color-accent))",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Pending approvals panel */}
        <div
          data-testid="hire-detail-approvals-panel"
          className="card"
          style={{
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "hsl(var(--color-muted-fg))",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            Pending Approvals
            {pendingEvents.length > 0 && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  background: "hsl(var(--color-destructive) / 0.12)",
                  color: "hsl(var(--color-destructive))",
                  textTransform: "none",
                  letterSpacing: "normal",
                }}
              >
                {pendingEvents.length}
              </span>
            )}
          </div>

          {pendingEvents.length === 0
            ? (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-muted-fg))",
                  margin: 0,
                }}
              >
                No pending approvals
              </p>
            )
            : pendingEvents.slice(0, 4).map((event) => {
              const mission = missions.find((m) => m.id === event.missionId);
              return (
                <div
                  key={event.missionId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: "var(--text-xs)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mission?.title ?? event.missionId}
                  </span>
                  <button
                    type="button"
                    aria-label={`Approve ${mission?.title ?? "mission"}`}
                    onClick={() => onApprove(event.missionId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "2px 6px",
                      background: "hsl(var(--color-status-complete))",
                      color: "#fff",
                      border: "none",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <MdCheck size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Reject ${mission?.title ?? "mission"}`}
                    onClick={() => onReject(event.missionId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "2px 6px",
                      background: "transparent",
                      color: "hsl(var(--color-destructive))",
                      border: "1px solid hsl(var(--color-border))",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <MdClose size={12} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* Buddy panel */}
        <BuddyAssignmentForm
          players={allPlayers}
          draft={buddyDraft}
          selectedPlayerId={player.id}
          onPlayerChange={() => {/* player is fixed in detail view */}}
          onDraftChange={onBuddyDraftChange}
          onSave={onBuddySave}
        />
      </div>

      {/* Admin-only onboarding checklist */}
      <HireChecklist
        items={checklistItems}
        onToggle={onChecklistToggle}
        onRename={onChecklistRename}
        onDelete={onChecklistDelete}
        onAdd={onChecklistAdd}
        onReorder={onChecklistReorder}
      />
    </div>
  );
};

export default HireDetailView;
