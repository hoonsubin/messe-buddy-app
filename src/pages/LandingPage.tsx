import { useNavigate } from "react-router-dom";
import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import Toast from "../components/shared/Toast.tsx";
import GameMakerForm from "./landing/GameMakerForm.tsx";
import EmployeeForm from "./landing/EmployeeForm.tsx";
import LandingShell from "./landing/LandingShell.tsx";
import ProfileList from "./landing/ProfileList.tsx";

const LandingPage = () => {
  const navigate = useNavigate();
  const flow = useLandingFlow();

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
        <Toast message={flow.toast} />
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

      <Toast message={flow.toast} />
    </LandingShell>
  );
};

export default LandingPage;
