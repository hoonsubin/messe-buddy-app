import { MdAutoAwesome } from "react-icons/md";
import type { Mission, ProgressEvent } from "../../types/index.ts";
import type {
  BuddyProfile,
  Milestone,
  MilestoneProgress,
  Resource,
} from "../../types/index.ts";
import ChatPanel from "./ChatPanel.tsx";
import MilestoneMapViewer from "./MilestoneMapViewer.tsx";
import CurrentMissionsList from "./CurrentMissionsList.tsx";
import ResourcesSection from "./ResourcesSection.tsx";
import BuddyCard from "./BuddyCard.tsx";
import type { ChatMessage } from "../../hooks/useChat.ts";

interface PlayerDashboardViewProps {
  readonly playerName?: string;
  readonly isLoading: boolean;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly bgImageUrl: string;
  readonly mapNodeScale: number;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly playerXPercent?: number;
  readonly playerYPercent?: number;
  readonly currentMissions: ReadonlyArray<Mission>;
  readonly progressEvents: ReadonlyArray<ProgressEvent>;
  readonly buddy: BuddyProfile | null;
  readonly resources: ReadonlyArray<Resource>;
  readonly onMilestoneClick: (id: string) => void;
  readonly onMissionClick: (id: string) => void;
}

const PlayerDashboardView = ({
  playerName,
  isLoading,
  milestones,
  bgImageUrl,
  mapNodeScale,
  milestoneProgress,
  playerXPercent,
  playerYPercent,
  currentMissions,
  progressEvents,
  buddy,
  resources,
  onMilestoneClick,
  onMissionClick,
}: PlayerDashboardViewProps) => (
  <main
    className="cockpit-main"
    style={{ flex: 1, paddingBlockStart: "var(--space-6)" }}
  >
    <header>
      <h1 className="player-cockpit__welcome-title">
        Welcome{playerName ? `, ${playerName.split(" ")[0]}` : ""}.
      </h1>
      <p className="player-cockpit__welcome-sub">
        Your onboarding journey starts here.
      </p>
    </header>

    <div className="cockpit-grid">
      <div className="cockpit-col">
        <section aria-label="Milestones">
          <h2 className="section-label">Milestones</h2>
          <div className="player-cockpit__map-wrap">
            <MilestoneMapViewer
              milestones={milestones}
              bgImageUrl={bgImageUrl}
              mapNodeScale={mapNodeScale}
              milestoneProgress={milestoneProgress}
              playerXPercent={playerXPercent}
              playerYPercent={playerYPercent}
              onMilestoneClick={onMilestoneClick}
            />
          </div>
        </section>

        <CurrentMissionsList
          missions={currentMissions}
          progressEvents={progressEvents}
          onMissionClick={onMissionClick}
          onMarkComplete={() => undefined}
        />
      </div>

      <div className="cockpit-col">
        <section aria-label="Your buddy">
          <h2 className="section-label">Your buddy</h2>
          {buddy
            ? (
              <BuddyCard
                name={buddy.name}
                role={buddy.role}
                {...(buddy.tenure !== undefined && { tenure: buddy.tenure })}
                {...(buddy.avatarUrl !== undefined && {
                  avatarUrl: buddy.avatarUrl,
                })}
                {...(buddy.contactUrl !== undefined && {
                  contactUrl: buddy.contactUrl,
                })}
                {...(buddy.quote !== undefined && { quote: buddy.quote })}
                {...(buddy.email !== undefined && { email: buddy.email })}
                {...(buddy.phone !== undefined && { phone: buddy.phone })}
              />
            )
            : (
              !isLoading && (
                <div className="card player-cockpit__buddy-empty">
                  <p className="player-cockpit__buddy-empty-text">
                    You'll be assigned a buddy soon.
                  </p>
                </div>
              )
            )}
        </section>

        <ResourcesSection resources={resources} onSearch={() => undefined} />
      </div>
    </div>
  </main>
);

interface PlayerAssistantViewProps {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly isStreaming: boolean;
  readonly onSend: (text: string) => void;
  readonly onStop: () => void;
  readonly buddyName?: string;
}

export const PlayerAssistantView = ({
  messages,
  isStreaming,
  onSend,
  onStop,
  buddyName,
}: PlayerAssistantViewProps) => (
  <main className="assistant-fullscreen">
    <section className="assistant-chat-card player-cockpit__assistant-panel">
      <div className="assistant-chat-card__header">
        <div className="assistant-chat-card__avatar" aria-hidden="true">
          <MdAutoAwesome size={18} />
        </div>
        <p className="assistant-chat-card__title">
          Ask AI about company policies
        </p>
      </div>
      <div className="player-cockpit__assistant-body">
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          onSend={onSend}
          onStop={onStop}
          {...(buddyName !== undefined && { buddyName })}
        />
      </div>
    </section>
  </main>
);

export default PlayerDashboardView;
