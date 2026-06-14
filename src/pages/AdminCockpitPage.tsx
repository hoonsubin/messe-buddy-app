import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { FormSchema, Player, ProgressEvent } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { useResources } from "../hooks/useResources.ts";
import { exportTemplate } from "../use-cases/exportTemplate.ts";
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

const AdminCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const adapter = useAdapter();
  const { identity } = useIdentity();

  // Session data via hooks
  const { session, milestones, missions } = useSession(sid);
  const { resources } = useResources(sid);

  // Players
  const [players, setPlayers] = useState<ReadonlyArray<Player>>([]);
  useEffect(() => {
    if (!sid) return;
    void adapter.listPlayers(sid).then(setPlayers);
  }, [adapter, sid]);

  // All progress events across all players (for pending approvals panel)
  const [allProgressEvents, setAllProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);

  const refreshEvents = useCallback(async () => {
    if (!players.length) return;
    const results = await Promise.all(
      players.map((p) => adapter.listProgressEvents(p.id)),
    );
    setAllProgressEvents(results.flat());
  }, [adapter, players]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
  );

  // Selected player
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  useEffect(() => {
    if (players.length && !selectedPlayerId) {
      setSelectedPlayerId(players[0]!.id);
    }
  }, [players, selectedPlayerId]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ??
    null;

  // ── Approval handlers ────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: identity?.uid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      void refreshEvents();
    },
    [adapter, identity, refreshEvents],
  );

  const handleReject = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pending",
      });
      void refreshEvents();
    },
    [adapter, refreshEvents],
  );

  // ── Template export ──────────────────────────────────────────────────────

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const handleExportTemplate = useCallback(async () => {
    if (!session) return;
    setIsSavingTemplate(true);
    try {
      const formMissions = missions.filter((m) => m.type === MISSION_TYPE.FORM);
      const schemaResults = await Promise.all(
        formMissions.map((m) => adapter.getFormSchema(m.id).catch(() => null)),
      );
      const formSchemas = schemaResults.filter(
        (s): s is FormSchema => s !== null,
      );

      const name = templateName.trim() || session.name;
      const template = exportTemplate(
        name,
        session,
        milestones,
        missions,
        formSchemas,
        resources,
      );

      const blob = new Blob([JSON.stringify(template, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaveTemplateOpen(false);
      setTemplateName("");
    } finally {
      setIsSavingTemplate(false);
    }
  }, [adapter, session, milestones, missions, resources, templateName]);

  return (
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
        playerName={session?.name ?? "Game Master"}
        totalXP={0}
        role="Game Master"
      />

      <main
        className="admin-layout"
        style={{ flex: 1, paddingTop: "var(--topbar-h)" }}
      >
        {/* Map canvas */}
        <div className="admin-layout__map">
          <MilestoneMapEditor
            milestones={milestones}
            bgImageUrl={session?.bgImageUrl ?? ""}
            onMilestoneClick={() => undefined}
            onNodeDrop={() => undefined}
            onAddMilestone={() => undefined}
            onRename={() => undefined}
            onDelete={() => undefined}
            onUploadBackground={() => undefined}
          />
        </div>

        {/* Sidebar panels */}
        <div className="admin-layout__sidebar">
          {players.length > 0 && (
            <PlayerSelectorDropdown
              players={players}
              selectedId={selectedPlayerId}
              onSelect={setSelectedPlayerId}
            />
          )}
          {selectedPlayer && <PlayerProfileCard player={selectedPlayer} />}
          <PendingApprovalsPanel
            pendingEvents={pendingEvents}
            players={players}
            missions={missions}
            onApprove={(playerId, missionId) =>
              void handleApprove(playerId, missionId)}
            onReject={(playerId, missionId) =>
              void handleReject(playerId, missionId)}
          />
          <BuddyAssignmentForm
            players={players}
            draft={{
              sessionId: sid,
              name: "",
              role: "",
              tenure: "",
              contactUrl: "",
            }}
            selectedPlayerId=""
            onPlayerChange={() => undefined}
            onDraftChange={() => undefined}
            onSave={() => undefined}
          />
          <ResourcesEditor
            resources={resources}
            sessionId={sid}
            onAdd={() => undefined}
            onDelete={() => undefined}
          />
          <TemplateLibrary
            templates={[]}
            onLoad={() => undefined}
          />
        </div>
      </main>

      {/* Milestone/mission editor sidebar — hidden until milestone selected */}
      <MilestoneSidebarEditor
        milestone={null}
        missions={missions}
        activeMissionId={null}
        draft={null}
        isDirty={false}
        isSaving={false}
        onMissionSelect={() => undefined}
        onDraftChange={() => undefined}
        onSave={() => undefined}
        onSaveAsTemplate={() => setSaveTemplateOpen(true)}
        onDiscard={() => undefined}
        onAddMission={() => undefined}
      />

      <SaveTemplateModal
        isOpen={saveTemplateOpen}
        templateName={templateName}
        isSaving={isSavingTemplate}
        onNameChange={setTemplateName}
        onConfirm={() => void handleExportTemplate()}
        onCancel={() => {
          setSaveTemplateOpen(false);
          setTemplateName("");
        }}
      />
    </div>
  );
};

export default AdminCockpitPage;
