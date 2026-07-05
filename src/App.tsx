import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import { DemoAwareAdapterProvider } from "./adapters/DemoAwareAdapterProvider.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import RootRedirect from "./pages/RootRedirect.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import GameMakerHomePage from "./pages/GameMakerHomePage.tsx";
import PlayerDetailPage from "./pages/PlayerDetailPage.tsx";
import FormPage from "./pages/FormPage.tsx";
import QRScannerView from "./pages/QRScannerView.tsx";
import ValidationPage from "./pages/ValidationPage.tsx";
import RequireRole from "./components/layout/RequireRole.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import { USER_ROLE } from "./types/index.ts";

const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    path: "/session/:sessionId",
    element: (
      <RequireRole role={USER_ROLE.PLAYER}>
        <DemoAwareAdapterProvider>
          <PlayerCockpitPage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    path: "/gamemaker/:sessionId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <GameMakerHomePage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <PlayerDetailPage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    path: "/gamemaker/:sessionId/scan",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <QRScannerView />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    // Not wrapped in RequireRole: the sessionId here is the *player's* session,
    // while a GM's cached identity is scoped to their own home session — the
    // two never match, so RequireRole's exact-sessionId check always fails
    // for this route. ValidationPage does its own authorization instead, by
    // matching the player's gameMakerId against any locally stored GM identity.
    path: "/validate/:sessionId",
    element: (
      <DemoAwareAdapterProvider>
        <ValidationPage />
      </DemoAwareAdapterProvider>
    ),
  },
  {
    path: "/form/:sessionId/:missionId",
    element: (
      <RequireRole role={USER_ROLE.PLAYER}>
        <DemoAwareAdapterProvider>
          <FormPage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  { path: "/join/:sessionId", element: <LandingPage /> },
  { path: "*", element: <NotFoundPage /> },
]);

const App = () => {
  return (
    <AdapterContextProvider>
      <RouterProvider router={router} />
    </AdapterContextProvider>
  );
};

export default App;
