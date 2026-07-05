import type {
  Milestone,
  MilestoneProgress,
  Mission,
  Player,
  ProgressEvent,
} from "../../types/index.ts";
import PlayerAnalytics from "../../components/gamemaker/PlayerAnalytics.tsx";
import IsometricMilestoneMap from "../../components/player/IsometricMilestoneMap.tsx";
import PendingApprovalsPanel from "../../components/gamemaker/PendingApprovalsPanel.tsx";
import PlayerDetailSection from "./PlayerDetailSection.tsx";
import PlayerInviteAccordion from "./PlayerInviteAccordion.tsx";

interface PlayerAnalyticsTabProps {
  readonly playerFirstName: string;
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
  readonly inviteToken: string;
  readonly onApprove: (playerId: string, missionId: string) => void;
  readonly onReject: (playerId: string, missionId: string) => void;
  readonly onMilestoneClick: (id: string) => void;
}

const PlayerAnalyticsTab = ({
  playerFirstName,
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
  inviteToken,
  onApprove,
  onReject,
  onMilestoneClick,
}: PlayerAnalyticsTabProps) => (
  <main className="player-detail__main player-detail__main--wide">
    <PlayerAnalytics
      {...(startDateISO !== undefined && { startDateISO })}
      firstName={playerFirstName}
      milestones={milestones}
      missions={missions}
      events={events}
    />

    {pendingEvents.length > 0 && (
      <PlayerDetailSection title="Pending approvals">
        <PendingApprovalsPanel
          pendingEvents={pendingEvents}
          players={players}
          missions={missions}
          onApprove={onApprove}
          onReject={onReject}
        />
      </PlayerDetailSection>
    )}

    <div className="card player-detail__journey-card">
      <header className="player-detail__journey-header">
        <h3 className="player-detail__journey-title">
          {playerFirstName}'s Journey Map
        </h3>
        <p className="player-detail__journey-sub">
          Quick access for mission edits
        </p>
      </header>
      {hasMilestones
        ? (
          <div className="player-detail__map-wrap">
            <IsometricMilestoneMap
              milestones={draftMilestones}
              milestoneProgress={milestoneProgress}
              onMilestoneClick={onMilestoneClick}
            />
          </div>
        )
        : (
          <p className="player-detail__journey-empty">
            No milestones yet — set up this player's journey in the Customize
            tab.
          </p>
        )}
    </div>

    <PlayerInviteAccordion
      playerFirstName={playerFirstName}
      sessionId={sessionId}
      inviteToken={inviteToken}
    />
  </main>
);

export default PlayerAnalyticsTab;
