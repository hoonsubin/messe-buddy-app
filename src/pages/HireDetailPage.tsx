import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MdArrowBack,
  MdExpandLess,
  MdExpandMore,
  MdPersonAdd,
  MdQrCodeScanner,
} from "react-icons/md";
import type { Milestone } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { useSession } from "../hooks/useSession.ts";
import { useAdminMilestoneEditor } from "../hooks/useAdminMilestoneEditor.ts";
import { useAdminMissionEditor } from "../hooks/useAdminMissionEditor.ts";
import { useProgressAdmin } from "../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../hooks/useBuddyProfile.ts";
import { useResources } from "../hooks/useResources.ts";
import { usePreBoardingChecklist } from "../hooks/usePreBoardingChecklist.ts";
import { useHireTemplates } from "../hooks/useHireTemplates.ts";
import Toast from "../components/shared/Toast.tsx";
import TopBar from "../components/shared/TopBar.tsx";
import ConfirmDialog from "../components/shared/ConfirmDialog.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";
import TemplateSelect from "../components/admin/TemplateSelect.tsx";
import IsometricMilestoneMap from "../components/player/IsometricMilestoneMap.tsx";
import MissionBottomSheet from "../components/admin/MissionBottomSheet.tsx";
import PendingApprovalsPanel from "../components/admin/PendingApprovalsPanel.tsx";
import BuddyAssignmentForm from "../components/admin/BuddyAssignmentForm.tsx";
import ResourcesEditor from "../components/admin/ResourcesEditor.tsx";
import PreBoardingChecklist from "../components/admin/PreBoardingChecklist.tsx";
import SessionInviteCard from "../components/admin/SessionInviteCard.tsx";
import AdminQRScannerModal from "../components/admin/AdminQRScannerModal.tsx";
import HireAnalytics from "../components/admin/HireAnalytics.tsx";
import MilestoneGrid from "../components/admin/MilestoneGrid.tsx";

const TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "customize", label: "Customize" },
  { key: "buddy", label: "Assign Buddy" },
  { key: "preboarding", label: "Pre-boarding" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Which template a hire's onboarding was built from (frontend-only, per device).
const tplKey = (sid: string) => `mb_hire_template_${sid}`;
const readAppliedTemplate = (sid: string): string | null => {
  try {
    return localStorage.getItem(tplKey(sid));
  } catch {
    return null;
  }
};
const writeAppliedTemplate = (sid: string, name: string): void => {
  try {
    localStorage.setItem(tplKey(sid), name);
  } catch {
    /* ignore */
  }
};

const Section = (
  { title, children }: {
    readonly title: string;
    readonly children: React.ReactNode;
  },
) => (
  <section>
    <h2 className="section-label">{title}</h2>
    {children}
  </section>
);

const HireDetailPage = () => {
  const { sessionId, hireId } = useParams<{
    sessionId: string;
    hireId: string;
  }>();
  const homeSid = sessionId ?? "";
  const sid = hireId ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const identity = useActiveProfile(homeSid, USER_ROLE.GAMEMAKER);

  // Newly added hires land on Customize (their dashboard is empty).
  const [tab, setTab] = useState<TabKey>(
    searchParams.get("new") === "1" ? "customize" : "analytics",
  );

  const {
    session,
    milestones,
    missions,
    error: sessionError,
    loading: sessionLoading,
    refresh: refreshSession,
  } = useSession(sid, { role: "gamemaker" });

  const [scannerOpen, setScannerOpen] = useState(false);

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
  const {
    templates,
    applying: applyingTemplate,
    applyTemplate,
    saveAsTemplate,
  } = useHireTemplates(sid);

  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(() =>
    readAppliedTemplate(sid)
  );
  const [showTemplateSavePrompt, setShowTemplateSavePrompt] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleUseTemplate = useCallback(
    (templateName: string) => {
      void applyTemplate(templateName)
        .then(() => {
          refreshSession();
          writeAppliedTemplate(sid, templateName);
          setAppliedTemplate(templateName);
          showToast("Template applied");
        })
        .catch(() => showToast("Could not apply template"));
    },
    [applyTemplate, refreshSession, showToast, sid],
  );

  const handleAddTemplate = useCallback(
    (name: string) => {
      if (!session) return;
      setCreatingTemplate(true);
      void saveAsTemplate(name, {
        session,
        milestones,
        missions,
        resources: adminResources.resources,
      })
        .then(() => {
          writeAppliedTemplate(sid, name);
          setAppliedTemplate(name);
          setShowAddTemplate(false);
          showToast(`Created "${name}" template`);
        })
        .catch(() => showToast("Could not create template"))
        .finally(() => setCreatingTemplate(false));
    },
    [
      session,
      milestones,
      missions,
      adminResources.resources,
      saveAsTemplate,
      sid,
      showToast,
    ],
  );

  const handleBuddySave = useCallback(() => {
    if (!adminProgress.selectedPlayerId) return;
    void buddyProfile.upsertBuddy().then(() => showToast("Buddy assigned"));
  }, [adminProgress.selectedPlayerId, buddyProfile, showToast]);

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
      await milestoneEditor.saveMilestones(sid, milestones);
      await missionEditor.saveMissions(sid, missions, missionEditor.xpPreview);
      milestoneEditor.clearDirtyMilestones();
      missionEditor.clearDirtyMissions();
      missionEditor.clearOrderChanges();
      refreshSession();
      showToast("Changes saved");
      // Offer to push the change back to the template it was built from.
      if (appliedTemplate) setShowTemplateSavePrompt(true);
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
    appliedTemplate,
  ]);

  const handleSaveToTemplate = useCallback(() => {
    setShowTemplateSavePrompt(false);
    if (!appliedTemplate || !session) return;
    void saveAsTemplate(appliedTemplate, {
      session,
      milestones,
      missions,
      resources: adminResources.resources,
    })
      .then(() => showToast(`Updated "${appliedTemplate}" template`))
      .catch(() => showToast("Could not update template"));
  }, [
    appliedTemplate,
    session,
    milestones,
    missions,
    adminResources.resources,
    saveAsTemplate,
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

  useEffect(() => {
    if (sessionError && !sessionLoading) {
      navigate(`/admin/${homeSid}`, { replace: true });
    }
  }, [sessionError, sessionLoading, navigate, homeSid]);

  const hireName = adminProgress.selectedPlayer?.name || session?.name ||
    "New hire";
  const hireFirstName = hireName.split(" ")[0] || hireName;
  const milestoneProgress =
    adminProgress.selectedPlayerProgress?.milestoneProgress ?? [];
  const completedMissionIds =
    adminProgress.selectedPlayerProgress?.completedMissionIds ?? [];
  const startDateISO = adminProgress.selectedPlayer?.startDate ??
    session?.created;
  const hasMilestones = milestones.length > 0;

  const openMilestone = useCallback(
    (id: string) => {
      missionEditor.clearSelectedMission();
      milestoneEditor.setSelectedMilestone(
        draftMilestonesAsMilestones.find((m) => m.id === id) ?? null,
      );
    },
    [missionEditor, milestoneEditor, draftMilestonesAsMilestones],
  );

  const invite = (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        data-testid="invite-toggle"
        aria-expanded={inviteOpen}
        onClick={() =>
          setInviteOpen((o) =>
            !o
          )}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <MdPersonAdd
          size={22}
          aria-hidden="true"
          style={{ color: "hsl(var(--color-accent))", flexShrink: 0 }}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-fg))",
            }}
          >
            Send {hireFirstName} their onboarding link
          </span>
          <span
            style={{
              display: "block",
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            {hireFirstName}{" "}
            can start their onboarding straight away by using this link.
          </span>
        </span>
        {inviteOpen
          ? (
            <MdExpandLess
              size={20}
              aria-hidden="true"
              style={{ flexShrink: 0, color: "hsl(var(--color-muted-fg))" }}
            />
          )
          : (
            <MdExpandMore
              size={20}
              aria-hidden="true"
              style={{ flexShrink: 0, color: "hsl(var(--color-muted-fg))" }}
            />
          )}
      </button>
      {inviteOpen && (
        <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
          <SessionInviteCard sessionId={sid} compact bare />
        </div>
      )}
    </div>
  );

  return (
    <div
      data-testid="hire-detail-page"
      data-page="hire-detail"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        paddingTop: "var(--topbar-h)",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={identity?.name ?? "Game Master"}
        role="Game Master"
      />

      {/* Header: back · centred hire title · scan */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-2)",
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
            flexShrink: 0,
          }}
          onClick={() => navigate(`/admin/${homeSid}`)}
        >
          <MdArrowBack size={16} />
          <span className="hire-header__back-label">All new hires</span>
        </button>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            paddingInline: "var(--space-2)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              lineHeight: "var(--leading-tight)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hireName}'s Onboarding Process
          </div>
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            flexShrink: 0,
          }}
          onClick={() => setScannerOpen(true)}
        >
          <MdQrCodeScanner size={16} />
          <span className="hire-header__scan-label">Scan QR</span>
        </button>
      </div>

      {/* Tabs */}
      <nav
        aria-label="Hire views"
        style={{
          display: "flex",
          flexShrink: 0,
          justifyContent: "center",
          overflowX: "auto",
          scrollbarWidth: "none",
          background: "hsl(var(--color-card))",
          borderBottom: "1px solid hsl(var(--color-border))",
          paddingInline: "var(--space-2)",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                flexShrink: 0,
                padding: "var(--space-3) var(--space-4)",
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? "2px solid hsl(var(--color-primary))"
                  : "2px solid transparent",
                color: active
                  ? "hsl(var(--color-primary))"
                  : "hsl(var(--color-muted-fg))",
                fontSize: "var(--text-sm)",
                fontWeight: active
                  ? "var(--weight-semibold)"
                  : "var(--weight-medium)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: "var(--min-touch)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ── Analytics ──────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: "60rem",
            marginInline: "auto",
            padding: "var(--space-6) var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <HireAnalytics
            {...(startDateISO !== undefined && { startDateISO })}
            firstName={hireFirstName}
            milestones={milestones}
            missions={missions}
            events={adminProgress.selectedPlayerEvents}
          />

          {adminProgress.pendingEvents.length > 0 && (
            <Section title="Pending approvals">
              <PendingApprovalsPanel
                pendingEvents={adminProgress.pendingEvents}
                players={adminProgress.players}
                missions={missions}
                onApprove={(playerId, missionId) =>
                  void adminProgress.handleApprove(playerId, missionId)}
                onReject={(playerId, missionId) =>
                  void adminProgress.handleReject(playerId, missionId)}
              />
            </Section>
          )}

          <div
            className="card"
            style={{ padding: "var(--space-4) var(--space-5)" }}
          >
            <header style={{ marginBottom: "var(--space-3)" }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--weight-semibold)",
                  color: "hsl(var(--color-fg))",
                }}
              >
                {hireFirstName}'s Journey Map
              </h3>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "var(--text-xs)",
                  color: "hsl(var(--color-muted-fg))",
                }}
              >
                Quick access for mission edits
              </p>
            </header>
            {hasMilestones
              ? (
                <div
                  style={{
                    width: "100%",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <IsometricMilestoneMap
                    milestones={draftMilestonesAsMilestones}
                    milestoneProgress={milestoneProgress}
                    onMilestoneClick={openMilestone}
                  />
                </div>
              )
              : (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-muted-fg))",
                    textAlign: "center",
                    margin: 0,
                  }}
                >
                  No milestones yet — set up this hire's journey in the
                  Customize tab.
                </p>
              )}
          </div>

          {invite}
        </main>
      )}

      {/* ── Customize ──────────────────────────────────────────────────────── */}
      {tab === "customize" && (
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: "60rem",
            marginInline: "auto",
            padding: "var(--space-6) var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <Section title="Onboarding template">
            <TemplateSelect
              templates={templates}
              appliedName={appliedTemplate}
              applying={applyingTemplate}
              onSelect={handleUseTemplate}
              onAddNew={() => setShowAddTemplate(true)}
            />
          </Section>

          <Section title="Milestones & Missions">
            <MilestoneGrid
              milestones={draftMilestonesAsMilestones}
              missions={missions}
              completedMissionIds={completedMissionIds}
              onSelect={openMilestone}
            />
          </Section>

          <Section title="Resources">
            <ResourcesEditor
              resources={adminResources.resources}
              sessionId={sid}
              onAdd={(data) => void adminResources.addResource(data)}
              onUpdate={(id, patch) =>
                void adminResources.updateResource(id, patch)}
              onDelete={(id) => void adminResources.deleteResource(id)}
              onToggleVisibility={(id, visible) =>
                void adminResources.toggleVisibility(id, visible)}
            />
          </Section>

          {invite}
        </main>
      )}

      {/* ── Assign Buddy ───────────────────────────────────────────────────── */}
      {tab === "buddy" && (
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: "40rem",
            marginInline: "auto",
            padding: "var(--space-6) var(--space-4)",
          }}
        >
          <BuddyAssignmentForm
            players={adminProgress.players}
            draft={buddyProfile.buddyDraft}
            selectedPlayerId={adminProgress.selectedPlayerId}
            onPlayerChange={adminProgress.handlePlayerSelect}
            onDraftChange={buddyProfile.setBuddyDraft}
            onSave={handleBuddySave}
            showPlayerSelect={false}
          />
        </main>
      )}

      {/* ── Pre-boarding checklist ──────────────────────────────────────────── */}
      {tab === "preboarding" && (
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: "40rem",
            marginInline: "auto",
            padding: "var(--space-6) var(--space-4)",
          }}
        >
          <PreBoardingChecklist
            playerName={hireFirstName}
            items={preBoardingChecklist.items}
            onToggle={preBoardingChecklist.onToggle}
            onAdd={preBoardingChecklist.onAdd}
            onMarkAllDone={preBoardingChecklist.onMarkAllDone}
          />
        </main>
      )}

      <MissionBottomSheet
        isOpen={milestoneEditor.selectedMilestone !== null}
        milestone={milestoneEditor.selectedMilestone}
        missions={milestoneEditor.selectedMilestone
          ? missions
            .filter((m) =>
              m.milestoneId === milestoneEditor.selectedMilestone!.id
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

      <AdminQRScannerModal
        isOpen={scannerOpen}
        sessionId={sid}
        onClose={() => setScannerOpen(false)}
      />

      {showAddTemplate && (
        <NameCaptureModal
          title="New template"
          description="Save this hire's current milestones & missions as a reusable template."
          placeholder="e.g. Engineering Onboarding"
          submitLabel="Create template"
          inputLabel="Template name"
          loading={creatingTemplate}
          onSubmit={handleAddTemplate}
          onCancel={() => setShowAddTemplate(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showTemplateSavePrompt}
        title="Update template too?"
        body={appliedTemplate
          ? `Changes are saved for ${hireFirstName}. Also save them to the "${appliedTemplate}" template so future hires get them?`
          : ""}
        confirmLabel="Update template"
        cancelLabel="Just this hire"
        onConfirm={handleSaveToTemplate}
        onCancel={() => setShowTemplateSavePrompt(false)}
      />

      <Toast message={toast} isError={toast?.includes("fail") ?? false} />
    </div>
  );
};

export default HireDetailPage;
