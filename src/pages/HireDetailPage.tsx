import TopBar from "../components/shared/TopBar.tsx";
import RouteTabBar from "../components/shared/RouteTabBar.tsx";
import {
  HIRE_DETAIL_TABS,
  type HireDetailTabKey,
} from "./hire-detail/constants.ts";
import { useHireDetailPage } from "./hire-detail/useHireDetailPage.ts";
import HireDetailHeader from "./hire-detail/HireDetailHeader.tsx";
import HireAnalyticsTab from "./hire-detail/HireAnalyticsTab.tsx";
import HireCustomizeTab from "./hire-detail/HireCustomizeTab.tsx";
import HireBuddyTab from "./hire-detail/HireBuddyTab.tsx";
import HirePreboardingTab from "./hire-detail/HirePreboardingTab.tsx";
import HireDetailOverlays from "./hire-detail/HireDetailOverlays.tsx";

const HireDetailPage = () => {
  const vm = useHireDetailPage();

  return (
    <div
      className="hire-detail"
      data-testid="hire-detail-page"
      data-page="hire-detail"
    >
      <TopBar
        playerName={vm.identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <HireDetailHeader
        hireName={vm.hireName}
        onBack={() => vm.navigate(`/admin/${vm.homeSid}`)}
        onScan={() => vm.setScannerOpen(true)}
      />

      <RouteTabBar
        tabs={HIRE_DETAIL_TABS}
        activeKey={vm.tab}
        onChange={(key) => vm.setTab(key as HireDetailTabKey)}
        ariaLabel="Hire views"
      />

      {vm.tab === "analytics" && (
        <HireAnalyticsTab
          hireFirstName={vm.hireFirstName}
          {...(vm.startDateISO !== undefined &&
            { startDateISO: vm.startDateISO })}
          milestones={vm.milestones}
          missions={vm.missions}
          events={vm.adminProgress.selectedPlayerEvents}
          pendingEvents={vm.adminProgress.pendingEvents}
          players={vm.adminProgress.players}
          draftMilestones={vm.draftMilestonesAsMilestones}
          milestoneProgress={vm.milestoneProgress}
          hasMilestones={vm.hasMilestones}
          sessionId={vm.sid}
          onApprove={(playerId, missionId) =>
            void vm.adminProgress.handleApprove(playerId, missionId)}
          onReject={(playerId, missionId) =>
            void vm.adminProgress.handleReject(playerId, missionId)}
          onMilestoneClick={vm.openMilestone}
        />
      )}

      {vm.tab === "customize" && (
        <HireCustomizeTab
          hireFirstName={vm.hireFirstName}
          sessionId={vm.sid}
          templates={vm.templates}
          appliedTemplate={vm.appliedTemplate}
          applyingTemplate={vm.applyingTemplate}
          draftMilestones={vm.draftMilestonesAsMilestones}
          missions={vm.missions}
          completedMissionIds={vm.completedMissionIds}
          resources={vm.adminResources.resources}
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
          onAddResource={(data) => void vm.adminResources.addResource(data)}
          onUpdateResource={(id, patch) =>
            void vm.adminResources.updateResource(id, patch)}
          onDeleteResource={(id) => void vm.adminResources.deleteResource(id)}
          onToggleVisibility={(id, visible) =>
            void vm.adminResources.toggleVisibility(id, visible)}
        />
      )}

      {vm.tab === "buddy" && (
        <HireBuddyTab
          players={vm.adminProgress.players}
          draft={vm.buddyProfile.buddyDraft}
          selectedPlayerId={vm.adminProgress.selectedPlayerId}
          onPlayerChange={vm.adminProgress.handlePlayerSelect}
          onDraftChange={vm.buddyProfile.setBuddyDraft}
          onSave={vm.handleBuddySave}
        />
      )}

      {vm.tab === "preboarding" && (
        <HirePreboardingTab
          hireFirstName={vm.hireFirstName}
          items={vm.preBoardingChecklist.items}
          onToggle={vm.preBoardingChecklist.onToggle}
          onAdd={vm.preBoardingChecklist.onAdd}
          onMarkAllDone={vm.preBoardingChecklist.onMarkAllDone}
        />
      )}

      <HireDetailOverlays vm={vm} />
    </div>
  );
};

export default HireDetailPage;
