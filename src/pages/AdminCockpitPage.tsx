import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import type { Milestone } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { useScrollCollapse } from "../hooks/useScrollCollapse.ts";
import { useAdminMilestoneEditor } from "../hooks/useAdminMilestoneEditor.ts";
import { useAdminMissionEditor } from "../hooks/useAdminMissionEditor.ts";
import {
  useProgressAdmin,
  useProgressCrossHire,
} from "../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../hooks/useBuddyProfile.ts";
import { useResources } from "../hooks/useResources.ts";
import { usePreBoardingChecklist } from "../hooks/usePreBoardingChecklist.ts";
import { useTemplateLibrary } from "../hooks/useTemplateLibrary.ts";
import Toast from "../components/shared/Toast.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import MilestoneMapEditor from "../components/admin/MilestoneMapEditor.tsx";
import MissionBottomSheet from "../components/admin/MissionBottomSheet.tsx";
import PendingApprovalsPanel from "../components/admin/PendingApprovalsPanel.tsx";
import PlayerSelectorDropdown from "../components/admin/PlayerSelectorDropdown.tsx";
import PlayerProfileCard from "../components/admin/PlayerProfileCard.tsx";
import TemplateLibrary from "../components/shared/TemplateLibrary.tsx";
import { toTemplateSummaries } from "../utils/templateSummary.ts";
import BuddyAssignmentForm from "../components/admin/BuddyAssignmentForm.tsx";
import ResourcesEditor from "../components/admin/ResourcesEditor.tsx";
import SaveTemplateModal from "../components/admin/SaveTemplateModal.tsx";
import PreBoardingChecklist from "../components/admin/PreBoardingChecklist.tsx";
import CrossHireDashboard from "../components/admin/CrossHireDashboard.tsx";
import AdminQRScannerModal from "../components/admin/AdminQRScannerModal.tsx";
import SessionInviteCard from "../components/admin/SessionInviteCard.tsx";

const ADMIN_TABS = {
  ACTIVE_SESSION: "activeSession",
  PRE_BOARDING: "preBoarding",
  ALL_NEW_HIRES: "allNewHires",
} as const;
type AdminTab = (typeof ADMIN_TABS)[keyof typeof ADMIN_TABS];

const AdminCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sid = sessionId ?? "";
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sid, USER_ROLE.GAMEMAKER);

  const sessionData = useSession(sid, { role: "gamemaker" });
  const {
    session,
    milestones,
    missions,
    loading: sessionLoading,
    error: sessionError,
    refresh: refreshSession,
    uploadBackground,
    updateMapNodeScale,
  } = sessionData;

  const [bgImageUrlOverride, setBgImageUrlOverride] = useState<string | null>(
    null,
  );
  const bgImageUrl = bgImageUrlOverride ?? session?.bgImageUrl ?? "";

  const [activeTab, setActiveTab] = useState<AdminTab>(
    ADMIN_TABS.ACTIVE_SESSION,
  );
  const [scannerOpen, setScannerOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mapCollapsed = useScrollCollapse(sidebarRef, activeTab);

  const milestoneEditor = useAdminMilestoneEditor(milestones);
  const missionEditor = useAdminMissionEditor(missions);

  const adminProgress = useProgressAdmin({
    sid,
    milestones,
    missions,
    validatorUid: identity?.uid,
  });

  const buddyProfile = useBuddyProfile(sid, adminProgress.selectedPlayerId, {
    role: "gamemaker",
  });

  const adminResources = useResources(sid, { role: "gamemaker" });

  const preBoardingChecklist = usePreBoardingChecklist(sid, session);

  const crossHire = useProgressCrossHire({
    active: activeTab === ADMIN_TABS.ALL_NEW_HIRES,
  });

  const templateLibrary = useTemplateLibrary({
    sid,
    active: activeTab === ADMIN_TABS.ACTIVE_SESSION,
    session,
    milestones,
    missions,
    resources: adminResources.resources,
    gmUid: identity?.uid,
  });

  const handlePlayerSelectWithBuddy = useCallback(
    (playerId: string) => {
      adminProgress.handlePlayerSelect(playerId);
    },
    [adminProgress],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  }, []);

  const handleBuddySave = useCallback(() => {
    if (!adminProgress.selectedPlayerId) return;
    void buddyProfile.upsertBuddy().then(() => {
      showToast("Buddy assigned");
    });
  }, [adminProgress.selectedPlayerId, buddyProfile, showToast]);

  const handleUploadBackground = useCallback(
    (file: File) => {
      void uploadBackground(file).then(({ displayUrl }) => {
        setBgImageUrlOverride(displayUrl);
      });
    },
    [uploadBackground],
  );

  const handleMapNodeScaleChange = useCallback(
    (scale: number) => {
      void updateMapNodeScale(scale);
    },
    [updateMapNodeScale],
  );

  const isDirty = useMemo(
    () =>
      milestoneEditor.draftMilestonesAreDirty ||
      missionEditor.draftMissionsAreDirty ||
      missionEditor.missionOrderChanges.size > 0,
    [
      milestoneEditor.draftMilestonesAreDirty,
      missionEditor.draftMissionsAreDirty,
      missionEditor.missionOrderChanges,
    ],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const milestoneIdMap = await milestoneEditor.saveMilestones(
        sid,
        milestones,
      );
      await missionEditor.saveMissions(
        sid,
        missions,
        missionEditor.xpPreview,
        milestoneIdMap,
      );
      milestoneEditor.clearDirtyMilestones();
      missionEditor.clearDirtyMissions();
      missionEditor.clearOrderChanges();
      refreshSession();
      showToast("All changes saved");
    } catch {
      showToast("Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [
    sid,
    milestones,
    missions,
    milestoneEditor,
    missionEditor,
    refreshSession,
    showToast,
  ]);

  const handleDiscard = useCallback(() => {
    milestoneEditor.discardMilestones(milestones);
    missionEditor.discardMissions();
  }, [milestones, milestoneEditor, missionEditor]);

  const draftMilestonesAsMilestones: ReadonlyArray<Milestone> = useMemo(
    () =>
      milestoneEditor.draftMilestones.map((dm) => {
        const real = milestones.find((m) => m.id === dm.id);
        return {
          id: dm.id,
          name: dm.name,
          xPercent: dm.xPercent,
          yPercent: dm.yPercent,
          order: real?.order ?? 0,
          sessionId: real?.sessionId ?? sid,
          xpThreshold: real?.xpThreshold ?? 100,
          created: real?.created ?? new Date().toISOString(),
          updated: real?.updated ?? new Date().toISOString(),
        } satisfies Milestone;
      }),
    [milestoneEditor.draftMilestones, milestones, sid],
  );

  const missionCounts = useMemo<Record<string, number>>(
    () =>
      missions.reduce<Record<string, number>>((acc, m) => {
        acc[m.milestoneId] = (acc[m.milestoneId] ?? 0) + 1;
        return acc;
      }, {}),
    [missions],
  );

  useEffect(() => {
    if (sessionError && !sessionLoading) {
      sessionStorage.setItem("mb_landing_toast", "Session does not exist.");
      navigate("/", { replace: true });
    }
  }, [sessionError, sessionLoading, navigate]);

  if (sessionError && !sessionLoading) return null;

  return (
    <div
      data-testid="admin-cockpit-page"
      data-page="admin-cockpit"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        paddingTop: "var(--topbar-h)",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={session?.name ?? "Game Master"}
        totalXP={0}
        role="Game Master"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          padding: "var(--space-2) var(--space-4)",
          background: "hsl(var(--color-card))",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
          onClick={() => {
            if (identity && !identity.isDemo) {
              removeProfile(identity.uid);
            }
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

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
              { key: ADMIN_TABS.PRE_BOARDING, label: "Pre-Boarding Checklist" },
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
                    borderRadius: "var(--radius) var(--radius) 0 0",
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

      {activeTab === ADMIN_TABS.ACTIVE_SESSION && (
        <main
          className="admin-layout"
          data-map-collapsed={mapCollapsed ? "true" : undefined}
          style={{ flex: 1 }}
        >
          <div className="admin-layout__map">
            <MilestoneMapEditor
              milestones={draftMilestonesAsMilestones}
              missionCounts={missionCounts}
              bgImageUrl={bgImageUrl}
              mapNodeScale={session?.mapNodeScale ?? 1}
              onMilestoneClick={(id) => {
                missionEditor.clearSelectedMission();
                milestoneEditor.setSelectedMilestone(
                  draftMilestonesAsMilestones.find((m) => m.id === id) ?? null,
                );
              }}
              onNodeDrop={milestoneEditor.handleNodeDrop}
              onAddMilestoneAt={milestoneEditor.handleAddMilestoneAt}
              onDelete={milestoneEditor.handleDeleteMilestone}
              onUploadBackground={handleUploadBackground}
              onMapNodeScaleChange={handleMapNodeScaleChange}
              onOpenScanner={() => setScannerOpen(true)}
              onResetToGrid={milestoneEditor.handleResetToGrid}
            />
          </div>

          <div ref={sidebarRef} className="admin-layout__sidebar">
            <SessionInviteCard sessionId={sid} />
            {adminProgress.players.length > 0 && (
              <PlayerSelectorDropdown
                players={adminProgress.players}
                selectedId={adminProgress.selectedPlayerId}
                onSelect={handlePlayerSelectWithBuddy}
              />
            )}
            {adminProgress.selectedPlayer &&
              adminProgress.selectedPlayerProgress && (
              <PlayerProfileCard
                player={adminProgress.selectedPlayer}
                totalXP={adminProgress.selectedPlayerProgress.totalXP}
                milestoneProgress={adminProgress.selectedPlayerProgress
                  .milestoneProgress}
              />
            )}
            <PendingApprovalsPanel
              pendingEvents={adminProgress.pendingEvents}
              players={adminProgress.players}
              missions={missions}
              onApprove={(playerId, missionId) =>
                void adminProgress.handleApprove(playerId, missionId)}
              onReject={(playerId, missionId) =>
                void adminProgress.handleReject(playerId, missionId)}
            />
            <BuddyAssignmentForm
              players={adminProgress.players}
              draft={buddyProfile.buddyDraft}
              selectedPlayerId={adminProgress.selectedPlayerId}
              onPlayerChange={handlePlayerSelectWithBuddy}
              onDraftChange={buddyProfile.setBuddyDraft}
              onSave={handleBuddySave}
            />
            <ResourcesEditor
              resources={adminResources.resources}
              sessionId={sid}
              onAdd={(data) => void adminResources.addResource(data)}
              onDelete={(id) => void adminResources.deleteResource(id)}
              onToggleVisibility={(id, visible) =>
                void adminResources.toggleVisibility(id, visible)}
            />
            <TemplateLibrary
              templates={toTemplateSummaries(templateLibrary.templates)}
              onLoad={templateLibrary.handleLoadTemplate}
              onDelete={(id) => void templateLibrary.handleDeleteTemplate(id)}
            />
          </div>
        </main>
      )}

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
            playerName={adminProgress.selectedPlayer?.name.split(" ")[0]}
            items={preBoardingChecklist.items}
            onToggle={preBoardingChecklist.onToggle}
            onAdd={preBoardingChecklist.onAdd}
            onMarkAllDone={preBoardingChecklist.onMarkAllDone}
          />
        </main>
      )}

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
          <CrossHireDashboard hires={crossHire.rows} />
        </main>
      )}

      <AdminQRScannerModal
        isOpen={scannerOpen}
        sessionId={sid}
        onClose={() => setScannerOpen(false)}
      />

      <MissionBottomSheet
        isOpen={milestoneEditor.selectedMilestone !== null}
        milestone={milestoneEditor.selectedMilestone}
        missions={milestoneEditor.selectedMilestone
          ? missions
            .filter(
              (m) => m.milestoneId === milestoneEditor.selectedMilestone!.id,
            )
            .filter((m) => !missionEditor.deletedMissionIds.has(m.id))
          : []}
        activeMissionId={missionEditor.selectedMissionId}
        draft={missionEditor.activeDraftMission}
        xpPreview={missionEditor.xpPreview}
        isDirty={isDirty}
        isSaving={isSaving}
        sessionId={sid}
        onMissionSelect={missionEditor.handleMissionSelect}
        onDraftChange={missionEditor.handleDraftChange}
        onRename={(newName) =>
          milestoneEditor.selectedMilestone
            ? milestoneEditor.handleRenameMilestone(
              milestoneEditor.selectedMilestone.id,
              newName,
            )
            : undefined}
        onSave={() => void handleSave()}
        onSaveAsTemplate={() => templateLibrary.setSaveTemplateOpen(true)}
        onDiscard={handleDiscard}
        onAddMission={() =>
          milestoneEditor.selectedMilestone
            ? missionEditor.handleAddMission(
              milestoneEditor.selectedMilestone.id,
            )
            : undefined}
        onDeleteMission={missionEditor.handleDeleteMission}
        onReorderMission={missionEditor.handleMissionReorder}
        onClose={() => {
          missionEditor.clearSelectedMission();
          milestoneEditor.setSelectedMilestone(null);
        }}
      />

      <Toast
        message={saveToast}
        isError={saveToast?.includes("fail") ?? false}
      />

      <SaveTemplateModal
        isOpen={templateLibrary.saveTemplateOpen}
        templateName={templateLibrary.templateName}
        isSaving={templateLibrary.isSavingTemplate}
        existingTemplates={templateLibrary.templates.map((t) => t.name)}
        onNameChange={templateLibrary.setTemplateName}
        onConfirm={(replaceTarget) =>
          void templateLibrary.handleExportTemplate(replaceTarget)}
        onCancel={() => {
          templateLibrary.setSaveTemplateOpen(false);
          templateLibrary.setTemplateName("");
        }}
      />
    </div>
  );
};

export default AdminCockpitPage;
