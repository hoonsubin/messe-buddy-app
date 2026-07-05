import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import Toast from "../components/shared/Toast.tsx";
import GameMakerForm from "./landing/GameMakerForm.tsx";
import EmployeeForm from "./landing/EmployeeForm.tsx";
import LandingShell from "./landing/LandingShell.tsx";
import ProfileList from "./landing/ProfileList.tsx";
import RecoverySection from "./landing/RecoverySection.tsx";

const LandingPage = () => {
  const flow = useLandingFlow();

  const handleToggleForm = (form: "employee" | "gamemaker") => {
    flow.setActiveForm(flow.activeForm === form ? null : form);
  };

  return (
    <LandingShell>
      <div className="landing__card landing__card--wide">
        <ProfileList
          profiles={flow.profiles}
          orphanedUids={flow.orphanedUids}
          keyPopupUid={flow.keyPopupUid}
          activeForm={flow.activeForm}
          onResume={flow.handleResume}
          onRemove={flow.handleRemoveProfile}
          onShowKey={flow.handleShowKey}
          onHideKey={flow.handleHideKey}
          onToggleForm={handleToggleForm}
        />

        {flow.activeForm === "employee" && (
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
            onClose={() => flow.setActiveForm(null)}
          />
        )}

        {flow.activeForm === "gamemaker" && (
          <GameMakerForm
            sessionName={flow.sessionName}
            gmName={flow.gmName}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionNameChange={flow.setSessionName}
            onGmNameChange={flow.setGmName}
            onCreate={() => void flow.handleCreateGamemaker()}
            onClose={() => flow.setActiveForm(null)}
          />
        )}

        <RecoverySection
          recoveryKeyInput={flow.recoveryKeyInput}
          status={flow.status}
          errorMessage={flow.errorMessage}
          activeForm={flow.activeForm}
          onRecoveryKeyChange={flow.setRecoveryKeyInput}
          onRecover={() => void flow.handleRecover()}
        />
      </div>

      <Toast message={flow.toast} />
    </LandingShell>
  );
};

export default LandingPage;
