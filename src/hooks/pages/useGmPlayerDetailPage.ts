import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  FormSchema,
  Milestone,
  MilestoneProgress,
  PBRecord,
  PreBoardingCheckItem,
  Resource,
  Session,
} from "../../types/index.ts";
import { MISSION_TYPE, USER_ROLE } from "../../types/index.ts";
import {
  type BuddyProfileDraft,
  emptyBuddyProfileDraft,
} from "../../types/buddyPicker.ts";
import type { AddResourceInput } from "../../types/resourceInputs.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import { useActiveProfile } from "../useActiveProfile.ts";
import { useGmMilestoneEditor } from "../useGmMilestoneEditor.ts";
import { useGmMissionEditor } from "../useGmMissionEditor.ts";
import { useGmProgressView } from "../useGmProgressView.ts";
import { useStaleSessionRedirect } from "../useStaleSessionRedirect.ts";
import { useQuery } from "../useQuery.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { devBackendTrace } from "../../store/devBackendTrace.ts";
import {
  fetchBuddy,
  fetchJourney,
  fetchLibraryResources,
  fetchPlayerById,
  fetchPlayerResources,
  fetchSessionMeta,
  fetchTemplates,
} from "../../store/queryFetchers.ts";
import { queryKeys } from "../../store/queryKeys.ts";
import { useQueryClient } from "../../store/useQueryClient.ts";
import { applyTemplateToPlayer } from "../../use-cases/applyTemplateToPlayer.ts";
import { exportTemplate } from "../../use-cases/exportTemplate.ts";
import {
  ensureUniqueResourceKey,
  generateResourceKey,
} from "../../utils/resourceKey.ts";
import { makeId } from "../../utils/id.ts";
import type { PlayerDetailTabKey } from "../../components/gamemaker/player-detail/constants.ts";
import {
  readAppliedTemplate,
  writeAppliedTemplate,
} from "../../utils/playerDetailStorage.ts";
import {
  parsePlayerDetailTab,
  playerDetailScanPath,
  playerDetailTabPath,
} from "../../utils/routeTabs.ts";

type PlayerDetailNavState = {
  readonly inviteToken?: string;
};

export const useGmPlayerDetailPage = () => {
  const { sessionId, playerId: routePlayerId } = useParams<{
    sessionId: string;
    playerId: string;
  }>();
  const homeSid = sessionId ?? "";
  const playerId = routePlayerId ?? "";
  const navigate = useNavigate();
  const location = useLocation();
  const navInviteToken =
    (location.state as PlayerDetailNavState | null)?.inviteToken ?? "";
  const identity = useActiveProfile(homeSid, USER_ROLE.GAMEMAKER);
  const adapter = useAdapter();
  const client = useQueryClient();

  const routeTab = parsePlayerDetailTab(location.pathname);
  const isScanMode = routeTab === "scan";
  const tab: PlayerDetailTabKey = routeTab === "scan" ? "customize" : routeTab;

  const setTab = useCallback(
    (key: PlayerDetailTabKey) => {
      navigate(playerDetailTabPath(homeSid, playerId, key));
    },
    [navigate, homeSid, playerId],
  );

  const openScanner = useCallback(() => {
    navigate(playerDetailScanPath(homeSid, playerId));
  }, [navigate, homeSid, playerId]);

  const closeScanner = useCallback(() => {
    navigate(playerDetailTabPath(homeSid, playerId, tab));
  }, [navigate, homeSid, playerId, tab]);

  useEffect(() => {
    if (homeSid) devBackendTrace.setActiveScope(homeSid);
  }, [homeSid]);

  const sessionMeta = useQuery(
    homeSid ? queryKeys.sessionMeta(homeSid) : null,
    fetchSessionMeta(homeSid),
    { enabled: !!homeSid },
  );

  const journey = useQuery(
    homeSid && playerId ? queryKeys.journey(homeSid, playerId) : null,
    fetchJourney(homeSid, playerId),
    { enabled: !!homeSid && !!playerId },
  );

  const session = sessionMeta.data ?? null;
  const milestones = journey.data?.milestones ?? [];
  const missions = journey.data?.missions ?? [];
  const sessionLoading = sessionMeta.isInitialLoading ||
    journey.isInitialLoading;
  const sessionMissing = !sessionMeta.isInitialLoading && !!sessionMeta.error;
  const sessionError = sessionMeta.error ?? journey.error;

  useStaleSessionRedirect(sessionMissing, identity?.uid);

  const refreshSession = useCallback(() => {
    client.invalidateQuery([
      queryKeys.sessionMeta(homeSid),
      queryKeys.journey(homeSid, playerId),
      queryKeys.gmRoster(homeSid),
    ]);
  }, [client, homeSid, playerId]);

  const updateSession = useCallback(
    async (
      patch: Partial<Omit<Session, keyof PBRecord | "bgImageUrl">> & {
        readonly bgImageUrl?: string | File;
      },
    ) => {
      const updated = await adapter.updateSession(homeSid, patch);
      client.patchQuery(queryKeys.sessionMeta(homeSid), () => updated);
      return updated;
    },
    [adapter, client, homeSid],
  );

  const uploadBackground = useCallback(
    async (file: File) => {
      const updated = await updateSession({ bgImageUrl: file });
      return { displayUrl: updated.bgImageUrl };
    },
    [updateSession],
  );

  const updateMapNodeScale = useCallback(
    async (scale: number) => {
      await updateSession({ mapNodeScale: scale });
    },
    [updateSession],
  );

  const milestoneEditor = useGmMilestoneEditor(milestones);
  const missionEditor = useGmMissionEditor(missions);

  const gmProgress = useGmProgressView(
    homeSid,
    playerId,
    milestones,
    missions,
    identity?.uid,
  );

  useEffect(() => {
    if (playerId) gmProgress.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, gmProgress.refresh]);

  const playerQuery = useQuery(
    playerId ? queryKeys.playerId(playerId) : null,
    fetchPlayerById(playerId),
    { enabled: !!playerId },
  );

  const inviteToken = useMemo(() => {
    const fromList = gmProgress.selectedPlayer?.inviteToken ?? "";
    if (fromList.length >= 8) return fromList;
    const fetched = playerQuery.data?.inviteToken ?? "";
    if (fetched.length >= 8) return fetched;
    if (navInviteToken.length >= 8) return navInviteToken;
    return fromList || fetched || navInviteToken;
  }, [
    gmProgress.selectedPlayer?.inviteToken,
    navInviteToken,
    playerQuery.data?.inviteToken,
  ]);

  const buddyQuery = useQuery(
    playerId ? queryKeys.buddy(playerId) : null,
    fetchBuddy(playerId),
    { enabled: !!playerId },
  );

  const [buddyDraft, setBuddyDraft] = useState<BuddyProfileDraft>(() =>
    emptyBuddyProfileDraft(homeSid)
  );

  useEffect(() => {
    const profile = buddyQuery.data;
    if (profile) {
      setBuddyDraft({
        sessionId: profile.sessionId,
        name: profile.name,
        role: profile.role,
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        tenure: profile.tenure ?? "",
        contactUrl: profile.contactUrl ?? "",
        quote: profile.quote,
        avatarUrl: profile.avatarUrl,
      });
    } else if (!buddyQuery.isInitialLoading) {
      setBuddyDraft(emptyBuddyProfileDraft(homeSid));
    }
  }, [buddyQuery.data, buddyQuery.isInitialLoading, homeSid]);

  const upsertBuddy = useCallback(async () => {
    if (!playerId) return;
    await adapter.upsertBuddyProfile(playerId, buddyDraft);
    client.invalidateQuery(queryKeys.buddy(playerId));
  }, [adapter, buddyDraft, client, playerId]);

  const buddyProfile = {
    role: "gamemaker" as const,
    buddyDraft,
    savedBuddy: buddyQuery.data ?? null,
    setBuddyDraft,
    upsertBuddy,
    loading: buddyQuery.isInitialLoading,
    error: buddyQuery.error,
    refresh: () => client.invalidateQuery(queryKeys.buddy(playerId)),
  };

  const resourcesQuery = useQuery(
    homeSid && playerId ? queryKeys.resources(homeSid, playerId) : null,
    fetchPlayerResources(homeSid, playerId, false),
    { enabled: !!homeSid && !!playerId },
  );

  const libraryQuery = useQuery(
    playerId ? queryKeys.libraryResources() : null,
    fetchLibraryResources(),
    { enabled: !!playerId },
  );

  const refreshResources = useCallback(() => {
    if (homeSid && playerId) {
      client.invalidateQuery(queryKeys.resources(homeSid, playerId));
    }
  }, [client, homeSid, playerId]);

  const slugKey = useCallback(
    async (title: string): Promise<string> => {
      const existing = await adapter.listLibraryResources();
      const keys = new Set(existing.map((r) => r.resourceKey));
      return ensureUniqueResourceKey(generateResourceKey(title), keys);
    },
    [adapter],
  );

  const addResource = useCallback(
    async (data: AddResourceInput) => {
      if (!playerId) throw new Error("playerId required to attach resources");
      const lib = await adapter.createLibraryResource({
        resourceKey: await slugKey(data.title),
        title: data.title,
        type: data.type,
        url: data.url,
        description: data.description,
      });
      const msId = data.milestoneId;
      if (!msId) throw new Error("milestoneId required to attach resources");
      await adapter.attachMilestoneResource({
        sessionId: homeSid,
        playerId,
        milestoneId: msId,
        libraryResourceId: lib.id,
        isVisibleToPlayer: data.isVisibleToPlayer,
      });
      refreshResources();
    },
    [adapter, homeSid, playerId, refreshResources, slugKey],
  );

  const updateResource = useCallback(
    async (
      resourceId: string,
      patch: Partial<Omit<Resource, "id" | "created" | "updated">>,
    ) => {
      const libFields: Array<
        keyof Pick<
          Resource,
          "title" | "type" | "url" | "description" | "resourceKey"
        >
      > = ["title", "type", "url", "description", "resourceKey"];
      const libPatch = Object.fromEntries(
        libFields
          .filter((key) => patch[key] !== undefined)
          .map((key) => [key, patch[key]]),
      ) as Partial<
        Pick<Resource, "title" | "type" | "url" | "description" | "resourceKey">
      >;
      if (Object.keys(libPatch).length > 0) {
        await adapter.updateLibraryResource(resourceId, libPatch);
      }
      const { isVisibleToPlayer } = patch;
      if (isVisibleToPlayer !== undefined && playerId) {
        const attachments = await adapter.listMilestoneResources(playerId);
        const match = attachments.find((mr) =>
          mr.libraryResourceId === resourceId
        );
        if (match) {
          await adapter.updateMilestoneResource(match.id, {
            isVisibleToPlayer,
          });
        }
      }
      refreshResources();
    },
    [adapter, playerId, refreshResources],
  );

  const deleteResource = useCallback(
    async (resourceId: string) => {
      if (playerId) {
        const attachments = await adapter.listMilestoneResources(playerId);
        for (const mr of attachments) {
          if (mr.libraryResourceId === resourceId) {
            await adapter.detachMilestoneResource(mr.id);
          }
        }
      }
      await adapter.deleteLibraryResource(resourceId);
      refreshResources();
    },
    [adapter, playerId, refreshResources],
  );

  const detachFromMilestone = useCallback(
    async (resourceId: string, milestoneId: string) => {
      if (!playerId) return;
      const attachments = await adapter.listMilestoneResources(
        playerId,
        milestoneId,
      );
      const match = attachments.find((mr) =>
        mr.libraryResourceId === resourceId
      );
      if (match) await adapter.detachMilestoneResource(match.id);
      refreshResources();
    },
    [adapter, playerId, refreshResources],
  );

  const attachFromLibrary = useCallback(
    async (libraryResourceId: string, milestoneId: string) => {
      if (!playerId) throw new Error("playerId required to attach resources");
      await adapter.attachMilestoneResource({
        sessionId: homeSid,
        playerId,
        milestoneId,
        libraryResourceId,
        isVisibleToPlayer: true,
      });
      refreshResources();
    },
    [adapter, homeSid, playerId, refreshResources],
  );

  const toggleVisibility = useCallback(
    async (resourceId: string, visible: boolean) => {
      await updateResource(resourceId, { isVisibleToPlayer: visible });
    },
    [updateResource],
  );

  const gmResources = {
    role: "gamemaker" as const,
    resources: resourcesQuery.data ?? [],
    libraryResources: libraryQuery.data ?? [],
    loading: resourcesQuery.isInitialLoading,
    error: resourcesQuery.error,
    refresh: refreshResources,
    addResource,
    updateResource,
    deleteResource,
    detachFromMilestone,
    attachFromLibrary,
    toggleVisibility,
  };

  const [preBoardingItems, setPreBoardingItems] = useState<
    ReadonlyArray<PreBoardingCheckItem>
  >([]);

  useEffect(() => {
    if (session) setPreBoardingItems(session.preBoardingChecks);
  }, [session]);

  const persistPreBoarding = useCallback(
    (next: ReadonlyArray<PreBoardingCheckItem>) => {
      setPreBoardingItems(next);
      void adapter.updateSession(homeSid, { preBoardingChecks: next }).then(
        (updated) => {
          client.patchQuery(queryKeys.sessionMeta(homeSid), () => updated);
        },
      );
    },
    [adapter, client, homeSid],
  );

  const preBoardingChecklist = {
    items: preBoardingItems,
    onToggle: (id: string) => {
      persistPreBoarding(
        preBoardingItems.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        ),
      );
    },
    onAdd: (label: string) => {
      persistPreBoarding([
        ...preBoardingItems,
        { id: makeId(), label, checked: false },
      ]);
    },
    onMarkAllDone: () => {
      persistPreBoarding(
        preBoardingItems.map((item) => ({ ...item, checked: true })),
      );
    },
  };

  const templatesQuery = useQuery(queryKeys.templates(), fetchTemplates());
  const templates = templatesQuery.data ?? [];
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const applyTemplate = useCallback(
    async (templateName: string): Promise<void> => {
      const t = templates.find((tpl) => tpl.name === templateName);
      if (!t) return;
      setApplyingTemplate(true);
      try {
        await applyTemplateToPlayer(homeSid, playerId, t, adapter);
        refreshSession();
      } finally {
        setApplyingTemplate(false);
      }
    },
    [adapter, homeSid, playerId, refreshSession, templates],
  );

  const saveAsTemplate = useCallback(
    async (
      name: string,
      input: {
        readonly milestones: ReadonlyArray<Milestone>;
        readonly missions: typeof missions;
        readonly resources: ReadonlyArray<Resource>;
      },
    ): Promise<void> => {
      const formMissions = input.missions.filter(
        (m) => m.type === MISSION_TYPE.FORM,
      );
      const schemaResults = await Promise.all(
        formMissions.map((m) => adapter.getFormSchema(m.id).catch(() => null)),
      );
      const schemas = schemaResults.filter(
        (s): s is FormSchema => s !== null,
      );
      const [library, attachments] = await Promise.all([
        adapter.listLibraryResources(),
        adapter.listMilestoneResources(playerId),
      ]);
      const visibilityByLib = new Map(
        input.resources.map((r) => [r.id, r.isVisibleToPlayer]),
      );
      const milestoneResources = attachments.map((mr) => ({
        ...mr,
        isVisibleToPlayer: visibilityByLib.get(mr.libraryResourceId) ??
          mr.isVisibleToPlayer,
      }));
      const tpl = exportTemplate(
        name,
        input.milestones,
        input.missions,
        schemas,
        milestoneResources,
        library,
      );
      await adapter.saveTemplate(tpl);
      client.invalidateQuery(queryKeys.templates());
    },
    [adapter, client, playerId],
  );

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

  const handleAddResource = useCallback(
    (data: AddResourceInput) => {
      void (async () => {
        const milestoneId = data.milestoneId ??
          milestoneEditor.selectedMilestone?.id;
        if (!milestoneId) {
          showToast("Select a milestone before attaching resources");
          return;
        }
        await gmResources.addResource({ ...data, milestoneId });
        showToast("Resource attached");
      })().catch(() => showToast("Could not attach resource"));
    },
    [gmResources, milestoneEditor.selectedMilestone, showToast],
  );

  const handleAttachFromLibrary = useCallback(
    (libraryResourceId: string, milestoneId: string) => {
      void gmResources.attachFromLibrary(libraryResourceId, milestoneId)
        .then(() => showToast("Resource attached"))
        .catch(() => showToast("Could not attach resource"));
    },
    [gmResources, showToast],
  );

  const handleDetachResource = useCallback(
    (resourceId: string, milestoneId: string) => {
      void gmResources.detachFromMilestone(resourceId, milestoneId)
        .then(() => showToast("Resource removed"))
        .catch(() => showToast("Could not remove resource"));
    },
    [gmResources, showToast],
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
    session,
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
    if (sessionMissing) return;
    if (sessionError && !sessionLoading && !sessionMeta.error) {
      navigate(`/gamemaker/${homeSid}`, { replace: true });
    }
  }, [
    homeSid,
    navigate,
    sessionError,
    sessionLoading,
    sessionMeta.error,
    sessionMissing,
  ]);

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
  const claimStatus = gmProgress.selectedPlayer?.claimStatus ?? "invited";

  const showAnalyticsTab = useMemo(() => {
    if (claimStatus !== "claimed") return false;
    return gmProgress.selectedPlayerEvents.length > 0;
  }, [claimStatus, gmProgress.selectedPlayerEvents]);

  const activeTab: PlayerDetailTabKey = tab === "analytics" && !showAnalyticsTab
    ? "customize"
    : tab;

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

  const closeMilestoneEditorRef = useRef(closeMilestoneEditor);
  useEffect(() => {
    closeMilestoneEditorRef.current = closeMilestoneEditor;
  });

  // Fresh player route only — do not depend on closeMilestoneEditor identity
  // (mission/milestone editor hooks return new objects each render).
  useEffect(() => {
    closeMilestoneEditorRef.current();
  }, [playerId]);

  useEffect(() => {
    if (isScanMode) closeMilestoneEditorRef.current();
  }, [isScanMode]);

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
    activeTab,
    setTab,
    playerName,
    playerFirstName,
    startDateISO,
    hasMilestones,
    milestones,
    missions,
    milestoneProgress,
    completedMissionIds,
    claimStatus,
    inviteToken,
    showAnalyticsTab,
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
    isScanMode,
    openScanner,
    closeScanner,
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
    handleAddResource,
    handleAttachFromLibrary,
    handleDetachResource,
    handleSave,
    handleSaveToTemplate,
    handleDiscard,
    openMilestone,
    closeMilestoneEditor,
    sheetMissions,
    navigate,
  };
};

export type GmPlayerDetailPageModel = ReturnType<typeof useGmPlayerDetailPage>;
