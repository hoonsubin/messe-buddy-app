import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Milestone, MilestoneProgress } from "../../types/index.ts";
import { USER_ROLE } from "../../types/index.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import { useActiveProfile } from "../../hooks/useActiveProfile.ts";
import { useSession } from "../../hooks/useSession.ts";
import { useGmMilestoneEditor } from "../../hooks/useGmMilestoneEditor.ts";
import { useGmMissionEditor } from "../../hooks/useGmMissionEditor.ts";
import { useProgressGamemaker } from "../../hooks/useProgress/index.ts";
import { useBuddyProfile } from "../../hooks/useBuddyProfile.ts";
import { useResources } from "../../hooks/useResources.ts";
import { usePreBoardingChecklist } from "../../hooks/usePreBoardingChecklist.ts";
import { usePlayerTemplates } from "../../hooks/usePlayerTemplates.ts";
import type { PlayerDetailTabKey } from "./constants.ts";
import {
  readAppliedTemplate,
  writeAppliedTemplate,
} from "./playerDetailStorage.ts";

export const usePlayerDetailPage = () => {
  const { sessionId, playerId: routePlayerId } = useParams<{
    sessionId: string;
    playerId: string;
  }>();
  const homeSid = sessionId ?? "";
  const playerId = routePlayerId ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const identity = useActiveProfile(homeSid, USER_ROLE.GAMEMAKER);

  const [tab, setTab] = useState<PlayerDetailTabKey>(
    searchParams.get("new") === "1" ? "customize" : "analytics",
  );

  const {
    session,
    milestones,
    missions,
    error: sessionError,
    loading: sessionLoading,
    refresh: refreshSession,
    uploadBackground,
    updateMapNodeScale,
  } = useSession(homeSid, { role: "gamemaker", playerId });

  const [scannerOpen, setScannerOpen] = useState(false);
  const milestoneEditor = useGmMilestoneEditor(milestones);
  const missionEditor = useGmMissionEditor(missions);

  const gmProgress = useProgressGamemaker({
    sid: homeSid,
    milestones,
    missions,
    validatorUid: identity?.uid,
  });

  useEffect(() => {
    if (playerId) gmProgress.handlePlayerSelect(playerId);
  }, [playerId, gmProgress.handlePlayerSelect]);

  const buddyProfile = useBuddyProfile(homeSid, playerId, {
    role: "gamemaker",
  });
  const gmResources = useResources(homeSid, {
    role: "gamemaker",
    playerId,
  });
  const preBoardingChecklist = usePreBoardingChecklist(homeSid, session);
  const {
    templates,
    applying: applyingTemplate,
    applyTemplate,
    saveAsTemplate,
  } = usePlayerTemplates(homeSid, playerId);

  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(() =>
    readAppliedTemplate(playerId)
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
          writeAppliedTemplate(playerId, templateName);
          setAppliedTemplate(templateName);
          showToast("Template applied");
        })
        .catch(() => showToast("Could not apply template"));
    },
    [applyTemplate, refreshSession, showToast, playerId],
  );

  const handleAddTemplate = useCallback(
    (name: string) => {
      if (!session) return;
      setCreatingTemplate(true);
      void saveAsTemplate(name, {
        milestones,
        missions,
        resources: gmResources.resources,
      })
        .then(() => {
          writeAppliedTemplate(playerId, name);
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
      gmResources.resources,
      saveAsTemplate,
      playerId,
      showToast,
    ],
  );

  const handleBuddySave = useCallback(() => {
    if (!playerId) return;
    void buddyProfile.upsertBuddy().then(() => showToast("Buddy assigned"));
  }, [playerId, buddyProfile, showToast]);

  // Wrap the editors' raw delete handlers so a failed server-side delete
  // surfaces as a toast instead of an unhandled rejection — the raw
  // handlers only remove local draft state after the adapter call succeeds.
  const handleDeleteMilestone = useCallback(
    (id: string) => {
      void milestoneEditor.handleDeleteMilestone(id)
        .then(() => showToast("Milestone deleted"))
        .catch(() => showToast("Could not delete milestone"));
    },
    [milestoneEditor, showToast],
  );

  const handleDeleteMission = useCallback(
    (missionId: string) => {
      void missionEditor.handleDeleteMission(missionId)
        .then(() => showToast("Mission deleted"))
        .catch(() => showToast("Could not delete mission"));
    },
    [missionEditor, showToast],
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
      await milestoneEditor.saveMilestones(homeSid, milestones, playerId);
      await missionEditor.saveMissions(homeSid, missions, milestones, playerId);
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
    homeSid,
    playerId,
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
      milestones,
      missions,
      resources: gmResources.resources,
    })
      .then(() => showToast(`Updated "${appliedTemplate}" template`))
      .catch(() => showToast("Could not update template"));
  }, [
    appliedTemplate,
    milestones,
    missions,
    gmResources.resources,
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
          sessionId: real?.sessionId ?? homeSid,
          playerId: real?.playerId ?? playerId,
          xpThreshold: real?.xpThreshold ?? 100,
          created: real?.created ?? new Date().toISOString(),
          updated: real?.updated ?? new Date().toISOString(),
        } satisfies Milestone;
      }),
    [milestoneEditor.draftMilestones, milestones, homeSid, playerId],
  );

  useEffect(() => {
    if (sessionError && !sessionLoading) {
      navigate(`/gamemaker/${homeSid}`, { replace: true });
    }
  }, [sessionError, sessionLoading, navigate, homeSid]);

  const playerName = gmProgress.selectedPlayer?.name || session?.name ||
    "Player";
  const playerFirstName = playerName.split(" ")[0] || playerName;
  // If a player has joined we surface their live progress. Before that, fall
  // back to a zero-progress projection so the Journey Map widget's XP totals
  // reflect the player's configured mission XP instead of reading 0/0 (P-16).
  // The player cockpit already does this implicitly because `computeProgress`
  // is always called with a real player id there; here we synthesize the same
  // shape from `missions` + `milestones` alone.
  const milestoneProgress = useMemo<ReadonlyArray<MilestoneProgress>>(() => {
    const real = gmProgress.selectedPlayerProgress?.milestoneProgress;
    if (real && real.length > 0) return real;
    return computeProgress("", missions, milestones, []).milestoneProgress;
  }, [gmProgress.selectedPlayerProgress, missions, milestones]);
  const completedMissionIds =
    gmProgress.selectedPlayerProgress?.completedMissionIds ?? [];
  const startDateISO = gmProgress.selectedPlayer?.startDate ??
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

  // Project unsaved edits into the mission list the sheet renders:
  //   1. filter to the currently-open milestone,
  //   2. drop missions the user has deleted (but not yet saved),
  //   3. apply pending order changes from `missionOrderChanges` so a drag
  //      persists visually until save (C-22, P-01) instead of snapping back.
  // Falling back to `m.order` keeps unmoved missions in their server slot.
  const sheetMissions = useMemo(() => {
    if (!milestoneEditor.selectedMilestone) return [];
    const milestoneId = milestoneEditor.selectedMilestone.id;
    const orderChanges = missionEditor.missionOrderChanges;
    return missions
      .filter((m) => m.milestoneId === milestoneId)
      .filter((m) => !missionEditor.deletedMissionIds.has(m.id))
      .slice()
      .sort((a, b) => {
        const aOrder = orderChanges.get(a.id) ?? a.order;
        const bOrder = orderChanges.get(b.id) ?? b.order;
        return aOrder - bOrder;
      });
  }, [
    missions,
    milestoneEditor.selectedMilestone,
    missionEditor.deletedMissionIds,
    missionEditor.missionOrderChanges,
  ]);

  return {
    homeSid,
    playerId,
    identity,
    tab,
    setTab,
    playerName,
    playerFirstName,
    startDateISO,
    hasMilestones,
    milestones,
    missions,
    milestoneProgress,
    completedMissionIds,
    draftMilestonesAsMilestones,
    bgImageUrl: session?.bgImageUrl ?? "",
    mapNodeScale: session?.mapNodeScale ?? 1,
    uploadBackground,
    updateMapNodeScale,
    gmProgress,
    buddyProfile,
    gmResources,
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
    handleDeleteMilestone,
    handleDeleteMission,
    handleSave,
    handleSaveToTemplate,
    handleDiscard,
    openMilestone,
    closeMilestoneEditor,
    sheetMissions,
    navigate,
  };
};

export type PlayerDetailPageModel = ReturnType<typeof usePlayerDetailPage>;
