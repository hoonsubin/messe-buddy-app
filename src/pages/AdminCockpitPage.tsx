import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  BuddyProfile,
  DraftMilestone,
  DraftMission,
  FormSchema,
  Milestone,
  Mission,
  Player,
  PlayerProgress,
  PreBoardingCheckItem,
  ProgressEvent,
  Resource,
  TemplateExport,
} from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";
import { deriveXP } from "../use-cases/deriveXP.ts";
import { exportTemplate } from "../use-cases/exportTemplate.ts";
import { importTemplate } from "../use-cases/importTemplate.ts";
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
import type { HireProgressRow } from "../components/admin/CrossHireDashboard.tsx";
import AdminQRScannerModal from "../components/admin/AdminQRScannerModal.tsx";

const ADMIN_TABS = {
  ACTIVE_SESSION: "activeSession",
  PRE_BOARDING: "preBoarding",
  ALL_NEW_HIRES: "allNewHires",
} as const;
type AdminTab = (typeof ADMIN_TABS)[keyof typeof ADMIN_TABS];

// ── Draft helpers ─────────────────────────────────────────────────────────────

const defaultDraftMilestone = (
  id: string,
  name: string,
  xPercent: number,
  yPercent: number,
): DraftMilestone => ({
  id,
  name,
  xPercent,
  yPercent,
  isDirty: false,
});

const defaultDraftMission = (milestoneId: string): DraftMission => ({
  milestoneId,
  isDirty: false,
});

const makeId = (): string =>
  Math.random().toString(36).slice(2, 17).padEnd(15, "0").slice(0, 15);

// Compute XP preview for a draft mission given the current set of missions in
// the same milestone. Creates synthetic Mission objects, calls deriveXP, and
// returns the XP value for the synthetic draft mission.
const computeXPPreview = (
  draft: DraftMission,
  msMissions: ReadonlyArray<Mission>,
): number => {
  const synthetic: Mission = {
    id: "__draft__",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    sessionId: "",
    milestoneId: draft.milestoneId,
    title: draft.title ?? "",
    body: draft.body ?? "",
    type: draft.type ?? MISSION_TYPE.TEXT,
    difficulty: draft.difficulty ?? 1,
    xpValue: 0,
    tags: draft.tags ?? [],
    order: msMissions.length,
    isInCurrentMissions: draft.isInCurrentMissions ?? true,
    validationMethod: draft.validationMethod ?? "gmApprove",
  };
  const allMissions: ReadonlyArray<Mission> = [...msMissions, synthetic];
  const xpValues = deriveXP(allMissions);
  return xpValues[xpValues.length - 1] ?? 0;
};

// ── Page ──────────────────────────────────────────────────────────────────────

const AdminCockpitPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const adapter = useAdapter();
  const { identity } = useIdentity();
  const navigate = useNavigate();

  // Session data via hooks
  const { session, milestones, missions } = useSession(sid);

  // ── Resources (admin view — all resources, not filtered) ────────────────────

  const [adminResources, setAdminResources] = useState<
    ReadonlyArray<Resource>
  >([]);
  useEffect(() => {
    if (!sid) return;
    void adapter.listResources(sid).then(setAdminResources);
  }, [adapter, sid]);

  // ── Pre-boarding checklist state ────────────────────────────────────────────

  const [preBoardingItems, setPreBoardingItems] = useState<
    ReadonlyArray<PreBoardingCheckItem>
  >([]);

  // Sync from session when session data loads or changes
  const prevSessionRef = useRef(session);
  useEffect(() => {
    if (session && session !== prevSessionRef.current) {
      prevSessionRef.current = session;
      setPreBoardingItems(session.preBoardingChecks);
    }
  }, [session]);

  const handlePreBoardingToggle = useCallback(
    (id: string) => {
      setPreBoardingItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        );
        void adapter.updateSession(sid, { preBoardingChecks: next });
        return next;
      });
    },
    [adapter, sid],
  );

  const handlePreBoardingAdd = useCallback(
    (label: string) => {
      setPreBoardingItems((prev) => {
        const newItem: PreBoardingCheckItem = {
          id: makeId(),
          label,
          checked: false,
        };
        const next = [...prev, newItem];
        void adapter.updateSession(sid, { preBoardingChecks: next });
        return next;
      });
    },
    [adapter, sid],
  );

  const handlePreBoardingMarkAllDone = useCallback(() => {
    setPreBoardingItems((prev) => {
      const next = prev.map((item) => ({ ...item, checked: true }));
      void adapter.updateSession(sid, { preBoardingChecks: next });
      return next;
    });
  }, [adapter, sid]);

  // ── Players ─────────────────────────────────────────────────────────────────

  const [players, setPlayers] = useState<ReadonlyArray<Player>>([]);
  useEffect(() => {
    if (!sid) return;
    void adapter.listPlayers(sid).then(setPlayers);
  }, [adapter, sid]);

  // Selected player
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const isInitialPlayerLoad = useRef(true);

  // ── Buddy assignment state ──────────────────────────────────────────────────

  const emptyBuddyDraft = useCallback(
    (): Omit<
      BuddyProfile,
      "id" | "created" | "updated" | "assignedToPlayerId"
    > => ({
      sessionId: sid,
      name: "",
      role: "",
      tenure: "",
      contactUrl: "",
    }),
    [sid],
  );

  const [buddyDraft, setBuddyDraft] = useState(() => emptyBuddyDraft());
  const buddyProfileRef = useRef<BuddyProfile | null>(null);

  // Load buddy profile when player selection changes, using a callback
  // instead of an effect to avoid the setState-in-effect lint violation.
  const loadBuddyProfile = useCallback(
    (playerId: string) => {
      if (!playerId) {
        buddyProfileRef.current = null;
        setBuddyDraft(emptyBuddyDraft());
        return;
      }
      void adapter.getBuddyProfile(playerId).then((profile) => {
        buddyProfileRef.current = profile;
        if (profile) {
          setBuddyDraft({
            sessionId: profile.sessionId,
            name: profile.name,
            role: profile.role,
            tenure: profile.tenure ?? "",
            contactUrl: profile.contactUrl ?? "",
          });
        } else {
          setBuddyDraft(emptyBuddyDraft());
        }
      });
    },
    [adapter, emptyBuddyDraft],
  );

  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      setSelectedPlayerId(playerId);
      loadBuddyProfile(playerId);
    },
    [loadBuddyProfile],
  );

  const handleBuddyDraftChange = useCallback(
    (
      draft: Omit<
        BuddyProfile,
        "id" | "created" | "updated" | "assignedToPlayerId"
      >,
    ) => {
      setBuddyDraft(draft);
    },
    [],
  );

  const handleBuddySave = useCallback(() => {
    if (!selectedPlayerId) return;
    void adapter.upsertBuddyProfile(selectedPlayerId, {
      sessionId: buddyDraft.sessionId,
      name: buddyDraft.name,
      role: buddyDraft.role,
      tenure: buddyDraft.tenure,
      contactUrl: buddyDraft.contactUrl,
    }).then((profile) => {
      buddyProfileRef.current = profile;
    });
  }, [adapter, selectedPlayerId, buddyDraft]);

  // ── Resource CRUD callbacks ─────────────────────────────────────────────────

  const handleResourceAdd = useCallback(
    (data: Omit<Resource, "id" | "created" | "updated">) => {
      void adapter.createResource(data).then((created) => {
        setAdminResources((prev) => [...prev, created]);
      });
    },
    [adapter],
  );

  const handleResourceDelete = useCallback(
    (resourceId: string) => {
      void adapter.deleteResource(resourceId).then(() => {
        setAdminResources((prev) => prev.filter((r) => r.id !== resourceId));
      });
    },
    [adapter],
  );

  const handleResourceToggleVisibility = useCallback(
    (resourceId: string, visible: boolean) => {
      void adapter.updateResource(resourceId, {
        isVisibleToPlayer: visible,
      }).then((updated) => {
        setAdminResources((prev) =>
          prev.map((r) => (r.id === resourceId ? updated : r))
        );
      });
    },
    [adapter],
  );

  // All progress events across all players
  const [allProgressEvents, setAllProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);

  useEffect(() => {
    if (!players.length) return;
    let cancelled = false;

    if (isInitialPlayerLoad.current) {
      handlePlayerSelect(players[0]!.id);
      isInitialPlayerLoad.current = false;
    }

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
  }, [adapter, handlePlayerSelect, players]);

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
  );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ??
    null;

  // ── Selected player progress ────────────────────────────────────────────────

  const selectedPlayerProgress: PlayerProgress | null = useMemo(() => {
    if (!selectedPlayer) return null;
    const playerEvents = allProgressEvents.filter(
      (e) => e.playerId === selectedPlayer.id,
    );
    return computeProgress(
      selectedPlayer.id,
      missions,
      milestones,
      playerEvents,
    );
  }, [selectedPlayer, allProgressEvents, missions, milestones]);

  // ── Milestone editor state ──────────────────────────────────────────────────

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null,
  );

  // Draft milestones — seeded from real milestones on first load.
  // Tracked separately so drag/add/edit are batched until Save.
  const [draftMilestones, setDraftMilestones] = useState<
    ReadonlyArray<DraftMilestone>
  >([]);
  const draftMilestonesSeeded = useRef(false);

  useEffect(() => {
    if (draftMilestonesSeeded.current || milestones.length === 0) return;
    draftMilestonesSeeded.current = true;
    setDraftMilestones(
      milestones.map((ms) =>
        defaultDraftMilestone(ms.id, ms.name, ms.xPercent, ms.yPercent)
      ),
    );
  }, [milestones]);

  // Draft missions — keyed by a synthetic draft ID (not the PB mission ID).
  // When editing an existing mission we seed from real data; for new missions
  // we create a fresh DraftMission.
  const [draftMissions, setDraftMissions] = useState<
    ReadonlyMap<string, DraftMission>
  >(new Map());

  // ── MilestoneMapEditor callbacks ────────────────────────────────────────────

  const handleNodeDrop = useCallback(
    (id: string, xPercent: number, yPercent: number) => {
      setDraftMilestones((prev) =>
        prev.map((dm) =>
          dm.id === id ? { ...dm, xPercent, yPercent, isDirty: true } : dm
        )
      );
    },
    [],
  );

  const handleAddMilestone = useCallback(() => {
    const id = makeId();
    const dm = defaultDraftMilestone(id, "New milestone", 50, 50);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore readonly constraint — we manage state immutably
    setDraftMilestones((prev) => [...prev, dm]);
  }, []);

  const handleRenameMilestone = useCallback(
    (id: string, name: string) => {
      setDraftMilestones((prev) =>
        prev.map((dm) => dm.id === id ? { ...dm, name, isDirty: true } : dm)
      );
    },
    [],
  );

  const handleDeleteMilestone = useCallback((id: string) => {
    setDraftMilestones((prev) => prev.filter((dm) => dm.id !== id));
  }, []);

  // ── MilestoneSidebarEditor / MissionEditor callbacks ────────────────────────

  const handleMissionSelect = useCallback(
    (missionId: string) => {
      setSelectedMissionId(missionId);
      // Seed draft from real mission if not already in draftMissions
      setDraftMissions((prev) => {
        if (prev.has(missionId)) return prev;
        const real = missions.find((m) => m.id === missionId);
        if (!real) return prev;
        const draft: DraftMission = {
          milestoneId: real.milestoneId,
          isDirty: false,
          title: real.title,
          body: real.body,
          type: real.type,
          externalUrl: real.externalUrl,
          difficulty: real.difficulty,
          tags: real.tags,
          suggestedDueDate: real.suggestedDueDate,
          validationMethod: real.validationMethod,
          isInCurrentMissions: real.isInCurrentMissions,
          formFields: [],
        };
        return new Map(prev).set(missionId, draft);
      });
    },
    [missions],
  );

  const handleAddMission = useCallback(() => {
    if (!selectedMilestone) return;
    const draftId = makeId();
    const draft = defaultDraftMission(selectedMilestone.id);
    setDraftMissions((prev) => new Map(prev).set(draftId, draft));
    setSelectedMissionId(draftId);
  }, [selectedMilestone]);

  const handleDraftChange = useCallback(
    (draft: DraftMission) => {
      if (!selectedMissionId) return;
      setDraftMissions((prev) =>
        new Map(prev).set(selectedMissionId, { ...draft, isDirty: true })
      );
    },
    [selectedMissionId],
  );

  // Compute XP preview for the current draft mission
  const xpPreview = useMemo(() => {
    if (!selectedMissionId) return 0;
    const draft = draftMissions.get(selectedMissionId);
    if (!draft || draft.difficulty === undefined) return 0;
    const msMissions = missions.filter(
      (m) =>
        m.milestoneId === draft.milestoneId && m.id !== selectedMissionId,
    );
    return computeXPPreview(draft, msMissions);
  }, [selectedMissionId, draftMissions, missions]);

  // ── Tab navigation ──────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<AdminTab>(
    ADMIN_TABS.ACTIVE_SESSION,
  );

  // ── Cross-hire dashboard data (Phase 6g) ───────────────────────────────────

  const [crossHireRows, setCrossHireRows] = useState<
    ReadonlyArray<HireProgressRow>
  >([]);

  useEffect(() => {
    if (activeTab !== ADMIN_TABS.ALL_NEW_HIRES) return;
    let cancelled = false;

    const fetchCrossHireData = async () => {
      const sessions = await adapter.listSessions();
      const rows: HireProgressRow[] = [];

      for (const s of sessions) {
        const sessionPlayers = await adapter.listPlayers(s.id);
        const sessionMilestones = await adapter.listMilestones(s.id);
        const sessionMissions = await adapter.listMissions(s.id);

        for (const p of sessionPlayers) {
          const events = await adapter.listProgressEvents(p.id);
          const progress = computeProgress(
            p.id,
            sessionMissions,
            sessionMilestones,
            events,
          );

          const progressPercent = (() => {
            const { milestoneProgress } = progress;
            if (milestoneProgress.length === 0) return 0;
            const total = milestoneProgress.reduce(
              (sum, mp) => sum + mp.percentComplete,
              0,
            );
            return Math.round((total / milestoneProgress.length) * 100);
          })();

          const lastActivity = events.length > 0
            ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
            : null;
          const daysSinceLastActivity = lastActivity
            ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24))
            : Infinity;

          rows.push({
            playerId: p.id,
            playerName: p.name || p.uid || p.id,
            sessionName: s.name,
            progressPercent,
            daysSinceLastActivity,
            isStalled: daysSinceLastActivity > 3,
          });
        }
      }

      if (!cancelled) setCrossHireRows(rows);
    };

    void fetchCrossHireData();
    return () => {
      cancelled = true;
    };
  }, [adapter, activeTab]);

  // ── QR scanner ──────────────────────────────────────────────────────────────

  const [qrScannerContext, setQrScannerContext] = useState<{
    playerId: string;
    missionId: string;
    playerName: string;
    missionTitle: string;
  } | null>(null);

  const handleScanQR = useCallback(
    (playerId: string, missionId: string) => {
      const player = players.find((p) => p.id === playerId);
      const mission = missions.find((m) => m.id === missionId);
      setQrScannerContext({
        playerId,
        missionId,
        playerName: player?.name ?? player?.uid ?? playerId,
        missionTitle: mission?.title ?? missionId,
      });
    },
    [players, missions],
  );

  const handleQRValidate = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: identity?.uid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter, identity],
  );

  // ── Approval handlers ───────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: identity?.uid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
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

  // ── Batch save ──────────────────────────────────────────────────────────────

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    const msDirty = draftMilestones.some((dm) => dm.isDirty);
    const mDirty = [...draftMissions.values()].some((dm) => dm.isDirty);
    return msDirty || mDirty;
  }, [draftMilestones, draftMissions]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 1. Save milestones first (FK dependency for missions)
      for (const dm of draftMilestones) {
        const real = milestones.find((m) => m.id === dm.id);
        if (real) {
          await adapter.updateMilestone(dm.id, {
            name: dm.name,
            xPercent: dm.xPercent,
            yPercent: dm.yPercent,
          });
        } else {
          // New milestone — find order
          const maxOrder = milestones.reduce(
            (max, m) => Math.max(max, m.order),
            0,
          );
          await adapter.createMilestone({
            sessionId: sid,
            name: dm.name,
            xPercent: dm.xPercent,
            yPercent: dm.yPercent,
            xpThreshold: 100,
            order: maxOrder + 1,
          });
        }
      }

      // 2. Save missions
      for (const [, draft] of draftMissions) {
        if (!draft.isDirty) continue;
        const real = missions.find((m) => m.id === selectedMissionId);
        if (real && selectedMissionId) {
          await adapter.updateMission(selectedMissionId, {
            title: draft.title ?? real.title,
            body: draft.body ?? real.body,
            type: draft.type ?? real.type,
            externalUrl: draft.externalUrl,
            difficulty: draft.difficulty ?? real.difficulty,
            tags: draft.tags ?? real.tags,
            suggestedDueDate: draft.suggestedDueDate ?? real.suggestedDueDate,
            validationMethod: draft.validationMethod ?? real.validationMethod,
            isInCurrentMissions: draft.isInCurrentMissions ??
              real.isInCurrentMissions,
          });
        } else {
          await adapter.createMission({
            sessionId: sid,
            milestoneId: draft.milestoneId,
            title: draft.title ?? "New mission",
            body: draft.body ?? "",
            type: draft.type ?? MISSION_TYPE.TEXT,
            difficulty: draft.difficulty ?? 1,
            xpValue: xpPreview,
            tags: draft.tags ?? [],
            order: 0,
            isInCurrentMissions: draft.isInCurrentMissions ?? true,
            validationMethod: draft.validationMethod ?? "gmApprove",
          });
        }
      }

      // Clear dirty state
      setDraftMilestones((prev) =>
        prev.map((dm) => ({ ...dm, isDirty: false }))
      );
      setDraftMissions((prev) => {
        const next = new Map(prev);
        for (const [key, dm] of next) {
          if (dm.isDirty) next.set(key, { ...dm, isDirty: false });
        }
        return next;
      });

      setSaveToast("All changes saved");
      setTimeout(() => setSaveToast(null), 3000);
    } catch {
      setSaveToast("Save failed");
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [
    adapter,
    sid,
    draftMilestones,
    draftMissions,
    missions,
    milestones,
    selectedMissionId,
    xpPreview,
  ]);

  const handleDiscard = useCallback(() => {
    setDraftMilestones(
      milestones.map((ms) =>
        defaultDraftMilestone(ms.id, ms.name, ms.xPercent, ms.yPercent)
      ),
    );
    setDraftMissions(new Map());
    setSelectedMissionId(null);
    setSelectedMilestone(null);
  }, [milestones]);

  // ── Template export ─────────────────────────────────────────────────────────

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const handleExportTemplate = useCallback(async () => {
    if (!session) return;
    setIsSavingTemplate(true);
    try {
      const formMissions = missions.filter((m) =>
        m.type === MISSION_TYPE.FORM
      );
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
        adminResources,
      );

      // Save to mock template store
      await adapter.saveTemplate(template);

      // Also download as JSON file
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
  }, [adapter, session, milestones, missions, adminResources, templateName]);

  // ── Template library ────────────────────────────────────────────────────────

  const [templates, setTemplates] = useState<ReadonlyArray<TemplateExport>>([]);

  useEffect(() => {
    if (activeTab !== ADMIN_TABS.ACTIVE_SESSION) return;
    void adapter.listTemplates().then(setTemplates);
  }, [adapter, activeTab]);

  const handleLoadTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t.name === templateId);
      if (!template) return;
      const gmUid = identity?.uid ?? crypto.randomUUID();
      const newSessionId = await importTemplate(
        template,
        template.name,
        gmUid,
        adapter,
      );
      navigate(`/admin/${newSessionId}`, { replace: true });
    },
    [adapter, identity, navigate, templates],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeDraftMission = selectedMissionId
    ? draftMissions.get(selectedMissionId) ?? null
    : null;

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
              milestones={draftMilestones.map((dm) => {
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
              })}
              bgImageUrl={session?.bgImageUrl ?? ""}
              onMilestoneClick={(id) => {
                setSelectedMissionId(null);
                setSelectedMilestone(
                  milestones.find((m) => m.id === id) ?? null,
                );
              }}
              onNodeDrop={handleNodeDrop}
              onAddMilestone={handleAddMilestone}
              onRename={handleRenameMilestone}
              onDelete={handleDeleteMilestone}
              onUploadBackground={() => undefined}
            />
          </div>

          {/* Sidebar panels */}
          <div className="admin-layout__sidebar">
            {players.length > 0 && (
              <PlayerSelectorDropdown
                players={players}
                selectedId={selectedPlayerId}
                onSelect={handlePlayerSelect}
              />
            )}
            {selectedPlayer && selectedPlayerProgress && (
              <PlayerProfileCard
                player={selectedPlayer}
                totalXP={selectedPlayerProgress.totalXP}
                milestoneProgress={selectedPlayerProgress.milestoneProgress}
              />
            )}
            <PendingApprovalsPanel
              pendingEvents={pendingEvents}
              players={players}
              missions={missions}
              onApprove={(playerId, missionId) =>
                void handleApprove(playerId, missionId)}
              onReject={(playerId, missionId) =>
                void handleReject(playerId, missionId)}
              onScanQR={handleScanQR}
            />
            <BuddyAssignmentForm
              players={players}
              draft={buddyDraft}
              selectedPlayerId={selectedPlayerId}
              onPlayerChange={handlePlayerSelect}
              onDraftChange={handleBuddyDraftChange}
              onSave={handleBuddySave}
            />
            <ResourcesEditor
              resources={adminResources}
              sessionId={sid}
              onAdd={handleResourceAdd}
              onDelete={handleResourceDelete}
              onToggleVisibility={handleResourceToggleVisibility}
            />
            <TemplateLibrary
              templates={templates.map((t) => ({
                id: t.name,
                name: t.name,
                milestoneCount: t.milestones.length,
                missionCount: t.missions.length,
              }))}
              onLoad={handleLoadTemplate}
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
            items={preBoardingItems}
            onToggle={handlePreBoardingToggle}
            onAdd={handlePreBoardingAdd}
            onMarkAllDone={handlePreBoardingMarkAllDone}
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
          <CrossHireDashboard hires={crossHireRows} />
        </main>
      )}

      {/* ── QR Scanner modal ────────────────────────────────────────────── */}
      <AdminQRScannerModal
        isOpen={qrScannerContext !== null}
        context={qrScannerContext}
        sessionId={sid}
        onClose={() => setQrScannerContext(null)}
        onValidate={(playerId, missionId) =>
          handleQRValidate(playerId, missionId)}
      />

      {/* Milestone/mission editor sidebar */}
      {selectedMilestone && (
        <MilestoneSidebarEditor
          milestone={selectedMilestone}
          missions={missions}
          activeMissionId={selectedMissionId}
          draft={activeDraftMission}
          xpPreview={xpPreview}
          isDirty={isDirty}
          isSaving={isSaving}
          onMissionSelect={handleMissionSelect}
          onDraftChange={handleDraftChange}
          onRename={(newName) =>
            handleRenameMilestone(selectedMilestone.id, newName)}
          onSave={() => void handleSave()}
          onSaveAsTemplate={() => setSaveTemplateOpen(true)}
          onDiscard={handleDiscard}
          onAddMission={handleAddMission}
        />
      )}

      {/* ── Save toast ──────────────────────────────────────────────────── */}
      {saveToast && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "var(--space-6)",
            left: "50%",
            zIndex: 2000,
            padding: "var(--space-3) var(--space-5)",
            borderRadius: "var(--radius-md)",
            background: "hsl(var(--color-card))",
            boxShadow: "var(--shadow-lg)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-medium)",
            color: saveToast.includes("fail")
              ? "hsl(var(--color-destructive))"
              : "hsl(var(--color-status-complete))",
          }}
        >
          {saveToast}
        </div>
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
