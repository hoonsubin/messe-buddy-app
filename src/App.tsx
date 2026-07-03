import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import { DemoAwareAdapterProvider } from "./adapters/DemoAwareAdapterProvider.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import AdminHomePage from "./pages/AdminHomePage.tsx";
import HireDetailPage from "./pages/HireDetailPage.tsx";
import FormPage from "./pages/FormPage.tsx";
import QRScannerView from "./pages/QRScannerView.tsx";
import ValidationPage from "./pages/ValidationPage.tsx";
import RequireRole from "./components/layout/RequireRole.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import { USER_ROLE } from "./types/index.ts";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
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
    path: "/admin/:sessionId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <AdminHomePage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    path: "/admin/:sessionId/hire/:hireId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <HireDetailPage />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    path: "/admin/:sessionId/scan",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <DemoAwareAdapterProvider>
          <QRScannerView />
        </DemoAwareAdapterProvider>
      </RequireRole>
    ),
  },
  {
    // Not wrapped in RequireRole: the sessionId here is the *hire's* session,
    // while a GM's cached identity is scoped to their own home session — the
    // two never match, so RequireRole's exact-sessionId check always fails
    // for this route. ValidationPage does its own authorization instead, by
    // matching the hire's gameMakerId against any locally stored GM identity.
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
