import TopBar from "../components/shared/TopBar.tsx";
import RouteTabBar from "../components/shared/RouteTabBar.tsx";
import {
  PLAYER_DETAIL_TABS,
  type PlayerDetailTabKey,
} from "./player-detail/constants.ts";
import { usePlayerDetailPage } from "./player-detail/usePlayerDetailPage.ts";
import PlayerDetailHeader from "./player-detail/PlayerDetailHeader.tsx";
import PlayerAnalyticsTab from "./player-detail/PlayerAnalyticsTab.tsx";
import PlayerCustomizeTab from "./player-detail/PlayerCustomizeTab.tsx";
import PlayerBuddyTab from "./player-detail/PlayerBuddyTab.tsx";
import PlayerPreboardingTab from "./player-detail/PlayerPreboardingTab.tsx";
import PlayerDetailOverlays from "./player-detail/PlayerDetailOverlays.tsx";

const PlayerDetailPage = () => {
  const vm = usePlayerDetailPage();

  return (
    <div
      className="player-detail"
      data-testid="player-detail-page"
      data-page="player-detail"
    >
      <TopBar
        playerName={vm.identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <PlayerDetailHeader
        playerName={vm.playerName}
        onBack={() => vm.navigate(`/gamemaker/${vm.homeSid}`)}
        onScan={() => vm.setScannerOpen(true)}
      />

      <RouteTabBar
        tabs={PLAYER_DETAIL_TABS}
        activeKey={vm.tab}
        onChange={(key) => vm.setTab(key as PlayerDetailTabKey)}
        ariaLabel="Player views"
      />

      {vm.tab === "analytics" && (
        <PlayerAnalyticsTab
          playerFirstName={vm.playerFirstName}
          {...(vm.startDateISO !== undefined &&
            { startDateISO: vm.startDateISO })}
          milestones={vm.milestones}
          missions={vm.missions}
          events={vm.gmProgress.selectedPlayerEvents}
          pendingEvents={vm.gmProgress.pendingEvents}
          players={vm.gmProgress.players}
          draftMilestones={vm.draftMilestonesAsMilestones}
          milestoneProgress={vm.milestoneProgress}
          hasMilestones={vm.hasMilestones}
          sessionId={vm.homeSid}
          inviteToken={vm.gmProgress.selectedPlayer?.inviteToken ?? ""}
          onApprove={(playerId, missionId) =>
            void vm.gmProgress.handleApprove(playerId, missionId)}
          onReject={(playerId, missionId) =>
            void vm.gmProgress.handleReject(playerId, missionId)}
          onMilestoneClick={vm.openMilestone}
        />
      )}

      {vm.tab === "customize" && (
        <PlayerCustomizeTab
          playerFirstName={vm.playerFirstName}
          sessionId={vm.homeSid}
          inviteToken={vm.gmProgress.selectedPlayer?.inviteToken ?? ""}
          templates={vm.templates}
          appliedTemplate={vm.appliedTemplate}
          applyingTemplate={vm.applyingTemplate}
          draftMilestones={vm.draftMilestonesAsMilestones}
          missions={vm.missions}
          completedMissionIds={vm.completedMissionIds}
          resources={vm.gmResources.resources}
          bgImageUrl={vm.bgImageUrl}
          mapNodeScale={vm.mapNodeScale}
          onSelectTemplate={vm.handleUseTemplate}
          onAddTemplate={() => vm.setShowAddTemplate(true)}
          onSelectMilestone={vm.openMilestone}
          onAddMilestoneAt={vm.milestoneEditor.handleAddMilestoneAt}
          onNodeDrop={vm.milestoneEditor.handleNodeDrop}
          onDeleteMilestone={vm.handleDeleteMilestone}
          onResetToGrid={vm.milestoneEditor.handleResetToGrid}
          onUploadBackground={(file) => void vm.uploadBackground(file)}
          onMapNodeScaleChange={(scale) => void vm.updateMapNodeScale(scale)}
          onOpenScanner={() => vm.setScannerOpen(true)}
          onAddResource={vm.handleAddResource}
          onUpdateResource={(id, patch) =>
            void vm.gmResources.updateResource(id, patch)}
          onDeleteResource={(id) => void vm.gmResources.deleteResource(id)}
          onToggleVisibility={(id, visible) =>
            void vm.gmResources.toggleVisibility(id, visible)}
        />
      )}

      {vm.tab === "buddy" && (
        <PlayerBuddyTab
          players={vm.gmProgress.players}
          draft={vm.buddyProfile.buddyDraft}
          selectedPlayerId={vm.gmProgress.selectedPlayerId}
          onPlayerChange={vm.gmProgress.handlePlayerSelect}
          onDraftChange={vm.buddyProfile.setBuddyDraft}
          onSave={vm.handleBuddySave}
        />
      )}

      {vm.tab === "preboarding" && (
        <PlayerPreboardingTab
          playerFirstName={vm.playerFirstName}
          items={vm.preBoardingChecklist.items}
          onToggle={vm.preBoardingChecklist.onToggle}
          onAdd={vm.preBoardingChecklist.onAdd}
          onMarkAllDone={vm.preBoardingChecklist.onMarkAllDone}
        />
      )}

      <PlayerDetailOverlays vm={vm} />
    </div>
  );
};

export default PlayerDetailPage;
