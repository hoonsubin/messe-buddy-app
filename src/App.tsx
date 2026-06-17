import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import AdminCockpitPage from "./pages/AdminCockpitPage.tsx";
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
        <PlayerCockpitPage />
      </RequireRole>
    ),
  },
  {
    path: "/admin/:sessionId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <AdminCockpitPage />
      </RequireRole>
    ),
  },
  {
    path: "/admin/:sessionId/scan",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <QRScannerView />
      </RequireRole>
    ),
  },
  {
    path: "/validate/:sessionId",
    element: (
      <RequireRole role={USER_ROLE.GAMEMAKER}>
        <ValidationPage />
      </RequireRole>
    ),
  },
  { path: "/form/:missionId", element: <FormPage /> },
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
