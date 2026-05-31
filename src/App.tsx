import { useState } from 'react'
import type { NavPage } from './types'
import LandingPage       from './pages/LandingPage'
import PlayerCockpitPage from './pages/PlayerCockpitPage'
import AdminCockpitPage  from './pages/AdminCockpitPage'
import PlayerListPage    from './pages/PlayerListPage'
import PlayerDetailPage  from './pages/PlayerDetailPage'
import QRScannerPage     from './pages/QRScannerPage'
import FormPage          from './pages/FormPage'

export default function App() {
  const [nav, setNav] = useState<NavPage>({ name: 'landing' })

  function navigate(page: NavPage) {
    setNav(page)
    // Scroll to top on navigation
    window.scrollTo(0, 0)
  }

  switch (nav.name) {
    case 'landing':
      return <LandingPage navigate={navigate} />

    case 'playerCockpit':
      return <PlayerCockpitPage sessionId={nav.sessionId} playerId={nav.playerId} navigate={navigate} />

    case 'adminCockpit':
      return <AdminCockpitPage sessionId={nav.sessionId} navigate={navigate} />

    case 'playerList':
      return <PlayerListPage sessionId={nav.sessionId} navigate={navigate} />

    case 'playerDetail':
      return <PlayerDetailPage sessionId={nav.sessionId} playerId={nav.playerId} navigate={navigate} />

    case 'qrScanner':
      return <QRScannerPage sessionId={nav.sessionId} navigate={navigate} />

    case 'formPage':
      return <FormPage missionId={nav.missionId} sessionId={nav.sessionId} playerId={nav.playerId} navigate={navigate} />

    default:
      return <LandingPage navigate={navigate} />
  }
}
