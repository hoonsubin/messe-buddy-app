import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "./useIdentity.ts";
import {
  createGameMakerSession,
  joinSession,
  verifySession,
} from "../use-cases/joinSession.ts";
import { recoverIdentity } from "../use-cases/recoverIdentity.ts";
import type { LocalIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

// ── Demo profiles (pre-seeded, always at top of list) ────────────────────────

export const DEMO_PROFILES: readonly LocalIdentity[] = [
  {
    uid: "uid_sofia_002",
    recoveryKey: "SOFIA026",
    sessionId: "sess_mmt2026",
    role: USER_ROLE.PLAYER,
    name: "Sofia Chen",
    isDemo: true,
  },
  {
    uid: "uid_gamemaker_peter",
    recoveryKey: "DEMO1234",
    sessionId: "sess_mmt2026",
    role: USER_ROLE.GAMEMAKER,
    name: "Peter Tubak",
    isDemo: true,
  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type LandingStatus = "idle" | "loading" | "error";

// Which inline form is expanded
export type ActiveForm = "employee" | "admin" | null;

// Employee join: 2-step (verify → name)
export type EmployeeStep = "code" | "name";

export interface UseLandingFlowResult {
  readonly profiles: ReadonlyArray<LocalIdentity>;
  readonly activeForm: ActiveForm;
  readonly employeeStep: EmployeeStep;
  readonly verifiedSessionId: string;
  readonly sessionCode: string;
  readonly playerName: string;
  readonly sessionName: string;
  readonly adminName: string;
  readonly recoveryKeyInput: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly keyPopupUid: string | null;
  readonly toast: string | null;
  readonly setActiveForm: (form: ActiveForm) => void;
  readonly setSessionCode: (v: string) => void;
  readonly setPlayerName: (v: string) => void;
  readonly setSessionName: (v: string) => void;
  readonly setAdminName: (v: string) => void;
  readonly setRecoveryKeyInput: (v: string) => void;
  readonly handleVerifySession: () => Promise<void>;
  readonly handleJoinSession: () => Promise<void>;
  readonly handleCreateAdmin: () => Promise<void>;
  readonly handleRecover: () => Promise<void>;
  readonly handleResume: (identity: LocalIdentity) => void;
  readonly handleRemoveProfile: (uid: string) => void;
  readonly handleShowKey: (uid: string) => void;
  readonly handleHideKey: () => void;
  readonly resetError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useLandingFlow = (): UseLandingFlowResult => {
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { profiles, setIdentity, removeProfile } = useIdentity();

  // ── Seed demo profiles once on mount ──────────────────────────────────────
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (const demo of DEMO_PROFILES) {
      const exists = profiles.some((p) => p.uid === demo.uid);
      if (!exists) setIdentity(demo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [activeForm, setActiveFormState] = useState<ActiveForm>(null);
  const [employeeStep, setEmployeeStep] = useState<EmployeeStep>("code");
  const [verifiedSessionId, setVerifiedSessionId] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [keyPopupUid, setKeyPopupUid] = useState<string | null>(null);

  // ── Toast (from sessionStorage on mount — set by cockpit pages) ──────────
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const msg = sessionStorage.getItem("mb_landing_toast");
    if (!msg) return;
    sessionStorage.removeItem("mb_landing_toast");
    setToast(msg);
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetError = useCallback(() => {
    setErrorMessage("");
    setStatus("idle");
  }, []);

  const setActiveForm = useCallback((form: ActiveForm) => {
    setActiveFormState(form);
    setEmployeeStep("code");
    setVerifiedSessionId("");
    setSessionCode("");
    setPlayerName("");
    setSessionName("");
    setAdminName("");
    resetError();
  }, [resetError]);

  // ── Employee join: step 1 — verify session exists ─────────────────────────
  const handleVerifySession = useCallback(async () => {
    const code = sessionCode.trim();
    if (!code) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      await verifySession(code, adapter);
      setVerifiedSessionId(code);
      setEmployeeStep("name");
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Session not found. Check the code and try again.");
    }
  }, [adapter, sessionCode]);

  // ── Employee join: step 2 — create player with name ───────────────────────
  const handleJoinSession = useCallback(async () => {
    const name = playerName.trim();
    if (!name || !verifiedSessionId) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const { identity } = await joinSession(verifiedSessionId, name, adapter);
      setIdentity(identity);
      setActiveForm(null);
      navigate(`/session/${identity.sessionId}`, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("Could not join session. Please try again.");
    }
  }, [
    adapter,
    playerName,
    verifiedSessionId,
    setIdentity,
    navigate,
    setActiveForm,
  ]);

  // ── Admin: create session ─────────────────────────────────────────────────
  const handleCreateAdmin = useCallback(async () => {
    const name = adminName.trim();
    const sName = sessionName.trim();
    if (!name || !sName) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const identity = await createGameMakerSession(sName, name, adapter);
      setIdentity(identity);
      setActiveForm(null);
      navigate(`/admin/${identity.sessionId}`, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("Could not create session. Please try again.");
    }
  }, [adapter, adminName, sessionName, setIdentity, navigate, setActiveForm]);

  // ── Recovery: key-only ────────────────────────────────────────────────────
  const handleRecover = useCallback(async () => {
    const key = recoveryKeyInput.trim().toUpperCase();
    if (!key) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const identity = await recoverIdentity(key, adapter);
      setIdentity(identity);
      setRecoveryKeyInput("");
      resetError();
      const dest = identity.role === USER_ROLE.PLAYER
        ? `/session/${identity.sessionId}`
        : `/admin/${identity.sessionId}`;
      navigate(dest, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("No account found for that key.");
    }
  }, [adapter, recoveryKeyInput, setIdentity, navigate, resetError]);

  // ── Profile actions ───────────────────────────────────────────────────────
  const handleResume = useCallback((identity: LocalIdentity) => {
    const dest = identity.role === USER_ROLE.PLAYER
      ? `/session/${identity.sessionId}`
      : `/admin/${identity.sessionId}`;
    navigate(dest, { replace: true });
  }, [navigate]);

  const handleRemoveProfile = useCallback((uid: string) => {
    // Prevent removing demo profiles
    const isDemoProfile = DEMO_PROFILES.some((d) => d.uid === uid);
    if (isDemoProfile) return;
    removeProfile(uid);
  }, [removeProfile]);

  const handleShowKey = useCallback((uid: string) => {
    setKeyPopupUid(uid);
  }, []);

  const handleHideKey = useCallback(() => {
    setKeyPopupUid(null);
  }, []);

  return {
    profiles,
    activeForm,
    employeeStep,
    verifiedSessionId,
    sessionCode,
    playerName,
    sessionName,
    adminName,
    recoveryKeyInput,
    status,
    errorMessage,
    keyPopupUid,
    toast,
    setActiveForm,
    setSessionCode,
    setPlayerName,
    setSessionName,
    setAdminName,
    setRecoveryKeyInput,
    handleVerifySession,
    handleJoinSession,
    handleCreateAdmin,
    handleRecover,
    handleResume,
    handleRemoveProfile,
    handleShowKey,
    handleHideKey,
    resetError,
  };
};
