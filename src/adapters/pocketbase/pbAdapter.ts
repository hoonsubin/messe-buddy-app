import type PocketBase from "pocketbase";
import type { RecordModel } from "pocketbase";
import type { AppAdapter } from "../interface.ts";
import type {
  BuddyProfile,
  FieldSchema,
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../../types/index.ts";
import {
  marshalBuddyProfile,
  marshalFormSchema,
  marshalMilestone,
  marshalMission,
  marshalPlayer,
  marshalProgressEvent,
  marshalResource,
  marshalSession,
  marshalTemplate,
} from "./parsers.ts";

type SessionPatch =
  & Partial<
    Omit<Session, keyof PBRecord | "bgImageUrl">
  >
  & {
    readonly bgImageUrl?: string | File;
  };

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
      if (key === "preBoardingChecks") {
        body[key] = value;
      } else {
        body[key] = value;
      }
    }
    return body;
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (isUploadFile(value)) {
      formData.append(key, value);
    } else if (key === "preBoardingChecks") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
};

export const createPBAdapter = (pb: PocketBase): AppAdapter => {
  const getSession = async (sessionId: string): Promise<Session> => {
    const record = await pb.collection("sessions").getOne(sessionId);
    return marshalSession(pb, record);
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
  ): Promise<Session> => {
    let record = await pb.collection("sessions").create({
      name,
      gameMakerId: gameMakerUid,
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

  const createPlayer = async (
    data: Omit<Player, keyof PBRecord>,
  ): Promise<Player> => {
    const record = await pb.collection("players").create({
      ...data,
      tutorialComplete: data.tutorialComplete ?? false,
      profileComplete: data.profileComplete ?? false,
      skillsConfident: data.skillsConfident ?? [],
      skillsDevelop: data.skillsDevelop ?? [],
      languages: data.languages ?? [],
      energizers: data.energizers ?? [],
      drainers: data.drainers ?? [],
    });
    return marshalPlayer(pb, record);
  };

  const updatePlayer = async (
    playerId: string,
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ): Promise<Player> => {
    const record = await pb.collection("players").update(playerId, {
      ...patch,
    });
    return marshalPlayer(pb, record);
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
  ): Promise<ReadonlyArray<Milestone>> => {
    const records = await pb.collection("milestones").getFullList({
      filter: pb.filter("sessionId = {:sessionId}", { sessionId }),
      sort: "order",
    });
    return records.map(marshalMilestone);
  };

  const createMilestone = async (
    data: Omit<Milestone, keyof PBRecord>,
  ): Promise<Milestone> => {
    const record = await pb.collection("milestones").create({ ...data });
    return marshalMilestone(record);
  };

  const updateMilestone = async (
    milestoneId: string,
    patch: Partial<Omit<Milestone, keyof PBRecord>>,
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
  ): Promise<ReadonlyArray<Mission>> => {
    const records = await pb.collection("missions").getFullList({
      filter: pb.filter("sessionId = {:sessionId}", { sessionId }),
      sort: "order",
    });
    return records.map(marshalMission);
  };

  const createMission = async (
    data: Omit<Mission, keyof PBRecord>,
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
    patch: Partial<Omit<Mission, keyof PBRecord>>,
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
        keyof PBRecord | "playerId" | "missionId" | "sessionId"
      >
    >,
  ): Promise<ProgressEvent> => {
    const filter = progressKeyFilter(pb, playerId, missionId);
    const data: Record<string, unknown> = { ...patch };
    if (patch.formResponse) {
      data.formResponse = patch.formResponse;
    }

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

    try {
      const record = await pb.collection("progress_events").create({
        playerId,
        missionId,
        sessionId: player.sessionId,
        status: "pending",
        ...data,
      });
      return marshalProgressEvent(record);
    } catch (err) {
      const retry = await pb.collection("progress_events").getFullList({
        filter,
      });
      if (retry.length === 0) throw err;
      const record = await pb.collection("progress_events").update(
        retry[0].id,
        data,
      );
      return marshalProgressEvent(record);
    }
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

    void pb.collection("progress_events").subscribe(
      "*",
      (e) => {
        const record = e.record as RecordModel;
        if (
          record.playerId === playerId && record.missionId === missionId
        ) {
          callback(marshalProgressEvent(record));
        }
      },
      { filter: progressKeyFilter(pb, playerId, missionId) },
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

  const upsertBuddyProfile = async (
    playerId: string,
    data: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">,
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

  const listResources = async (
    sessionId: string,
  ): Promise<ReadonlyArray<Resource>> => {
    const records = await pb.collection("resources").getFullList({
      filter: pb.filter("sessionId = {:sessionId}", { sessionId }),
      sort: "id",
    });
    return records.map(marshalResource);
  };

  const createResource = async (
    data: Omit<Resource, keyof PBRecord>,
  ): Promise<Resource> => {
    const record = await pb.collection("resources").create({ ...data });
    return marshalResource(record);
  };

  const updateResource = async (
    resourceId: string,
    patch: Partial<Omit<Resource, keyof PBRecord>>,
  ): Promise<Resource> => {
    const record = await pb.collection("resources").update(resourceId, {
      ...patch,
    });
    return marshalResource(record);
  };

  const deleteResource = async (resourceId: string): Promise<void> => {
    await pb.collection("resources").delete(resourceId);
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
    listSessions,
    createSession,
    updateSession,
    getPlayer,
    getPlayerById,
    createPlayer,
    updatePlayer,
    getPlayerByRecoveryKey,
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
    getBuddyProfile,
    upsertBuddyProfile,
    listResources,
    createResource,
    updateResource,
    deleteResource,
    listTemplates,
    saveTemplate,
    deleteTemplate,
  };
};
