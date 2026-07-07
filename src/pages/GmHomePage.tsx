import TopBar from "../components/shared/TopBar.tsx";
import RouteTabBar from "../components/shared/RouteTabBar.tsx";
import Toast from "../components/shared/Toast.tsx";
import OnboardingJourneyModal from "../components/gamemaker/OnboardingJourneyModal.tsx";
import GmPlayersTab from "../components/gamemaker/GmPlayersTab.tsx";
import ResourceLibraryTab from "../components/gamemaker/ResourceLibraryTab.tsx";
import { gmHomeTabsForSession } from "../components/gamemaker/gmHomeConstants.ts";
import { useGmHomePage } from "../hooks/pages/useGmHomePage.ts";
import { MdArrowBack } from "react-icons/md";
import { clearActiveUid } from "../hooks/useIdentity.ts";

const GmHomePage = () => {
  const vm = useGmHomePage();

  return (
    <div
      className="gm-home"
      data-testid="gamemaker-home-page"
      data-page="gm-home"
    >
      <TopBar
        playerName={vm.identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <div className="gm-home__back-row">
        <button
          type="button"
          className="btn btn--ghost gm-home__back-btn"
          onClick={() => {
            clearActiveUid();
            vm.navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} aria-hidden="true" />
          {vm.identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      <RouteTabBar
        tabs={gmHomeTabsForSession(vm.sid)}
        ariaLabel="Game Maker workspace"
        testIdPrefix="gm-home-tab"
      />

      <main className="gm-home__main">
        {vm.tab === "players"
          ? (
            <GmPlayersTab
              players={vm.players}
              loading={vm.loading}
              checkingSession={vm.checkingSession}
              sessionMissing={vm.sessionMissing}
              joinedCount={vm.joinedCount}
              avgProgress={vm.avgProgress}
              stalledCount={vm.stalledCount}
              pendingCount={vm.pendingCount}
              onAdd={() => {
                vm.setWizardKey((k) => k + 1);
                vm.setWizardOpen(true);
              }}
              onOpenPlayer={(playerId) =>
                vm.navigate(`/gamemaker/${vm.sid}/player/${playerId}`)}
              onRemoveStaleProfile={vm.handleRemoveStaleProfile}
            />
          )
          : (
            <ResourceLibraryTab
              resources={vm.libraryResources}
              tagSuggestions={vm.libraryTagSuggestions}
              loading={vm.libraryLoading}
              error={vm.libraryError}
              refresh={vm.refreshLibrary}
              createResource={vm.createLibraryResource}
              updateResource={vm.updateLibraryResource}
              deleteResource={vm.deleteLibraryResource}
            />
          )}
      </main>

      {vm.wizardOpen && (
        <OnboardingJourneyModal
          key={vm.wizardKey}
          sessionId={vm.sid}
          templates={vm.templates}
          buddyOptions={vm.buddyOptions}
          buddyLoading={vm.buddyLoading}
          loading={vm.creating}
          onSubmit={vm.handleCreateJourney}
          onClose={() => vm.setWizardOpen(false)}
        />
      )}

      <Toast message={vm.toast} isError={vm.toastError} />
    </div>
  );
};

export default GmHomePage;
