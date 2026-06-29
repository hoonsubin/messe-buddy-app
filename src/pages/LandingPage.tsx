import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import Toast from "../components/shared/Toast.tsx";
import AdminForm from "./landing/AdminForm.tsx";
import EmployeeForm from "./landing/EmployeeForm.tsx";
import LandingShell from "./landing/LandingShell.tsx";
import ProfileList from "./landing/ProfileList.tsx";
import RecoverySection from "./landing/RecoverySection.tsx";

const LandingPage = () => {
  const flow = useLandingFlow();

  const handleToggleForm = (form: "employee" | "admin") => {
    flow.setActiveForm(flow.activeForm === form ? null : form);
  };

  return (
    <LandingShell>
      <div className="landing__card landing__card--wide">
        <ProfileList
          profiles={flow.profiles}
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
            playerName={flow.playerName}
            verifiedSessionId={flow.verifiedSessionId}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onCodeChange={flow.setSessionCode}
            onNameChange={flow.setPlayerName}
            onVerify={() => void flow.handleVerifySession()}
            onJoin={() => void flow.handleJoinSession()}
            onClose={() => flow.setActiveForm(null)}
          />
        )}

        {flow.activeForm === "admin" && (
          <AdminForm
            sessionName={flow.sessionName}
            adminName={flow.adminName}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionNameChange={flow.setSessionName}
            onAdminNameChange={flow.setAdminName}
            onCreate={() => void flow.handleCreateAdmin()}
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
