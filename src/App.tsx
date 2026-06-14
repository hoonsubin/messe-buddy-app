import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdapterContextProvider } from "./adapters/AdapterContext.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import AdminCockpitPage from "./pages/AdminCockpitPage.tsx";
import FormPage from "./pages/FormPage.tsx";
import QRScannerView from "./pages/QRScannerView.tsx";

// Route tree — guards and layouts added in Phase 2.
const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/play", element: <PlayerCockpitPage /> },
  { path: "/admin", element: <AdminCockpitPage /> },
  { path: "/form/:missionId", element: <FormPage /> },
  { path: "/qr/:missionId", element: <QRScannerView /> },
]);

const App = () => {
  return (
    <AdapterContextProvider>
      <RouterProvider router={router} />
    </AdapterContextProvider>
  );
};

export default App;
