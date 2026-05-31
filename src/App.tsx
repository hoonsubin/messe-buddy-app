import { useState } from "react";
import type { NavPage } from "./types.ts";
import LandingPage from "./pages/LandingPage.tsx";
import PlayerCockpitPage from "./pages/PlayerCockpitPage.tsx";
import AdminCockpitPage from "./pages/AdminCockpitPage.tsx";
import PlayerListPage from "./pages/PlayerListPage.tsx";
import PlayerDetailPage from "./pages/PlayerDetailPage.tsx";
import QRScannerPage from "./pages/QRScannerPage.tsx";
import FormPage from "./pages/FormPage.tsx";

export default function App() {
  const [nav, setNav] = useState<NavPage>({ name: "landing" });

  function navigate(page: NavPage) {
    setNav(page);
    // Scroll to top on navigation
    globalThis.scrollTo(0, 0);
  }

  switch (nav.name) {
    case "landing":
      return <LandingPage navigate={navigate} />;

    case "playerCockpit":
      return (
        <PlayerCockpitPage
          sessionId={nav.sessionId}
          playerId={nav.playerId}
          navigate={navigate}
        />
      );

    case "adminCockpit":
      return <AdminCockpitPage sessionId={nav.sessionId} navigate={navigate} />;

    case "playerList":
      return <PlayerListPage sessionId={nav.sessionId} navigate={navigate} />;

    case "playerDetail":
      return (
        <PlayerDetailPage
          sessionId={nav.sessionId}
          playerId={nav.playerId}
          navigate={navigate}
        />
      );

    case "qrScanner":
      return <QRScannerPage sessionId={nav.sessionId} navigate={navigate} />;

    case "formPage":
      return (
        <FormPage
          missionId={nav.missionId}
          sessionId={nav.sessionId}
          playerId={nav.playerId}
          navigate={navigate}
        />
      );

    default:
      return <LandingPage navigate={navigate} />;
  }
}
