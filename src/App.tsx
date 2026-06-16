import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import AdminCockpitPage from "./pages/AdminCockpitPage.tsx";
import FormPage from "./pages/FormPage.tsx";
import QRScannerView from "./pages/QRScannerView.tsx";
import RequireRole from "./components/layout/RequireRole.tsx";
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
  { path: "/form/:missionId", element: <FormPage /> },
  { path: "/qr/:missionId", element: <QRScannerView /> },
  // QR invite link — renders landing page with sessionId pre-filled
  { path: "/join/:sessionId", element: <LandingPage /> },
]);

const App = () => {
  return (
    <AdapterContextProvider>
      <RouterProvider router={router} />
    </AdapterContextProvider>
  );
};

export default App;
