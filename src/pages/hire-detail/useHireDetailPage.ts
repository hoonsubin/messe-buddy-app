import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Milestone } from "../../types/index.ts";
import { USER_ROLE } from "../../types/index.ts";
import { useActiveProfile } from "../../hooks/useActiveProfile.ts";
import { useSession } from "../../hooks/useSession.ts";
import { useAdminMilestoneEditor } from "../../hooks/useAdminMilestoneEditor.ts";
import { useAdminMissionEditor } from "../../hooks/useAdminMissionEditor.ts";
import { useProgressAdmin } from "../../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../../hooks/useBuddyProfile.ts";
import { useResources } from "../../hooks/useResources.ts";
import { usePreBoardingChecklist } from "../../hooks/usePreBoardingChecklist.ts";
import { useHireTemplates } from "../../hooks/useHireTemplates.ts";
import type { HireDetailTabKey } from "./constants.ts";
import {
  readAppliedTemplate,
  writeAppliedTemplate,
} from "./hireDetailStorage.ts";

export const useHireDetailPage = () => {
  const { sessionId, hireId } = useParams<{
    sessionId: string;
    hireId: string;
  }>();
  const homeSid = sessionId ?? "";
  const sid = hireId ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const identity = useActiveProfile(homeSid, USER_ROLE.GAMEMAKER);

  const [tab, setTab] = useState<HireDetailTabKey>(
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

  const closeMilestoneEditor = useCallback(() => {
    missionEditor.clearSelectedMission();
    milestoneEditor.setSelectedMilestone(null);
  }, [missionEditor, milestoneEditor]);

  const sheetMissions = milestoneEditor.selectedMilestone
    ? missions
      .filter((m) => m.milestoneId === milestoneEditor.selectedMilestone!.id)
      .filter((m) => !missionEditor.deletedMissionIds.has(m.id))
    : [];

  return {
    homeSid,
    sid,
    identity,
    tab,
    setTab,
    hireName,
    hireFirstName,
    startDateISO,
    hasMilestones,
    milestones,
    missions,
    milestoneProgress,
    completedMissionIds,
    draftMilestonesAsMilestones,
    adminProgress,
    buddyProfile,
    adminResources,
    preBoardingChecklist,
    templates,
    appliedTemplate,
    applyingTemplate,
    milestoneEditor,
    missionEditor,
    isDirty,
    isSaving,
    scannerOpen,
    setScannerOpen,
    showAddTemplate,
    setShowAddTemplate,
    creatingTemplate,
    showTemplateSavePrompt,
    setShowTemplateSavePrompt,
    toast,
    handleUseTemplate,
    handleAddTemplate,
    handleBuddySave,
    handleSave,
    handleSaveToTemplate,
    handleDiscard,
    openMilestone,
    closeMilestoneEditor,
    sheetMissions,
    navigate,
  };
};

export type HireDetailPageModel = ReturnType<typeof useHireDetailPage>;
