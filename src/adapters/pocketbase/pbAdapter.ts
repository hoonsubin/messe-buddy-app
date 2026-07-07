import type PocketBase from "pocketbase";
import type { RecordModel } from "pocketbase";
import type {
  AppAdapter,
  ListMilestonesOptions,
  ListMissionsOptions,
} from "../interface.ts";
import type {
  BuddyProfile,
  FieldSchema,
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../../types/index.ts";
import { generateInviteToken } from "../../utils/inviteToken.ts";
import {
  marshalBuddyProfile,
  marshalFormSchema,
  marshalLibraryResource,
  marshalMilestone,
  marshalMilestoneResource,
  marshalMission,
  marshalPlayer,
  marshalProgressEvent,
  marshalSession,
  marshalTemplate,
  resolveResource,
} from "./parsers.ts";

type SessionPatch =
  & Partial<Omit<Session, "id" | "created" | "updated" | "bgImageUrl">>
  & { readonly bgImageUrl?: string | File };

const isUploadFile = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const progressKeyFilter = (
  pb: PocketBase,
  playerId: string,
  missionId: string,
): string =>
  pb.filter(
    "playerId = {:playerId} && missionId = {:missionId}",
    { playerId, missionId },
  );

const toSessionBody = (
  patch: SessionPatch,
): Record<string, unknown> | FormData => {
  const hasFile = isUploadFile(patch.bgImageUrl);
  if (!hasFile) {
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      body[key] = key === "preBoardingChecks" ? value : value;
    }
    return body;
  }
  const formData = new FormData();
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (isUploadFile(value)) formData.append(key, value);
    else if (key === "preBoardingChecks") {
      formData.append(key, JSON.stringify(value));
    } else formData.append(key, String(value));
  }
  return formData;
};

const scopeFilter = (
  pb: PocketBase,
  sessionId: string,
  playerId?: string,
): string => {
  if (playerId) {
    return pb.filter(
      "sessionId = {:sessionId} && playerId = {:playerId}",
      { sessionId, playerId },
    );
  }
  return pb.filter("sessionId = {:sessionId}", { sessionId });
};

export const createPBAdapter = (pb: PocketBase): AppAdapter => {
  const getSession = async (sessionId: string): Promise<Session> => {
    const record = await pb.collection("sessions").getOne(sessionId);
    return marshalSession(pb, record);
  };

  const getSessionByGmRecoveryKey = async (
    recoveryKey: string,
  ): Promise<Session | null> => {
    try {
      const record = await pb.collection("sessions").getFirstListItem(
        pb.filter("gmRecoveryKey = {:recoveryKey}", { recoveryKey }),
      );
      return marshalSession(pb, record);
    } catch {
      return null;
    }
  };

  const listSessions = async (): Promise<ReadonlyArray<Session>> => {
    const records = await pb.collection("sessions").getFullList({
      sort: "-id",
    });
    return records.map((r) => marshalSession(pb, r));
  };

  const createSession = async (
    name: string,
    gameMakerUid: string,
    gmRecoveryKey: string,
    id?: string,
  ): Promise<Session> => {
    let record = await pb.collection("sessions").create({
      ...(id ? { id } : {}),
      name,
      gameMakerId: gameMakerUid,
      gmRecoveryKey,
      mapNodeScale: 0.33,
      preBoardingChecks: [],
    });
    if (!record.qrSecret) {
      record = await pb.collection("sessions").getOne(record.id);
    }
    return marshalSession(pb, record);
  };

  const updateSession = async (
    sessionId: string,
    patch: SessionPatch,
  ): Promise<Session> => {
    const record = await pb.collection("sessions").update(
      sessionId,
      toSessionBody(patch),
    );
    return marshalSession(pb, record);
  };

  const getPlayer = async (uid: string): Promise<Player | null> => {
    if (!uid) return null;
    try {
      const record = await pb.collection("players").getFirstListItem(
        pb.filter("uid = {:uid}", { uid }),
      );
      return marshalPlayer(pb, record);
    } catch {
      return null;
    }
  };

  const getPlayerById = async (playerId: string): Promise<Player | null> => {
    try {
      const record = await pb.collection("players").getOne(playerId);
      return marshalPlayer(pb, record);
    } catch {
      return null;
    }
  };

  const getPlayerByInviteToken = async (
    inviteToken: string,
  ): Promise<Player | null> => {
    try {
      const record = await pb.collection("players").getFirstListItem(
        pb.filter("inviteToken = {:inviteToken}", { inviteToken }),
      );
      return marshalPlayer(pb, record);
    } catch {
      return null;
    }
  };

  const getPlayerByRecoveryKey = async (
    recoveryKey: string,
  ): Promise<Player | null> => {
    try {
      const record = await pb.collection("players").getFirstListItem(
        pb.filter("recoveryKey = {:recoveryKey}", { recoveryKey }),
      );
      return marshalPlayer(pb, record);
    } catch {
      return null;
    }
  };

  const invitePlayer = async (
    sessionId: string,
    data: { readonly name?: string; readonly jobTitle?: string },
    id?: string,
  ): Promise<Player> => {
    const inviteToken = generateInviteToken();
    const today = new Date().toISOString().split("T")[0] ?? "";
    // Unique indexes on uid / recoveryKey — invited rows get placeholders until
    // claimPlayer assigns real identity fields (SPECS: no uid until claim).
    const pendingId = `pending_${inviteToken}`;
    const record = await pb.collection("players").create({
      ...(id ? { id } : {}),
      sessionId,
      inviteToken,
      uid: pendingId,
      recoveryKey: pendingId,
      claimStatus: "invited",
      name: data.name?.trim() || "New player",
      jobTitle: data.jobTitle?.trim() || "",
      team: "",
      startDate: today,
      location: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tutorialComplete: false,
      profileComplete: false,
      skillsConfident: [],
      skillsDevelop: [],
      languages: [],
    });
    return marshalPlayer(pb, record);
  };

  const updatePlayer = async (
    playerId: string,
    patch: Partial<Omit<Player, "id" | "created" | "updated">>,
  ): Promise<Player> => {
    const record = await pb.collection("players").update(playerId, {
      ...patch,
    });
    return marshalPlayer(pb, record);
  };

  const listPlayers = async (
    sessionId: string,
  ): Promise<ReadonlyArray<Player>> => {
    const records = await pb.collection("players").getFullList({
      filter: pb.filter("sessionId = {:sessionId}", { sessionId }),
      sort: "id",
    });
    return records.map((r) => marshalPlayer(pb, r));
  };

  const listMilestones = async (
    sessionId: string,
    options?: ListMilestonesOptions,
  ): Promise<ReadonlyArray<Milestone>> => {
    const records = await pb.collection("milestones").getFullList({
      filter: scopeFilter(pb, sessionId, options?.playerId),
      sort: "order",
    });
    return records.map(marshalMilestone);
  };

  const createMilestone = async (
    data: Omit<Milestone, "id" | "created" | "updated"> & {
      readonly id?: string;
    },
  ): Promise<Milestone> => {
    const record = await pb.collection("milestones").create({ ...data });
    return marshalMilestone(record);
  };

  const updateMilestone = async (
    milestoneId: string,
    patch: Partial<Omit<Milestone, "id" | "created" | "updated">>,
  ): Promise<Milestone> => {
    const record = await pb.collection("milestones").update(milestoneId, {
      ...patch,
    });
    return marshalMilestone(record);
  };

  const deleteMilestone = async (milestoneId: string): Promise<void> => {
    await pb.collection("milestones").delete(milestoneId);
  };

  const listMissions = async (
    sessionId: string,
    options?: ListMissionsOptions,
  ): Promise<ReadonlyArray<Mission>> => {
    const records = await pb.collection("missions").getFullList({
      filter: scopeFilter(pb, sessionId, options?.playerId),
      sort: "order",
    });
    return records.map(marshalMission);
  };

  const createMission = async (
    data: Omit<Mission, "id" | "created" | "updated"> & {
      readonly id?: string;
    },
  ): Promise<Mission> => {
    const record = await pb.collection("missions").create({
      ...data,
      tags: data.tags ?? [],
      isInCurrentMissions: data.isInCurrentMissions ?? false,
    });
    return marshalMission(record);
  };

  const updateMission = async (
    missionId: string,
    patch: Partial<Omit<Mission, "id" | "created" | "updated">>,
  ): Promise<Mission> => {
    const record = await pb.collection("missions").update(missionId, {
      ...patch,
    });
    return marshalMission(record);
  };

  const deleteMission = async (missionId: string): Promise<void> => {
    await pb.collection("missions").delete(missionId);
  };

  const getFormSchema = async (
    missionId: string,
  ): Promise<FormSchema | null> => {
    try {
      const record = await pb.collection("form_schemas").getFirstListItem(
        pb.filter("missionId = {:missionId}", { missionId }),
      );
      return marshalFormSchema(record);
    } catch {
      return null;
    }
  };

  const upsertFormSchema = async (
    missionId: string,
    fields: ReadonlyArray<FieldSchema>,
  ): Promise<FormSchema> => {
    const existing = await getFormSchema(missionId);
    if (existing) {
      const record = await pb.collection("form_schemas").update(existing.id, {
        fields,
      });
      return marshalFormSchema(record);
    }
    const record = await pb.collection("form_schemas").create({
      missionId,
      fields,
    });
    return marshalFormSchema(record);
  };

  const upsertProgressEvent = async (
    playerId: string,
    missionId: string,
    patch: Partial<
      Omit<
        ProgressEvent,
        "id" | "created" | "updated" | "playerId" | "missionId" | "sessionId"
      >
    >,
  ): Promise<ProgressEvent> => {
    const filter = progressKeyFilter(pb, playerId, missionId);
    const data: Record<string, unknown> = { ...patch };
    const existing = await pb.collection("progress_events").getFullList({
      filter,
    });
    if (existing.length > 0) {
      const record = await pb.collection("progress_events").update(
        existing[0].id,
        data,
      );
      return marshalProgressEvent(record);
    }
    const player = await getPlayerById(playerId);
    if (!player) throw new Error("Player not found");
    const record = await pb.collection("progress_events").create({
      playerId,
      missionId,
      sessionId: player.sessionId,
      status: "pending",
      ...data,
    });
    return marshalProgressEvent(record);
  };

  const listProgressEvents = async (
    playerId: string,
  ): Promise<ReadonlyArray<ProgressEvent>> => {
    const records = await pb.collection("progress_events").getFullList({
      filter: pb.filter("playerId = {:playerId}", { playerId }),
    });
    return records.map(marshalProgressEvent);
  };

  const subscribeProgressEvent = (
    playerId: string,
    missionId: string,
    callback: (event: ProgressEvent) => void,
  ): () => void => {
    let unsubscribe: (() => Promise<void>) | null = null;
    let cancelled = false;
    // Single-field filter — compound playerId+missionId filters can miss PB realtime.
    void pb.collection("progress_events").subscribe(
      "*",
      (e) => {
        const record = e.record as RecordModel;
        if (record.playerId !== playerId || record.missionId !== missionId) {
          return;
        }
        callback(marshalProgressEvent(record));
      },
      { filter: pb.filter("playerId = {:playerId}", { playerId }) },
    ).then((unsub) => {
      if (cancelled) void unsub();
      else unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      if (unsubscribe) void unsubscribe();
    };
  };

  const subscribeSessionPlayers = (
    sessionId: string,
    callback: (player: Player) => void,
  ): () => void => {
    let unsubscribe: (() => Promise<void>) | null = null;
    let cancelled = false;
    void pb.collection("players").subscribe(
      "*",
      (e) => {
        const record = e.record as RecordModel;
        if (record.sessionId !== sessionId) return;
        callback(marshalPlayer(pb, record));
      },
      { filter: pb.filter("sessionId = {:sessionId}", { sessionId }) },
    ).then((unsub) => {
      if (cancelled) void unsub();
      else unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      if (unsubscribe) void unsubscribe();
    };
  };

  const subscribeSessionProgressEvents = (
    sessionId: string,
    callback: (event: ProgressEvent) => void,
  ): () => void => {
    let unsubscribe: (() => Promise<void>) | null = null;
    let cancelled = false;
    void pb.collection("progress_events").subscribe(
      "*",
      (e) => {
        const record = e.record as RecordModel;
        if (record.sessionId !== sessionId) return;
        callback(marshalProgressEvent(record));
      },
      { filter: pb.filter("sessionId = {:sessionId}", { sessionId }) },
    ).then((unsub) => {
      if (cancelled) void unsub();
      else unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      if (unsubscribe) void unsubscribe();
    };
  };

  const getBuddyProfile = async (
    playerId: string,
  ): Promise<BuddyProfile | null> => {
    try {
      const record = await pb.collection("buddy_profiles").getFirstListItem(
        pb.filter("assignedToPlayerId = {:playerId}", { playerId }),
      );
      return marshalBuddyProfile(pb, record);
    } catch {
      return null;
    }
  };

  const listBuddyProfiles = async (
    sessionId: string,
  ): Promise<ReadonlyArray<BuddyProfile>> => {
    const records = await pb.collection("buddy_profiles").getFullList({
      filter: pb.filter("sessionId = {:sessionId}", { sessionId }),
      sort: "name",
    });
    return records.map((r) => marshalBuddyProfile(pb, r));
  };

  const upsertBuddyProfile = async (
    playerId: string,
    data: Omit<
      BuddyProfile,
      "id" | "created" | "updated" | "assignedToPlayerId"
    >,
  ): Promise<BuddyProfile> => {
    const existing = await getBuddyProfile(playerId);
    if (existing) {
      const record = await pb.collection("buddy_profiles").update(existing.id, {
        ...data,
        assignedToPlayerId: playerId,
      });
      return marshalBuddyProfile(pb, record);
    }
    const record = await pb.collection("buddy_profiles").create({
      ...data,
      assignedToPlayerId: playerId,
    });
    return marshalBuddyProfile(pb, record);
  };

  const listLibraryResources = async (): Promise<
    ReadonlyArray<LibraryResource>
  > => {
    const records = await pb.collection("library_resources").getFullList({
      sort: "resourceKey",
    });
    return records.map(marshalLibraryResource);
  };

  const createLibraryResource = async (
    data: Omit<LibraryResource, "id" | "created" | "updated">,
  ): Promise<LibraryResource> => {
    const record = await pb.collection("library_resources").create({ ...data });
    return marshalLibraryResource(record);
  };

  const updateLibraryResource = async (
    resourceId: string,
    patch: Partial<Omit<LibraryResource, "id" | "created" | "updated">>,
  ): Promise<LibraryResource> => {
    const record = await pb.collection("library_resources").update(
      resourceId,
      { ...patch },
    );
    return marshalLibraryResource(record);
  };

  const deleteLibraryResource = async (resourceId: string): Promise<void> => {
    await pb.collection("library_resources").delete(resourceId);
  };

  const listMilestoneResources = async (
    playerId: string,
    milestoneId?: string,
  ): Promise<ReadonlyArray<MilestoneResource>> => {
    const filter = milestoneId
      ? pb.filter(
        "playerId = {:playerId} && milestoneId = {:milestoneId}",
        { playerId, milestoneId },
      )
      : pb.filter("playerId = {:playerId}", { playerId });
    const records = await pb.collection("milestone_resources").getFullList({
      filter,
    });
    return records.map(marshalMilestoneResource);
  };

  const attachMilestoneResource = async (
    data: Omit<MilestoneResource, "id" | "created" | "updated">,
  ): Promise<MilestoneResource> => {
    const record = await pb.collection("milestone_resources").create({
      ...data,
    });
    return marshalMilestoneResource(record);
  };

  const updateMilestoneResource = async (
    attachmentId: string,
    patch: Partial<Omit<MilestoneResource, "id" | "created" | "updated">>,
  ): Promise<MilestoneResource> => {
    const record = await pb.collection("milestone_resources").update(
      attachmentId,
      { ...patch },
    );
    return marshalMilestoneResource(record);
  };

  const detachMilestoneResource = async (
    attachmentId: string,
  ): Promise<void> => {
    await pb.collection("milestone_resources").delete(attachmentId);
  };

  const listResources = async (
    sessionId: string,
    options?: { readonly playerId?: string; readonly milestoneId?: string },
  ): Promise<ReadonlyArray<Resource>> => {
    const filter = options?.playerId
      ? pb.filter(
        "sessionId = {:sessionId} && playerId = {:playerId}",
        { sessionId, playerId: options.playerId },
      )
      : pb.filter("sessionId = {:sessionId}", { sessionId });
    const attachments = await pb.collection("milestone_resources").getFullList({
      filter,
    });
    const libRecords = await pb.collection("library_resources").getFullList();
    const libById = new Map(
      libRecords.map((r) => [r.id, marshalLibraryResource(r)]),
    );
    return attachments
      .map((raw) => {
        const mr = marshalMilestoneResource(raw);
        if (options?.milestoneId && mr.milestoneId !== options.milestoneId) {
          return null;
        }
        const lib = libById.get(mr.libraryResourceId);
        return lib ? resolveResource(lib, mr) : null;
      })
      .filter((r): r is Resource => r !== null);
  };

  const listTemplates = async (): Promise<ReadonlyArray<TemplateExport>> => {
    const records = await pb.collection("templates").getFullList({
      sort: "name",
    });
    return records.map(marshalTemplate);
  };

  const saveTemplate = async (template: TemplateExport): Promise<void> => {
    const filter = pb.filter("name = {:name}", { name: template.name });
    const existing = await pb.collection("templates").getFullList({ filter });
    const payload = { name: template.name, data: template };
    if (existing.length > 0) {
      await pb.collection("templates").update(existing[0].id, payload);
    } else {
      await pb.collection("templates").create(payload);
    }
  };

  const deleteTemplate = async (name: string): Promise<void> => {
    const records = await pb.collection("templates").getFullList({
      filter: pb.filter("name = {:name}", { name }),
    });
    if (records.length > 0) {
      await pb.collection("templates").delete(records[0].id);
    }
  };

  return {
    getSession,
    getSessionByGmRecoveryKey,
    listSessions,
    createSession,
    updateSession,
    getPlayer,
    getPlayerById,
    getPlayerByInviteToken,
    getPlayerByRecoveryKey,
    invitePlayer,
    updatePlayer,
    listPlayers,
    listMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    listMissions,
    createMission,
    updateMission,
    deleteMission,
    getFormSchema,
    upsertFormSchema,
    upsertProgressEvent,
    listProgressEvents,
    subscribeProgressEvent,
    subscribeSessionPlayers,
    subscribeSessionProgressEvents,
    getBuddyProfile,
    listBuddyProfiles,
    upsertBuddyProfile,
    listLibraryResources,
    createLibraryResource,
    updateLibraryResource,
    deleteLibraryResource,
    listMilestoneResources,
    attachMilestoneResource,
    updateMilestoneResource,
    detachMilestoneResource,
    listResources,
    listTemplates,
    saveTemplate,
    deleteTemplate,
  };
};
