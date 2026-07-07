import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { isDemoBuild } from "../adapters/AdapterContextValue.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity, writeActiveUid } from "./useIdentity.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import { claimPlayer, isClaimedPlayer } from "../use-cases/claimPlayer.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { DEMO_PROFILES } from "../constants/demoInstance.ts";
import { parseInviteTokenFromSearch } from "../utils/inviteUrl.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LandingStatus = "idle" | "loading" | "error";

/** Join route UI — invite/QR links only; no manual token entry. */
export type JoinView = "loading" | "missing_invite" | "claim_name";

export interface UseLandingFlowResult {
  readonly profiles: ReadonlyArray<CachedIdentity>;
  /** UIDs whose backend session no longer exists (P-17). */
  readonly orphanedUids: ReadonlySet<string>;
  readonly workspacePanelOpen: boolean;
  readonly isJoinRoute: boolean;
  readonly joinView: JoinView;
  readonly playerName: string;
  readonly sessionName: string;
  readonly gmName: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly setWorkspacePanelOpen: (open: boolean) => void;
  readonly setPlayerName: (v: string) => void;
  readonly setSessionName: (v: string) => void;
  readonly setGmName: (v: string) => void;
  readonly handleJoinSession: () => Promise<void>;
  readonly handleCreateGamemaker: () => Promise<void>;
  readonly handleResume: (identity: CachedIdentity) => void;
  readonly handleRemoveProfile: (uid: string) => void;
  readonly resetError: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** GM-assigned display name from invite lookup (skip internal placeholders). */
const inviteDisplayName = (name: string | undefined): string | null => {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.startsWith("pending_")) return null;
  return trimmed;
};

const inviteNotFoundMessage =
  "Invite not found. Check the link from your Game Master and try again.";

export const useLandingFlow = (): UseLandingFlowResult => {
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { profiles, setIdentity, removeProfile } = useIdentity();
  const [searchParams] = useSearchParams();

  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const inviteTokenFromUrl = parseInviteTokenFromSearch(searchParams);
  const isJoinRoute = Boolean(routeSessionId);

  // ── Seed demo profiles once on mount (mock/static builds only — D-UX-1) ─
  const seeded = useRef(false);
  useEffect(() => {
    if (!isDemoBuild()) return;
    if (seeded.current) return;
    seeded.current = true;
    for (const demo of DEMO_PROFILES) {
      const exists = profiles.some((p) => p.uid === demo.uid);
      if (!exists) setIdentity(demo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleProfiles = useMemo(
    () => isDemoBuild() ? profiles : profiles.filter((p) => !p.isDemo),
    [profiles],
  );

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
  const [joinView, setJoinView] = useState<JoinView>(() => {
    if (!routeSessionId) return "claim_name";
    if (!inviteTokenFromUrl) return "missing_invite";
    return "loading";
  });
  const [verifiedInviteToken, setVerifiedInviteToken] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [gmName, setGmName] = useState("");
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

  // ── Invite link / QR: auto-verify token on /join/:sessionId?t= ───────────
  useEffect(() => {
    if (!isJoinRoute || !routeSessionId || !inviteTokenFromUrl) return;

    let cancelled = false;
    const processInvite = async () => {
      setJoinView("loading");
      setStatus("loading");
      setErrorMessage("");
      try {
        const player = await adapter.getPlayerByInviteToken(inviteTokenFromUrl);
        if (cancelled) return;
        if (!player || player.sessionId !== routeSessionId) {
          setJoinView("missing_invite");
          setStatus("error");
          setErrorMessage(inviteNotFoundMessage);
          return;
        }

        setVerifiedInviteToken(inviteTokenFromUrl);

        if (isClaimedPlayer(player)) {
          const { identity } = await claimPlayer(
            inviteTokenFromUrl,
            undefined,
            adapter,
          );
          if (cancelled) return;
          setIdentity(identity);
          writeActiveUid(identity.uid);
          navigate(`/session/${identity.sessionId}`, { replace: true });
          return;
        }

        const displayName = inviteDisplayName(player.name);
        if (displayName) setPlayerName(displayName);
        setJoinView("claim_name");
        setStatus("idle");
      } catch {
        if (cancelled) return;
        setJoinView("missing_invite");
        setStatus("error");
        setErrorMessage(inviteNotFoundMessage);
      }
    };
    void processInvite();
    return () => {
      cancelled = true;
    };
  }, [
    adapter,
    isJoinRoute,
    routeSessionId,
    inviteTokenFromUrl,
    setIdentity,
    navigate,
  ]);

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
          ? inviteNotFoundMessage
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
    const profile = profiles.find((p) => p.uid === uid);
    if (profile?.isDemo) return;
    removeProfile(uid);
  }, [profiles, removeProfile]);

  return {
    profiles: visibleProfiles,
    orphanedUids,
    workspacePanelOpen,
    isJoinRoute,
    joinView,
    playerName,
    sessionName,
    gmName,
    status,
    errorMessage,
    setWorkspacePanelOpen,
    setPlayerName,
    setSessionName,
    setGmName,
    handleJoinSession,
    handleCreateGamemaker,
    handleResume,
    handleRemoveProfile,
    resetError,
  };
};
