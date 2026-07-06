import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity, writeActiveUid } from "./useIdentity.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { DEMO_PROFILES } from "../constants/demoInstance.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LandingStatus = "idle" | "loading" | "error";

export type EmployeeStep = "code" | "name";

export interface UseLandingFlowResult {
  readonly profiles: ReadonlyArray<CachedIdentity>;
  /** UIDs whose backend session no longer exists (P-17). */
  readonly orphanedUids: ReadonlySet<string>;
  readonly workspacePanelOpen: boolean;
  readonly isJoinRoute: boolean;
  readonly employeeStep: EmployeeStep;
  readonly verifiedSessionId: string;
  readonly sessionCode: string;
  readonly inviteToken: string;
  readonly playerName: string;
  readonly sessionName: string;
  readonly gmName: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly toast: string | null;
  readonly setWorkspacePanelOpen: (open: boolean) => void;
  readonly setSessionCode: (v: string) => void;
  readonly setInviteToken: (v: string) => void;
  readonly setPlayerName: (v: string) => void;
  readonly setSessionName: (v: string) => void;
  readonly setGmName: (v: string) => void;
  readonly handleVerifySession: () => Promise<void>;
  readonly handleJoinSession: () => Promise<void>;
  readonly handleCreateGamemaker: () => Promise<void>;
  readonly handleResume: (identity: CachedIdentity) => void;
  readonly handleRemoveProfile: (uid: string) => void;
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
  const isJoinRoute = Boolean(routeSessionId);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, profiles.length]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [workspacePanelOpen, setWorkspacePanelOpenState] = useState(false);
  const [employeeStep, setEmployeeStep] = useState<EmployeeStep>("code");
  const [verifiedSessionId, setVerifiedSessionId] = useState("");
  const [verifiedInviteToken, setVerifiedInviteToken] = useState("");
  const [sessionCode, setSessionCode] = useState(routeSessionId ?? "");
  const [inviteToken, setInviteToken] = useState(inviteTokenFromUrl);
  const [playerName, setPlayerName] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [gmName, setGmName] = useState("");
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Toast (from sessionStorage on mount — set by cockpit pages) ──────────
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const msg = sessionStorage.getItem("mb_landing_toast");
    if (!msg) return;
    sessionStorage.removeItem("mb_landing_toast");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync sessionStorage once on mount
    setToast(msg);
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  const resetError = useCallback(() => {
    setErrorMessage("");
    setStatus("idle");
  }, []);

  const setWorkspacePanelOpen = useCallback((open: boolean) => {
    setWorkspacePanelOpenState(open);
    if (open) {
      setSessionName("");
      setGmName("");
      resetError();
    }
  }, [resetError]);

  // ── Invite link: verify token on /join/:sessionId?t= ─────────────────────
  useEffect(() => {
    if (!isJoinRoute || !routeSessionId || !inviteTokenFromUrl) return;
    let cancelled = false;
    const verifyFromLink = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const player = await adapter.getPlayerByInviteToken(inviteTokenFromUrl);
        if (cancelled) return;
        if (!player || player.sessionId !== routeSessionId) {
          setEmployeeStep("code");
          setSessionCode(routeSessionId);
          setInviteToken(inviteTokenFromUrl);
          setStatus("error");
          setErrorMessage(
            "Invite not found. Check the link from your Game Master and try again.",
          );
          return;
        }
        setVerifiedSessionId(routeSessionId);
        setVerifiedInviteToken(inviteTokenFromUrl);
        setSessionCode(routeSessionId);
        setInviteToken(inviteTokenFromUrl);
        setEmployeeStep("name");
        setStatus("idle");
      } catch {
        if (cancelled) return;
        setEmployeeStep("code");
        setSessionCode(routeSessionId);
        setInviteToken(inviteTokenFromUrl);
        setStatus("error");
        setErrorMessage(
          "Invite not found. Check the link from your Game Master and try again.",
        );
      }
    };
    void verifyFromLink();
    return () => {
      cancelled = true;
    };
  }, [adapter, isJoinRoute, routeSessionId, inviteTokenFromUrl]);

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
      navigate(`/session/${identity.sessionId}`, { replace: true });
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "";
      setErrorMessage(
        msg === "Invite not found"
          ? "Invite not found. Check the link from your Game Master and try again."
          : "Could not join session. Please try again.",
      );
    }
  }, [adapter, playerName, verifiedInviteToken, setIdentity, navigate]);

  const handleCreateGamemaker = useCallback(async () => {
    const name = gmName.trim();
    const sName = sessionName.trim();
    if (!name || !sName) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const identity = await createGameMakerSession(sName, name, adapter);
      setIdentity(identity);
      writeActiveUid(identity.uid);
      setWorkspacePanelOpen(false);
      navigate(`/gamemaker/${identity.sessionId}`, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("Could not create session. Please try again.");
    }
  }, [
    adapter,
    gmName,
    sessionName,
    setIdentity,
    navigate,
    setWorkspacePanelOpen,
  ]);

  const handleResume = useCallback((identity: CachedIdentity) => {
    writeActiveUid(identity.uid);
    const dest = identity.role === USER_ROLE.PLAYER
      ? `/session/${identity.sessionId}`
      : `/gamemaker/${identity.sessionId}`;
    navigate(dest, { replace: true });
  }, [navigate]);

  const handleRemoveProfile = useCallback((uid: string) => {
    const isDemoProfile = DEMO_PROFILES.some((d) => d.uid === uid);
    if (isDemoProfile) return;
    removeProfile(uid);
  }, [removeProfile]);

  return {
    profiles,
    orphanedUids,
    workspacePanelOpen,
    isJoinRoute,
    employeeStep,
    verifiedSessionId,
    sessionCode,
    inviteToken,
    playerName,
    sessionName,
    gmName,
    status,
    errorMessage,
    toast,
    setWorkspacePanelOpen,
    setSessionCode,
    setInviteToken,
    setPlayerName,
    setSessionName,
    setGmName,
    handleVerifySession,
    handleJoinSession,
    handleCreateGamemaker,
    handleResume,
    handleRemoveProfile,
    resetError,
  };
};
