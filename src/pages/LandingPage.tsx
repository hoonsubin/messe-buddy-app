import RecoveryKeyModal from "../components/shared/RecoveryKeyModal.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";
import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import LandingShell from "./landing/LandingShell.tsx";
import RoleSelectView from "./landing/RoleSelectView.tsx";
import ReturningUserView from "./landing/ReturningUserView.tsx";
import JoinSessionView from "./landing/JoinSessionView.tsx";
import CreateSessionView from "./landing/CreateSessionView.tsx";
import TemplatesView from "./landing/TemplatesView.tsx";
import RecoverView from "./landing/RecoverView.tsx";

const LandingPage = () => {
  const flow = useLandingFlow();

  return (
    <>
      <LandingShell view={flow.view}>
        {flow.view === "role-select" && (
          <RoleSelectView
            onGoToView={flow.goToView}
            onDemoPlayer={flow.handleDemoPlayer}
            onDemoAdmin={flow.handleDemoAdmin}
          />
        )}
        {flow.view === "returning-user" && flow.identity && (
          <ReturningUserView
            identity={flow.identity}
            onResume={flow.handleResumeSession}
            onLogout={flow.handleLogout}
            onGoToView={flow.goToView}
          />
        )}
        {flow.view === "join" && (
          <JoinSessionView
            sessionCode={flow.sessionCode}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionCodeChange={flow.setSessionCode}
            onJoin={() => void flow.handleJoin()}
            onGoToView={flow.goToView}
          />
        )}
        {flow.view === "create" && (
          <CreateSessionView
            sessionName={flow.sessionName}
            status={flow.status}
            errorMessage={flow.errorMessage}
            templateFileRef={flow.templateFileRef}
            onSessionNameChange={flow.setSessionName}
            onCreate={() => void flow.handleCreate()}
            onTemplateImport={(e) => void flow.handleTemplateImport(e)}
            onGoToView={flow.goToView}
          />
        )}
        {flow.view === "templates" && (
          <TemplatesView
            templates={flow.templates}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onLoadTemplate={(id) => void flow.handleLoadTemplate(id)}
            onGoToView={flow.goToView}
          />
        )}
        {flow.view === "recover" && (
          <RecoverView
            recoveryKey={flow.recoveryKey}
            recoverySessionId={flow.recoverySessionId}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onRecoveryKeyChange={flow.setRecoveryKey}
            onRecoverySessionIdChange={flow.setRecoverySessionId}
            onRecover={() => void flow.handleRecover()}
            onGoToView={flow.goToView}
          />
        )}
      </LandingShell>

      {flow.pendingPlayer && (
        <NameCaptureModal
          onSubmit={(name) => void flow.handleNameSubmit(name)}
          loading={flow.status === "loading"}
        />
      )}

      {flow.pendingRecoveryKey && !flow.pendingPlayer && (
        <RecoveryKeyModal
          recoveryKey={flow.pendingRecoveryKey}
          onDismiss={flow.handleRecoveryKeyDismiss}
        />
      )}
    </>
  );
};

export default LandingPage;
