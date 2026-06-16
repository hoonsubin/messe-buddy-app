import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "./useIdentity.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import { recoverIdentity } from "../use-cases/recoverIdentity.ts";
import { importTemplate } from "../use-cases/importTemplate.ts";
import type { Player, TemplateExport } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

export type LandingView =
  | "role-select"
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
  readonly setView: (view: LandingView) => void;
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
  readonly handleLoadTemplateFromStore: (templateName: string) => Promise<void>;
  readonly handleTemplateImport: (e: ChangeEvent<HTMLInputElement>) => Promise<
    void
  >;
  readonly handleRecoveryKeyDismiss: () => void;
}

// Module-level guard to prevent double-navigation under React 18+ StrictMode.
// Unlike useRef (which is re-initialized on StrictMode unmount/remount), a
// module-level variable survives remount and prevents the second effect fire
// from calling navigate() - which would otherwise throw a SecurityError:
// "Too many calls to Location or History APIs within a short timeframe."
let hasNavigated = false;

export const useLandingFlow = (): UseLandingFlowResult => {
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity, setIdentity } = useIdentity();

  const [view, setView] = useState<LandingView>("role-select");
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [sessionCode, setSessionCode] = useState("");
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

  // Returning user: if identity exists in localStorage, navigate to cockpit
  // only if the user hasn't explicitly chosen a view (i.e. landing page loads
  // and identity is present, but the user hasn't clicked any button yet).
  useEffect(() => {
    if (!identity || view !== "role-select") return;
    if (hasNavigated) return;
    hasNavigated = true;
    const dest = identity.role === USER_ROLE.PLAYER
      ? `/session/${identity.sessionId}`
      : `/admin/${identity.sessionId}`;
    try {
      navigate(dest, { replace: true });
    } catch {
      // Suppress SecurityError from react-router when navigate() is called
      // too rapidly (StrictMode double-fire safety net).
    }
  }, [identity, navigate, view]);

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
    setIdentity({
      uid: "uid_sofia_002",
      recoveryKey: "SOFIA026",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.PLAYER,
    });
  }, [setIdentity]);

  const handleDemoAdmin = useCallback(() => {
    setIdentity({
      uid: "uid_gamemaker_peter",
      recoveryKey: "DEMO1234",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.GAMEMAKER,
    });
  }, [setIdentity]);

  const handleLoadTemplateFromStore = useCallback(
    async (templateName: string) => {
      const template = templates.find((t) => t.name === templateName);
      if (!template) return;
      setStatus("loading");
      setErrorMessage("");
      try {
        const gmUid = crypto.randomUUID();
        const newSessionId = await importTemplate(
          template,
          template.name,
          gmUid,
          adapter,
        );
        setIdentity({
          uid: gmUid,
          recoveryKey: "TMPL0001",
          sessionId: newSessionId,
          role: USER_ROLE.GAMEMAKER,
        });
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
      const gmUid = crypto.randomUUID();
      const newSessionId = await importTemplate(
        template,
        template.name,
        gmUid,
        adapter,
      );
      setIdentity({
        uid: gmUid,
        recoveryKey: "IMPRT001",
        sessionId: newSessionId,
        role: USER_ROLE.GAMEMAKER,
      });
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
    setView,
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
    handleLoadTemplateFromStore,
    handleTemplateImport,
    handleRecoveryKeyDismiss,
  };
};
