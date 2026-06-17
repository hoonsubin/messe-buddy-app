import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "./useIdentity.ts";
import {
  clearEphemeralIdentity,
  isEphemeralIdentity,
  setEphemeralIdentity,
} from "./ephemeralIdentityStore.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import { recoverIdentity } from "../use-cases/recoverIdentity.ts";
import { bootstrapFromTemplate } from "../use-cases/bootstrapFromTemplate.ts";
import type { Player, TemplateExport } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

export type LandingView =
  | "role-select"
  | "returning-user"
  | "join"
  | "create"
  | "recover"
  | "templates";

export type LandingStatus = "idle" | "loading" | "error";

export interface UseLandingFlowResult {
  readonly view: LandingView;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly sessionCode: string;
  readonly sessionName: string;
  readonly recoveryKey: string;
  readonly recoverySessionId: string;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly pendingRecoveryKey: string | null;
  readonly pendingPlayer: Player | null;
  readonly templateFileRef: RefObject<HTMLInputElement | null>;
  readonly identity: import("../types/index.ts").LocalIdentity | null;
  readonly goToView: (view: LandingView) => void;
  readonly setSessionCode: (value: string) => void;
  readonly setSessionName: (value: string) => void;
  readonly setRecoveryKey: (value: string) => void;
  readonly setRecoverySessionId: (value: string) => void;
  readonly resetError: () => void;
  readonly refreshTemplates: () => void;
  readonly handleJoin: () => Promise<void>;
  readonly handleCreate: () => Promise<void>;
  readonly handleRecover: () => Promise<void>;
  readonly handleNameSubmit: (name: string) => Promise<void>;
  readonly handleDemoPlayer: () => void;
  readonly handleDemoAdmin: () => void;
  readonly handleLoadTemplate: (templateName: string) => Promise<void>;
  readonly handleTemplateImport: (e: ChangeEvent<HTMLInputElement>) => Promise<
    void
  >;
  readonly handleRecoveryKeyDismiss: () => void;
  readonly handleResumeSession: () => void;
  readonly handleLogout: () => void;
}

export const useLandingFlow = (): UseLandingFlowResult => {
  const navigate = useNavigate();
  const { sessionId: inviteSessionId } = useParams<{ sessionId: string }>();
  const adapter = useAdapter();
  const { identity, setIdentity, clearIdentity } = useIdentity();

  const [view, setView] = useState<LandingView>(() =>
    inviteSessionId ? "join" : "role-select"
  );
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [sessionCode, setSessionCode] = useState(() => inviteSessionId ?? "");
  const [sessionName, setSessionName] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoverySessionId, setRecoverySessionId] = useState("");
  const [templates, setTemplates] = useState<ReadonlyArray<TemplateExport>>(
    [],
  );

  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(
    null,
  );
  const [pendingRedirect, setPendingRedirect] = useState("/");
  const [pendingPlayer, setPendingPlayer] = useState<Player | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const refreshTemplates = useCallback(() => setRefreshKey((k) => k + 1), []);

  const resetError = useCallback(() => {
    setErrorMessage("");
    setStatus("idle");
  }, []);

  const goToView = useCallback((next: LandingView) => {
    resetError();
    setView(next);
  }, [resetError]);

  // Clear any stale ephemeral identity when LandingPage mounts.
  // Handles browser-back from demo cockpit where the ephemeral store
  // was set before navigation; the original page instance couldn't
  // clear it before unmounting.
  useEffect(() => {
    if (isEphemeralIdentity()) {
      clearEphemeralIdentity();
    }
  }, []);

  // Returning user: if a persisted (non-ephemeral) identity exists in
  // localStorage and no view has been chosen yet, show the returning-user
  // view so the user can resume, log out, or create a new account.
  useEffect(() => {
    if (!identity || view !== "role-select") return;
    if (isEphemeralIdentity()) return;
    setView("returning-user");
  }, [identity, view]);

  // Fetch templates when entering templates view
  useEffect(() => {
    if (view !== "templates") return;

    let cancelled = false;

    void adapter.listTemplates().then((list) => {
      if (!cancelled) setTemplates(list);
    });

    return () => {
      cancelled = true;
    };
  }, [adapter, view, refreshKey]);

  const handleJoin = useCallback(async () => {
    if (!sessionCode.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await joinSession(sessionCode.trim(), adapter);
      // joinSession already writes to localStorage - do NOT call setIdentity here,
      // which would fire the returning-user useEffect and navigate before the modal renders.
      setPendingRedirect(`/session/${result.identity.sessionId}`);
      setPendingPlayer(result.player);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Session not found. Check your session code and try again.",
      );
    }
  }, [adapter, sessionCode]);

  const handleNameSubmit = useCallback(async (name: string) => {
    if (!pendingPlayer) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      await adapter.updatePlayer(pendingPlayer.id, { name });
      setPendingRecoveryKey(pendingPlayer.recoveryKey);
      setPendingPlayer(null);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not save your name. Please try again.");
    }
  }, [adapter, pendingPlayer]);

  const handleCreate = useCallback(async () => {
    if (!sessionName.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const createdIdentity = await createGameMakerSession(
        sessionName.trim(),
        adapter,
      );
      // Same reasoning: use case writes localStorage; setIdentity would race the modal.
      setPendingRedirect(`/admin/${createdIdentity.sessionId}`);
      setPendingRecoveryKey(createdIdentity.recoveryKey);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not create session. Please try again.");
    }
  }, [adapter, sessionName]);

  const handleRecover = useCallback(async () => {
    if (!recoveryKey.trim() || !recoverySessionId.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const recovered = await recoverIdentity(
        recoveryKey.trim().toUpperCase(),
        recoverySessionId.trim(),
        adapter,
      );
      const dest = recovered.role === USER_ROLE.PLAYER
        ? `/session/${recovered.sessionId}`
        : `/admin/${recovered.sessionId}`;
      navigate(dest, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage(
        "No account found for that key and session. Check and try again.",
      );
    }
  }, [adapter, navigate, recoveryKey, recoverySessionId]);

  const handleDemoPlayer = useCallback(() => {
    clearEphemeralIdentity(); // clear any stale before setting new
    setEphemeralIdentity({
      uid: "uid_sofia_002",
      recoveryKey: "SOFIA026",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.PLAYER,
    });
    navigate("/session/sess_mmt2026", { replace: true });
  }, [navigate]);

  const handleDemoAdmin = useCallback(() => {
    clearEphemeralIdentity();
    setEphemeralIdentity({
      uid: "uid_gamemaker_peter",
      recoveryKey: "DEMO1234",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.GAMEMAKER,
    });
    navigate("/admin/sess_mmt2026", { replace: true });
  }, [navigate]);

  const handleLoadTemplate = useCallback(
    async (templateName: string) => {
      const template = templates.find((t) => t.name === templateName);
      if (!template) return;
      setStatus("loading");
      setErrorMessage("");
      try {
        const { identity } = await bootstrapFromTemplate(template, adapter, {
          recoveryKey: "TMPL0001",
        });
        setIdentity(identity);
      } catch {
        setStatus("error");
        setErrorMessage("Could not import template. Please try again.");
      }
    },
    [adapter, setIdentity, templates],
  );

  const handleTemplateImport = useCallback(async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const text = await file.text();
      const template = JSON.parse(text) as TemplateExport;
      const { identity } = await bootstrapFromTemplate(template, adapter, {
        recoveryKey: "IMPRT001",
      });
      setIdentity(identity);
    } catch {
      setStatus("error");
      setErrorMessage(
        "Could not import template. Make sure it's a valid MesseBuddy template file.",
      );
    }
  }, [adapter, setIdentity]);

  const handleRecoveryKeyDismiss = useCallback(() => {
    navigate(pendingRedirect, { replace: true });
  }, [navigate, pendingRedirect]);

  const handleResumeSession = useCallback(() => {
    if (!identity) return;
    const dest = identity.role === USER_ROLE.PLAYER
      ? `/session/${identity.sessionId}`
      : `/admin/${identity.sessionId}`;
    navigate(dest, { replace: true });
  }, [identity, navigate]);

  const handleLogout = useCallback(() => {
    clearIdentity();
    setView("role-select");
  }, [clearIdentity]);

  return {
    view,
    status,
    errorMessage,
    sessionCode,
    sessionName,
    recoveryKey,
    recoverySessionId,
    templates,
    pendingRecoveryKey,
    pendingPlayer,
    templateFileRef,
    identity,
    goToView,
    setSessionCode,
    setSessionName,
    setRecoveryKey,
    setRecoverySessionId,
    resetError,
    refreshTemplates,
    handleJoin,
    handleCreate,
    handleRecover,
    handleNameSubmit,
    handleDemoPlayer,
    handleDemoAdmin,
    handleLoadTemplate,
    handleTemplateImport,
    handleRecoveryKeyDismiss,
    handleResumeSession,
    handleLogout,
  };
};
