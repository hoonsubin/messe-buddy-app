import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import { DemoAwareAdapterProvider } from "./adapters/DemoAwareAdapterProvider.tsx";
import { QueryProvider } from "./store/QueryProvider.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import GmHomePage from "./pages/GmHomePage.tsx";
import GmPlayerDetailPage from "./pages/GmPlayerDetailPage.tsx";
import PlayerFormPage from "./pages/PlayerFormPage.tsx";
import ValidationPage from "./pages/ValidationPage.tsx";
import GmWorkspaceLayout from "./components/layout/GmWorkspaceLayout.tsx";
import PlayerSessionLayout from "./components/layout/PlayerSessionLayout.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/join/:sessionId", element: <LandingPage /> },
  {
    path: "/session/:sessionId",
    element: (
      <PlayerSessionLayout>
        <PlayerCockpitPage />
      </PlayerSessionLayout>
    ),
  },
  {
    path: "/session/:sessionId/assistant",
    element: (
      <PlayerSessionLayout>
        <PlayerCockpitPage />
      </PlayerSessionLayout>
    ),
  },
  {
    path: "/form/:sessionId/:missionId",
    element: (
      <PlayerSessionLayout>
        <PlayerFormPage />
      </PlayerSessionLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId",
    element: (
      <GmWorkspaceLayout>
        <GmHomePage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/library",
    element: (
      <GmWorkspaceLayout>
        <GmHomePage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId",
    element: (
      <GmWorkspaceLayout>
        <GmPlayerDetailPage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId/customize",
    element: (
      <GmWorkspaceLayout>
        <GmPlayerDetailPage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId/buddy",
    element: (
      <GmWorkspaceLayout>
        <GmPlayerDetailPage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId/preboarding",
    element: (
      <GmWorkspaceLayout>
        <GmPlayerDetailPage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/gamemaker/:sessionId/player/:playerId/scan",
    element: (
      <GmWorkspaceLayout>
        <GmPlayerDetailPage />
      </GmWorkspaceLayout>
    ),
  },
  {
    path: "/validate/:sessionId",
    element: (
      <DemoAwareAdapterProvider>
        <ValidationPage />
      </DemoAwareAdapterProvider>
    ),
  },
  { path: "*", element: <NotFoundPage /> },
]);

const App = () => {
  return (
    <AdapterContextProvider>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </AdapterContextProvider>
  );
};

export default App;
