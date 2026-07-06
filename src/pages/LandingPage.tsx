import { Navigate, useNavigate, useParams } from "react-router-dom";
import { readActiveUid } from "../hooks/useIdentity.ts";
import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import { USER_ROLE } from "../types/index.ts";
import type { CachedIdentity } from "../types/index.ts";
import GameMakerForm from "../components/landing/GameMakerForm.tsx";
import EmployeeForm from "../components/landing/EmployeeForm.tsx";
import LandingShell from "../components/landing/LandingShell.tsx";
import ProfileList from "../components/landing/ProfileList.tsx";

const readProfiles = (): ReadonlyArray<CachedIdentity> => {
  try {
    const raw = localStorage.getItem("mb_identity");
    return raw ? (JSON.parse(raw) as CachedIdentity[]) : [];
  } catch {
    return [];
  }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const flow = useLandingFlow();
  const isJoinRoute = Boolean(routeSessionId);

  if (!isJoinRoute) {
    const uid = readActiveUid();
    if (uid) {
      const match = readProfiles().find((p) => p.uid === uid);
      if (match) {
        const dest = match.role === USER_ROLE.PLAYER
          ? `/session/${match.sessionId}`
          : `/gamemaker/${match.sessionId}`;
        return <Navigate to={dest} replace />;
      }
    }
  }

  if (flow.isJoinRoute) {
    return (
      <LandingShell>
        <div
          className="landing__card landing__card--wide"
          data-testid="join-page"
        >
          <p className="landing__section-label landing__section-label--emphasis">
            Join your onboarding
          </p>
          <EmployeeForm
            step={flow.employeeStep}
            sessionCode={flow.sessionCode}
            inviteToken={flow.inviteToken}
            playerName={flow.playerName}
            verifiedSessionId={flow.verifiedSessionId}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionChange={flow.setSessionCode}
            onTokenChange={flow.setInviteToken}
            onNameChange={flow.setPlayerName}
            onVerify={() => void flow.handleVerifySession()}
            onJoin={() => void flow.handleJoinSession()}
            onClose={() => navigate("/", { replace: true })}
          />
        </div>
      </LandingShell>
    );
  }

  return (
    <LandingShell>
      <div className="landing__card landing__card--wide">
        <ProfileList
          profiles={flow.profiles}
          orphanedUids={flow.orphanedUids}
          workspacePanelOpen={flow.workspacePanelOpen}
          onResume={flow.handleResume}
          onRemove={flow.handleRemoveProfile}
          onToggleWorkspacePanel={() =>
            flow.setWorkspacePanelOpen(!flow.workspacePanelOpen)}
        />

        {flow.workspacePanelOpen && (
          <GameMakerForm
            sessionName={flow.sessionName}
            gmName={flow.gmName}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionNameChange={flow.setSessionName}
            onGmNameChange={flow.setGmName}
            onCreate={() => void flow.handleCreateGamemaker()}
            onClose={() => flow.setWorkspacePanelOpen(false)}
          />
        )}
      </div>
    </LandingShell>
  );
};

export default LandingPage;
