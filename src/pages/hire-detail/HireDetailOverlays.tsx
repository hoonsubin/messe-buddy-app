import Toast from "../../components/shared/Toast.tsx";
import ConfirmDialog from "../../components/shared/ConfirmDialog.tsx";
import NameCaptureModal from "../../components/shared/NameCaptureModal.tsx";
import MissionBottomSheet from "../../components/admin/MissionBottomSheet.tsx";
import AdminQRScannerModal from "../../components/admin/AdminQRScannerModal.tsx";
import type { HireDetailPageModel } from "./useHireDetailPage.ts";

interface HireDetailOverlaysProps {
  readonly vm: HireDetailPageModel;
}

const HireDetailOverlays = ({ vm }: HireDetailOverlaysProps) => (
  <>
    <MissionBottomSheet
      isOpen={vm.milestoneEditor.selectedMilestone !== null}
      milestone={vm.milestoneEditor.selectedMilestone}
      missions={vm.sheetMissions}
      activeMissionId={vm.missionEditor.selectedMissionId}
      draft={vm.missionEditor.activeDraftMission}
      isDirty={vm.isDirty}
      isSaving={vm.isSaving}
      sessionId={vm.sid}
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

    <AdminQRScannerModal
      isOpen={vm.scannerOpen}
      sessionId={vm.sid}
      onClose={() => vm.setScannerOpen(false)}
    />

    {vm.showAddTemplate && (
      <NameCaptureModal
        title="New template"
        description="Save this hire's current milestones & missions as a reusable template."
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
        ? `Changes are saved for ${vm.hireFirstName}. Also save them to the "${vm.appliedTemplate}" template so future hires get them?`
        : ""}
      confirmLabel="Update template"
      cancelLabel="Just this hire"
      onConfirm={vm.handleSaveToTemplate}
      onCancel={() => vm.setShowTemplateSavePrompt(false)}
    />

    <Toast message={vm.toast} isError={vm.toast?.includes("fail") ?? false} />
  </>
);

export default HireDetailOverlays;
