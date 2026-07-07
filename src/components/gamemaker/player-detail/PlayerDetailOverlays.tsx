import Toast from "../../shared/Toast.tsx";
import ConfirmDialog from "../../shared/ConfirmDialog.tsx";
import NameCaptureModal from "../../shared/NameCaptureModal.tsx";
import MissionBottomSheet from "../MissionBottomSheet.tsx";
import type { GmPlayerDetailPageModel } from "../../../hooks/pages/useGmPlayerDetailPage.ts";

interface PlayerDetailOverlaysProps {
  readonly vm: GmPlayerDetailPageModel;
}

const PlayerDetailOverlays = ({ vm }: PlayerDetailOverlaysProps) => {
  const milestoneId = vm.milestoneEditor.selectedMilestone?.id;
  const milestoneResources = vm.gmResources.resources.filter(
    (resource) => resource.milestoneId === milestoneId,
  );

  const openMilestone = vm.milestoneEditor.selectedMilestone;

  return (
    <>
      {openMilestone !== null && (
        <MissionBottomSheet
          isOpen
          milestone={openMilestone}
          missions={vm.sheetMissions}
          activeMissionId={vm.missionEditor.selectedMissionId}
          draft={vm.missionEditor.activeDraftMission}
          isDirty={vm.isDirty}
          isSaving={vm.isSaving}
          sessionId={vm.homeSid}
          milestoneResources={milestoneResources}
          onMissionSelect={vm.missionEditor.handleMissionSelect}
          onDraftChange={vm.missionEditor.handleDraftChange}
          onRename={(newName) =>
            vm.milestoneEditor.handleRenameMilestone(openMilestone.id, newName)}
          onSave={() => void vm.handleSave()}
          onDiscard={vm.handleDiscard}
          onAddMission={() =>
            vm.missionEditor.handleAddMission(openMilestone.id)}
          onDeleteMission={vm.handleDeleteMission}
          onReorderMission={vm.missionEditor.handleMissionReorder}
          onClose={vm.closeMilestoneEditor}
          onAddResource={(data) =>
            vm.handleAddResource({
              ...data,
              milestoneId: openMilestone.id,
            })}
          onUpdateResource={(id, patch) =>
            void vm.gmResources.updateResource(id, patch)}
          onDeleteResource={(id) =>
            vm.handleDetachResource(id, openMilestone.id)}
          onToggleResourceVisibility={(id, visible) =>
            void vm.gmResources.toggleVisibility(id, visible)}
          libraryResources={vm.gmResources.libraryResources}
          onAttachFromLibrary={(libraryResourceId) =>
            vm.handleAttachFromLibrary(libraryResourceId, openMilestone.id)}
        />
      )}

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
};

export default PlayerDetailOverlays;
