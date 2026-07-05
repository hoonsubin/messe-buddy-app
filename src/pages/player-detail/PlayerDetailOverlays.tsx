import Toast from "../../components/shared/Toast.tsx";
import ConfirmDialog from "../../components/shared/ConfirmDialog.tsx";
import NameCaptureModal from "../../components/shared/NameCaptureModal.tsx";
import MissionBottomSheet from "../../components/gamemaker/MissionBottomSheet.tsx";
import GmQRScannerModal from "../../components/gamemaker/GmQRScannerModal.tsx";
import type { PlayerDetailPageModel } from "./usePlayerDetailPage.ts";

interface PlayerDetailOverlaysProps {
  readonly vm: PlayerDetailPageModel;
}

const PlayerDetailOverlays = ({ vm }: PlayerDetailOverlaysProps) => (
  <>
    <MissionBottomSheet
      isOpen={vm.milestoneEditor.selectedMilestone !== null}
      milestone={vm.milestoneEditor.selectedMilestone}
      missions={vm.sheetMissions}
      activeMissionId={vm.missionEditor.selectedMissionId}
      draft={vm.missionEditor.activeDraftMission}
      isDirty={vm.isDirty}
      isSaving={vm.isSaving}
      sessionId={vm.homeSid}
      onMissionSelect={vm.missionEditor.handleMissionSelect}
      onDraftChange={vm.missionEditor.handleDraftChange}
      onRename={(newName) =>
        vm.milestoneEditor.selectedMilestone
          ? vm.milestoneEditor.handleRenameMilestone(
            vm.milestoneEditor.selectedMilestone.id,
            newName,
          )
          : undefined}
      onSave={() => void vm.handleSave()}
      onDiscard={vm.handleDiscard}
      onAddMission={() =>
        vm.milestoneEditor.selectedMilestone
          ? vm.missionEditor.handleAddMission(
            vm.milestoneEditor.selectedMilestone.id,
          )
          : undefined}
      onDeleteMission={vm.handleDeleteMission}
      onReorderMission={vm.missionEditor.handleMissionReorder}
      onClose={vm.closeMilestoneEditor}
    />

    <GmQRScannerModal
      isOpen={vm.scannerOpen}
      sessionId={vm.homeSid}
      playerId={vm.playerId}
      onClose={() => vm.setScannerOpen(false)}
    />

    {vm.showAddTemplate && (
      <NameCaptureModal
        title="New template"
        description="Save this player's current milestones & missions as a reusable template."
        placeholder="e.g. Engineering Onboarding"
        submitLabel="Create template"
        inputLabel="Template name"
        loading={vm.creatingTemplate}
        onSubmit={vm.handleAddTemplate}
        onCancel={() => vm.setShowAddTemplate(false)}
      />
    )}

    <ConfirmDialog
      isOpen={vm.showTemplateSavePrompt}
      title="Update template too?"
      body={vm.appliedTemplate
        ? `Changes are saved for ${vm.playerFirstName}. Also save them to the "${vm.appliedTemplate}" template so future players get them?`
        : ""}
      confirmLabel="Update template"
      cancelLabel="Just this player"
      onConfirm={vm.handleSaveToTemplate}
      onCancel={() => vm.setShowTemplateSavePrompt(false)}
    />

    <Toast message={vm.toast} isError={vm.toast?.includes("fail") ?? false} />
  </>
);

export default PlayerDetailOverlays;
