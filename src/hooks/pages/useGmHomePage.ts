import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { USER_ROLE } from "../../types/index.ts";
import { RESOURCE_TYPE } from "../../types/index.ts";
import type {
  BuddyProfile,
  LibraryResource,
  TemplateExport,
} from "../../types/index.ts";
import type {
  LibraryResourceInput,
  LibraryResourcePatch,
} from "../../types/resourceInputs.ts";
import { useActiveProfile } from "../useActiveProfile.ts";
import { clearActiveUid, useIdentity } from "../useIdentity.ts";
import { useMutation } from "../useMutation.ts";
import { useQuery } from "../useQuery.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { devBackendTrace } from "../../store/devBackendTrace.ts";
import {
  fetchBuddyPicker,
  fetchGmRoster,
  fetchLibraryResources,
  fetchSessionMeta,
  fetchTemplates,
  type GmPlayerRow,
} from "../../store/queryFetchers.ts";
import { queryKeys } from "../../store/queryKeys.ts";
import { useQueryClient } from "../../store/useQueryClient.ts";
import { writeAppliedTemplate } from "../../utils/playerDetailStorage.ts";
import {
  collectTagSuggestions,
  serializeLibraryTags,
} from "../../utils/libraryTags.ts";
import {
  ensureUniqueResourceKey,
  generateResourceKey,
} from "../../utils/resourceKey.ts";
import { parseGmHomeTab } from "../../utils/routeTabs.ts";
import {
  createOnboardingJourney as createOnboardingJourneyUseCase,
  type CreateOnboardingJourneyInput,
  type CreateOnboardingJourneyResult,
} from "../../use-cases/createOnboardingJourney.ts";

export interface UseGmHomePageResult {
  readonly sid: string;
  readonly tab: ReturnType<typeof parseGmHomeTab>;
  readonly identity: ReturnType<typeof useActiveProfile>;
  readonly players: ReadonlyArray<GmPlayerRow>;
  readonly loading: boolean;
  readonly checkingSession: boolean;
  readonly sessionMissing: boolean;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly wizardOpen: boolean;
  readonly setWizardOpen: (open: boolean) => void;
  readonly wizardKey: number;
  readonly setWizardKey: React.Dispatch<React.SetStateAction<number>>;
  readonly creating: boolean;
  readonly toast: string | null;
  readonly toastError: boolean;
  readonly showToast: (msg: string, isError?: boolean) => void;
  readonly handleRemoveStaleProfile: () => void;
  readonly handleCreateJourney: (input: CreateOnboardingJourneyInput) => void;
  readonly joinedCount: number;
  readonly joinedPlayers: ReadonlyArray<GmPlayerRow>;
  readonly avgProgress: number;
  readonly stalledCount: number;
  readonly pendingCount: number;
  readonly navigate: ReturnType<typeof useNavigate>;
  readonly libraryActive: boolean;
  readonly libraryResources: ReadonlyArray<LibraryResource>;
  readonly libraryTagSuggestions: ReadonlyArray<string>;
  readonly libraryLoading: boolean;
  readonly libraryError: Error | null;
  readonly refreshLibrary: () => void;
  readonly createLibraryResource: (
    data: LibraryResourceInput,
  ) => Promise<LibraryResource>;
  readonly updateLibraryResource: (
    id: string,
    patch: LibraryResourcePatch,
  ) => Promise<LibraryResource>;
  readonly deleteLibraryResource: (id: string) => Promise<void>;
  readonly buddyOptions: ReadonlyArray<BuddyProfile>;
  readonly buddyLoading: boolean;
}

export const useGmHomePage = (): UseGmHomePageResult => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const location = useLocation();
  const tab = parseGmHomeTab(location.pathname);
  const navigate = useNavigate();
  const adapter = useAdapter();
  const client = useQueryClient();
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sid, USER_ROLE.GAMEMAKER);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    if (sid) devBackendTrace.setActiveScope(sid);
  }, [sid]);

  const sessionMeta = useQuery(
    sid ? queryKeys.sessionMeta(sid) : null,
    fetchSessionMeta(sid),
    { enabled: !!sid },
  );

  const gmRoster = useQuery(
    sid && tab === "players" ? queryKeys.gmRoster(sid) : null,
    fetchGmRoster(sid),
    { enabled: !!sid && tab === "players" },
  );

  const templatesQuery = useQuery(
    queryKeys.templates(),
    fetchTemplates(),
  );

  const libraryQuery = useQuery(
    tab === "library" ? queryKeys.libraryResources() : null,
    fetchLibraryResources(),
    { enabled: tab === "library" },
  );

  const buddyPickerQuery = useQuery(
    sid && wizardOpen ? queryKeys.buddyPicker(sid) : null,
    fetchBuddyPicker(sid),
    { enabled: !!sid && wizardOpen },
  );

  const showToast = useCallback((msg: string, isError = false) => {
    setToast(msg);
    setToastError(isError);
    setTimeout(() => {
      setToast(null);
      setToastError(false);
    }, 3000);
  }, []);

  const handleRemoveStaleProfile = useCallback(() => {
    if (identity) removeProfile(identity.uid);
    clearActiveUid();
    navigate("/", { replace: true });
  }, [identity, removeProfile, navigate]);

  const createJourneyMutation = useMutation({
    label: "gm:createOnboardingJourney",
    mutationFn: async (
      input: CreateOnboardingJourneyInput,
    ): Promise<CreateOnboardingJourneyResult> => {
      const result = await createOnboardingJourneyUseCase(sid, adapter, input);
      if (result.appliedTemplateName) {
        writeAppliedTemplate(result.playerId, result.appliedTemplateName);
      }
      return result;
    },
    invalidateKeys: () => [queryKeys.gmRoster(sid)],
  });

  const handleCreateJourney = useCallback(
    (input: CreateOnboardingJourneyInput) => {
      setCreating(true);
      void createJourneyMutation.mutate(input)
        .then(({ playerId, inviteToken }) => {
          setWizardOpen(false);
          setCreating(false);
          navigate(`/gamemaker/${sid}/player/${playerId}/customize`, {
            state: { inviteToken },
          });
        })
        .catch(() => {
          setCreating(false);
          showToast("Could not create onboarding journey", true);
        });
    },
    [createJourneyMutation, navigate, sid, showToast],
  );

  const refreshLibrary = useCallback(() => {
    client.invalidateQuery(queryKeys.libraryResources());
  }, [client]);

  const createLibraryResource = useCallback(
    async (data: LibraryResourceInput): Promise<LibraryResource> => {
      const existing = await adapter.listLibraryResources();
      const keys = new Set(existing.map((r) => r.resourceKey));
      const resourceKey = ensureUniqueResourceKey(
        generateResourceKey(data.title),
        keys,
      );
      const created = await adapter.createLibraryResource({
        resourceKey,
        title: data.title.trim(),
        type: RESOURCE_TYPE.LINK,
        url: data.url.trim(),
        description: data.description?.trim() || undefined,
        tags: serializeLibraryTags(data.tags),
      });
      client.invalidateQuery(queryKeys.libraryResources());
      return created;
    },
    [adapter, client],
  );

  const updateLibraryResource = useCallback(
    async (
      id: string,
      patch: LibraryResourcePatch,
    ): Promise<LibraryResource> => {
      const libPatch: Partial<
        Omit<LibraryResource, "id" | "created" | "updated">
      > = {
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.url !== undefined && { url: patch.url.trim() }),
        ...(patch.description !== undefined && {
          description: patch.description.trim() || undefined,
        }),
        ...(patch.tags !== undefined && {
          tags: serializeLibraryTags(patch.tags),
        }),
      };
      const updated = await adapter.updateLibraryResource(id, libPatch);
      client.invalidateQuery(queryKeys.libraryResources());
      return updated;
    },
    [adapter, client],
  );

  const deleteLibraryResource = useCallback(
    async (id: string): Promise<void> => {
      await adapter.deleteLibraryResource(id);
      client.invalidateQuery(queryKeys.libraryResources());
    },
    [adapter, client],
  );

  const players = gmRoster.data?.rows ?? [];
  const joinedPlayers = players.filter((p) => p.joined);
  const joinedCount = joinedPlayers.length;
  const avgProgress = joinedCount > 0
    ? Math.round(
      joinedPlayers.reduce((s, p) => s + p.progressPercent, 0) / joinedCount,
    )
    : 0;
  const stalledCount = joinedPlayers.filter((p) => p.isStalled).length;
  const pendingCount = players.length - joinedCount;

  const libraryTagSuggestions = useMemo(
    () => collectTagSuggestions(libraryQuery.data ?? []),
    [libraryQuery.data],
  );

  return {
    sid,
    tab,
    identity,
    players,
    loading: gmRoster.isInitialLoading,
    checkingSession: sessionMeta.isInitialLoading,
    sessionMissing: !sessionMeta.isInitialLoading && !!sessionMeta.error,
    templates: templatesQuery.data ?? [],
    wizardOpen,
    setWizardOpen,
    wizardKey,
    setWizardKey,
    creating,
    toast,
    toastError,
    showToast,
    handleRemoveStaleProfile,
    handleCreateJourney,
    joinedCount,
    joinedPlayers,
    avgProgress,
    stalledCount,
    pendingCount,
    navigate,
    libraryActive: tab === "library",
    libraryResources: libraryQuery.data ?? [],
    libraryTagSuggestions,
    libraryLoading: libraryQuery.isInitialLoading,
    libraryError: libraryQuery.error,
    refreshLibrary,
    createLibraryResource,
    updateLibraryResource,
    deleteLibraryResource,
    buddyOptions: buddyPickerQuery.data ?? [],
    buddyLoading: buddyPickerQuery.isInitialLoading,
  };
};
