import type {
  Milestone,
  MilestoneProgress,
  Mission,
  Player,
  ProgressEvent,
} from "../../types/index.ts";
import HireAnalytics from "../../components/admin/HireAnalytics.tsx";
import IsometricMilestoneMap from "../../components/player/IsometricMilestoneMap.tsx";
import PendingApprovalsPanel from "../../components/admin/PendingApprovalsPanel.tsx";
import HireDetailSection from "./HireDetailSection.tsx";
import HireInviteAccordion from "./HireInviteAccordion.tsx";

interface HireAnalyticsTabProps {
  readonly hireFirstName: string;
  readonly startDateISO?: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly events: ReadonlyArray<ProgressEvent>;
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly players: ReadonlyArray<Player>;
  readonly draftMilestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly hasMilestones: boolean;
  readonly sessionId: string;
  readonly onApprove: (playerId: string, missionId: string) => void;
  readonly onReject: (playerId: string, missionId: string) => void;
  readonly onMilestoneClick: (id: string) => void;
}

const HireAnalyticsTab = ({
  hireFirstName,
  startDateISO,
  milestones,
  missions,
  events,
  pendingEvents,
  players,
  draftMilestones,
  milestoneProgress,
  hasMilestones,
  sessionId,
  onApprove,
  onReject,
  onMilestoneClick,
}: HireAnalyticsTabProps) => (
  <main className="hire-detail__main hire-detail__main--wide">
    <HireAnalytics
      {...(startDateISO !== undefined && { startDateISO })}
      firstName={hireFirstName}
      milestones={milestones}
      missions={missions}
      events={events}
    />

    {pendingEvents.length > 0 && (
      <HireDetailSection title="Pending approvals">
        <PendingApprovalsPanel
          pendingEvents={pendingEvents}
          players={players}
          missions={missions}
          onApprove={onApprove}
          onReject={onReject}
        />
      </HireDetailSection>
    )}

    <div className="card hire-detail__journey-card">
      <header className="hire-detail__journey-header">
        <h3 className="hire-detail__journey-title">
          {hireFirstName}'s Journey Map
        </h3>
        <p className="hire-detail__journey-sub">
          Quick access for mission edits
        </p>
      </header>
      {hasMilestones
        ? (
          <div className="hire-detail__map-wrap">
            <IsometricMilestoneMap
              milestones={draftMilestones}
              milestoneProgress={milestoneProgress}
              onMilestoneClick={onMilestoneClick}
            />
          </div>
        )
        : (
          <p className="hire-detail__journey-empty">
            No milestones yet — set up this hire's journey in the Customize tab.
          </p>
        )}
    </div>

    <HireInviteAccordion
      hireFirstName={hireFirstName}
      sessionId={sessionId}
    />
  </main>
);

export default HireAnalyticsTab;
