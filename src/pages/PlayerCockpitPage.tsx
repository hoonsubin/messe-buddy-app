import { usePlayerCockpitPage } from "./player-cockpit/usePlayerCockpitPage.ts";
import ConfirmDialog from "../components/shared/ConfirmDialog.tsx";
import RouteTabBar from "../components/shared/RouteTabBar.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneSidebarViewer from "../components/player/MilestoneSidebarViewer.tsx";
import MissionDetailPopup from "../components/player/MissionDetailPopup.tsx";
import {
  PLACEHOLDER_STEPS,
  TutorialOverlayWithStep,
} from "../components/tutorial/TutorialOverlay.tsx";
import { PLAYER_TABS, type PlayerTabKey } from "./player-cockpit/constants.ts";
import PlayerCockpitToolbar from "./player-cockpit/PlayerCockpitToolbar.tsx";
import PlayerDashboardView, {
  PlayerAssistantView,
} from "./player-cockpit/PlayerDashboardView.tsx";

const PlayerCockpitPage = () => {
  const result = usePlayerCockpitPage();

  if (result.status === "no-identity") {
    return (
      <div
        className="page-state-center"
        data-testid="player-cockpit-page"
        data-page="player-cockpit"
      >
        <p>No identity found. Please return to the landing page.</p>
      </div>
    );
  }

  if (result.status === "player-error") {
    return (
      <div
        className="page-state-center"
        data-testid="player-cockpit-page"
        data-page="player-cockpit"
      >
        <p>Could not load player data. Please try again.</p>
      </div>
    );
  }

  if (result.status === "session-redirect") return null;

  const m = result.model;

  return (
    <div
      className="player-cockpit"
      data-testid="player-cockpit-page"
      data-page="player-cockpit"
    >
      {m.isLoading && (
        <div className="player-cockpit__loading-overlay">
          Loading your journey…
        </div>
      )}

      <TutorialOverlayWithStep
        isVisible={m.showTutorial}
        currentStepIndex={m.tutorialStep}
        steps={PLACEHOLDER_STEPS}
        playerName={m.player.name}
        onNext={m.handleTutorialNext}
        onSkip={m.handleTutorialSkip}
      />

      <ConfirmDialog
        isOpen={m.showSkipConfirm}
        title="Skip tutorial?"
        body="You won't see this again, but your buddy and the Resources tab are there if you need a hand later."
        confirmLabel="Skip tutorial"
        onConfirm={m.handleSkipConfirm}
        onCancel={m.handleSkipCancel}
      />

      <TopBar
        playerName={m.player.name ?? ""}
        totalXP={m.progress.playerProgress?.totalXP ?? 0}
        role={m.player.role ?? ""}
      />

      <PlayerCockpitToolbar
        isDemo={m.identity.isDemo ?? false}
        onLeave={m.handleLeave}
      />

      <RouteTabBar
        tabs={PLAYER_TABS}
        activeKey={m.tab}
        onChange={(key) => m.setTab(key as PlayerTabKey)}
        ariaLabel="New hire views"
      />

      {m.popupMission !== null && (
        <MissionDetailPopup
          mission={m.popupMission}
          playerId={m.player.id}
          sessionId={m.sessionId}
          progressEvent={m.progress.progressEvents.find((e) =>
            e.missionId === m.popupMission!.id
          ) ?? null}
          markSelfComplete={() =>
            m.progress.markSelfComplete(m.popupMission!.id)}
          markPending={() => m.progress.markPending(m.popupMission!.id)}
          onClose={() => m.setPopupMission(null)}
          onValidated={() => {
            m.setPopupMission(null);
            m.progress.refresh();
          }}
        />
      )}

      {m.selectedMilestoneId !== null && m.selectedMilestone !== undefined && (
        <MilestoneSidebarViewer
          milestoneId={m.selectedMilestone.id}
          milestoneName={m.selectedMilestone.name}
          missions={m.sidebarMissions}
          progressEvents={m.progress.progressEvents}
          currentXP={m.msProgressEarnedXP}
          xpThreshold={m.selectedMilestone.xpThreshold}
          onClose={() => m.setSelectedMilestoneId(null)}
          onMissionClick={(id) => m.handleMissionClick(id)}
        />
      )}

      {m.tab === "dashboard" && (
        <PlayerDashboardView
          playerName={m.player.name}
          isLoading={m.isLoading}
          milestones={m.milestones}
          bgImageUrl={m.session?.bgImageUrl ?? ""}
          mapNodeScale={m.session?.mapNodeScale ?? 1}
          milestoneProgress={m.progress.playerProgress?.milestoneProgress ?? []}
          playerXPercent={m.currentMilestone?.xPercent}
          playerYPercent={m.currentMilestone?.yPercent}
          currentMissions={m.currentMissions}
          progressEvents={m.progress.progressEvents}
          buddy={m.buddy}
          resources={m.resources}
          onMilestoneClick={m.setSelectedMilestoneId}
          onMissionClick={m.handleMissionClick}
        />
      )}

      {m.tab === "assistant" && (
        <PlayerAssistantView
          messages={m.chat.messages}
          isStreaming={m.chat.isStreaming}
          onSend={m.chat.send}
          onStop={m.chat.stop}
          {...(m.buddy?.name !== undefined && { buddyName: m.buddy.name })}
        />
      )}
    </div>
  );
};

export default PlayerCockpitPage;
