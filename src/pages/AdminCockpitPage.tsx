import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  FormSchema,
  Milestone,
  Player,
  ProgressEvent,
} from "../types/index.ts";
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
import PreBoardingChecklist from "../components/admin/PreBoardingChecklist.tsx";
import CrossHireDashboard from "../components/admin/CrossHireDashboard.tsx";
import AdminQRScannerModal from "../components/admin/AdminQRScannerModal.tsx";

const ADMIN_TABS = {
  ACTIVE_SESSION: "activeSession",
  PRE_BOARDING: "preBoarding",
  ALL_NEW_HIRES: "allNewHires",
} as const;
type AdminTab = (typeof ADMIN_TABS)[keyof typeof ADMIN_TABS];

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

  // Selected player — declare before effects that reference setSelectedPlayerId.
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  // Track whether this is the initial player list load (for auto-selecting
  // the first player on first load only, not on every player array change).
  const isInitialPlayerLoad = useRef(true);

  // All progress events across all players (for pending approvals panel).
  // Fetched in a single effect whenever the player list changes.
  const [allProgressEvents, setAllProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);

  useEffect(() => {
    if (!players.length) return;
    let cancelled = false;

    // Auto-select first player on initial load only.
    if (isInitialPlayerLoad.current) {
      setSelectedPlayerId(players[0]!.id);
      isInitialPlayerLoad.current = false;
    }

    // Fetch progress events for all players.
    const fetchAll = async () => {
      const results = await Promise.all(
        players.map((p) => adapter.listProgressEvents(p.id)),
      );
      if (!cancelled) setAllProgressEvents(results.flat());
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [adapter, players]);

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
  );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ??
    null;

  // Selected milestone (opens MilestoneSidebarEditor)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );

  // Tab navigation
  const [activeTab, setActiveTab] = useState<AdminTab>(
    ADMIN_TABS.ACTIVE_SESSION,
  );

  // QR scanner modal
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // ── Approval handlers ────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: identity?.uid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      // Re-fetch events for this player after approval.
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter, identity],
  );

  const handleReject = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pending",
      });
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter],
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

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
      <nav
        aria-label="Admin views"
        className="tab-bar"
        style={{
          position: "sticky",
          top: "var(--topbar-h)",
          zIndex: 10,
          background: "hsl(var(--color-bg))",
          borderBottom: "1px solid hsl(var(--color-border))",
          paddingInline: "var(--space-4)",
        }}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            gap: "var(--space-1)",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {(
            [
              { key: ADMIN_TABS.ACTIVE_SESSION, label: "Active Session" },
              {
                key: ADMIN_TABS.PRE_BOARDING,
                label: "Pre-Boarding Checklist",
              },
              { key: ADMIN_TABS.ALL_NEW_HIRES, label: "All New Hires" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <li key={tab.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    background: isActive
                      ? "hsl(var(--color-card))"
                      : "transparent",
                    border: "none",
                    borderBottom: isActive
                      ? "2px solid hsl(var(--color-accent))"
                      : "2px solid transparent",
                    color: isActive
                      ? "hsl(var(--color-fg))"
                      : "hsl(var(--color-muted-fg))",
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive
                      ? "var(--weight-semibold)"
                      : "var(--weight-medium)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    minHeight: "var(--min-touch)",
                    borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Active Session view ─────────────────────────────────────────── */}
      {activeTab === ADMIN_TABS.ACTIVE_SESSION && (
        <main
          className="admin-layout"
          style={{ flex: 1 }}
        >
          {/* Map canvas */}
          <div className="admin-layout__map">
            <MilestoneMapEditor
              milestones={milestones}
              bgImageUrl={session?.bgImageUrl ?? ""}
              onMilestoneClick={(id) =>
                setSelectedMilestone(
                  milestones.find((m) => m.id === id) ?? null,
                )}
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
            <div
              style={{
                padding: "var(--space-2)",
                borderTop: "1px solid hsl(var(--color-border))",
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                style={{ width: "100%" }}
                onClick={() => setQrScannerOpen(true)}
              >
                Scan QR
              </button>
            </div>
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
      )}

      {/* ── Pre-Boarding Checklist view ─────────────────────────────────── */}
      {activeTab === ADMIN_TABS.PRE_BOARDING && (
        <main
          style={{
            flex: 1,
            padding: "var(--space-6) var(--space-4)",
            maxWidth: "40rem",
            marginInline: "auto",
            width: "100%",
          }}
        >
          <PreBoardingChecklist
            playerName={selectedPlayer?.name.split(" ")[0]}
          />
        </main>
      )}

      {/* ── All New Hires view (HR Overview) ────────────────────────────── */}
      {activeTab === ADMIN_TABS.ALL_NEW_HIRES && (
        <main
          style={{
            flex: 1,
            padding: "var(--space-6) var(--space-4)",
            maxWidth: "48rem",
            marginInline: "auto",
            width: "100%",
          }}
        >
          <h2
            style={{
              margin: "0 0 var(--space-4)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
            }}
          >
            All New Hires
          </h2>
          <CrossHireDashboard />
        </main>
      )}

      {/* ── QR Scanner modal ────────────────────────────────────────────── */}
      <AdminQRScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />

      {/* Milestone/mission editor sidebar — only rendered when a milestone is selected */}
      {selectedMilestone && (
        <MilestoneSidebarEditor
          milestone={selectedMilestone}
          missions={missions}
          activeMissionId={null}
          draft={null}
          isDirty={false}
          isSaving={false}
          onMissionSelect={() => undefined}
          onDraftChange={() => undefined}
          onSave={() => undefined}
          onSaveAsTemplate={() => setSaveTemplateOpen(true)}
          onDiscard={() => setSelectedMilestone(null)}
          onAddMission={() => undefined}
        />
      )}

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
