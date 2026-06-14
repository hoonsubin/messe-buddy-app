// Phase 1 shell — GM view layout. Data fetching + state wired in Phase 4.
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneMapEditor from "../components/admin/MilestoneMapEditor.tsx";
import MilestoneSidebarEditor from "../components/admin/MilestoneSidebarEditor.tsx";
import PendingApprovalsPanel from "../components/admin/PendingApprovalsPanel.tsx";
import PlayerSelectorDropdown from "../components/admin/PlayerSelectorDropdown.tsx";
import PlayerProfileCard from "../components/admin/PlayerProfileCard.tsx";
import TemplateLibrary from "../components/admin/TemplateLibrary.tsx";
import BuddyAssignmentForm from "../components/admin/BuddyAssignmentForm.tsx";
import ResourcesEditor from "../components/admin/ResourcesEditor.tsx";
import SaveTemplateModal from "../components/admin/SaveTemplateModal.tsx";
import { MOCK_SESSION, MOCK_MILESTONES, MOCK_MISSIONS, MOCK_PLAYERS, MOCK_RESOURCES } from "../adapters/mock/mockData.ts";

// Phase 1: first player as default for visual shell preview.
const PLAYER = MOCK_PLAYERS[0]!;

const AdminCockpitPage = () => (
  <div
    data-testid="admin-cockpit-page"
    data-page="admin-cockpit"
    style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100dvh",
      background: "hsl(var(--color-bg))",
    }}
  >
    <TopBar
      playerName="Peter Tubak"
      totalXP={0}
      role="Game Master"
    />

    <main
      className="admin-layout"
      style={{ flex: 1, paddingTop: "var(--topbar-h)" }}
    >
      {/* Map canvas — order:-1 on mobile (top), order:1 on desktop (right) */}
      <div className="admin-layout__map">
        <MilestoneMapEditor
          milestones={MOCK_MILESTONES}
          bgImageUrl={MOCK_SESSION.bgImageUrl}
          onMilestoneClick={() => undefined}
          onNodeDrop={() => undefined}
          onAddMilestone={() => undefined}
          onRename={() => undefined}
          onDelete={() => undefined}
          onUploadBackground={() => undefined}
        />
      </div>

      {/* Sidebar panels — order:1 on mobile (below), order:-1 on desktop (left) */}
      <div className="admin-layout__sidebar">
        <PlayerSelectorDropdown
          players={MOCK_PLAYERS}
          selectedId={PLAYER.id}
          onSelect={() => undefined}
        />
        <PlayerProfileCard player={PLAYER} />
        <PendingApprovalsPanel
          pendingEvents={[]}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
        <BuddyAssignmentForm
          players={MOCK_PLAYERS}
          draft={{ sessionId: MOCK_SESSION.id, name: "", role: "", tenure: "", contactUrl: "" }}
          selectedPlayerId=""
          onPlayerChange={() => undefined}
          onDraftChange={() => undefined}
          onSave={() => undefined}
        />
        <ResourcesEditor
          resources={MOCK_RESOURCES}
          sessionId={MOCK_SESSION.id}
          onAdd={() => undefined}
          onDelete={() => undefined}
        />
        <TemplateLibrary templates={[]} onLoad={() => undefined} />
      </div>
    </main>

    {/* Right sidebar: milestone/mission editor — hidden until milestone selected */}
    <MilestoneSidebarEditor
      milestone={null}
      missions={MOCK_MISSIONS}
      activeMissionId={null}
      draft={null}
      isDirty={false}
      isSaving={false}
      onMissionSelect={() => undefined}
      onDraftChange={() => undefined}
      onSave={() => undefined}
      onSaveAsTemplate={() => undefined}
      onDiscard={() => undefined}
      onAddMission={() => undefined}
    />

    <SaveTemplateModal
      isOpen={false}
      templateName=""
      isSaving={false}
      onNameChange={() => undefined}
      onConfirm={() => undefined}
      onCancel={() => undefined}
    />
  </div>
);

export default AdminCockpitPage;
