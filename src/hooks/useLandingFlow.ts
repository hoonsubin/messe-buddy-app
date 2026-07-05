import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity, writeActiveUid } from "./useIdentity.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import { recoverIdentity } from "../use-cases/recoverIdentity.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

// ── Demo profiles (pre-seeded, always at top of list) ────────────────────────

export const DEMO_PROFILES: readonly CachedIdentity[] = [
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

// Employee join: verify invite token → name (claim)
export type EmployeeStep = "code" | "name";

export interface UseLandingFlowResult {
  readonly profiles: ReadonlyArray<CachedIdentity>;
  /** UIDs whose backend session no longer exists (P-17). */
  readonly orphanedUids: ReadonlySet<string>;
  readonly activeForm: ActiveForm;
  readonly employeeStep: EmployeeStep;
  readonly verifiedSessionId: string;
  readonly sessionCode: string;
  readonly inviteToken: string;
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
  readonly setInviteToken: (v: string) => void;
  readonly setPlayerName: (v: string) => void;
  readonly setSessionName: (v: string) => void;
  readonly setAdminName: (v: string) => void;
  readonly setRecoveryKeyInput: (v: string) => void;
  readonly handleVerifySession: () => Promise<void>;
  readonly handleJoinSession: () => Promise<void>;
  readonly handleCreateAdmin: () => Promise<void>;
  readonly handleRecover: () => Promise<void>;
  readonly handleResume: (identity: CachedIdentity) => void;
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
  const [searchParams] = useSearchParams();

  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const inviteTokenFromUrl = searchParams.get("t") ?? "";

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

  // ── Orphan detection (P-17) ──────────────────────────────────────────────
  // On mount, check each non-demo cached identity's session against the
  // backend. Sessions that 404 are marked orphaned so ProfileCard can render
  // a "User removed" badge instead of silently navigating to a dead route.
  const [orphanedUids, setOrphanedUids] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    let cancelled = false;
    const nonDemo = profiles.filter((p) => !p.isDemo);
    if (nonDemo.length === 0) return;

    const check = async () => {
      const dead = new Set<string>();
      await Promise.all(
        nonDemo.map(async (p) => {
          try {
            await adapter.getSession(p.sessionId);
          } catch {
            dead.add(p.uid);
          }
        }),
      );
      if (!cancelled && dead.size > 0) setOrphanedUids(dead);
    };
    void check();
    return () => {
      cancelled = true;
    };
    // Re-check when the profile list changes (e.g. after removing one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, profiles.length]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [activeForm, setActiveFormState] = useState<ActiveForm>(null);
  const [employeeStep, setEmployeeStep] = useState<EmployeeStep>("code");
  const [verifiedSessionId, setVerifiedSessionId] = useState("");
  const [verifiedInviteToken, setVerifiedInviteToken] = useState("");
  const [sessionCode, setSessionCode] = useState(routeSessionId ?? "");
  const [inviteToken, setInviteToken] = useState(inviteTokenFromUrl);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing React with sessionStorage external store fires once on mount
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
    setVerifiedInviteToken("");
    setSessionCode(form === "employee" && routeSessionId ? routeSessionId : "");
    setInviteToken(form === "employee" && inviteTokenFromUrl
      ? inviteTokenFromUrl
      : "");
    setPlayerName("");
    setSessionName("");
    setAdminName("");
    resetError();
  }, [resetError, routeSessionId, inviteTokenFromUrl]);

  useEffect(() => {
    if (!routeSessionId || !inviteTokenFromUrl) return;
    let cancelled = false;
    const verifyFromLink = async () => {
      try {
        const player = await adapter.getPlayerByInviteToken(inviteTokenFromUrl);
        if (cancelled || !player || player.sessionId !== routeSessionId) return;
        setVerifiedSessionId(routeSessionId);
        setVerifiedInviteToken(inviteTokenFromUrl);
        setSessionCode(routeSessionId);
        setInviteToken(inviteTokenFromUrl);
        setEmployeeStep("name");
      } catch {
        /* invalid link — user can retry manually */
      }
    };
    void verifyFromLink();
    return () => {
      cancelled = true;
    };
  }, [adapter, routeSessionId, inviteTokenFromUrl]);

  const handleVerifySession = useCallback(async () => {
    const sid = (sessionCode.trim() || routeSessionId || "").trim();
    const token = inviteToken.trim();
    if (!sid || !token) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const player = await adapter.getPlayerByInviteToken(token);
      if (!player || player.sessionId !== sid) {
        throw new Error("Invite not found for this session");
      }
      setVerifiedSessionId(sid);
      setVerifiedInviteToken(token);
      setEmployeeStep("name");
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Invite not found. Check the link from your Game Master and try again.",
      );
    }
  }, [adapter, sessionCode, inviteToken, routeSessionId]);

  const handleJoinSession = useCallback(async () => {
    const name = playerName.trim();
    if (!name || !verifiedInviteToken) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const { identity } = await joinSession(
        verifiedInviteToken,
        name,
        adapter,
      );
      setIdentity(identity);
      writeActiveUid(identity.uid);
      setActiveForm(null);
      navigate(`/session/${identity.sessionId}`, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("Could not join session. Please try again.");
    }
  }, [
    adapter,
    playerName,
    verifiedInviteToken,
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
      writeActiveUid(identity.uid);
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
      writeActiveUid(identity.uid);
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
  const handleResume = useCallback((identity: CachedIdentity) => {
    writeActiveUid(identity.uid);
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
    orphanedUids,
    activeForm,
    employeeStep,
    verifiedSessionId,
    sessionCode,
    inviteToken,
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
    setInviteToken,
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
