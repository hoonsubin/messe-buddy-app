import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdAttachment, MdLayers } from "react-icons/md";
// MdArrowBack used for in-app sub-navigation only; logout is handled by TopBar
import type { Milestone, PreBoardingCheckItem } from "../types/index.ts";
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
import { useTemplateLibrary } from "../hooks/useTemplateLibrary.ts";
import Toast from "../components/shared/Toast.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import ProfileEditSheet from "../components/shared/ProfileEditSheet.tsx";
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
import ConfirmSheet from "../components/admin/ConfirmSheet.tsx";
import CrossHireDashboard from "../components/admin/CrossHireDashboard.tsx";
import AdminQRScannerModal from "../components/admin/AdminQRScannerModal.tsx";
import SessionInviteCard from "../components/admin/SessionInviteCard.tsx";
import HireDetailView from "../components/admin/HireDetailView.tsx";
import { DEFAULT_CHECKLIST } from "../components/admin/HireChecklist.tsx";

// ── View state ─────────────────────────────────────────────────────────────────
// 'list'  = hire list root (program management strip + hire rows)
// 'detail' = per-hire detail (map viewer, panels, checklist)
// 'setup' = session setup (map editor, templates, resources)

type AdminView = "list" | "detail" | "setup";

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

  // ── Navigation state ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<AdminView>("list");
  const [selectedHireId, setSelectedHireId] = useState<string | null>(null);
  const [pendingViewSwitch, setPendingViewSwitch] = useState<AdminView | null>(
    null,
  );

  // Per-hire checklist: Record<playerId, items[]> — ephemeral for prototype
  const [hireChecklists, setHireChecklists] = useState<
    Record<string, ReadonlyArray<PreBoardingCheckItem>>
  >({});

  // Keep-mounted pattern for setup view (preserve unsaved map edits)
  const hasVisitedSetup = useRef(false);
  if (viewMode === "setup") {
    hasVisitedSetup.current = true;
  }

  const [scannerOpen, setScannerOpen] = useState(false);

  // ── GM profile ───────────────────────────────────────────────────────────────
  // Session-scoped override: null means "use session.name", string means GM edited
  const [gmDisplayNameOverride, setGmDisplayNameOverride] = useState<string | null>(null);
  const gmDisplayName = gmDisplayNameOverride ?? session?.name ?? "Game Master";
  const [isGMProfileEditOpen, setIsGMProfileEditOpen] = useState(false);

  const handleAdminAvatarClick = useCallback(() => {
    setIsGMProfileEditOpen(true);
  }, []);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mapCollapsed = useScrollCollapse(sidebarRef, viewMode);

  // ── Hooks ────────────────────────────────────────────────────────────────────
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

  const crossHire = useProgressCrossHire({
    active: viewMode === "list" || viewMode === "detail",
  });

  const templateLibrary = useTemplateLibrary({
    sid,
    active: viewMode === "setup",
    session,
    milestones,
    missions,
    resources: adminResources.resources,
    gmUid: identity?.uid,
  });

  // ── Derived state ────────────────────────────────────────────────────────────
  const pendingCountByPlayer = useMemo<Record<string, number>>(
    () =>
      adminProgress.pendingEvents.reduce<Record<string, number>>((acc, e) => {
        acc[e.playerId] = (acc[e.playerId] ?? 0) + 1;
        return acc;
      }, {}),
    [adminProgress.pendingEvents],
  );

  const pendingForSelectedHire = useMemo(
    () =>
      selectedHireId
        ? adminProgress.pendingEvents.filter((e) =>
          e.playerId === selectedHireId
        )
        : [],
    [adminProgress.pendingEvents, selectedHireId],
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

  // ── Navigation handlers ──────────────────────────────────────────────────────

  const handleSelectHire = useCallback(
    (playerId: string) => {
      adminProgress.handlePlayerSelect(playerId);
      setSelectedHireId(playerId);
      // Initialise checklist with defaults on first visit for this hire
      setHireChecklists((prev) => {
        if (prev[playerId]) return prev;
        return {
          ...prev,
          [playerId]: DEFAULT_CHECKLIST as ReadonlyArray<PreBoardingCheckItem>,
        };
      });
      setViewMode("detail");
    },
    [adminProgress],
  );

  const handleNavigateToSetup = useCallback(() => {
    setViewMode("setup");
  }, []);

  const handleViewChange = useCallback(
    (target: AdminView) => {
      if (isDirty && viewMode === "setup" && target !== "setup") {
        setPendingViewSwitch(target);
      } else {
        if (target === "list") setSelectedHireId(null);
        setViewMode(target);
      }
    },
    [isDirty, viewMode],
  );

  const getChecklist = useCallback(
    (playerId: string): ReadonlyArray<PreBoardingCheckItem> =>
      hireChecklists[playerId] ??
        (DEFAULT_CHECKLIST as ReadonlyArray<PreBoardingCheckItem>),
    [hireChecklists],
  );

  const handleChecklistToggle = useCallback(
    (playerId: string, itemId: string) => {
      setHireChecklists((prev) => {
        const items = prev[playerId] ??
          (DEFAULT_CHECKLIST as ReadonlyArray<PreBoardingCheckItem>);
        return {
          ...prev,
          [playerId]: items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      });
    },
    [],
  );

  const handleChecklistRename = useCallback(
    (playerId: string, itemId: string, newLabel: string) => {
      setHireChecklists((prev) => ({
        ...prev,
        [playerId]: getChecklist(playerId).map((item) =>
          item.id === itemId ? { ...item, label: newLabel } : item
        ),
      }));
    },
    [getChecklist],
  );

  const handleChecklistDelete = useCallback(
    (playerId: string, itemId: string) => {
      setHireChecklists((prev) => ({
        ...prev,
        [playerId]: getChecklist(playerId).filter((item) => item.id !== itemId),
      }));
    },
    [getChecklist],
  );

  const handleChecklistAdd = useCallback(
    (playerId: string, label: string) => {
      const newItem: PreBoardingCheckItem = {
        id: `chk_custom_${Date.now()}`,
        label,
        checked: false,
      };
      setHireChecklists((prev) => ({
        ...prev,
        [playerId]: [...getChecklist(playerId), newItem],
      }));
    },
    [getChecklist],
  );

  const handleChecklistReorder = useCallback(
    (playerId: string, fromIndex: number, toIndex: number) => {
      setHireChecklists((prev) => {
        const items = [...getChecklist(playerId)];
        const [moved] = items.splice(fromIndex, 1);
        if (moved === undefined) return prev;
        items.splice(toIndex, 0, moved);
        return { ...prev, [playerId]: items };
      });
    },
    [getChecklist],
  );

  // ── Save / discard ───────────────────────────────────────────────────────────
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await milestoneEditor.saveMilestones(sid, milestones);
      await missionEditor.saveMissions(sid, missions, missionEditor.xpPreview);
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

  // ── Error redirect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionError && !sessionLoading) {
      sessionStorage.setItem("mb_landing_toast", "Session does not exist.");
      navigate("/", { replace: true });
    }
  }, [sessionError, sessionLoading, navigate]);

  if (sessionError && !sessionLoading) return null;

  // ── Render ───────────────────────────────────────────────────────────────────
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
        playerName={gmDisplayName}
        totalXP={0}
        role="Game Master"
        onAvatarClick={handleAdminAvatarClick}
        onLogout={() => {
          if (identity && !identity.isDemo) {
            removeProfile(identity.uid);
          }
          navigate("/", { replace: true });
        }}
      />

      <ProfileEditSheet
        isOpen={isGMProfileEditOpen}
        variant="gm"
        initialValues={{ name: gmDisplayName }}
        onSave={async (fields) => {
          setGmDisplayNameOverride(fields.name);
        }}
        onClose={() => setIsGMProfileEditOpen(false)}
      />

      {/* ── HIRE LIST VIEW ─────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <main
          style={{
            flex: 1,
            maxWidth: "48rem",
            marginInline: "auto",
            width: "100%",
          }}
        >
          {/* Program management strip */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid hsl(var(--color-border))",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "hsl(var(--color-muted-fg))",
                marginBottom: "var(--space-2)",
              }}
            >
              Program management
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                type="button"
                data-testid="templates-btn"
                onClick={handleNavigateToSetup}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-3)",
                  background: "hsl(var(--color-card))",
                  border: "1px solid hsl(var(--color-border))",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: "var(--min-touch)",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "var(--radius)",
                    background: "hsl(var(--color-accent) / 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdLayers
                    size={16}
                    style={{ color: "hsl(var(--color-accent))" }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--weight-semibold)",
                      color: "hsl(var(--color-fg))",
                    }}
                  >
                    Templates
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "hsl(var(--color-muted-fg))",
                    }}
                  >
                    {templateLibrary.templates.length} template
                    {templateLibrary.templates.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>

              <button
                type="button"
                data-testid="resources-btn"
                onClick={handleNavigateToSetup}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-3)",
                  background: "hsl(var(--color-card))",
                  border: "1px solid hsl(var(--color-border))",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: "var(--min-touch)",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "var(--radius)",
                    background: "hsl(var(--color-status-complete) / 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdAttachment
                    size={16}
                    style={{ color: "hsl(var(--color-status-complete))" }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--weight-semibold)",
                      color: "hsl(var(--color-fg))",
                    }}
                  >
                    Resources
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "hsl(var(--color-muted-fg))",
                    }}
                  >
                    {adminResources.resources.length} document
                    {adminResources.resources.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Hire list */}
          <CrossHireDashboard
            hires={crossHire.rows}
            pendingCountByPlayer={pendingCountByPlayer}
            onSelectHire={handleSelectHire}
          />
        </main>
      )}

      {/* ── HIRE DETAIL VIEW ───────────────────────────────────────────────── */}
      {viewMode === "detail" && selectedHireId &&
        adminProgress.selectedPlayer && (
        <HireDetailView
          player={adminProgress.selectedPlayer}
          allPlayers={adminProgress.players}
          playerProgress={adminProgress.selectedPlayerProgress}
          pendingEvents={pendingForSelectedHire}
          milestones={milestones}
          missions={missions}
          bgImageUrl={bgImageUrl}
          mapNodeScale={session?.mapNodeScale ?? 1}
          buddyDraft={buddyProfile.buddyDraft}
          checklistItems={hireChecklists[selectedHireId] ??
            (DEFAULT_CHECKLIST as ReadonlyArray<PreBoardingCheckItem>)}
          onBack={() => handleViewChange("list")}
          onConfigureSession={handleNavigateToSetup}
          onApprove={(missionId) =>
            void adminProgress.handleApprove(selectedHireId, missionId)}
          onReject={(missionId) =>
            void adminProgress.handleReject(selectedHireId, missionId)}
          onChecklistToggle={(itemId) =>
            handleChecklistToggle(selectedHireId, itemId)}
          onChecklistRename={(itemId, newLabel) =>
            handleChecklistRename(selectedHireId, itemId, newLabel)}
          onChecklistDelete={(itemId) =>
            handleChecklistDelete(selectedHireId, itemId)}
          onChecklistAdd={(label) => handleChecklistAdd(selectedHireId, label)}
          onChecklistReorder={(from, to) =>
            handleChecklistReorder(selectedHireId, from, to)}
          onBuddyDraftChange={buddyProfile.setBuddyDraft}
          onBuddySave={handleBuddySave}
        />
      )}

      {/* ── SESSION SETUP VIEW ────────────────────────────────────────────── */}
      {viewMode === "setup" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "var(--space-2) var(--space-4)",
            background: "hsl(var(--color-card))",
            borderBottom: "1px solid hsl(var(--color-border))",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => handleViewChange("list")}
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <MdArrowBack size={16} />
            Hire list
          </button>
        </div>
      )}

      {/* Player context bar — shown in setup view when a hire is selected */}
      {viewMode === "setup" && selectedHireId && (() => {
        const ctxPlayer = adminProgress.players.find(
          (p) => p.id === selectedHireId,
        );
        return ctxPlayer
          ? (
            <div
              data-testid="player-context-bar"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) var(--space-4)",
                background: "hsl(var(--color-accent) / 0.08)",
                borderBottom: "1px solid hsl(var(--color-accent) / 0.2)",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-fg))",
                minHeight: "var(--min-touch)",
              }}
            >
              <span>
                Viewing: <strong>{ctxPlayer.name}</strong>
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                aria-label="Clear player context"
                onClick={() => setSelectedHireId(null)}
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "var(--space-1) var(--space-2)",
                }}
              >
                Clear
              </button>
            </div>
          )
          : null;
      })()}

      {/* Keep-mounted setup main: mounts on first visit, hidden when inactive */}
      {hasVisitedSetup.current && (
        <main
          className="admin-layout"
          data-testid="session-setup-main"
          data-map-collapsed={mapCollapsed ? "true" : undefined}
          style={{
            flex: 1,
            display: viewMode === "setup" ? "grid" : "none",
          }}
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
                onSelect={adminProgress.handlePlayerSelect}
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
              onPlayerChange={adminProgress.handlePlayerSelect}
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

      {/* ── DIRTY NAVIGATION GUARD ────────────────────────────────────────── */}
      {pendingViewSwitch !== null && (
        <div
          data-testid="dirty-nav-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "hsl(var(--color-overlay, 0 0% 0% / 0.5))",
          }}
        >
          <ConfirmSheet
            onKeepEditing={() => setPendingViewSwitch(null)}
            onSaveDraft={() => {
              const target = pendingViewSwitch;
              setPendingViewSwitch(null);
              void handleSave().then(() => {
                if (target === "list") setSelectedHireId(null);
                setViewMode(target);
              });
            }}
            onDiscardAndClose={() => {
              const target = pendingViewSwitch;
              setPendingViewSwitch(null);
              handleDiscard();
              if (target === "list") setSelectedHireId(null);
              setViewMode(target);
            }}
          />
        </div>
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
